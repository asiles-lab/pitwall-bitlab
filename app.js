const API_BASE = "https://api.openf1.org/v1";
const ACTIVE_REFRESH_MS = 2000;
const IDLE_REFRESH_MS = 300000;
const SESSION_REFRESH_MS = 60000;
const CONTEXT_REFRESH_MS = 15000;
const OPENF1_REQUEST_GAP_MS = 450;
const STREAM_WINDOW_MINUTES = 18;
const SESSION_GRACE_MS = 45000;
const FAST_ENDPOINT_ROTATION = [
  ["position", "intervals", "car_data"],
  ["position", "intervals", "location"],
  ["position", "intervals", "race_control"],
];

const els = {
  connection: document.querySelector("#connectionState"),
  lastSync: document.querySelector("#lastSync"),
  sessionMetric: document.querySelector("#sessionMetric"),
  sessionFlag: document.querySelector("#sessionFlag"),
  trackMetric: document.querySelector("#trackMetric"),
  flagMetric: document.querySelector("#flagMetric"),
  weatherMetric: document.querySelector("#weatherMetric"),
  lapMetric: document.querySelector("#lapMetric"),
  rowCount: document.querySelector("#rowCount"),
  timingTable: document.querySelector(".timing-table"),
  leaderboard: document.querySelector("#leaderboardBody"),
  weatherGrid: document.querySelector("#weatherGrid"),
  rainNote: document.querySelector("#rainNote"),
  strategyList: document.querySelector("#strategyList"),
  strategyNote: document.querySelector("#strategyNote"),
  raceControlList: document.querySelector("#raceControlList"),
  raceControlNote: document.querySelector("#raceControlNote"),
  channelGrid: document.querySelector("#channelGrid"),
  trackCanvas: document.querySelector("#trackCanvas"),
  trackNote: document.querySelector("#trackNote"),
  refreshBtn: document.querySelector("#refreshBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsPanel: document.querySelector("#settingsPanel"),
  tokenInput: document.querySelector("#tokenInput"),
  saveTokenBtn: document.querySelector("#saveTokenBtn"),
  clearTokenBtn: document.querySelector("#clearTokenBtn"),
  driversStandings: document.querySelector("#driversStandings"),
  teamsStandings: document.querySelector("#teamsStandings"),
  archiveState: document.querySelector("#archiveState"),
  archiveSync: document.querySelector("#archiveSync"),
  archiveRaceName: document.querySelector("#archiveRaceName"),
  archiveMetrics: document.querySelector("#archiveMetrics"),
  archiveResultCount: document.querySelector("#archiveResultCount"),
  archiveResultBody: document.querySelector("#archiveResultBody"),
  homePanel: document.querySelector("#home-panel"),
  racerStage: document.querySelector(".racer-stage"),
  racerVideo: document.querySelector("#racerVideo"),
  racerCanvas: document.querySelector("#racerCanvas"),
  generalNews: document.querySelector("#generalNews"),
  francoNews: document.querySelector("#francoNews"),
  supportNews: document.querySelector("#supportNews"),
  newsMeta: document.querySelector("#newsMeta"),
  newsHistory: document.querySelector("#newsHistory"),
  francoHistory: document.querySelector("#francoHistory"),
  articlePanel: document.querySelector("#article-panel"),
  articleView: document.querySelector("#articleView"),
  articleBackBtn: document.querySelector("#articleBackBtn"),
  articleKicker: document.querySelector("#articleKicker"),
  articleTitle: document.querySelector("#articleTitle"),
  articleStandfirst: document.querySelector("#articleStandfirst"),
  articleHero: document.querySelector("#articleHero"),
  articleBody: document.querySelector("#articleBody"),
  articleSource: document.querySelector("#articleSource"),
};

const GENERAL_NEWS_VISIBLE = 7;
const SIDE_NEWS_VISIBLE = 2;

const FALLBACK_NEWS = {
  updatedAt: "",
  checkedAt: "",
  pageSize: 18,
  sources: [],
  pages: [{ page: 1, createdAt: "", items: [] }],
};

const DRIVER_STANDINGS = [
  { pos: 1, driver: "Kimi Antonelli", code: "ANT", team: "Mercedes", points: 302 },
  { pos: 2, driver: "George Russell", code: "RUS", team: "Mercedes", points: 236 },
  { pos: 3, driver: "Lewis Hamilton", code: "HAM", team: "Ferrari", points: 199 },
  { pos: 4, driver: "Lando Norris", code: "NOR", team: "McLaren", points: 186 },
  { pos: 5, driver: "Charles Leclerc", code: "LEC", team: "Ferrari", points: 179 },
  { pos: 6, driver: "Max Verstappen", code: "VER", team: "Red Bull Racing", points: 163 },
  { pos: 7, driver: "Oscar Piastri", code: "PIA", team: "McLaren", points: 120 },
  { pos: 8, driver: "Isack Hadjar", code: "HAD", team: "Red Bull Racing", points: 86 },
  { pos: 9, driver: "Liam Lawson", code: "LAW", team: "Racing Bulls", points: 59 },
  { pos: 10, driver: "Pierre Gasly", code: "GAS", team: "Alpine", points: 41 },
  { pos: 11, driver: "Arvid Lindblad", code: "LIN", team: "Racing Bulls", points: 37 },
  { pos: 12, driver: "Franco Colapinto", code: "COL", team: "Alpine", points: 27 },
  { pos: 13, driver: "Oliver Bearman", code: "BEA", team: "Haas F1 Team", points: 20 },
  { pos: 14, driver: "Gabriel Bortoleto", code: "BOR", team: "Audi", points: 10 },
  { pos: 15, driver: "Nico Hulkenberg", code: "HUL", team: "Audi", points: 7 },
  { pos: 16, driver: "Esteban Ocon", code: "OCO", team: "Haas F1 Team", points: 7 },
  { pos: 17, driver: "Carlos Sainz", code: "SAI", team: "Williams", points: 7 },
  { pos: 18, driver: "Alex Albon", code: "ALB", team: "Williams", points: 5 },
  { pos: 19, driver: "Fernando Alonso", code: "ALO", team: "Aston Martin", points: 3 },
  { pos: 20, driver: "Yuki Tsunoda", code: "TSU", team: "Racing Bulls", points: 1 },
  { pos: 21, driver: "Lance Stroll", code: "STR", team: "Aston Martin", points: 0 },
  { pos: 22, driver: "Valtteri Bottas", code: "BOT", team: "Cadillac", points: 0 },
  { pos: 23, driver: "Sergio Perez", code: "PER", team: "Cadillac", points: 0 },
];

const TEAM_STANDINGS = [
  { pos: 1, team: "Mercedes", points: 538 },
  { pos: 2, team: "Ferrari", points: 378 },
  { pos: 3, team: "McLaren", points: 306 },
  { pos: 4, team: "Red Bull Racing", points: 263 },
  { pos: 5, team: "Racing Bulls", points: 83 },
  { pos: 6, team: "Alpine", points: 68 },
  { pos: 7, team: "Haas F1 Team", points: 27 },
  { pos: 8, team: "Audi", points: 17 },
  { pos: 9, team: "Williams", points: 12 },
  { pos: 10, team: "Aston Martin", points: 3 },
  { pos: 11, team: "Cadillac", points: 0 },
];

const FALLBACK_PREVIOUS_RACE = {
  name: "Azerbaijan GP 2026",
  circuit: "Baku City Circuit",
  date: "2026-09-26",
  laps: 51,
  source: "Formula1.com",
  results: [
    { position: 1, code: "RUS", driver: "George Russell", team: "Mercedes", laps: 51, gap: "1:38:02.143", status: "FIN" },
    { position: 2, code: "VER", driver: "Max Verstappen", team: "Red Bull Racing", laps: 51, gap: "+0.196s", status: "FIN" },
    { position: 3, code: "HAD", driver: "Isack Hadjar", team: "Red Bull Racing", laps: 51, gap: "+10.704s", status: "FIN" },
    { position: 4, code: "LEC", driver: "Charles Leclerc", team: "Ferrari", laps: 51, gap: "+14.136s", status: "FIN" },
    { position: 5, code: "ANT", driver: "Kimi Antonelli", team: "Mercedes", laps: 51, gap: "+14.512s", status: "FIN" },
    { position: 6, code: "HAM", driver: "Lewis Hamilton", team: "Ferrari", laps: 51, gap: "+22.382s", status: "FIN" },
    { position: 7, code: "LIN", driver: "Arvid Lindblad", team: "Racing Bulls", laps: 51, gap: "+31.159s", status: "FIN" },
    { position: 8, code: "OCO", driver: "Esteban Ocon", team: "Haas F1 Team", laps: 51, gap: "+31.189s", status: "FIN" },
    { position: 9, code: "BEA", driver: "Oliver Bearman", team: "Haas F1 Team", laps: 51, gap: "+31.929s", status: "FIN" },
    { position: 10, code: "SAI", driver: "Carlos Sainz", team: "Williams", laps: 51, gap: "+32.416s", status: "FIN" },
    { position: 11, code: "HUL", driver: "Nico Hulkenberg", team: "Audi", laps: 51, gap: "+33.231s", status: "FIN" },
    { position: 12, code: "LAW", driver: "Liam Lawson", team: "Racing Bulls", laps: 51, gap: "+34.013s", status: "FIN" },
    { position: 13, code: "PIA", driver: "Oscar Piastri", team: "McLaren", laps: 51, gap: "+36.401s", status: "FIN" },
    { position: 14, code: "PER", driver: "Sergio Perez", team: "Cadillac", laps: 51, gap: "+41.400s", status: "FIN" },
    { position: 15, code: "BOR", driver: "Gabriel Bortoleto", team: "Audi", laps: 51, gap: "+44.230s", status: "FIN" },
    { position: 16, code: "BOT", driver: "Valtteri Bottas", team: "Cadillac", laps: 49, gap: "DNF", status: "DNF" },
    { position: "NC", code: "COL", driver: "Franco Colapinto", team: "Alpine", laps: 36, gap: "DNF", status: "DNF" },
    { position: "NC", code: "GAS", driver: "Pierre Gasly", team: "Alpine", laps: 35, gap: "DNF", status: "DNF" },
    { position: "NC", code: "NOR", driver: "Lando Norris", team: "McLaren", laps: 35, gap: "DNF", status: "DNF" },
    { position: "NC", code: "ALB", driver: "Alex Albon", team: "Williams", laps: 29, gap: "DNF", status: "DNF" },
    { position: "NC", code: "ALO", driver: "Fernando Alonso", team: "Aston Martin", laps: 20, gap: "DNF", status: "DNF" },
    { position: "NC", code: "STR", driver: "Lance Stroll", team: "Aston Martin", laps: 7, gap: "DNF", status: "DNF" },
  ],
};

const state = {
  token: localStorage.getItem("openf1_token") || "",
  timer: null,
  isLoadingData: false,
  queuedLoad: false,
  fastTick: 0,
  lastSessionCheck: 0,
  lastContextLoad: 0,
  finalSnapshotKey: "",
  contextSessionKey: "",
  liveCache: null,
  latestLocations: [],
  drivers: new Map(),
  lastPayload: null,
  news: null,
  mainNewsPage: 1,
  sideNewsPage: 1,
};

let openF1Queue = Promise.resolve();

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

els.tokenInput.value = state.token;

function setConnection(mode, text) {
  els.connection.classList.toggle("is-live", mode === "live");
  els.connection.classList.toggle("is-error", mode === "error");
  els.connection.textContent = text;
}

function setChannel(name, status) {
  const node = els.channelGrid.querySelector(`[data-channel="${name}"]`);
  if (!node) return;
  node.classList.remove("ok", "warn", "fail");
  node.classList.add(status);
}

function setAllChannels(status) {
  ["drivers", "timing", "car", "gps", "weather", "race"].forEach((name) => setChannel(name, status));
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function streamWindowStart(session) {
  const end = normalizeDate(session?.date_end);
  const anchor = end && end < Date.now() ? end : Date.now();
  return new Date(anchor - STREAM_WINDOW_MINUTES * 60 * 1000).toISOString();
}

function sessionPhase(session, now = Date.now()) {
  const start = normalizeDate(session?.date_start);
  const end = normalizeDate(session?.date_end);
  if (!start || !end) return "unknown";
  if (now < start) return "upcoming";
  if (now <= end + SESSION_GRACE_MS) return "active";
  return "ended";
}

function makeEmptyPayload(session = null) {
  return {
    session,
    drivers: [],
    positions: [],
    intervals: [],
    laps: [],
    stints: [],
    pits: [],
    weather: [],
    raceControl: [],
    carData: [],
    locations: [],
    results: [],
    errors: [],
  };
}

function sessionId(session) {
  return String(session?.session_key || "latest");
}

function replaceCache(partial = {}) {
  state.liveCache = { ...(state.liveCache || makeEmptyPayload(partial.session || null)), ...partial };
}

function scheduleLoad(ms) {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(loadData, ms);
}

function normalizeDate(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSync(date = new Date()) {
  return `sync ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function countryFlag(session) {
  const aliases = {
    UK: "GB",
    UAE: "AE",
    ABU: "AE",
    AUS: "AU",
    AUT: "AT",
    AZE: "AZ",
    BAH: "BH",
    BHR: "BH",
    BEL: "BE",
    BRA: "BR",
    BRN: "BH",
    CAN: "CA",
    CHN: "CN",
    ESP: "ES",
    GBR: "GB",
    HUN: "HU",
    ITA: "IT",
    JPN: "JP",
    MAL: "MY",
    MCO: "MC",
    MEX: "MX",
    NED: "NL",
    QAT: "QA",
    SAU: "SA",
    SGP: "SG",
    USA: "US",
  };
  const nameAliases = {
    australia: "AU",
    austria: "AT",
    azerbaijan: "AZ",
    bahrain: "BH",
    belgium: "BE",
    brazil: "BR",
    canada: "CA",
    china: "CN",
    hungary: "HU",
    italy: "IT",
    japan: "JP",
    malaysia: "MY",
    mexico: "MX",
    monaco: "MC",
    netherlands: "NL",
    qatar: "QA",
    "saudi arabia": "SA",
    singapore: "SG",
    spain: "ES",
    "united arab emirates": "AE",
    "united kingdom": "GB",
    "united states": "US",
  };
  const placeText = `${session?.circuit_short_name || ""} ${session?.circuit_name || ""} ${session?.location || ""}`.toLowerCase();
  const placeAliases = [
    [/sepang|kuala lumpur|malaysia/, "MY"],
    [/sakhir|bahrain/, "BH"],
    [/baku|azerbaijan/, "AZ"],
    [/monza|imola|italy/, "IT"],
    [/monaco|monte carlo/, "MC"],
    [/silverstone|great britain|united kingdom/, "GB"],
    [/spa|belgium/, "BE"],
    [/zandvoort|netherlands/, "NL"],
    [/suzuka|japan/, "JP"],
    [/singapore|marina bay/, "SG"],
    [/austin|miami|las vegas|united states/, "US"],
    [/mexico/, "MX"],
    [/interlagos|sao paulo|brazil/, "BR"],
    [/yas marina|abu dhabi|united arab emirates/, "AE"],
    [/jeddah|saudi arabia/, "SA"],
    [/lusail|qatar/, "QA"],
    [/hungaroring|hungary/, "HU"],
    [/barcelona|spain/, "ES"],
    [/melbourne|australia/, "AU"],
    [/shanghai|china/, "CN"],
    [/montreal|canada/, "CA"],
  ];
  const placeCode = placeAliases.find(([pattern]) => pattern.test(placeText))?.[1] || "";
  const rawCode = String(session?.country_code || "").trim().toUpperCase();
  const countryName = String(session?.country_name || "").trim().toLowerCase();
  const code = placeCode || aliases[rawCode] || rawCode || nameAliases[countryName] || "";
  if (/^[A-Z]{2}$/.test(code)) {
    return [...code].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
  }
  return "🏁";
}

function circuitLabel(session) {
  const raw = String(session?.circuit_short_name || session?.location || "--").trim();
  const location = String(session?.location || "").trim();
  if (location && raw.toLowerCase().includes(location.toLowerCase())) {
    return location;
  }
  return raw.replace(/^[A-Z]{2,3}\s+/, "").trim() || raw || "--";
}

function formatLap(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "--";
  const mins = Math.floor(value / 60);
  const secs = value - mins * 60;
  return mins > 0 ? `${mins}:${secs.toFixed(3).padStart(6, "0")}` : secs.toFixed(3);
}

function formatGap(value, leaderText = "LEAD") {
  if (value === null || value === undefined || value === "") return leaderText;
  if (typeof value === "string") return value.toUpperCase();
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  if (number === 0) return leaderText;
  return `+${number.toFixed(3)}`;
}

function cleanName(driver) {
  return driver?.broadcast_name || driver?.full_name || driver?.name_acronym || `Car ${driver?.driver_number || "--"}`;
}

function teamColor(driver) {
  const raw = driver?.team_colour;
  return raw ? `#${raw.replace("#", "")}` : "#39d7ff";
}

function compoundClass(compound) {
  return String(compound || "unk").toLowerCase().replace(/\s+/g, "-");
}

function drsMode(car) {
  if (!car) return "--";
  if (Number(car.brake) > 0) return "BRK";
  if ([10, 12, 14].includes(Number(car.drs))) return "DRS";
  if (Number(car.throttle) > 92) return "PUSH";
  return `G${car.n_gear ?? "--"}`;
}

function resultMode(result) {
  if (!result) return "--";
  if (result.dsq) return "DSQ";
  if (result.dns) return "DNS";
  if (result.dnf) return "DNF";
  return "FIN";
}

function modeClass(car) {
  if (!car) return "";
  if (Number(car.brake) > 0) return "brake";
  if ([10, 12, 14].includes(Number(car.drs)) || Number(car.throttle) > 92) return "hot";
  return "";
}

function latestBy(items, key, sortKey = "date") {
  const out = new Map();
  for (const item of items || []) {
    const id = String(item[key]);
    const current = out.get(id);
    const a = sortKey === "lap_number" || sortKey === "stint_number" || sortKey === "position"
      ? Number(item[sortKey] || 0)
      : normalizeDate(item[sortKey]);
    const b = current
      ? (sortKey === "lap_number" || sortKey === "stint_number" || sortKey === "position"
        ? Number(current[sortKey] || 0)
        : normalizeDate(current[sortKey]))
      : -1;
    if (!current || a >= b) out.set(id, item);
  }
  return out;
}

function bestLapBy(items) {
  const out = new Map();
  for (const lap of items || []) {
    const duration = Number(lap.lap_duration);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const id = String(lap.driver_number);
    const current = out.get(id);
    if (!current || duration < Number(current.lap_duration)) out.set(id, lap);
  }
  return out;
}

function resultDuration(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => Number.isFinite(Number(item))).at(-1);
  }
  return value;
}

function lastRecord(items) {
  return [...(items || [])].sort((a, b) => normalizeDate(b.date || b.date_start) - normalizeDate(a.date || a.date_start))[0];
}

async function fetchOpenF1(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.append(key, value);
  }
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const task = openF1Queue.then(async () => {
    await delay(OPENF1_REQUEST_GAP_MS);
    let response = await fetch(url, { headers });
    if (response.status === 429) {
      await delay(1400);
      response = await fetch(url, { headers });
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`${endpoint}: ${response.status} ${detail.slice(0, 90)}`);
    }
    return response.json();
  });
  openF1Queue = task.catch(() => {});
  return task;
}

