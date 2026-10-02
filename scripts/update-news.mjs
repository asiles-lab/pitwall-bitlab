import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const newsPath = resolve(root, "data/news.json");

const PAGE_SIZE = 18;
const MAX_ITEMS = 90;
const BACKLOG_LIMIT = 180;
const RELEASE_LIMIT = Number(process.env.NEWS_RELEASE_LIMIT) || 2;
const MIN_RELEASE_SCORE = 32;
const CHECK_INTERVAL_MS = 50 * 60 * 1000;

const SOURCES = [
  {
    source: "TyC Sports",
    url: "https://www.tycsports.com/automovilismo.html",
    type: "page",
    language: "es",
  },
  {
    source: "TyC Sports",
    url: "https://www.tycsports.com/automovilismo/formula-1.html",
    type: "page",
    language: "es",
  },
];

const SUPPORT_SOURCES = [
  {
    source: "Formula 2",
    url: "https://www.fiaformula2.com/en/latest/all.xml",
    type: "rss",
    language: "en",
    series: "F2",
  },
  {
    source: "Formula 3",
    url: "https://www.fiaformula3.com/en/latest/all.xml",
    type: "rss",
    language: "en",
    series: "F3",
  },
  {
    source: "F1 Academy",
    url: "https://www.f1academy.com/Latest?filters=News",
    type: "academy",
    language: "en",
    series: "F1 Academy",
  },
];

const FRANCO_TERMS = ["colapinto", "franco", "alpine"];
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
  const named = {
    aacute: "á",
    eacute: "é",
    iacute: "í",
    oacute: "ó",
    uacute: "ú",
    Aacute: "Á",
    Eacute: "É",
    Iacute: "Í",
    Oacute: "Ó",
    Uacute: "Ú",
    ntilde: "ñ",
    Ntilde: "Ñ",
    uuml: "ü",
    Uuml: "Ü",
    deg: "°",
    ldquo: "“",
    rdquo: "”",
    lsquo: "‘",
    rsquo: "’",
    hellip: "...",
    iquest: "¿",
    nbsp: " ",
  };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => named[name] || match)
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metaContent(html, key) {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return "";
}

function firstJsonLdValue(html, key) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(decodeEntities(match[1]).trim());
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        if (entry && typeof entry === "object" && typeof entry[key] === "string") return entry[key];
        if (Array.isArray(entry?.["@graph"])) {
          const found = entry["@graph"].find((item) => typeof item?.[key] === "string");
          if (found) return found[key];
        }
      }
    } catch {
      // Ignore malformed embedded metadata.
    }
  }
  return "";
}

function extractParagraphs(html) {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const scoped = articleMatch ? articleMatch[0] : html;
  const paragraphs = [...scoped.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((paragraph) => paragraph.length > 70)
    .filter((paragraph) => !/también te puede interesar|seguí leyendo|newsletter|suscrib/i.test(paragraph));
  return [...new Set(paragraphs)].slice(0, 5);
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
  if (GENERAL_TERMS.some((term) => text.includes(term))) return "general";
  return "general";
}

function tagFor(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (item.category === "franco") return "Franco";
  if (item.category === "support") return item.series || "Soporte";
  if (text.includes("qualifying") || text.includes("clasificacion")) return "Clasificacion";
  if (text.includes("weather") || text.includes("clima") || text.includes("rain") || text.includes("lluvia") || text.includes("forecast") || text.includes("pronostico")) return "Clima";
  if (text.includes("preview") || text.includes("previa") || text.includes("esperan")) return "Previa";
  if (text.includes("strategy") || text.includes("estrategia") || text.includes("tyre") || text.includes("neumatico")) return "Estrategia";
  if (text.includes("race") || text.includes("carrera")) return "Carrera";
  if (text.includes("fia") || text.includes("rules") || text.includes("reglas")) return "Reglamento";
  if (text.includes("market") || text.includes("contract") || text.includes("contrato")) return "Mercado";
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
    const summary = stripTags(tagValue(entry, "description")).slice(0, 520);
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

function extractLinks(html, sourceUrl) {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      url: new URL(match[1], sourceUrl).href,
      text: stripTags(match[2]),
    }))
    .filter((link) => /\.html(?:$|\?)/i.test(link.url))
    .filter((link) => new URL(link.url).pathname.startsWith("/automovilismo/"))
    .filter((link) => /-id\d+\.html(?:$|\?)/i.test(new URL(link.url).pathname))
    .filter((link) => /f1|formula-?1|fórmula 1|formula 1|colapinto|alpine|briatore|gasly|grand prix|gp de/i.test(`${link.url} ${link.text}`));
  return mergeById(links.map((link) => ({ id: stableId(link.url), ...link }))).slice(0, 18);
}

