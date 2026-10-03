const http = require("node:http");
const { WebSocket } = require("ws");

const PORT = Number(process.env.PORT) || 8790;
const F1_ORIGIN = "https://www.formula1.com";
const F1_HTTP = "https://livetiming.formula1.com/signalrcore";
const F1_WS = "wss://livetiming.formula1.com/signalrcore";
const RECORD_SEPARATOR = "\x1e";
const CHANNELS = [
  "TimingData",
  "TimingDataF1",
  "TimingAppData",
  "DriverList",
  "SessionInfo",
  "WeatherData",
  "RaceControlMessages",
  "LapCount",
  "TrackStatus",
  "ExtrapolatedClock",
];

const raw = {
  timing: { Lines: {} },
  timingApp: { Lines: {} },
  drivers: {},
  session: {},
  weather: {},
  raceControl: { Messages: {} },
  lapCount: {},
  trackStatus: {},
  clock: {},
};

let socket = null;
let connected = false;
let lastMessageAt = "";
let reconnectTimer = null;
let watchdogTimer = null;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeValue(target, source) {
  if (Array.isArray(target)) {
    const entries = Array.isArray(source) ? source.entries() : Object.entries(source || {});
    for (const [key, value] of entries) {
      const index = Number(key);
      if (!Number.isInteger(index)) continue;
      target[index] = mergeValue(target[index], value);
    }
    return target;
  }

  if (isObject(source)) {
    const output = isObject(target) ? target : {};
    for (const [key, value] of Object.entries(source)) {
      output[key] = mergeValue(output[key], value);
    }
    return output;
  }

  if (Array.isArray(source)) {
    const output = Array.isArray(target) ? target : [];
    for (let index = 0; index < source.length; index += 1) {
      output[index] = mergeValue(output[index], source[index]);
    }
    return output;
  }

  return source === undefined ? target : source;
}

function updateChannel(channel, payload) {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!data) return;

  if (channel === "TimingData" || channel === "TimingDataF1") raw.timing = mergeValue(raw.timing, data);
  else if (channel === "TimingAppData") raw.timingApp = mergeValue(raw.timingApp, data);
  else if (channel === "DriverList") raw.drivers = mergeValue(raw.drivers, data);
  else if (channel === "SessionInfo") raw.session = mergeValue(raw.session, data);
  else if (channel === "WeatherData") raw.weather = mergeValue(raw.weather, data);
  else if (channel === "RaceControlMessages") raw.raceControl = mergeValue(raw.raceControl, data);
  else if (channel === "LapCount") raw.lapCount = mergeValue(raw.lapCount, data);
  else if (channel === "TrackStatus") raw.trackStatus = mergeValue(raw.trackStatus, data);
  else if (channel === "ExtrapolatedClock") raw.clock = mergeValue(raw.clock, data);
}

function handleSnapshot(snapshot) {
  for (const channel of CHANNELS) {
    if (snapshot[channel]) updateChannel(channel, snapshot[channel]);
  }
}

function scheduleReconnect(delay = 5000) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, delay);
}

async function negotiate() {
  const preflight = await fetch(`${F1_HTTP}/negotiate`, {
    method: "OPTIONS",
    headers: { Origin: F1_ORIGIN, "User-Agent": "BestHTTP" },
  });
  const cookieHeader = preflight.headers.get("set-cookie") || "";
  const cookie = cookieHeader.match(/AWSALBCORS=([^;]+)/)?.[1] || "";
  const headers = {
    Origin: F1_ORIGIN,
    "User-Agent": "BestHTTP",
    "Content-Type": "text/plain",
  };
  if (cookie) headers.Cookie = `AWSALBCORS=${cookie}`;

  const response = await fetch(`${F1_HTTP}/negotiate?negotiateVersion=1`, {
    method: "POST",
    headers,
  });
  if (!response.ok) throw new Error(`F1 negotiate HTTP ${response.status}`);
  return { ...(await response.json()), cookie };
}

