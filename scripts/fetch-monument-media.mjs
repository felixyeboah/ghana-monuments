/**
 * Pulls encyclopaedic text and contributor photography for each monument from
 * Wikipedia and Wikimedia Commons, and writes it to src/data/monument-media.json.
 *
 * This runs at author time, not request time: the record pages stay static, and
 * we keep a reviewable snapshot of exactly which photographs and licences ship.
 *
 * Run: node scripts/fetch-monument-media.mjs
 */
import { writeFile } from "node:fs/promises";

const UA = "ghana-monuments/0.1 (https://github.com/; educational project)";
const MAX_PHOTOS = 6;

/** slug → [Wikipedia article title, Commons category]. */
const SOURCES = {
  "larabanga-mosque": ["Larabanga Mosque", "Larabanga Mosque"],
  "elmina-castle": ["Elmina Castle", "Elmina Castle"],
  "cape-coast-castle": ["Cape Coast Castle", "Cape Coast Castle"],
  "jamestown-lighthouse": ["Jamestown Lighthouse", "Jamestown Lighthouse"],
  "manhyia-palace": ["Manhyia Palace", "Manhyia Palace"],
  "adomi-bridge": ["Adomi Bridge", "Adomi Bridge"],
  "black-star-gate": ["Black Star Gate", "Black Star Gate"],
  "independence-square": ["Black Star Square", "Black Star Square"],
  "kwame-nkrumah-mausoleum": [
    "Kwame Nkrumah Memorial Park",
    "Kwame Nkrumah Mausoleum",
  ],
  "national-theatre-ghana": [
    "National Theatre of Ghana",
    "National Theatre of Ghana",
  ],
  "national-mosque-of-ghana": ["Ghana National Mosque", "Ghana National Mosque"],
};

/** Diagrams, maps and scans — not photographs of the standing building. */
const REJECT = /\b(map|plan|diagram|coat[_ ]of[_ ]arms|logo|flag|seal|stamp|banner|chart|graph|locator|sketch)\b/i;
const PHOTO_EXT = /\.(jpe?g|png)$/i;

const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

async function json(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function summary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`;
  const data = await json(url);
  if (data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
    throw new Error(`no article: ${title}`);
  }
  return {
    title: data.title,
    extract: data.extract ?? "",
    wikipediaUrl: data.content_urls?.desktop?.page ?? null,
    coordinates: data.coordinates
      ? { lat: data.coordinates.lat, lon: data.coordinates.lon }
      : null,
  };
}

const IMAGE_INFO =
  "prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1400";

/** Files in a Commons category. Empty when the category does not exist. */
function byCategory(category) {
  return `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=categorymembers&gcmtitle=${encodeURIComponent(
    `Category:${category}`
  )}&gcmtype=file&gcmlimit=60&${IMAGE_INFO}`;
}

/** Full-text file search — the fallback when no category matches the name. */
function bySearch(term) {
  return `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
    `${term} filetype:bitmap`
  )}&gsrnamespace=6&gsrlimit=40&${IMAGE_INFO}`;
}

async function photos(category, searchTerm) {
  let pages = null;
  for (const url of [byCategory(category), bySearch(searchTerm)]) {
    try {
      pages = (await json(url)).query?.pages;
    } catch {
      pages = null;
    }
    if (pages && Object.keys(pages).length) break;
  }
  if (!pages) return [];

  const candidates = Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;

      const name = page.title.replace(/^File:/, "");
      if (!PHOTO_EXT.test(name) || REJECT.test(name)) return null;
      // Landscape-ish and large enough to carry a gallery tile.
      if (!info.width || info.width < 800) return null;

      const meta = info.extmetadata ?? {};
      const licence = strip(meta.LicenseShortName?.value);

      return {
        title: strip(meta.ObjectName?.value) || name.replace(PHOTO_EXT, ""),
        src: info.thumburl ?? info.url,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        credit: strip(meta.Artist?.value) || "Wikimedia Commons contributor",
        licence: licence || "See Wikimedia Commons",
        sourceUrl: info.descriptionurl,
        // Modern contributor photography over public-domain engravings.
        rank: /^cc/i.test(licence) ? 0 : 1,
      };
    })
    .filter(Boolean);

  candidates.sort((a, b) => a.rank - b.rank);
  return candidates.slice(0, MAX_PHOTOS).map(({ rank, ...photo }) => photo);
}

const out = {};
for (const [slug, [title, category]] of Object.entries(SOURCES)) {
  try {
    const [meta, gallery] = await Promise.all([
      summary(title),
      photos(category, title),
    ]);
    out[slug] = { ...meta, photos: gallery };
    console.log(
      `${slug.padEnd(26)} ${gallery.length} photos  ${
        meta.coordinates ? "coords" : "no coords"
      }`
    );
  } catch (error) {
    console.warn(`${slug.padEnd(26)} FAILED — ${error.message}`);
    out[slug] = {
      title,
      extract: "",
      wikipediaUrl: null,
      coordinates: null,
      photos: [],
    };
  }
}

await writeFile(
  "src/data/monument-media.json",
  `${JSON.stringify(out, null, 2)}\n`,
  "utf8"
);
console.log("\n→ src/data/monument-media.json");