async function fetchArticle(link, source) {
  const response = await fetch(link.url, {
    headers: {
      "user-agent": "Pitwall Bitlab local news updater",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`${source.source} article ${response.status}`);
  const html = await response.text();
  const rawTitle = metaContent(html, "og:title") || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || link.text;
  const title = stripTags(rawTitle).replace(/\s+-\s+TyC Sports$/i, "").trim();
  const summary = stripTags(metaContent(html, "og:description") || metaContent(html, "description")).slice(0, 520);
  const body = [
    ...extractParagraphs(html),
    stripTags(firstJsonLdValue(html, "articleBody")),
  ].filter(Boolean).join("\n\n").slice(0, 1800);
  const image = metaContent(html, "og:image") || firstImage(html);
  const published = metaContent(html, "article:published_time")
    || metaContent(html, "article:modified_time")
    || html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]
    || html.match(/"dateModified"\s*:\s*"([^"]+)"/i)?.[1]
    || new Date().toISOString();
  const item = {
    id: stableId(link.url),
    title,
    summary,
    source: source.source,
    sourceLabel: source.source,
    url: link.url,
    image,
    body,
    language: source.language,
    publishedAt: new Date(published).toISOString(),
    addedAt: new Date().toISOString(),
  };
  item.category = classify(item);
  item.tag = tagFor(item);
  return item;
}

async function fetchPageSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "Pitwall Bitlab local news updater",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`${source.source} ${response.status}`);
  const html = await response.text();
  const links = extractLinks(html, source.url);
  const settled = await Promise.allSettled(links.map((link) => fetchArticle(link, source)));
  return settled
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((item) => item.title && item.url);
}

function fetchSource(source) {
  if (source.type === "rss") return fetchSupportFeed(source);
  if (source.type === "academy") return fetchAcademySource(source);
  return source.type === "page" ? fetchPageSource(source) : fetchFeed(source);
}

function isFormulaItem(item) {
  if (item.category === "support") return true;
  if (item.category === "curiosity") return false;
  if (item.source !== "TyC Sports") return false;
  try {
    const path = new URL(item.url).pathname;
    if (!path.startsWith("/automovilismo/") || !/-id\d+\.html$/i.test(path)) return false;
  } catch {
    return false;
  }
  return /f1|formula-?1|fórmula 1|formula 1|colapinto|alpine|briatore|gasly|grand prix|gp de|malasia/i.test(`${item.url} ${item.title} ${item.summary}`);
}

function orderNews(items) {
  return [...items].sort((a, b) => {
    const supportDelta = Number(a.category === "support") - Number(b.category === "support");
    if (supportDelta) return supportDelta;
    const sourceDelta = Number(b.source === "TyC Sports") - Number(a.source === "TyC Sports");
    if (sourceDelta) return sourceDelta;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
}

async function fetchSupportFeed(source) {
  const items = await fetchFeed(source);
  return items.slice(0, 8).map((item) => ({
    ...item,
    category: "support",
    tag: source.series,
    series: source.series,
    source: source.source,
    sourceLabel: source.source,
  }));
}

async function fetchAcademySource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "Pitwall Bitlab local news updater",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`${source.source} ${response.status}`);
  const html = await response.text();
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      url: new URL(match[1], source.url).href,
      text: stripTags(match[2]),
    }))
    .filter((link) => {
      const path = new URL(link.url).pathname;
      return /\/Latest\/[^/?#]+\/[^/?#]+/i.test(path) && !/\/Latest\/Tag\//i.test(path);
    })
    .slice(0, 8);
  return links
    .map((link, index) => {
      const title = link.text.replace(/^News\s+/i, "").trim();
      return {
        id: stableId(link.url),
        title,
        summary: title,
        source: source.source,
        sourceLabel: source.source,
        url: link.url,
        image: "",
        language: source.language,
        publishedAt: new Date(Date.now() - index * 60000).toISOString(),
        addedAt: new Date().toISOString(),
      };
    })
    .map((item) => ({
      ...item,
      category: "support",
      tag: source.series,
      series: source.series,
      source: source.source,
      sourceLabel: source.source,
    }));
}

function score(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let value = 0;
  if (item.category === "general") value += 10;
  if (item.category === "franco") value += 16;
  if (item.source === "TyC Sports") value += 18;
  if (item.language === "es") value += 8;
  if (item.image) value += 4;
  if (RACE_PREVIEW_TERMS.some((term) => text.includes(term))) value += 12;
  if (text.includes("colapinto")) value += 20;
  if (text.includes("motor") || text.includes("engine") || text.includes("penaliz") || text.includes("grid penalty")) value += 14;
  if (text.includes("formula 1") || text.includes("f1")) value += 3;
  const published = new Date(item.publishedAt).getTime();
  if (!Number.isNaN(published)) {
    const ageHours = (Date.now() - published) / 3600000;
    if (ageHours <= 3) value += 25;
    else if (ageHours <= 12) value += 18;
    else if (ageHours <= 24) value += 12;
    else if (ageHours <= 72) value += 4;
    else if (ageHours > 720) value -= 50;
    else if (ageHours > 168) value -= 20;
  }
  return value;
}