async function optional(endpoint, params = {}) {
  try {
    return { ok: true, data: await fetchOpenF1(endpoint, params) };
  } catch (error) {
    return { ok: false, data: [], error };
  }
}

function payloadSources(payload) {
  return {
    drivers: { ok: Boolean(payload.drivers?.length), data: payload.drivers || [] },
    positions: { ok: Boolean(payload.positions?.length), data: payload.positions || [] },
    intervals: { ok: Boolean(payload.intervals?.length), data: payload.intervals || [] },
    laps: { ok: Boolean(payload.laps?.length), data: payload.laps || [] },
    weather: { ok: Boolean(payload.weather?.length), data: payload.weather || [] },
    raceControl: { ok: Boolean(payload.raceControl?.length), data: payload.raceControl || [] },
    carData: { ok: Boolean(payload.carData?.length), data: payload.carData || [] },
    locations: { ok: Boolean(payload.locations?.length), data: payload.locations || [] },
  };
}

function endpointCacheKey(endpoint) {
  return ({
    car_data: "carData",
    location: "locations",
    position: "positions",
    intervals: "intervals",
    race_control: "raceControl",
  })[endpoint] || endpoint;
}

async function loadSession(force, now) {
  const cached = state.liveCache?.session || null;
  const shouldRefresh = force || !cached || now - state.lastSessionCheck > SESSION_REFRESH_MS;
  if (!shouldRefresh) return cached;

  const sessionResult = await optional("sessions", { session_key: "latest" });
  state.lastSessionCheck = now;
  const session = Array.isArray(sessionResult.data) ? sessionResult.data.at(-1) : null;
  if (!session) return cached;

  if (!cached || sessionId(cached) !== sessionId(session)) {
    state.liveCache = makeEmptyPayload(session);
    state.contextSessionKey = "";
    state.finalSnapshotKey = "";
  } else {
    replaceCache({ session });
  }
  return session;
}