async function connect() {
  clearTimeout(reconnectTimer);
  try {
    const negotiation = await negotiate();
    const headers = { Origin: F1_ORIGIN, "User-Agent": "BestHTTP" };
    if (negotiation.cookie) headers.Cookie = `AWSALBCORS=${negotiation.cookie}`;
    socket = new WebSocket(`${F1_WS}?id=${encodeURIComponent(negotiation.connectionToken)}`, { headers });

    let handshakeComplete = false;
    socket.on("open", () => {
      socket.send(`${JSON.stringify({ protocol: "json", version: 1 })}${RECORD_SEPARATOR}`);
    });
    socket.on("message", (buffer) => {
      lastMessageAt = new Date().toISOString();
      clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => socket?.terminate(), 30000);

      for (const segment of buffer.toString("utf8").split(RECORD_SEPARATOR)) {
        if (!segment) continue;
        const frame = JSON.parse(segment);
        if (!handshakeComplete) {
          if (frame.error) throw new Error(frame.error);
          handshakeComplete = true;
          connected = true;
          socket.send(`${JSON.stringify({
            type: 1,
            invocationId: "0",
            target: "Subscribe",
            arguments: [CHANNELS],
          })}${RECORD_SEPARATOR}`);
          continue;
        }

        if (frame.type === 3 && frame.invocationId === "0" && frame.result) handleSnapshot(frame.result);
        if (frame.type === 1 && frame.target === "feed" && frame.arguments?.length >= 2) {
          updateChannel(frame.arguments[0], frame.arguments[1]);
        }
      }
    });
    socket.on("close", () => {
      connected = false;
      clearTimeout(watchdogTimer);
      scheduleReconnect();
    });
    socket.on("error", () => {
      connected = false;
    });
  } catch (error) {
    connected = false;
    console.error(`[live] ${error.message}`);
    scheduleReconnect();
  }
}

function offsetIso(value, offset) {
  if (!value) return "";
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value).toISOString();
  const clean = String(offset || "00:00:00");
  const sign = clean.startsWith("-") ? "-" : "+";
  const parts = clean.replace(/^[+-]/, "").split(":");
  const zone = `${sign}${String(parts[0] || "00").padStart(2, "0")}:${String(parts[1] || "00").padStart(2, "0")}`;
  return new Date(`${value}${zone}`).toISOString();
}