function rebalance(items) {
  const sorted = [...items].sort((a, b) => score(b) - score(a) || new Date(b.publishedAt) - new Date(a.publishedAt));
  const general = sorted.filter((item) => item.category === "general").slice(0, 9);
  const franco = sorted.filter((item) => item.category === "franco").slice(0, 5);
  const selected = [...general, ...franco];
  const selectedIds = new Set(selected.map((item) => item.id));
  return [
    ...selected,
    ...sorted.filter((item) => !selectedIds.has(item.id)),
  ];
}

function sortNews(items) {
  return [...items].sort((a, b) => score(b) - score(a) || new Date(b.publishedAt) - new Date(a.publishedAt));
}

function mergeById(items) {
  const byId = new Map();
  for (const item of items) {
    if (!item?.id || byId.has(item.id)) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function pickRelease(queue) {
  const sorted = sortNews(queue);
  const relevant = sorted
    .filter((item) => score(item) >= MIN_RELEASE_SCORE)
    .slice(0, RELEASE_LIMIT);
  const release = relevant.length ? relevant : sorted.slice(0, 1);
  const used = new Set(release.map((item) => item.id));
  return {
    release: sortNews(release),
    remaining: queue.filter((item) => !used.has(item.id)),
  };
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
  const now = new Date();
  const lastChecked = new Date(existing.checkedAt || existing.updatedAt || 0).getTime();
  if (process.env.FORCE_NEWS_UPDATE !== "1" && Number.isFinite(lastChecked) && now.getTime() - lastChecked < CHECK_INTERVAL_MS) {
    console.log(`Revision omitida: la ultima fue ${existing.checkedAt || existing.updatedAt}.`);
    return;
  }

  const allSources = [...SOURCES, ...SUPPORT_SOURCES];
  const sourceResults = await Promise.allSettled(allSources.map(fetchSource));
  sourceResults.forEach((result, index) => {
    if (result.status === "rejected") console.warn(`Fuente omitida: ${allSources[index].source} - ${result.reason?.message || result.reason}`);
  });
  const fetched = sourceResults
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter(isFormulaItem);
  const fetchedById = new Map(fetched.map((item) => [item.id, item]));
  const previousItems = (existing.pages || []).flatMap((page) => page.items || [])
    .filter(isFormulaItem)
    .map((item) => {
      const fresh = fetchedById.get(item.id);
      return fresh ? { ...fresh, addedAt: item.addedAt || fresh.addedAt } : item;
    });
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const publishedIds = new Set(previousById.keys());

  const normalizedFetched = fetched.map((item) => {
    const previous = previousById.get(item.id);
    return previous ? { ...item, addedAt: previous.addedAt } : item;
  });
  const supportItems = SUPPORT_SOURCES.flatMap((source) => (
    sortNews(normalizedFetched.filter((item) => item.category === "support" && item.series === source.series)).slice(0, 3)
  ));
  const incomingQueue = normalizedFetched.filter((item) => item.category !== "support" && !publishedIds.has(item.id));
  const currentSources = new Set(allSources.map((source) => source.source));
  const existingQueue = Array.isArray(existing.backlog) ? existing.backlog.filter((item) => !publishedIds.has(item.id) && currentSources.has(item.source)) : [];
  const queue = sortNews(mergeById([...existingQueue, ...incomingQueue]));
  const { release, remaining } = pickRelease(queue);

  const backlog = sortNews(remaining).slice(0, BACKLOG_LIMIT);
  const nowIso = now.toISOString();
  const previousCoreItems = previousItems.filter((item) => item.category !== "support");
  const items = orderNews(release.length
    ? mergeById([...release, ...supportItems, ...previousCoreItems])
    : mergeById([...supportItems, ...previousCoreItems])).slice(0, MAX_ITEMS);
  const payload = {
    updatedAt: release.length || !previousItems.length ? nowIso : (existing.updatedAt || nowIso),
    checkedAt: nowIso,
    pageSize: PAGE_SIZE,
    sources: allSources.map(({ source, url }) => ({ source, url })),
    releasePolicy: {
      maxPerRun: RELEASE_LIMIT,
      minScore: MIN_RELEASE_SCORE,
      cadence: "hourly",
      fallbackPerRun: 1,
    },
    backlog,
    pages: paginate(items),
  };
  await writeFile(newsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  if (!release.length) {
    console.log(`Revisado sin novedades relevantes para publicar; en cola: ${backlog.length}; guardadas: ${items.length}.`);
    return;
  }
  console.log(`Noticias publicadas: ${release.length}; en cola: ${backlog.length}; guardadas: ${items.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