async function loadContext(sessionKey) {
  const [drivers, laps, stints, pits, weather, results] = await Promise.all([
    optional("drivers", { session_key: sessionKey }),
    optional("laps", { session_key: sessionKey }),
    optional("stints", { session_key: sessionKey }),
    optional("pit", { session_key: sessionKey }),
    optional("weather", { session_key: sessionKey }),
    optional("session_result", { session_key: sessionKey }),
  ]);

  replaceCache({
    drivers: drivers.ok ? drivers.data : state.liveCache?.drivers || [],
    laps: laps.ok ? laps.data : state.liveCache?.laps || [],
    stints: stints.ok ? stints.data : state.liveCache?.stints || [],
    pits: pits.ok ? pits.data : state.liveCache?.pits || [],
    weather: weather.ok ? weather.data : state.liveCache?.weather || [],
    results: results.ok ? results.data : state.liveCache?.results || [],
    errors: [drivers, laps, stints, pits, weather, results].filter((x) => !x.ok),
  });
}

async function loadFastChannels(sessionKey, endpoints) {
  const liveWindow = { "date>=": streamWindowStart(state.liveCache?.session), session_key: sessionKey };
  const results = await Promise.all(endpoints.map((endpoint) => optional(endpoint, liveWindow)));
  const next = {};
  const errors = [];

  results.forEach((result, index) => {
    const endpoint = endpoints[index];
    const key = endpointCacheKey(endpoint);
    if (result.ok) next[key] = result.data;
    else errors.push(result);
  });

  replaceCache({
    ...next,
    errors: [...(state.liveCache?.errors || []), ...errors],
  });
}

