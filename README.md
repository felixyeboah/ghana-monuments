# Monuments of Ghana

Eleven monuments, drawn as silhouettes and laid out along a horizon in the order
they were built — from the mud mosque at Larabanga (c. 1421) to the minarets over
Accra (2021). Scrolling the skyline walks forward through six centuries.

Picking a monument flies it up into a record: an essay, contributor photography,
the Wikipedia entry, and a drawn map of Ghana showing where it stands among the
other ten.

## Running it

```bash
pnpm install
pnpm dev
```

## How it is put together

**Next.js 16 · Tailwind 4 · shadcn/ui · Motion**

The skyline does not use native scrolling. Wheel, drag, keyboard and search all
write to a single target offset; a spring follows it and the track moves by
transform. Keeping the glide, the settle onto a monument and the focus falloff on
one clock avoids CSS scroll-snap fighting the wheel.

Each monument's state comes from two custom properties — `--focus` (distance from
the centre of the viewport, written every frame) and `--dim` (whether it survived
the current search). Everything visual follows from those two numbers, which is
only possible because the silhouettes are single-colour.

The flight between the skyline and a record is an explicit FLIP, not a shared
`layoutId`. Motion's layout projection walks the ancestor tree, and the skyline
slot lives inside the transform-driven track — projection kept resolving the
record hero into the track's coordinate space. Measuring both boxes and animating
between them needs no projection tree at all.

## Generated data

Four build steps produce everything under `src/data` and `src/lib`. Each is
committed, so a clean checkout runs without network access.

| Command | Output | Source |
| --- | --- | --- |
| `pnpm gen:art` | `src/lib/monument-art.ts` | the traced SVGs in `assets/monuments` |
| `pnpm gen:media` | `src/data/monument-media.json` | Wikipedia + Wikimedia Commons |
| `node scripts/build-ghana-map.mjs` | `src/data/ghana-map.json` | geoBoundaries ADM0 |
| `node scripts/build-artifact.mjs` | `artifact/monuments-of-ghana.html` | all of the above |

The monument silhouettes are potrace traces: one path, `fill="currentColor"`,
which is what lets focus and ghost states be pure CSS.

## The Artifact build

`artifact/monuments-of-ghana.html` is a standalone single-file version — no
build step, no network, roughly 740 KB. It reads the same sources as the app
(Node imports the `.ts` data modules directly), so the two cannot drift.

It runs under a CSP that blocks every external host, which shapes three things:
the display face is inlined as a data URI rather than linked; photography is
embedded as WebP data URIs, one per monument instead of the app's six; and the
map is a drawn outline rather than tiles, since no tile server is reachable.

## Credits

Photography by Wikimedia Commons contributors, credited and licence-linked on
every record. Encyclopaedia text from Wikipedia (CC BY-SA 4.0). National boundary
from [geoBoundaries](https://www.geoboundaries.org) (CC BY 4.0). Display face is
Instrument Serif (SIL Open Font License).
