import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const newsPath = resolve(root, "data/news.json");

const PAGE_SIZE = 18;
const MAX_ITEMS = 90;

const FEEDS = [
  {
    source: "Motorsport.com Espanol",
    url: "https://espanol.motorsport.com/rss/f1/news/",
    language: "es",
  },
  {
    source: "Motorsport.com",
    url: "https://www.motorsport.com/rss/f1/news/",
    language: "en",
  },
];

const FRANCO_TERMS = ["colapinto", "franco", "alpine"];
const CURIOSITY_TERMS = ["stat", "record", "history", "curious", "dato", "curioso", "historia", "ranking"];
const GENERAL_TERMS = ["f1", "formula 1", "grand prix", "gp", "fia", "qualifying", "race"];
const RACE_PREVIEW_TERMS = [
  "race",
  "carrera",
  "grand prix",
  "gran premio",
  "practice",
  "practica",
  "clasificacion",
  "qualifying",
  "preview",
  "previa",
  "weather",
  "clima",
  "rain",
  "lluvia",
  "forecast",
  "pronostico",
  "strategy",
  "estrategia",
  "tyre",
  "neumatico",
  "parrilla",
  "grid",
  "penalty",
  "penaliza",
];

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function attrValue(xml, attr) {
  const match = xml.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function firstImage(xml) {
  const media = xml.match(/<media:(?:content|thumbnail)[^>]+>/i)?.[0] || "";
  const enclosure = xml.match(/<enclosure[^>]+>/i)?.[0] || "";
  const fromMedia = attrValue(media, "url");
  const fromEnclosure = /image\//i.test(enclosure) ? attrValue(enclosure, "url") : "";
  const html = tagValue(xml, "description") || tagValue(xml, "content:encoded");
  const fromHtml = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
  return fromMedia || fromEnclosure || decodeEntities(fromHtml);
}

function classify(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (FRANCO_TERMS.some((term) => text.includes(term))) return "franco";
  if (CURIOSITY_TERMS.some((term) => text.includes(term))) return "curiosity";
  if (GENERAL_TERMS.some((term) => text.includes(term))) return "general";
  return "general";
}

function tagFor(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (item.category === "franco") return "Franco";
  if (text.includes("qualifying") || text.includes("clasificacion")) return "Clasificacion";
  if (text.includes("weather") || text.includes("clima") || text.includes("rain") || text.includes("lluvia") || text.includes("forecast") || text.includes("pronostico")) return "Clima";
  if (text.includes("preview") || text.includes("previa") || text.includes("esperan")) return "Previa";
  if (text.includes("strategy") || text.includes("estrategia") || text.includes("tyre") || text.includes("neumatico")) return "Estrategia";
  if (text.includes("race") || text.includes("carrera")) return "Carrera";
  if (text.includes("fia") || text.includes("rules") || text.includes("reglas")) return "Reglamento";
  if (text.includes("market") || text.includes("contract") || text.includes("contrato")) return "Mercado";
  if (item.category === "curiosity") return "Dato";
  return "F1";
}

function stableId(url) {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "Pitwall Bitlab local news updater",
      accept: "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) throw new Error(`${feed.source} ${response.status}`);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return entries.map((entry) => {
    const title = stripTags(tagValue(entry, "title"));
    const url = stripTags(tagValue(entry, "link"));
    const summary = stripTags(tagValue(entry, "description")).slice(0, 240);
    const publishedAt = new Date(stripTags(tagValue(entry, "pubDate")) || Date.now()).toISOString();
    const item = {
      id: stableId(url || title),
      title,
      summary,
      source: feed.source,
      sourceLabel: feed.source,
      url,
      image: firstImage(entry),
      language: feed.language,
      publishedAt,
      addedAt: new Date().toISOString(),
    };
    item.category = classify(item);
    item.tag = tagFor(item);
    return item;
  }).filter((item) => item.title && item.url);
}

function score(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let value = 0;
  if (item.category === "general") value += 10;
  if (item.category === "franco") value += 16;
  if (item.category === "curiosity") value += 8;
  if (item.language === "es") value += 8;
  if (item.image) value += 4;
  if (RACE_PREVIEW_TERMS.some((term) => text.includes(term))) value += 12;
  if (text.includes("colapinto")) value += 20;
  if (text.includes("formula 1") || text.includes("f1")) value += 3;
  return value;
}

function rebalance(items) {
  const sorted = [...items].sort((a, b) => score(b) - score(a) || new Date(b.publishedAt) - new Date(a.publishedAt));
  const general = sorted.filter((item) => item.category === "general").slice(0, 9);
  const franco = sorted.filter((item) => item.category === "franco").slice(0, 5);
  const curiosity = sorted.filter((item) => item.category === "curiosity").slice(0, 4);
  const selected = [...general, ...franco, ...curiosity];
  const selectedIds = new Set(selected.map((item) => item.id));
  return [
    ...selected,
    ...sorted.filter((item) => !selectedIds.has(item.id)),
  ];
}

function paginate(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    pages.push({
      page: pages.length + 1,
      createdAt: new Date().toISOString(),
      items: items.slice(i, i + PAGE_SIZE),
    });
  }
  return pages;
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(newsPath, "utf8"));
  } catch {
    return { pageSize: PAGE_SIZE, pages: [] };
  }
}

async function main() {
  const existing = await readExisting();
  const previousItems = (existing.pages || []).flatMap((page) => page.items || []);
  const fetched = (await Promise.allSettled(FEEDS.map(fetchFeed)))
    .flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const byId = new Map();
  for (const item of [...fetched, ...previousItems]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const items = rebalance([...byId.values()]).slice(0, MAX_ITEMS);
  const payload = {
    updatedAt: new Date().toISOString(),
    pageSize: PAGE_SIZE,
    sources: FEEDS.map(({ source, url }) => ({ source, url })),
    pages: paginate(items),
  };
  await writeFile(newsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Noticias actualizadas: ${fetched.length} nuevas/recientes, ${items.length} guardadas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