async function loadData(options = {}) {
  const force = options?.force === true || options?.type === "click";
  if (state.isLoadingData) {
    state.queuedLoad = true;
    return;
  }
  state.isLoadingData = true;
  setConnection("loading", "sincronizando");
  if (!state.liveCache) setAllChannels("warn");

  let nextDelay = IDLE_REFRESH_MS;

  try {
    const now = Date.now();
    const session = await loadSession(force, now);
    const sessionKey = session?.session_key || "latest";
    const phase = sessionPhase(session, now);
    const finalSnapshotKey = `${sessionKey}:final`;
    const needsContext = force
      || state.contextSessionKey !== String(sessionKey)
      || now - state.lastContextLoad > CONTEXT_REFRESH_MS
      || (phase === "ended" && state.finalSnapshotKey !== finalSnapshotKey);

    replaceCache({ session, errors: [] });

    if (needsContext) {
      await loadContext(sessionKey);
      state.contextSessionKey = String(sessionKey);
      state.lastContextLoad = now;
    }

    if (phase === "active") {
      const endpoints = FAST_ENDPOINT_ROTATION[state.fastTick % FAST_ENDPOINT_ROTATION.length];
      state.fastTick += 1;
      await loadFastChannels(sessionKey, endpoints);
      state.finalSnapshotKey = "";
      nextDelay = ACTIVE_REFRESH_MS;
    } else if (phase === "ended" && state.finalSnapshotKey !== finalSnapshotKey) {
      await loadFastChannels(sessionKey, ["position", "intervals", "car_data", "location", "race_control"]);
      state.finalSnapshotKey = finalSnapshotKey;
      nextDelay = IDLE_REFRESH_MS;
    } else if (phase === "upcoming") {
      nextDelay = Math.min(SESSION_REFRESH_MS, Math.max(5000, normalizeDate(session?.date_start) - Date.now()));
    }

    const payload = state.liveCache || makeEmptyPayload(session);
    updateChannels(payloadSources(payload));
    render(payload);
  } finally {
    state.isLoadingData = false;
    if (state.queuedLoad) {
      state.queuedLoad = false;
      scheduleLoad(OPENF1_REQUEST_GAP_MS);
    } else {
      scheduleLoad(nextDelay);
    }
  }
}

function updateChannels(sources) {
  setChannel("drivers", sources.drivers.ok && sources.drivers.data.length ? "ok" : "warn");
  setChannel("timing", (sources.positions.ok && sources.positions.data.length) || (sources.intervals.ok && sources.intervals.data.length) || (sources.laps.ok && sources.laps.data.length) ? "ok" : "warn");
  setChannel("car", sources.carData.ok && sources.carData.data.length ? "ok" : "warn");
  setChannel("gps", sources.locations.ok && sources.locations.data.length ? "ok" : "warn");
  setChannel("weather", sources.weather.ok && sources.weather.data.length ? "ok" : "warn");
  setChannel("race", sources.raceControl.ok && sources.raceControl.data.length ? "ok" : "warn");
}

function render(payload) {
  state.lastPayload = payload;
  state.drivers = new Map(payload.drivers.map((driver) => [String(driver.driver_number), driver]));
  state.latestLocations = payload.locations;

  const freshest = [
    lastRecord(payload.carData),
    lastRecord(payload.locations),
    lastRecord(payload.intervals),
    lastRecord(payload.positions),
  ].filter(Boolean).map((item) => normalizeDate(item.date));
  const maxFresh = freshest.length ? Math.max(...freshest) : 0;
  const liveAgeMinutes = maxFresh ? (Date.now() - maxFresh) / 60000 : Infinity;
  const hasLivePulse = liveAgeMinutes <= 8;

  if (payload.errors.length && !payload.drivers.length) {
    setConnection("error", "sin datos");
  } else if (hasLivePulse) {
    setConnection("live", "live");
  } else {
    setConnection("loading", "standby");
  }

  els.lastSync.textContent = formatSync();
  renderMetrics(payload, hasLivePulse);
  renderLeaderboard(payload);
  renderWeather(payload.weather);
  renderStrategy(payload);
  renderRaceControl(payload.raceControl);
  renderArchive(payload);
  drawTrack(payload.locations);
}

function renderMetrics(payload, hasLivePulse) {
  const latestWeather = lastRecord(payload.weather);
  const latestRace = lastRecord(payload.raceControl);
  const lastLap = lastRecord(payload.laps);
  const resultLaps = Math.max(0, ...(payload.results || []).map((result) => Number(result.number_of_laps) || 0));
  const stintLaps = Math.max(0, ...(payload.stints || []).map((stint) => Number(stint.lap_end) || 0));
  const lapNumber = Number(lastLap?.lap_number) || resultLaps || stintLaps;
  const session = payload.session;
  const flag = session ? countryFlag(session) : "🏁";
  const trackName = session ? `${flag} ${circuitLabel(session)}` : "--";

  els.sessionFlag.textContent = flag;
  els.sessionFlag.setAttribute("aria-label", session?.country_name ? `Bandera de ${session.country_name}` : "Bandera de sesion");
  els.sessionMetric.textContent = session ? (session.session_name || session.session_type || "Sesion") : "OpenF1";
  els.trackMetric.textContent = trackName;
  els.flagMetric.textContent = latestRace?.flag || latestRace?.category || "--";
  els.weatherMetric.textContent = latestWeather ? `${Math.round(latestWeather.track_temperature ?? 0)}C pista` : "--";
  els.lapMetric.textContent = lapNumber ? `L${lapNumber}` : "--";
}

