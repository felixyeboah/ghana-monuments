/**
 * Turns Ghana's national boundary into a single projected SVG path.
 *
 * The records need a map that works with no network at all — the Artifact runs
 * under a CSP that blocks tile servers, so Leaflet or an embedded slippy map
 * would render blank there. A drawn outline ships inside the page, costs one
 * path, and suits the line-art direction better than tiles would.
 *
 * Source: geoBoundaries ADM0 (open data, CC BY 4.0).
 * Run: node scripts/build-ghana-map.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const SRC = "/tmp/gha_adm0.json";
const OUT = "src/data/ghana-map.json";

/** Width of the emitted viewBox; height follows from Ghana's real proportions. */
const WIDTH = 1000;
const PADDING = 12;
/** Douglas–Peucker tolerance in degrees. Tuned to keep the coast and the
 *  Volta basin readable while dropping the path under ~10 KB. */
const TOLERANCE = 0.008;

const geo = JSON.parse(await readFile(SRC, "utf8"));
const geometry = geo.features[0].geometry;
const polygons =
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

/** Perpendicular distance from p to the segment ab. */
function distance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;

  let index = 0;
  let furthest = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distance(points[i], points[0], points[points.length - 1]);
    if (d > furthest) {
      furthest = d;
      index = i;
    }
  }

  if (furthest <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

// Bounds across every ring, so the projection frames the whole country.
let minLon = Infinity;
let maxLon = -Infinity;
let minLat = Infinity;
let maxLat = -Infinity;
for (const polygon of polygons) {
  for (const ring of polygon) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
}

// Equirectangular, corrected so a degree of longitude is narrower than one of
// latitude at Ghana's latitude. Without this the country looks squat.
const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
const lonScale = Math.cos(midLat);

const spanX = (maxLon - minLon) * lonScale;
const spanY = maxLat - minLat;
const inner = WIDTH - PADDING * 2;
const scale = inner / spanX;
const HEIGHT = Math.round(spanY * scale + PADDING * 2);

const project = ([lon, lat]) => [
  +(PADDING + (lon - minLon) * lonScale * scale).toFixed(1),
  // SVG y grows downward; latitude grows upward.
  +(PADDING + (maxLat - lat) * scale).toFixed(1),
];

const paths = [];
for (const polygon of polygons) {
  for (const ring of polygon) {
    const simplified = simplify(ring, TOLERANCE).map(project);
    if (simplified.length < 3) continue;
    paths.push(
      `M${simplified.map(([x, y]) => `${x} ${y}`).join("L")}Z`
    );
  }
}

const map = {
  viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
  path: paths.join(""),
  /** Lets consumers place a monument's coordinates on the same projection. */
  projection: { minLon, maxLat, lonScale, scale, padding: PADDING },
};

await writeFile(OUT, `${JSON.stringify(map)}\n`, "utf8");

const original = polygons.flat().reduce((n, ring) => n + ring.length, 0);
console.log(
  `${original} → ${map.path.split("L").length} points, ${(
    map.path.length / 1024
  ).toFixed(1)} KB path`
);
console.log(`viewBox ${map.viewBox}  →  ${OUT}`);
