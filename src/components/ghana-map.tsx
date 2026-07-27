"use client";

import { GHANA_MAP, project } from "@/lib/ghana-map";
import { mediaFor } from "@/data/monument-media";
import { MONUMENTS } from "@/data/monuments";

/**
 * Ghana drawn rather than tiled.
 *
 * A slippy map would need a tile server, and the record has to work with no
 * network at all — the Artifact build runs under a CSP that blocks external
 * hosts. One projected path costs about 4 KB, never fails to load, and sits
 * with the traced silhouettes instead of against them.
 *
 * Every monument is marked, so each record also shows where it stands in
 * relation to the other ten.
 */
export function GhanaMap({ slug }: { slug: string }) {
  const here = mediaFor(slug)?.coordinates;
  if (!here) return null;

  const active = project(here.lat, here.lon);

  const others = MONUMENTS.filter((m) => m.slug !== slug)
    .map((m) => {
      const point = mediaFor(m.slug)?.coordinates;
      return point ? { slug: m.slug, ...project(point.lat, point.lon) } : null;
    })
    .filter((p): p is { slug: string; x: number; y: number } => p !== null);

  return (
    <svg
      viewBox={GHANA_MAP.viewBox}
      className="h-full w-auto"
      role="img"
      aria-label={`Map of Ghana marking the location of this monument at ${here.lat.toFixed(
        3
      )} degrees north, ${Math.abs(here.lon).toFixed(3)} degrees ${
        here.lon < 0 ? "west" : "east"
      }`}
    >
      <path
        d={GHANA_MAP.path}
        className="fill-ink/[0.04] stroke-ink/25"
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {others.map((point) => (
        <circle
          key={point.slug}
          cx={point.x}
          cy={point.y}
          r={9}
          className="fill-ink/20"
        />
      ))}

      {/* The monument this record is about. */}
      <circle cx={active.x} cy={active.y} r={34} className="fill-gold/15" />
      <circle
        cx={active.x}
        cy={active.y}
        r={18}
        className="fill-none stroke-gold"
        strokeWidth={4}
      />
      <circle cx={active.x} cy={active.y} r={8} className="fill-gold" />
    </svg>
  );
}