function renderLeaderboard(payload) {
  const latestPosition = latestBy(payload.positions, "driver_number", "date");
  const latestInterval = latestBy(payload.intervals, "driver_number", "date");
  const latestLap = latestBy(payload.laps, "driver_number", "lap_number");
  const bestLap = bestLapBy(payload.laps);
  const latestStint = latestBy(payload.stints, "driver_number", "stint_number");
  const latestCar = latestBy(payload.carData, "driver_number", "date");
  const resultMap = latestBy(payload.results, "driver_number", "position");
  const isRace = /race/i.test(`${payload.session?.session_name || ""} ${payload.session?.session_type || ""}`);
  const isActiveSession = sessionPhase(payload.session) === "active";

  const ids = new Set();
  [payload.drivers, payload.positions, payload.intervals, payload.laps, payload.stints, payload.carData, payload.results].forEach((items) => {
    for (const item of items || []) ids.add(String(item.driver_number));
  });

  const rows = [...ids].map((id) => {
    const driver = state.drivers.get(id) || { driver_number: id, name_acronym: `#${id}` };
    const pos = latestPosition.get(id)?.position ?? resultMap.get(id)?.position ?? 99;
    const interval = latestInterval.get(id);
    const lap = latestLap.get(id);
    const best = bestLap.get(id);
    const stint = latestStint.get(id);
    const car = latestCar.get(id);
    const result = resultMap.get(id);
    return { id, driver, pos, interval, lap, best, stint, car, result };
  }).sort((a, b) => Number(a.pos) - Number(b.pos) || Number(a.id) - Number(b.id));

  els.rowCount.textContent = `${rows.length || "--"} autos`;
  const pitActive = rows.some((row) => isActiveSession && isPitActive(row.lap));
  els.timingTable.classList.toggle("has-pit-active", pitActive);

  if (!rows.length) {
    els.leaderboard.innerHTML = `<tr class="skeleton-row"><td colspan="13">Sin datos de sesion disponibles. Si hay carrera en vivo, OpenF1 puede requerir token.</td></tr>`;
    return;
  }

  els.leaderboard.innerHTML = rows.map((row, index) => {
    const compound = row.stint?.compound || "--";
    const segments = [
      ...(row.lap?.segments_sector_1 || []),
      ...(row.lap?.segments_sector_2 || []),
      ...(row.lap?.segments_sector_3 || []),
    ].slice(-18);
    const gapValue = row.interval ? formatGap(row.interval.gap_to_leader) : (row.result ? formatGap(row.result.gap_to_leader) : "--");
    const bestValue = row.best?.lap_duration || (!isRace ? resultDuration(row.result?.duration) : null);
    const modeValue = row.car ? drsMode(row.car) : resultMode(row.result);
    const pitLabel = isActiveSession && isPitActive(row.lap) ? "PIT" : "";
    return `
      <tr class="${row.driver.name_acronym === "COL" ? "highlight-row" : ""}">
        <td class="pit-cell pit-col">${pitLabel ? `<span class="pit-badge">${pitLabel}</span>` : ""}</td>
        <td class="pos-cell">${row.pos === 99 ? index + 1 : row.pos}</td>
        <td>
          <div class="driver-cell">
            <span class="team-chip" style="background:${teamColor(row.driver)}; color:${teamColor(row.driver)}"></span>
            <span class="driver-copy">
              <strong>${row.driver.name_acronym || row.id}</strong>
              <span>${cleanName(row.driver)} · ${row.driver.team_name || "sin equipo"}</span>
            </span>
          </div>
        </td>
        <td class="mono">${gapValue}</td>
        <td class="mono">${row.interval ? formatGap(row.interval.interval, "--") : "--"}</td>
        <td class="mono">${formatLap(row.lap?.lap_duration)}</td>
        <td class="mono">${formatLap(bestValue)}</td>
        <td>${renderSegments(segments)}</td>
        <td><span class="compound ${compoundClass(compound)}">${compound}</span></td>
        <td class="mono">${row.lap?.lap_number || row.result?.number_of_laps || "--"}</td>
        <td class="mono">${row.car?.speed ?? row.lap?.st_speed ?? "--"}</td>
        <td class="mono">${row.car?.rpm ?? "--"}</td>
        <td><span class="mode-badge ${modeClass(row.car)}">${modeValue}</span></td>
      </tr>
    `;
  }).join("");
}

function renderSegments(values) {
  if (!values.length) return `<span class="segments">${Array.from({ length: 18 }, () => `<span class="seg"></span>`).join("")}</span>`;
  return `<span class="segments">${values.map((value) => `<span class="seg ${segmentClass(value)}"></span>`).join("")}</span>`;
}

function isPitActive(lap) {
  if (!lap) return false;
  const segments = [
    ...(lap.segments_sector_1 || []),
    ...(lap.segments_sector_2 || []),
    ...(lap.segments_sector_3 || []),
  ];
  return Boolean(lap.is_pit_out_lap) || segments.slice(-4).some((value) => value === 2064);
}

function segmentClass(value) {
  if (value === 2049) return "green";
  if (value === 2051) return "purple";
  if (value === 2048) return "yellow";
  if (value === 2064) return "pit";
  return "";
}

function renderWeather(weather) {
  const latest = lastRecord(weather);
  if (!latest) {
    els.weatherGrid.innerHTML = `
      <span>Aire <strong>--</strong></span>
      <span>Pista <strong>--</strong></span>
      <span>Humedad <strong>--</strong></span>
      <span>Viento <strong>--</strong></span>
    `;
    els.rainNote.textContent = "--";
    return;
  }

  els.rainNote.textContent = Number(latest.rainfall) ? "lluvia" : "seco";
  els.weatherGrid.innerHTML = `
    <span>Aire <strong>${formatNumber(latest.air_temperature)}C</strong></span>
    <span>Pista <strong>${formatNumber(latest.track_temperature)}C</strong></span>
    <span>Humedad <strong>${formatNumber(latest.humidity, 0)}%</strong></span>
    <span>Viento <strong>${formatNumber(latest.wind_speed)} m/s</strong></span>
  `;
}

function renderStrategy(payload) {
  const latestLap = latestBy(payload.laps, "driver_number", "lap_number");
  const latestStint = latestBy(payload.stints, "driver_number", "stint_number");
  const currentLap = Math.max(
    0,
    ...[...latestLap.values()].map((lap) => Number(lap.lap_number) || 0),
    ...(payload.results || []).map((result) => Number(result.number_of_laps) || 0),
    ...(payload.stints || []).map((stint) => Number(stint.lap_end) || 0),
  );
  const items = [...latestStint.entries()].map(([id, stint]) => {
    const driver = state.drivers.get(id) || { name_acronym: `#${id}`, driver_number: id };
    const age = tyreAge(stint, currentLap);
    const risk = tyreRisk(stint.compound, age);
    return { id, stint, driver, age, risk };
  }).sort((a, b) => b.risk.score - a.risk.score || b.age - a.age).slice(0, 7);

  els.strategyNote.textContent = currentLap ? `vuelta ${currentLap}` : "neumaticos";

  if (!items.length) {
    els.strategyList.innerHTML = `<p class="empty-copy">Esperando stints de OpenF1.</p>`;
    return;
  }

  els.strategyList.innerHTML = items.map((item) => `
    <article class="strategy-item">
      <span class="compound ${compoundClass(item.stint.compound)}">${item.stint.compound || "--"}</span>
      <div>
        <strong>${item.driver.name_acronym || item.id} · ${cleanName(item.driver)}</strong>
        <span>Edad ${item.age}v · stint ${item.stint.stint_number || "--"} · inicio L${item.stint.lap_start || "--"}</span>
      </div>
      <span class="risk ${item.risk.className}">${item.risk.label}</span>
    </article>
  `).join("");
}

function tyreAge(stint, currentLap) {
  const start = Number(stint.lap_start || 0);
  const base = Number(stint.tyre_age_at_start || 0);
  if (!currentLap || !start) return base;
  return Math.max(base, base + currentLap - start + 1);
}

function tyreRisk(compound, age) {
  const key = String(compound || "").toLowerCase();
  let warn = 24;
  let box = 34;
  if (key.includes("soft")) {
    warn = 13;
    box = 20;
  } else if (key.includes("medium")) {
    warn = 22;
    box = 32;
  } else if (key.includes("hard")) {
    warn = 34;
    box = 46;
  } else if (key.includes("inter") || key.includes("wet")) {
    warn = 16;
    box = 24;
  }
  if (age >= box) return { label: "box", className: "box", score: 3 };
  if (age >= warn) return { label: "vigilar", className: "watch", score: 2 };
  return { label: "ok", className: "", score: 1 };
}