function timeSeconds(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function numericEntries(value) {
  if (Array.isArray(value)) return value;
  return Object.keys(value || {}).sort((a, b) => Number(a) - Number(b)).map((key) => value[key]);
}

function snapshot() {
  const at = lastMessageAt || new Date().toISOString();
  const sessionInfo = raw.session || {};
  const meeting = sessionInfo.Meeting || {};
  const start = offsetIso(sessionInfo.StartDate, sessionInfo.GmtOffset);
  const end = offsetIso(sessionInfo.EndDate, sessionInfo.GmtOffset);
  const session = Object.keys(sessionInfo).length ? {
    session_key: sessionInfo.Key,
    meeting_key: meeting.Key,
    session_name: sessionInfo.Name,
    session_type: sessionInfo.Type,
    date_start: start,
    date_end: end,
    year: start ? new Date(start).getUTCFullYear() : new Date().getUTCFullYear(),
    country_name: meeting.Country?.Name,
    country_code: meeting.Country?.Code,
    location: meeting.Location,
    circuit_short_name: meeting.Circuit?.ShortName,
    status: sessionInfo.SessionStatus,
    path: sessionInfo.Path,
  } : null;

  const drivers = Object.entries(raw.drivers || {}).filter(([key, driver]) => /^\d+$/.test(key) && driver?.RacingNumber).map(([key, driver]) => ({
    driver_number: Number(driver.RacingNumber || key),
    full_name: driver.FullName || `${driver.FirstName || ""} ${driver.LastName || ""}`.trim(),
    first_name: driver.FirstName,
    last_name: driver.LastName,
    name_acronym: driver.Tla,
    team_name: driver.TeamName,
    team_colour: driver.TeamColour ? `#${driver.TeamColour.replace(/^#/, "")}` : "",
    headshot_url: driver.HeadshotUrl,
  }));

  const positions = [];
  const intervals = [];
  const laps = [];
  const stints = [];
  const carData = [];
  const results = [];
  for (const [driverNumber, line] of Object.entries(raw.timing?.Lines || {})) {
    if (!line || !/^\d+$/.test(driverNumber)) continue;
    const id = Number(driverNumber);
    const position = Number(line.Position || line.Line) || 99;
    const sectors = numericEntries(line.Sectors);
    const segmentValues = (index) => numericEntries(sectors[index]?.Segments).map((segment) => Number(segment?.Status || 0));
    const lastLap = timeSeconds(line.LastLapTime?.Value);
    const bestLap = timeSeconds(line.BestLapTime?.Value);
    const lapNumber = Number(line.NumberOfLaps) || 0;
    const pitActive = Boolean(line.InPit || line.PitOut);
    const speedTrap = Number(line.Speeds?.ST?.Value || line.Speeds?.FL?.Value) || null;
    const gap = line.GapToLeader || line.TimeDiffToFastest || (position === 1 ? "0" : null);
    const interval = line.IntervalToPositionAhead?.Value || line.IntervalToPositionAhead || line.TimeDiffToPositionAhead || null;

    positions.push({ driver_number: id, position, date: at });
    intervals.push({ driver_number: id, gap_to_leader: gap, interval, date: at });
    if (bestLap) laps.push({ driver_number: id, lap_number: Number(line.BestLapTime?.Lap) || 0, lap_duration: bestLap, date_start: at });
    laps.push({
      driver_number: id,
      lap_number: lapNumber,
      lap_duration: lastLap,
      duration_sector_1: timeSeconds(sectors[0]?.Value),
      duration_sector_2: timeSeconds(sectors[1]?.Value),
      duration_sector_3: timeSeconds(sectors[2]?.Value),
      segments_sector_1: segmentValues(0),
      segments_sector_2: segmentValues(1),
      segments_sector_3: segmentValues(2),
      is_pit_out_lap: pitActive,
      st_speed: speedTrap,
      date_start: at,
    });
    results.push({
      driver_number: id,
      position,
      number_of_laps: lapNumber,
      gap_to_leader: gap,
      dnf: Boolean(line.Retired || line.Stopped),
      dns: false,
      dsq: false,
    });

    const appLine = raw.timingApp?.Lines?.[driverNumber] || {};
    numericEntries(appLine.Stints).forEach((stint, index) => {
      if (!stint) return;
      const startLap = Number(stint.StartLaps) || 0;
      const totalLaps = Number(stint.TotalLaps) || 0;
      stints.push({
        driver_number: id,
        stint_number: index + 1,
        compound: stint.Compound || "UNKNOWN",
        tyre_age_at_start: startLap,
        lap_start: Number(stint.LapNumber) || Math.max(1, lapNumber - totalLaps + 1),
        lap_end: lapNumber,
        date: at,
      });
    });
  }

  const weather = Object.keys(raw.weather || {}).length ? [{
    air_temperature: Number(raw.weather.AirTemp),
    track_temperature: Number(raw.weather.TrackTemp),
    humidity: Number(raw.weather.Humidity),
    pressure: Number(raw.weather.Pressure),
    rainfall: Number(raw.weather.Rainfall),
    wind_direction: Number(raw.weather.WindDirection),
    wind_speed: Number(raw.weather.WindSpeed),
    date: at,
  }] : [];

  const raceControl = numericEntries(raw.raceControl?.Messages).filter(Boolean).map((message) => ({
    category: message.Category || "Track",
    flag: message.Flag || message.Status || "",
    message: message.Message || "",
    scope: message.Scope || "Track",
    date: message.Utc || at,
  }));

  const sessionStatus = String(sessionInfo.SessionStatus || "");
  const active = /started|active/i.test(sessionStatus);
  return {
    source: "f1-live-timing",
    feed: { connected, active, sessionStatus, lastMessageAt },
    session,
    drivers,
    positions,
    intervals,
    laps,
    stints,
    pits: [],
    weather,
    raceControl,
    carData,
    locations: [],
    results,
    errors: [],
  };
}

function corsOrigin(request) {
  const origin = request.headers.origin || "";
  const allowed = (process.env.ALLOWED_ORIGINS || "https://asiles-lab.github.io,http://127.0.0.1:8787,http://localhost:8787")
    .split(",")
    .map((value) => value.trim());
  return allowed.includes(origin) ? origin : allowed[0];
}

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", corsOrigin(request));
  response.setHeader("Vary", "Origin");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "Access-Control-Allow-Methods": "GET, OPTIONS" });
    response.end();
    return;
  }
  if (request.url === "/health") {
    response.end(JSON.stringify({ ok: true, connected, lastMessageAt }));
    return;
  }
  if (request.url === "/api/snapshot") {
    response.end(JSON.stringify(snapshot()));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[live] listening on ${PORT}`);
  connect();
});
