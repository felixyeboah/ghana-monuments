/**
 * Builds the self-contained Artifact: one HTML file, no external requests.
 *
 * It reads the same sources the Next app does — the monument content, the
 * traced silhouettes, the Wikipedia text — so the two never drift. The photos
 * and the display face come from build-artifact-assets.py as data URIs, because
 * an Artifact runs under a CSP that blocks every external host.
 *
 * Run: node scripts/build-artifact.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { MONUMENTS } from "../src/data/monuments.ts";
import { MONUMENT_ART } from "../src/lib/monument-art.ts";

const media = JSON.parse(
  await readFile("src/data/monument-media.json", "utf8")
);
const assets = JSON.parse(
  await readFile("src/data/artifact-assets.json", "utf8")
);
const ghana = JSON.parse(await readFile("src/data/ghana-map.json", "utf8"));

/** Projects a coordinate onto the outline path's own coordinate system. */
function projectPoint(lat, lon) {
  const { minLon, maxLat, lonScale, scale, padding } = ghana.projection;
  return {
    x: +(padding + (lon - minLon) * lonScale * scale).toFixed(1),
    y: +(padding + (maxLat - lat) * scale).toFixed(1),
  };
}

/** Teardrop with its tip at the origin, so the point sits on the coordinate. */
const PIN =
  "M0 0 C-7 -16 -22 -26 -22 -40 A22 22 0 1 1 22 -40 C22 -26 7 -16 0 0 Z";

const OUT_DIR = "artifact";
const OUT = `${OUT_DIR}/monuments-of-ghana.html`;

/** Everything the page's script needs, in one payload. */
const payload = MONUMENTS.map((monument) => {
  const extra = media[monument.slug] ?? {};
  const photo = assets.photos[monument.slug] ?? null;

  return {
    slug: monument.slug,
    name: monument.name,
    place: monument.place,
    region: monument.region,
    year: monument.year,
    yearLabel: monument.yearLabel,
    tagline: monument.tagline,
    description: monument.description,
    facts: monument.facts,
    scale: monument.scale,
    aspect: MONUMENT_ART[monument.slug]?.aspect ?? 1,
    viewBox: MONUMENT_ART[monument.slug]?.viewBox ?? "0 0 100 100",
    art: MONUMENT_ART[monument.slug]?.body ?? "",
    extract: extra.extract ?? "",
    wikipediaUrl: extra.wikipediaUrl ?? null,
    coordinates: extra.coordinates ?? null,
    // Precomputed here so the page never has to carry the projection maths.
    mapPoint: extra.coordinates
      ? projectPoint(extra.coordinates.lat, extra.coordinates.lon)
      : null,
    photo,
  };
});