function renderRaceControl(messages) {
  const latest = [...(messages || [])].sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date)).slice(0, 6);
  els.raceControlNote.textContent = latest.length ? `${latest.length} ultimos` : "--";
  if (!latest.length) {
    els.raceControlList.innerHTML = `<p class="empty-copy">Sin mensajes cargados.</p>`;
    return;
  }
  els.raceControlList.innerHTML = latest.map((message) => `
    <article class="message-item">
      <span class="risk ${message.flag ? "watch" : ""}">${message.flag || message.category || "INFO"}</span>
      <div>
        <strong>${message.message || message.category || "Race control"}</strong>
        <span>${message.lap_number ? `L${message.lap_number}` : "sesion"} · ${formatMessageTime(message.date)}</span>
      </div>
      <span class="mono">${message.driver_number || "--"}</span>
    </article>
  `).join("");
}

function renderStandings() {
  els.driversStandings.innerHTML = DRIVER_STANDINGS.map((item) => `
    <article class="points-row ${item.code === "COL" ? "is-franco" : ""}">
      <span class="rank">${item.pos}</span>
      <span class="points-main">
        <strong>${item.code} · ${item.driver}</strong>
        <span>${item.team}</span>
      </span>
      <span class="points-score">${item.points}</span>
    </article>
  `).join("");

  els.teamsStandings.innerHTML = TEAM_STANDINGS.map((item) => `
    <article class="points-row ${item.team === "Alpine" ? "is-franco" : ""}">
      <span class="rank">${item.pos}</span>
      <span class="points-main">
        <strong>${item.team}</strong>
        <span>constructores</span>
      </span>
      <span class="points-score">${item.points}</span>
    </article>
  `).join("");
}

function renderArchive(payload) {
  const results = [...(payload.results || [])].sort((a, b) => Number(a.position || 99) - Number(b.position || 99));
  if (!results.length) {
    renderArchiveFallback();
    return;
  }
  const winner = results[0];
  const winnerDriver = winner ? state.drivers.get(String(winner.driver_number)) : null;
  const session = payload.session;
  const laps = Math.max(0, ...results.map((result) => Number(result.number_of_laps) || 0));

  els.archiveState.textContent = results.length ? "archivo" : "sin datos";
  els.archiveState.classList.toggle("is-error", !results.length);
  els.archiveSync.textContent = session?.date_end ? `cerrada ${new Date(session.date_end).toLocaleDateString("es-AR")}` : "ultima carrera disponible";
  els.archiveRaceName.textContent = session ? `${session.session_name || "Race"} · ${session.circuit_short_name || session.location || "--"}` : "OpenF1";
  els.archiveMetrics.innerHTML = `
    <span>Circuito <strong>${session?.circuit_short_name || session?.location || "--"}</strong></span>
    <span>Vueltas <strong>${laps || "--"}</strong></span>
    <span>Ganador <strong>${winnerDriver?.name_acronym || winner?.driver_number || "--"}</strong></span>
    <span>Fecha <strong>${session?.date_start ? new Date(session.date_start).toLocaleDateString("es-AR") : "--"}</strong></span>
  `;
  els.archiveResultCount.textContent = `${results.length || "--"} pilotos`;

  if (!results.length) {
    els.archiveResultBody.innerHTML = `<tr class="skeleton-row"><td colspan="6">OpenF1 no devolvio resultados para la ultima carrera.</td></tr>`;
    return;
  }

  els.archiveResultBody.innerHTML = results.map((result, index) => {
    const driver = state.drivers.get(String(result.driver_number));
    return `
      <tr>
        <td class="pos-cell">${result.position || index + 1}</td>
        <td>
          <div class="driver-cell">
            <span class="team-chip" style="background:${teamColor(driver)}; color:${teamColor(driver)}"></span>
            <span class="driver-copy">
              <strong>${driver?.name_acronym || result.driver_number}</strong>
              <span>${cleanName(driver)}</span>
            </span>
          </div>
        </td>
        <td>${driver?.team_name || "--"}</td>
        <td class="mono">${result.number_of_laps || "--"}</td>
        <td class="mono">${formatGap(result.gap_to_leader, "WIN")}</td>
        <td><span class="mode-badge">${resultMode(result)}</span></td>
      </tr>
    `;
  }).join("");
}

function renderArchiveFallback() {
  const race = FALLBACK_PREVIOUS_RACE;
  els.archiveState.textContent = "archivo";
  els.archiveState.classList.remove("is-error");
  els.archiveSync.textContent = `${race.source} · respaldo local`;
  els.archiveRaceName.textContent = race.name;
  els.archiveMetrics.innerHTML = `
    <span>Circuito <strong>${race.circuit}</strong></span>
    <span>Vueltas <strong>${race.laps}</strong></span>
    <span>Ganador <strong>${race.results[0].code}</strong></span>
    <span>Fecha <strong>${formatDateOnly(race.date)}</strong></span>
  `;
  els.archiveResultCount.textContent = `${race.results.length} pilotos`;
  els.archiveResultBody.innerHTML = race.results.map((result) => `
    <tr class="${result.code === "COL" ? "highlight-row" : ""}">
      <td class="pos-cell">${result.position}</td>
      <td>
        <div class="driver-cell">
          <span class="team-chip"></span>
          <span class="driver-copy">
            <strong>${result.code}</strong>
            <span>${result.driver}</span>
          </span>
        </div>
      </td>
      <td>${result.team}</td>
      <td class="mono">${result.laps}</td>
      <td class="mono">${result.gap}</td>
      <td><span class="mode-badge">${result.status}</span></td>
    </tr>
  `).join("");
}

function drawTrack(locations) {
  const canvas = els.trackCanvas;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.round(rect.width * dpr));
  canvas.height = Math.max(220, Math.round(rect.height * dpr));
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#070907";
  ctx.fillRect(0, 0, width, height);
  drawCanvasGrid(ctx, width, height);

  const valid = (locations || []).filter((p) => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)));
  const latest = [...latestBy(valid, "driver_number", "date").values()];

  if (valid.length < 4 || latest.length < 2) {
    drawFallbackTrack(ctx, width, height);
    els.trackNote.textContent = "standby";
    return;
  }

  els.trackNote.textContent = `${latest.length} autos`;
  const xs = valid.map((p) => Number(p.x));
  const ys = valid.map((p) => Number(p.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 34;
  const scaleX = (width - pad * 2) / Math.max(1, maxX - minX);
  const scaleY = (height - pad * 2) / Math.max(1, maxY - minY);
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const project = (p) => ({
    x: offsetX + (Number(p.x) - minX) * scale,
    y: offsetY + (Number(p.y) - minY) * scale,
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(245, 238, 223, 0.18)";
  ctx.beginPath();
  valid.slice(-220).forEach((point, index) => {
    const p = project(point);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  for (const point of latest) {
    const driver = state.drivers.get(String(point.driver_number));
    const p = project(point);
    const color = teamColor(driver);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#070706";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f5eedf";
    ctx.font = "700 11px Consolas, monospace";
    ctx.fillText(driver?.name_acronym || point.driver_number, p.x + 9, p.y + 4);
  }
}

function drawCanvasGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(245, 238, 223, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawFallbackTrack(ctx, width, height) {
  ctx.strokeStyle = "rgba(184, 244, 94, 0.62)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, Math.max(70, width * 0.32), Math.max(48, height * 0.28), -0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(57, 215, 255, 0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, Math.max(54, width * 0.24), Math.max(34, height * 0.18), -0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(245, 238, 223, 0.76)";
  ctx.font = "800 13px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText("sin coordenadas live", width / 2, height / 2 + 5);
  ctx.textAlign = "start";
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(value) {
  if (!value) return "--";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return "--";
  return `${day}/${month}/${year}`;
}

function showPanel(name) {
  document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === name));
  document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item.dataset.tab === name));
}

function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      showPanel(target);
    });
  });
}

function setupSettings() {
  els.settingsBtn.addEventListener("click", () => {
    const hidden = els.settingsPanel.hasAttribute("hidden");
    els.settingsPanel.toggleAttribute("hidden", !hidden);
    els.settingsBtn.setAttribute("aria-expanded", String(hidden));
  });
  els.saveTokenBtn.addEventListener("click", () => {
    state.token = els.tokenInput.value.trim();
    if (state.token) localStorage.setItem("openf1_token", state.token);
    else localStorage.removeItem("openf1_token");
    loadData();
  });
  els.clearTokenBtn.addEventListener("click", () => {
    state.token = "";
    els.tokenInput.value = "";
    localStorage.removeItem("openf1_token");
    loadData();
  });
  els.refreshBtn.addEventListener("click", loadData);
}

function newsPages(news) {
  return Array.isArray(news.pages) ? news.pages : [];
}

function allNewsItems(news) {
  return newsPages(news).flatMap((page) => Array.isArray(page.items) ? page.items : []);
}

function latestNewsItems(news) {
  const pages = newsPages(news);
  const page = pages.find((entry) => Number(entry.page) === 1) || pages[0];
  return Array.isArray(page?.items) ? page.items : [];
}

function sourceText(item) {
  return item.sourceLabel || item.source || "Fuente";
}

function newsUrl(item) {
  return `#noticia/${encodeURIComponent(item.id || stableNewsKey(item))}`;
}

function stableNewsKey(item) {
  return String(item.url || item.title || "noticia").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function excerpt(value = "", maxLength = 142) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

function newsThumb(item) {
  const source = item.source || "F1";
  const href = escapeHtml(newsUrl(item));
  if (!item.image) {
    return `<a class="news-thumb" href="${href}" aria-label="${escapeHtml(item.title || "Noticia")}"><span class="news-thumb-fallback">${source.slice(0, 10)}</span></a>`;
  }
  return `
    <a class="news-thumb" href="${href}" aria-label="${escapeHtml(item.title || "Noticia")}">
      <img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    </a>
  `;
}

function newsCard(item, index) {
  const summaryLength = index === 0 ? 168 : 112;
  const href = escapeHtml(newsUrl(item));
  return `
    <article class="news-card ${index === 0 ? "priority" : ""}">
      <div class="news-card-body">
        <span class="news-tag">${escapeHtml(item.tag || item.category || "Noticia")}</span>
        <h3><a href="${href}">${escapeHtml(item.title)}</a></h3>
        <a class="news-summary-link" href="${href}">${escapeHtml(excerpt(item.summary || "", summaryLength))}</a>
        <span class="news-source">Fuente: ${escapeHtml(sourceText(item))}</span>
      </div>
      ${newsThumb(item)}
    </article>
  `;
}

function miniNews(item) {
  const href = escapeHtml(newsUrl(item));
  return `
    <article>
      <a class="mini-thumb" href="${href}" aria-label="${escapeHtml(item.title || "Noticia")}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span>${escapeHtml((item.source || "F1").slice(0, 6))}</span>`}
      </a>
      <div>
        <strong><a href="${href}">${escapeHtml(item.title)}</a></strong>
        <a class="news-summary-link" href="${href}">${escapeHtml(excerpt(item.summary || "", 118))}</a>
        <em class="news-source">Fuente: ${escapeHtml(sourceText(item))}</em>
      </div>
    </article>
  `;
}

function supportItem(item) {
  return `
    <article>
      <a href="${escapeHtml(newsUrl(item))}">
        <strong>${escapeHtml(item.series || item.tag || sourceText(item))} · ${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(excerpt(item.summary || "", 190))}</span>
        <em>${escapeHtml(sourceText(item))}</em>
      </a>
    </article>
  `;
}

function formatNewsTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function newsTimestampDiffers(a, b) {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return false;
  return Math.abs(first - second) > 60000;
}

function renderNewsHistory(target, news, activePage, scope) {
  if (!target) return;
  const pages = newsPages(news);
  const markup = pages.length <= 1 ? "" : `
    <span>Historico</span>
    ${pages.map((page) => `<button class="${Number(page.page) === activePage ? "is-active" : ""}" type="button" data-news-page="${page.page}" data-news-scope="${scope}">${page.page}</button>`).join("")}
  `;
  target.innerHTML = markup;
}

function currentArticleId() {
  const match = window.location.hash.match(/^#noticia\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function articleParagraphs(item) {
  const summary = String(item.summary || "").trim();
  const bodyParagraphs = String(item.body || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 60);
  const paragraphs = bodyParagraphs.length
    ? bodyParagraphs
    : (summary ? [summary] : ["No hay un resumen disponible para esta nota."]);
  const text = `${item.title} ${summary}`.toLowerCase();
  if (text.includes("motor") || text.includes("penaliz")) {
    paragraphs.push("Lectura Pitwall: esta noticia cambia la preparación de la sesión porque una penalización de parrilla modifica la prioridad entre ritmo puro, gestión de neumáticos y estrategia de adelantamiento.");
  } else if (item.category === "franco" || item.category === "argentino") {
    paragraphs.push("Lectura Pitwall: seguimiento directo para pilotos argentinos, con foco en rendimiento, contexto deportivo y consecuencias para el fin de semana.");
  } else if (text.includes("clima") || text.includes("pronóstico") || text.includes("weather")) {
    paragraphs.push("Lectura Pitwall: el clima puede alterar ventanas de pista, degradación y timing de clasificación o carrera.");
  } else if (text.includes("mejora") || text.includes("upgrade") || text.includes("actualiz")) {
    paragraphs.push("Lectura Pitwall: las actualizaciones técnicas importan si se traducen en ritmo sostenido, no solo en una vuelta rápida.");
  }
  return paragraphs;
}

function renderArticle(item) {
  if (!item) return false;
  els.articleKicker.textContent = `${item.tag || item.category || "Noticia"} · ${sourceText(item)}`;
  els.articleTitle.textContent = item.title || "Noticia";
  els.articleStandfirst.textContent = excerpt(item.summary || "", 240);
  els.articleHero.innerHTML = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span>${escapeHtml(sourceText(item))}</span>`;
  els.articleBody.innerHTML = articleParagraphs(item).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  els.articleSource.innerHTML = `
    <span>Fuente citada: ${escapeHtml(sourceText(item))}</span>
    <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Abrir fuente original</a>
  `;
  showPanel("article");
  window.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}

function restoreHomeScroll(recheck = true) {
  const feed = els.generalNews?.closest(".feature-news");
  if (!feed) return;
  const top = window.scrollY + feed.getBoundingClientRect().top - 90;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  if (recheck) setTimeout(() => restoreHomeScroll(false), 90);
}

function returnToHome() {
  history.pushState("", document.title, window.location.pathname + window.location.search);
  if (state.news) renderNews(state.news);
  showPanel("home");
  requestAnimationFrame(() => setTimeout(restoreHomeScroll, 0));
}