const html = String.raw`<title>Monuments of Ghana</title>

<style>
  @font-face {
    font-family: "Instrument Serif";
    src: url(${assets.font}) format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: block;
  }

  /*
    Ghana editorial. Warm paper, near-black traced silhouettes, Ghana gold as
    the only accent. The dark theme is an evening reading of the same palette —
    the paper becomes the ink and the gold holds on both grounds — rather than
    an inversion.
  */
  :root {
    --paper: #f7f5f0;
    --paper-deep: #efece4;
    --card: #fdfcfa;
    --ink: #14100e;
    --ink-soft: #4a423c;
    --ink-faint: #8c827a;
    --line: rgb(20 16 14 / 0.12);
    --gold: #a6851f;
    --forest: #046a38;
    --grain: rgb(20 16 14 / 0.022);
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #14100e;
      --paper-deep: #1b1613;
      --card: #1c1714;
      --ink: #f2ede3;
      --ink-soft: #c3b8a9;
      --ink-faint: #8a7f71;
      --line: rgb(242 237 227 / 0.14);
      --gold: #d8b451;
      --forest: #4aa87a;
      --grain: rgb(242 237 227 / 0.02);
      color-scheme: dark;
    }
  }

  :root[data-theme="dark"] {
    --paper: #14100e;
    --paper-deep: #1b1613;
    --card: #1c1714;
    --ink: #f2ede3;
    --ink-soft: #c3b8a9;
    --ink-faint: #8a7f71;
    --line: rgb(242 237 227 / 0.14);
    --gold: #d8b451;
    --forest: #4aa87a;
    --grain: rgb(242 237 227 / 0.02);
    color-scheme: dark;
  }

  :root[data-theme="light"] {
    --paper: #f7f5f0;
    --paper-deep: #efece4;
    --card: #fdfcfa;
    --ink: #14100e;
    --ink-soft: #4a423c;
    --ink-faint: #8c827a;
    --line: rgb(20 16 14 / 0.12);
    --gold: #a6851f;
    --forest: #046a38;
    --grain: rgb(20 16 14 / 0.022);
    color-scheme: light;
  }

  @property --focus {
    syntax: "<number>";
    inherits: true;
    initial-value: 0;
  }

  @property --dim {
    syntax: "<number>";
    inherits: false;
    initial-value: 1;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    height: 100dvh;
    overflow: hidden;
    background-color: var(--paper);
    background-image: radial-gradient(circle at 1px 1px, var(--grain) 1px, transparent 0);
    background-size: 4px 4px;
    color: var(--ink);
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::selection { background: var(--gold); color: var(--paper); }

  :focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }

  .serif { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; }

  .eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  /* ---------- skyline ---------- */

  .stage { display: flex; flex-direction: column; height: 100dvh; }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 1.25rem 1.25rem 0;
    flex-shrink: 0;
  }
  @media (min-width: 640px) { .topbar { padding: 1.75rem 2rem 0; } }
  .topbar .meta { color: var(--ink-faint); }
  @media (max-width: 639px) { .topbar .meta { display: none; } }

  .intro { flex-shrink: 0; padding: 1.25rem 1.25rem 0.75rem; text-align: center; }
  @media (min-width: 640px) { .intro { padding: 1.75rem 1.25rem 1rem; } }

  .intro h1 {
    margin: 0 auto;
    max-width: 22ch;
    font-size: clamp(2rem, 5.5vw, 3.5rem);
    line-height: 1.05;
    text-wrap: balance;
  }

  .intro p {
    margin: 0.75rem auto 0;
    max-width: 42ch;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--ink-soft);
    text-wrap: balance;
  }

  .search { position: relative; margin: 1.25rem auto 0; width: min(100%, 24rem); }

  .search input {
    width: 100%;
    height: 2.75rem;
    padding: 0 2.5rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in oklab, var(--card) 70%, transparent);
    color: var(--ink);
    font: inherit;
    font-size: 0.875rem;
    text-align: center;
  }
  .search input::placeholder { color: var(--ink-faint); }
  .search input:focus-visible { border-color: var(--gold); outline-offset: 2px; }

  .search button {
    position: absolute;
    right: 0.9rem;
    top: 50%;
    translate: 0 -50%;
    border: 0;
    background: none;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem;
    line-height: 1;
  }
  .search button:hover { color: var(--ink); }
  .search button[hidden] { display: none; }

  .skyline { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }

  .viewport { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; }

  .track {
    position: relative;
    display: flex;
    align-items: flex-end;
    height: 100%;
    margin: 0;
    padding: 0 50%;
    list-style: none;
    gap: clamp(3rem, 7vw, 8rem);
    will-change: transform;
    /* Sinks the row into the ground gradient. */
    top: clamp(6px, 1.6vh, 16px);
  }

  .monument {
    --focus: 0;
    --dim: 1;
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    color: color-mix(in oklab, var(--ink) calc(var(--focus) * 100%), var(--ink-faint));
    opacity: calc((0.22 + 0.78 * var(--focus)) * var(--dim));
    transition: --dim 700ms var(--ease);
  }

  .monument .year {
    position: absolute;
    bottom: 18%;
    left: 50%;
    translate: -50% 0;
    font-size: clamp(5rem, 14vw, 13rem);
    line-height: 1;
    color: var(--ink);
    opacity: calc(var(--focus) * 0.06);
    pointer-events: none;
  }

  .monument .pin {
    position: absolute;
    bottom: calc(100% + 0.75rem);
    left: 50%;
    translate: -50% 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid color-mix(in oklab, var(--gold) 50%, transparent);
    border-radius: 999px;
    background: color-mix(in oklab, var(--paper) 85%, transparent);
    color: var(--ink);
    white-space: nowrap;
    opacity: 0;
    transition: opacity 300ms var(--ease), translate 300ms var(--ease);
    pointer-events: none;
  }
  .monument[data-active] .pin { opacity: 1; }
  .monument .pin::before {
    content: "";
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 999px;
    background: var(--gold);
  }

  .monument button {
    position: relative;
    display: block;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    top: calc((1 - var(--focus)) * 0.5rem);
    transition: top 500ms var(--ease);
  }
  .monument button:hover { top: calc((1 - var(--focus)) * 0.5rem - 0.375rem); }

  .monument svg { display: block; width: 100%; height: 100%; }

  .ground {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    height: 15%;
    pointer-events: none;
    background: linear-gradient(
      to top,
      var(--paper) 0%,
      var(--paper) 16%,
      color-mix(in oklab, var(--paper) 72%, transparent) 42%,
      color-mix(in oklab, var(--paper) 26%, transparent) 70%,
      transparent 100%
    );
  }

  .caption {
    position: relative;
    flex-shrink: 0;
    min-height: 5.5rem;
    padding: 0 1.5rem 1.75rem;
    text-align: center;
    background: var(--paper);
  }
  .caption h2 { margin: 0; font-size: clamp(1.6rem, 3.4vw, 2.4rem); line-height: 1.1; }
  .caption p { margin: 0.375rem 0 0; color: var(--ink-faint); }
  .caption .inner { transition: opacity 250ms var(--ease); }

  /* ---------- record ---------- */

  .record[hidden] { display: none; }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: var(--paper);
    opacity: 0;
    transition: opacity 280ms var(--ease);
  }
  .record[data-open] .backdrop { opacity: 1; }

  .record-hero {
    position: fixed;
    inset-inline: 0;
    top: 0;
    z-index: 35;
    height: 50vh;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(to bottom, #000 52%, transparent 94%);
    mask-image: linear-gradient(to bottom, #000 52%, transparent 94%);
  }
  .record-hero > div { color: var(--ink); transform-origin: top left; }
  .record-hero svg { display: block; width: 100%; height: 100%; }

  .record-scroll {
    position: fixed;
    inset: 0;
    z-index: 40;
    overflow-y: auto;
    overscroll-behavior: contain;
    opacity: 0;
    transition: opacity 300ms var(--ease);
  }
  .record[data-open] .record-scroll { opacity: 1; }

  .back {
    position: fixed;
    left: 1.25rem;
    top: 1.25rem;
    z-index: 50;
    padding: 0.5rem 1rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in oklab, var(--paper) 80%, transparent);
    backdrop-filter: blur(8px);
    color: var(--ink);
    cursor: pointer;
    font: inherit;
  }
  .back:hover { border-color: color-mix(in oklab, var(--ink) 40%, transparent); }
  @media (min-width: 640px) { .back { left: 2rem; top: 2rem; } }

  .record article {
    position: relative;
    margin: 42vh auto 0;
    max-width: 48rem;
    padding: 0 1rem 6rem;
  }
  @media (min-width: 640px) { .record article { padding: 0 2rem 6rem; } }

  .sheet {
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--card);
    padding: 1.25rem;
    box-shadow: 0 -24px 60px -40px rgb(20 16 14 / 0.5);
    translate: 0 44px;
    opacity: 0;
    transition: translate 600ms var(--ease), opacity 600ms var(--ease);
  }
  .record[data-open] .sheet { translate: 0 0; opacity: 1; }
  @media (min-width: 640px) { .sheet { padding: 2.5rem; } }

  .sheet .kicker { margin: 0; color: var(--gold); }
  .sheet h1 { margin: 0.75rem 0 0; font-size: clamp(2.25rem, 7vw, 4rem); line-height: 1.05; text-wrap: balance; }
  .sheet .tagline { margin: 0.75rem 0 0; font-size: clamp(1.125rem, 2.5vw, 1.5rem); font-style: italic; line-height: 1.3; color: var(--ink-soft); }
  .sheet hr { margin: 1.75rem 0; border: 0; border-top: 1px solid var(--line); }
  .sheet .body { margin: 0; font-size: 0.975rem; line-height: 1.75; color: var(--ink-soft); }

  figure { margin: 2.25rem 0 0; }
  figure .frame { position: relative; overflow: hidden; border-radius: 0.75rem; background: var(--paper-deep); aspect-ratio: 3 / 2; }
  figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
  figcaption { margin-top: 0.75rem; font-size: 0.75rem; line-height: 1.6; color: var(--ink-faint); }
  figcaption a { color: inherit; }

  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    margin: 2.25rem 0 0;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--line);
  }
  .facts > div { background: var(--card); padding: 1rem; }
  @media (min-width: 640px) { .facts > div { padding: 1.25rem; } }
  .facts dt { color: var(--ink-faint); }
  .facts dd { margin: 0.375rem 0 0; font-size: 0.9375rem; }

  .encyclopaedia {
    margin: 2.25rem 0 0;
    padding: 1.25rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: color-mix(in oklab, var(--paper-deep) 50%, transparent);
  }
  .encyclopaedia h2 { margin: 0; color: var(--ink-faint); }
  .encyclopaedia p { margin: 0.75rem 0 0; font-size: 0.875rem; line-height: 1.75; color: var(--ink-soft); }
  .encyclopaedia a { display: inline-block; margin-top: 1rem; color: var(--ink); }

  /* Ghana drawn, not tiled — no tile server exists inside a CSP'd Artifact. */
  .where { margin-top: 2.25rem; padding-top: 1.75rem; border-top: 1px solid var(--line); }
  .where > h2 { margin: 0; color: var(--ink-faint); }
  .where .layout { display: flex; align-items: center; gap: 1.5rem; margin-top: 1rem; }
  @media (min-width: 640px) { .where .layout { gap: 2.25rem; } }
  .where svg { display: block; height: 16rem; width: auto; flex-shrink: 0; }
  @media (min-width: 640px) { .where svg { height: 19rem; } }
  .where .outline { fill: color-mix(in oklab, var(--ink) 4%, transparent); stroke: color-mix(in oklab, var(--ink) 25%, transparent); stroke-width: 3; stroke-linejoin: round; }
  .where .other { fill: color-mix(in oklab, var(--ink) 30%, transparent); }
  .where .halo { fill: none; stroke: color-mix(in oklab, var(--ink) 50%, transparent); stroke-width: 2; opacity: 0; transition: opacity 200ms var(--ease); }
  .where .halo.gold { stroke: var(--gold); }
  /* :focus as well as :focus-visible — the target is invisible, so a ring is
     never noise, and :focus-visible alone can leave keyboard users with none. */
  .where .pin-target:hover .halo,
  .where .hit:focus + .halo,
  .where .hit:focus-visible + .halo { opacity: 1; }
  /*
    Map targets are invisible circles sized for the finger, not the eye. The
    default focus ring boxes their bounding rect, drawing a large rectangle
    around a small pin — so it is suppressed in favour of the ring above.
  */
  .where .hit { fill: transparent; cursor: pointer; }
  .where .hit:focus, .where .hit:focus-visible { outline: none; }
  .where .shadow { fill: color-mix(in oklab, var(--ink) 20%, transparent); }
  .where .pin { fill: var(--gold); stroke: color-mix(in oklab, var(--ink) 70%, transparent); stroke-width: 3; stroke-linejoin: round; }
  .where .pin-hole { fill: var(--paper); }
  .where figure { margin: 0; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
  .where figcaption { margin: 0; text-align: center; color: var(--ink-faint); }
  .where figcaption button { border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
  .where figcaption button:hover { color: var(--ink); }
  .where dl { margin: 0; min-width: 0; }
  .where dt { color: var(--ink-faint); }
  .where dt + dd { margin: 0.25rem 0 0; }
  .where dt:not(:first-of-type) { margin-top: 1.25rem; }
  .where .place { font-size: 1.25rem; line-height: 1.2; }
  .where .coords { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; font-variant-numeric: tabular-nums; color: var(--ink-soft); }
  .where .note { margin: 1.25rem 0 0; font-size: 0.75rem; line-height: 1.6; color: var(--ink-faint); }
  .where .region { font-size: 0.875rem; color: var(--ink-soft); }

  .neighbours { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1.5rem; }
  .neighbours button, .neighbours .empty {
    padding: 1rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: color-mix(in oklab, var(--card) 60%, transparent);
    color: inherit;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  .neighbours .empty { border-style: dashed; cursor: default; color: var(--ink-faint); }
  .neighbours button:hover { background: var(--card); }
  .neighbours .next { text-align: right; }
  .neighbours .label { color: var(--ink-faint); }
  .neighbours .name { margin: 0.375rem 0 0; font-size: 1.125rem; line-height: 1.2; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>

<div class="stage">
  <header class="topbar">
    <p class="eyebrow" style="margin:0">Monuments of Ghana</p>
    <p class="eyebrow meta" style="margin:0">11 standing · 1421–2021</p>
  </header>

  <div class="intro">
    <h1 class="serif">Six centuries of Ghana, standing in a row.</h1>
    <p id="hint">Scroll sideways along the horizon — everything is in the order it was built.</p>
    <div class="search">
      <input id="q" type="search" placeholder="Accra, Kumasi, castle, 1957…" aria-label="Search monuments" autocomplete="off" />
      <button id="clear" type="button" aria-label="Clear search" hidden>✕</button>
    </div>
  </div>

  <div class="skyline">
    <div class="viewport" id="viewport">
      <ul class="track" id="track"></ul>
      <div class="ground"></div>
    </div>
    <div class="caption"><div class="inner" id="caption"></div></div>
  </div>
</div>

<div class="record" id="record" hidden>
  <div class="backdrop"></div>
  <div class="record-hero" id="recordHero" aria-hidden="true"><div></div></div>
  <div class="record-scroll" id="recordScroll">
    <button class="back eyebrow" id="back" type="button">← All monuments</button>
    <article id="recordBody"></article>
  </div>
</div>

<script>
(() => {
  "use strict";

  const MONUMENTS = ${JSON.stringify(payload)};
  const GHANA = ${JSON.stringify({ viewBox: ghana.viewBox, path: ghana.path })};
  const PIN = ${JSON.stringify(PIN)};
  const MAP_FULL = GHANA.viewBox.split(" ").map(Number);
  /** Enough to separate the six Accra monuments; more just magnifies empty fill. */
  const MAP_ZOOM = 3.5;
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  const FLIGHT = 580;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const track = document.getElementById("track");
  const viewport = document.getElementById("viewport");
  const caption = document.getElementById("caption");
  const search = document.getElementById("q");
  const clearBtn = document.getElementById("clear");
  const record = document.getElementById("record");
  const recordHero = document.getElementById("recordHero");
  const recordBody = document.getElementById("recordBody");
  const recordScroll = document.getElementById("recordScroll");

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------- build the skyline ---------- */

  const nodes = new Map();

  for (const m of MONUMENTS) {
    const li = document.createElement("li");
    li.className = "monument";
    li.style.setProperty("--scale", m.scale);
    li.style.setProperty("--aspect", m.aspect);

    const height = "calc(clamp(160px, 38vh, 400px) * (0.5 + 0.5 * " + m.scale + "))";
    li.innerHTML =
      '<span class="year serif" aria-hidden="true">' + m.year + "</span>" +
      '<span class="pin eyebrow">' + esc(m.place) + "</span>" +
      '<button type="button" aria-label="' + esc(m.name + ", " + m.place + ", " + m.yearLabel) + '"' +
        ' style="height:' + height + ";width:calc(" + height + " * " + m.aspect + ')">' +
        '<span class="slot"><svg viewBox="' + m.viewBox + '" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + m.art + "</svg></span>" +
      "</button>";

    li.querySelector("button").addEventListener("click", () => openRecord(m.slug));
    track.appendChild(li);
    nodes.set(m.slug, li);
  }

  /* ---------- spring-driven horizontal scroll ---------- */

  let offset = 0, velocity = 0, target = 0, raf = 0;
  let centres = new Map(), min = 0, max = 0, span = 0;
  let matched = new Set(MONUMENTS.map((m) => m.slug));
  let activeSlug = null;
  let userMoved = false;

  const clamp = (v) => Math.min(max, Math.max(min, v));

  function measure() {
    span = viewport.clientWidth;
    centres = new Map();
    min = Infinity; max = -Infinity;
    for (const [slug, li] of nodes) {
      const centre = li.offsetLeft + li.offsetWidth / 2;
      centres.set(slug, centre);
      const o = centre - span / 2;
      if (o < min) min = o;
      if (o > max) max = o;
    }
    if (!isFinite(min)) { min = 0; max = 0; }
  }

  function offsetFor(slug) {
    const c = centres.get(slug);
    return c === undefined ? null : c - span / 2;
  }

  function paint() {
    track.style.transform = "translateX(" + -offset + "px)";
    const centre = offset + span / 2;
    const falloff = span * 0.3;
    let best = null, bestDistance = Infinity;

    for (const [slug, li] of nodes) {
      const c = centres.get(slug);
      if (c === undefined) continue;
      const distance = Math.abs(c - centre);
      const t = Math.max(0, 1 - distance / falloff);
      li.style.setProperty("--focus", (t * t * (3 - 2 * t)).toFixed(3));
      if (matched.has(slug) && distance < bestDistance) { bestDistance = distance; best = slug; }
    }

    if (best !== activeSlug) {
      if (activeSlug && nodes.get(activeSlug)) nodes.get(activeSlug).removeAttribute("data-active");
      activeSlug = best;
      if (activeSlug) nodes.get(activeSlug).setAttribute("data-active", "");
      renderCaption();
    }
  }

  /* A light spring so the horizon carries momentum and settles without bounce. */
  let lastTime = 0;
  function step(now) {
    const dt = Math.min(0.032, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;

    const k = 120, c = 26, mass = 0.9;
    const force = -k * (offset - target) - c * velocity;
    velocity += (force / mass) * dt;
    offset += velocity * dt;

    if (Math.abs(offset - target) < 0.4 && Math.abs(velocity) < 0.4) {
      offset = target; velocity = 0; paint(); raf = 0; lastTime = 0;
      return;
    }
    paint();
    raf = requestAnimationFrame(step);
  }

  function run() {
    if (reduced) { offset = target; velocity = 0; paint(); return; }
    if (!raf) { lastTime = 0; raf = requestAnimationFrame(step); }
  }

  function jumpTo(value) {
    target = clamp(value); offset = target; velocity = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    paint();
  }

  /** Nearest monument the skyline may rest on — never a filtered-out ghost. */
  function nearestRest(value) {
    let best = value, bestDistance = Infinity;
    for (const [slug, centre] of centres) {
      if (!matched.has(slug)) continue;
      const candidate = centre - span / 2;
      const d = Math.abs(candidate - value);
      if (d < bestDistance) { bestDistance = d; best = candidate; }
    }
    return best;
  }

  let settle;
  viewport.addEventListener("wheel", (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    userMoved = true;
    target = clamp(target + delta);
    run();
    clearTimeout(settle);
    settle = setTimeout(() => { target = nearestRest(target); run(); }, 140);
  }, { passive: false });

  /* Pointer drag. Capture is deferred until the gesture is clearly a drag, so a
     plain click still reaches the monument underneath. */
  const DRAG = 8;
  let drag = null, travelled = 0;

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag = { id: event.pointerId, from: event.clientX, origin: target, captured: false };
    travelled = 0;
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = event.clientX - drag.from;
    travelled = Math.max(travelled, Math.abs(moved));
    if (!drag.captured) {
      if (travelled <= DRAG) return;
      drag.captured = true;
      userMoved = true;
      viewport.setPointerCapture(event.pointerId);
    }
    target = clamp(drag.origin - moved);
    run();
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const wasCaptured = drag.captured;
    drag = null;
    if (wasCaptured) {
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      target = nearestRest(target);
      run();
    }
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener("click", (event) => {
    if (travelled > DRAG) { event.preventDefault(); event.stopPropagation(); }
    travelled = 0;
  }, true);

  addEventListener("keydown", (event) => {
    if (!record.hidden) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const order = MONUMENTS.filter((m) => matched.has(m.slug));
    const index = order.findIndex((m) => m.slug === activeSlug);
    const next = order[index + (event.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    userMoved = true;
    const o = offsetFor(next.slug);
    if (o !== null) { target = clamp(o); run(); }
  });

  /* ---------- caption + search ---------- */

  function renderCaption() {
    if (!matched.size) {
      caption.innerHTML = '<p style="color:var(--ink-faint)">No monument matches “' +
        esc(search.value.trim()) + "”.</p>";
      return;
    }
    const m = MONUMENTS.find((x) => x.slug === activeSlug);
    if (!m) { caption.innerHTML = ""; return; }
    caption.innerHTML =
      '<h2 class="serif">' + esc(m.name) + "</h2>" +
      '<p class="eyebrow">' + esc(m.yearLabel) + " · " + esc(m.region) + "</p>";
  }

  function applyFilter() {
    const q = search.value.trim().toLowerCase();
    clearBtn.hidden = !q;
    matched = new Set(
      MONUMENTS.filter((m) =>
        !q || (m.name + " " + m.place + " " + m.region + " " + m.yearLabel).toLowerCase().includes(q)
      ).map((m) => m.slug)
    );
    for (const [slug, li] of nodes) li.style.setProperty("--dim", matched.has(slug) ? "1" : "0.07");

    if (q) {
      const first = MONUMENTS.find((m) => matched.has(m.slug));
      if (first) {
        const o = offsetFor(first.slug);
        if (o !== null) { userMoved = true; target = clamp(o); run(); }
      }
    }
    paint();
    renderCaption();
  }

  search.addEventListener("input", applyFilter);
  clearBtn.addEventListener("click", () => { search.value = ""; applyFilter(); search.focus(); });

  /* ---------- record ---------- */

  let openSlug = null;
  /*
    Bumped on every open and close. The closing flight finishes ~580ms later and
    then tears the record down; without this, closing and immediately picking
    another monument lets that stale callback hide the record that just opened.
  */
  let session = 0;

  function renderRecord(m) {
    const facts = m.facts.map((f) =>
      '<div><dt class="eyebrow">' + esc(f.label) + '</dt><dd>' + esc(f.value) + "</dd></div>").join("");

    const photo = m.photo
      ? '<figure><div class="frame"><img src="' + m.photo.src + '" alt="' + esc(m.photo.title || m.name) +
        '" width="' + m.photo.width + '" height="' + m.photo.height + '" /></div>' +
        '<figcaption>' + esc(m.photo.title) + " — " + esc(m.photo.credit) + " · " +
        '<a href="' + esc(m.photo.sourceUrl) + '" target="_blank" rel="noreferrer">' + esc(m.photo.licence) + "</a>" +
        "</figcaption></figure>"
      : "";

    const encyclopaedia = m.extract
      ? '<section class="encyclopaedia"><h2 class="eyebrow">From Wikipedia</h2><p>' + esc(m.extract) + "</p>" +
        (m.wikipediaUrl ? '<a class="eyebrow" href="' + esc(m.wikipediaUrl) + '" target="_blank" rel="noreferrer">Read the full article ↗</a>' : "") +
        "</section>"
      : "";

    const where = m.mapPoint
      ? '<section class="where"><h2 class="eyebrow">Where it stands</h2><div class="layout">' +
          '<figure><svg id="ghanaMap" viewBox="' + GHANA.viewBox + '" role="group"' +
            ' aria-label="Map of Ghana. Every monument is marked; select one to open it.">' +
            '<path class="outline" d="' + GHANA.path + '" vector-effect="non-scaling-stroke" />' +
            MONUMENTS.filter((o) => o.slug !== m.slug && o.mapPoint).map((o) =>
              '<g class="pin-target" transform="translate(' + o.mapPoint.x + " " + o.mapPoint.y + ')">' +
                "<title>" + esc(o.name + " — " + o.place) + "</title>" +
                '<g data-mark transform="scale(1)">' +
                  '<circle class="other" r="9" />' +
                  '<circle class="hit" r="34" role="button" tabindex="0" data-open="' + o.slug + '" aria-label="Open ' + esc(o.name) + '" />' +
                  '<circle class="halo" r="16" vector-effect="non-scaling-stroke" />' +
                "</g></g>").join("") +
            '<g class="pin-target" transform="translate(' + m.mapPoint.x + " " + m.mapPoint.y + ')">' +
              "<title>Zoom to the exact position</title>" +
              '<g data-mark transform="scale(1)">' +
                '<ellipse class="shadow" cy="2" rx="13" ry="4" />' +
                '<path class="pin" d="' + PIN + '" vector-effect="non-scaling-stroke" />' +
                '<circle class="pin-hole" cy="-40" r="8" />' +
                '<circle class="hit" r="40" role="button" tabindex="0" data-zoom aria-pressed="false" aria-label="Zoom to the exact position" />' +
                '<circle class="halo gold" cy="-26" r="34" vector-effect="non-scaling-stroke" />' +
              "</g></g>" +
          "</svg>" +
          '<figcaption class="eyebrow"><button type="button" data-zoom>Zoom to pin</button></figcaption>' +
          "</figure>" +
          "<dl>" +
            '<dt class="eyebrow">Place</dt><dd class="place serif">' + esc(m.place) + "</dd>" +
            '<dt class="eyebrow">Region</dt><dd class="region">' + esc(m.region) + "</dd>" +
            '<dt class="eyebrow">Coordinates</dt><dd class="coords">' +
              Math.abs(m.coordinates.lat).toFixed(4) + "°" + (m.coordinates.lat >= 0 ? "N" : "S") + "<br />" +
              Math.abs(m.coordinates.lon).toFixed(4) + "°" + (m.coordinates.lon >= 0 ? "E" : "W") +
            "</dd>" +
            '<dd class="note">The faint marks are the other ten — select one to open it.</dd>' +
          "</dl>" +
        "</div></section>"
      : "";

    const index = MONUMENTS.findIndex((x) => x.slug === m.slug);
    const neighbour = (other, isNext) => other
      ? '<button type="button" class="' + (isNext ? "next" : "") + '" data-goto="' + other.slug + '">' +
        '<span class="eyebrow label">' + (isNext ? "Later →" : "← Earlier") + "</span>" +
        '<p class="name serif">' + esc(other.name) + "</p>" +
        '<span class="eyebrow label">' + esc(other.yearLabel) + "</span></button>"
      : '<div class="empty ' + (isNext ? "next" : "") + '"><span class="eyebrow">' +
        (isNext ? "End of the line" : "Start of the line") + "</span></div>";

    recordBody.innerHTML =
      '<div class="sheet">' +
        '<p class="kicker eyebrow">' + esc(m.yearLabel) + " · " + esc(m.region) + "</p>" +
        '<h1 class="serif">' + esc(m.name) + "</h1>" +
        '<p class="tagline serif">' + esc(m.tagline) + "</p>" +
        "<hr />" +
        '<p class="body">' + esc(m.description) + "</p>" +
        photo +
        '<dl class="facts">' + facts + "</dl>" +
        encyclopaedia +
        where +
      "</div>" +
      '<nav class="neighbours">' +
        neighbour(MONUMENTS[index - 1], false) +
        neighbour(MONUMENTS[index + 1], true) +
      "</nav>";

    for (const button of recordBody.querySelectorAll("[data-goto]")) {
      button.addEventListener("click", () => openRecord(button.dataset.goto));
    }
    wireMap(m);
  }

  /**
   * The map's zoom moves the viewBox rather than transforming a group: CSS
   * transforms on an SVG <g> are unreliable across engines, and the SVG
   * transform attribute cannot be transitioned. Frames are written straight to
   * the DOM so the outline and eleven marks are not rebuilt sixty times a second.
   */
  function wireMap(m) {
    const svg = recordBody.querySelector("#ghanaMap");
    if (!svg || !m.mapPoint) return;

    let box = MAP_FULL.slice();
    let zoomed = false;
    let frame = 0;

    const paint = (next) => {
      box = next;
      svg.setAttribute("viewBox", next.join(" "));
      // Counter-scale the marks so zooming reveals position, not bigger blobs.
      const inverse = next[2] / MAP_FULL[2];
      for (const mark of svg.querySelectorAll("[data-mark]")) {
        mark.setAttribute("transform", "scale(" + inverse + ")");
      }
    };

    const setZoom = (next) => {
      zoomed = next;
      const target = zoomed
        ? [
            m.mapPoint.x - MAP_FULL[2] / (2 * MAP_ZOOM),
            m.mapPoint.y - MAP_FULL[3] / (2 * MAP_ZOOM),
            MAP_FULL[2] / MAP_ZOOM,
            MAP_FULL[3] / MAP_ZOOM,
          ]
        : MAP_FULL.slice();

      for (const control of recordBody.querySelectorAll("[data-zoom]")) {
        if (control.tagName === "BUTTON") {
          control.textContent = zoomed ? "Whole country" : "Zoom to pin";
        } else {
          control.setAttribute("aria-pressed", String(zoomed));
          control.setAttribute(
            "aria-label",
            zoomed ? "Zoom back out to the whole country" : "Zoom to the exact position"
          );
        }
      }

      // A hidden tab gets no animation frames, so a tween there would never
      // arrive and would strand the map between states. Same for reduced motion.
      if (reduced || document.hidden) { paint(target); return; }

      const from = box.slice();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 650);
        const eased = 1 - Math.pow(1 - t, 4);
        paint(from.map((value, i) => value + (target[i] - value) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };

    paint(MAP_FULL.slice());

    for (const control of recordBody.querySelectorAll("[data-zoom]")) {
      control.addEventListener("click", () => setZoom(!zoomed));
      control.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setZoom(!zoomed);
      });
    }

    for (const hit of svg.querySelectorAll("[data-open]")) {
      hit.addEventListener("click", () => openRecord(hit.dataset.open));
      hit.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openRecord(hit.dataset.open);
      });
    }
  }

  /**
   * The flight is an explicit FLIP: measure the skyline slot and the record
   * hero, then animate between them. No shared-element machinery is involved,
   * so the transform-driven track underneath cannot skew it.
   */
  function flight(hero, slot, back) {
    hero.style.transform = "none";
    const here = hero.getBoundingClientRect();
    const there = slot.getBoundingClientRect();
    if (!here.width || !there.width) return null;

    const from = "translate(" + (there.left - here.left) + "px, " + (there.top - here.top) +
      "px) scale(" + there.width / here.width + ")";

    if (reduced) { hero.style.transform = back ? from : "none"; return null; }

    // Seat the first frame synchronously — otherwise one paint lands untransformed.
    hero.style.transform = back ? "none" : from;
    return hero.animate(
      [{ transform: back ? "none" : from }, { transform: back ? from : "none" }],
      { duration: FLIGHT, easing: EASE, fill: "both" }
    );
  }

  function openRecord(slug) {
    const m = MONUMENTS.find((x) => x.slug === slug);
    if (!m) return;

    const previous = openSlug;
    openSlug = slug;
    session += 1;
    renderRecord(m);

    // Centre the monument behind the record so the return flight lands true.
    const o = offsetFor(slug);
    if (o !== null) { userMoved = true; jumpTo(o); }

    if (previous && nodes.get(previous)) nodes.get(previous).querySelector(".slot").style.visibility = "";
    const slot = nodes.get(slug).querySelector(".slot");
    slot.style.visibility = "hidden";

    const heroInner = recordHero.firstElementChild;
    heroInner.style.aspectRatio = m.aspect;
    heroInner.style.height = "min(42vh, calc(84vw / " + m.aspect + "))";
    heroInner.innerHTML = '<svg viewBox="' + m.viewBox + '" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + m.art + "</svg>";

    record.hidden = false;
    recordScroll.scrollTop = 0;
    document.body.style.overflow = "hidden";

    // Force layout so the opening transition actually runs from its start state.
    void record.offsetWidth;
    record.setAttribute("data-open", "");
    flight(heroInner, slot, false);
    document.getElementById("back").focus({ preventScroll: true });
  }

  function closeRecord() {
    if (!openSlug) return;
    const slot = nodes.get(openSlug).querySelector(".slot");
    const heroInner = recordHero.firstElementChild;
    const slug = openSlug;
    openSlug = null;
    session += 1;
    const mine = session;

    record.removeAttribute("data-open");
    const animation = flight(heroInner, slot, true);

    const finish = () => {
      if (session !== mine) return; // a new record opened while we were leaving
      record.hidden = true;
      document.body.style.overflow = "";
      slot.style.visibility = "";
      heroInner.style.transform = "none";
      heroInner.innerHTML = "";
      const button = nodes.get(slug) && nodes.get(slug).querySelector("button");
      if (button) button.focus({ preventScroll: true });
    };

    if (animation) animation.finished.then(finish).catch(finish);
    else finish();
  }

  document.getElementById("back").addEventListener("click", closeRecord);
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !record.hidden) closeRecord();
  });

  /* ---------- boot ---------- */

  function layout() {
    measure();
    if (!userMoved) jumpTo(offsetFor(MONUMENTS[0].slug) ?? min);
    else { target = clamp(target); offset = clamp(offset); paint(); }
  }

  layout();
  new ResizeObserver(layout).observe(viewport);
  new ResizeObserver(layout).observe(track);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
</script>
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, html, "utf8");

const kb = Buffer.byteLength(html) / 1024;
console.log(`→ ${OUT}  ${(kb / 1024).toFixed(2)} MB`);
console.log(`   ${payload.length} monuments, ${Object.keys(assets.photos).length} photos`);