function handleArticleRoute() {
  const id = currentArticleId();
  if (!id || !state.news) return false;
  const item = allNewsItems(state.news).find((entry) => entry.id === id || stableNewsKey(entry) === id);
  return renderArticle(item);
}

function newsSectionItems(news, pageKey) {
  const pages = newsPages(news);
  const safePage = Math.min(Math.max(1, Number(state[pageKey]) || 1), Math.max(1, pages.length));
  state[pageKey] = safePage;
  if (safePage === 1) return allNewsItems(news);
  const page = pages.find((entry) => Number(entry.page) === safePage) || pages[0];
  return Array.isArray(page?.items) ? page.items : [];
}

function renderNewsBucket(node, items, renderer, emptyText) {
  if (!node) return;
  node.innerHTML = items.length ? items.map(renderer).join("") : `<p class="empty-copy">${emptyText}</p>`;
}

function preferSpanish(items) {
  return [
    ...items.filter((item) => item.language !== "en"),
    ...items.filter((item) => item.language === "en"),
  ];
}

function renderNews(news) {
  state.news = news;
  const allItems = allNewsItems(news);
  const mainItems = newsSectionItems(news, "mainNewsPage");
  const sideItems = newsSectionItems(news, "sideNewsPage");
  const visibleMainCategories = new Set(["argentino", "franco", "general"]);
  const currentGeneral = preferSpanish(mainItems.filter((item) => visibleMainCategories.has(item.category)));
  const currentGeneralIds = new Set(currentGeneral.map((item) => item.id || stableNewsKey(item)));
  const generalBackfill = preferSpanish(allItems.filter((item) => visibleMainCategories.has(item.category) && !currentGeneralIds.has(item.id || stableNewsKey(item))));
  const general = [...currentGeneral, ...generalBackfill].slice(0, GENERAL_NEWS_VISIBLE);
  const franco = preferSpanish(sideItems.filter((item) => item.category === "argentino" || item.category === "franco")).slice(0, SIDE_NEWS_VISIBLE);
  const support = mainItems.filter((item) => item.category === "support").slice(0, 3);

  if (els.newsMeta) {
    const pages = newsPages(news).length || 1;
    const checkedAt = news.checkedAt || news.updatedAt;
    const updatedText = newsTimestampDiffers(checkedAt, news.updatedAt)
      ? ` · ultima novedad ${formatNewsTimestamp(news.updatedAt)}`
      : "";
    els.newsMeta.textContent = `Revisado ${formatNewsTimestamp(checkedAt)}${updatedText} · pagina ${state.mainNewsPage}/${pages} · ${allItems.length} notas en historico`;
  }
  renderNewsBucket(els.generalNews, general, newsCard, "Sin notas F1 en esta pagina.");
  renderNewsBucket(els.francoNews, franco, miniNews, "Sin notas de argentinos en esta pagina.");
  renderNewsBucket(els.supportNews, support, supportItem, "Sin novedades de F2, F3 o F1 Academy en esta pagina.");
  renderNewsHistory(els.newsHistory, news, state.mainNewsPage, "main");
  renderNewsHistory(els.francoHistory, news, state.sideNewsPage, "side");
  handleArticleRoute();
}

function setupNewsHistory() {
  for (const history of [els.newsHistory, els.francoHistory].filter(Boolean)) {
    history.addEventListener("click", (event) => {
      const button = event.target.closest("[data-news-page]");
      if (!button || !state.news) return;
      const pageKey = button.dataset.newsScope === "side" ? "sideNewsPage" : "mainNewsPage";
      state[pageKey] = Number(button.dataset.newsPage) || 1;
      renderNews(state.news);
    });
  }
  els.articleBackBtn?.addEventListener("click", () => {
    returnToHome();
  });
  window.addEventListener("hashchange", () => {
    if (!handleArticleRoute() && !currentArticleId()) {
      if (state.news) renderNews(state.news);
      showPanel("home");
      requestAnimationFrame(() => setTimeout(restoreHomeScroll, 0));
    }
  });
}

async function loadNews() {
  renderNews(FALLBACK_NEWS);
  try {
    const response = await fetch("./data/news.json", { cache: "no-store" });
    if (!response.ok) return;
    renderNews(await response.json());
  } catch {
    renderNews(FALLBACK_NEWS);
  }
}

function setupRacerBackground() {
  const video = els.racerVideo;
  const canvas = els.racerCanvas;
  const stage = els.racerStage;
  if (!video || !canvas || !stage) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d", { willReadFrequently: true });
  let target = { eyeX: 0, eyeY: 0 };
  let current = { eyeX: 0, eyeY: 0 };
  let raf = 0;

  const sizeCanvas = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(240, Math.round(rect.width * dpr));
    const height = Math.max(320, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      buffer.width = width;
      buffer.height = height;
    }
  };

  const drawFrame = () => {
    sizeCanvas();
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (video.readyState >= 2) {
      bufferCtx.clearRect(0, 0, width, height);
      const videoRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 1;
      const canvasRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      let dx = 0;
      let dy = 0;

      if (videoRatio > canvasRatio) {
        drawWidth = width;
        drawHeight = width / videoRatio;
        dy = (height - drawHeight) / 2;
      } else {
        drawHeight = height;
        drawWidth = height * videoRatio;
        dx = (width - drawWidth) / 2;
      }

      bufferCtx.drawImage(video, dx, dy, drawWidth, drawHeight);
      const frame = bufferCtx.getImageData(0, 0, width, height);
      const data = frame.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const greenBias = g - Math.max(r, b);
        if (g > 78 && greenBias > 28 && g > r * 1.18 && g > b * 1.12) {
          const softAlpha = Math.max(0, Math.min(255, (48 - greenBias) * 5));
          data[i + 3] = softAlpha;
          data[i] = Math.min(255, r * 1.08);
          data[i + 1] = Math.max(0, g * 0.34);
          data[i + 2] = Math.min(255, b * 1.08);
        } else if (g > 95 && greenBias > 16) {
          data[i + 1] = Math.max(0, g * 0.58);
        }
      }
      ctx.putImageData(frame, 0, 0);
    }

    current.eyeX += (target.eyeX - current.eyeX) * 0.18;
    current.eyeY += (target.eyeY - current.eyeY) * 0.18;
    stage.style.setProperty("--eye-x", `${current.eyeX.toFixed(2)}px`);
    stage.style.setProperty("--eye-y", `${current.eyeY.toFixed(2)}px`);
    raf = window.requestAnimationFrame(drawFrame);
  };

  const updateTarget = (event) => {
    const rect = els.homePanel.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.34;
    const nx = Math.max(-1, Math.min(1, (event.clientX - centerX) / Math.max(1, rect.width * 0.5)));
    const ny = Math.max(-1, Math.min(1, (event.clientY - centerY) / Math.max(1, rect.height * 0.35)));
    target = {
      eyeX: nx * 4.4,
      eyeY: ny * 2.2,
    };
  };

  document.addEventListener("pointermove", updateTarget, { passive: true });
  video.addEventListener("loadedmetadata", sizeCanvas);
  video.play().catch(() => {
    stage.style.opacity = "0.38";
  });
  drawFrame();

  window.addEventListener("resize", sizeCanvas);
  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(raf));
}

function start() {
  setupTabs();
  setupSettings();
  setupNewsHistory();
  setupRacerBackground();
  loadNews();
  renderStandings();
  drawTrack([]);
  loadData({ force: true });
  window.addEventListener("resize", () => drawTrack(state.latestLocations));
}

start();
