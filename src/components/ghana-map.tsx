"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GHANA_MAP, project } from "@/lib/ghana-map";
import { mediaFor } from "@/data/monument-media";
import { MONUMENTS, type Monument } from "@/data/monuments";

/** Enough to separate the six Accra monuments; more just magnifies empty fill. */
const ZOOM = 3.5;
const DURATION = 650;

/** Teardrop with its tip at the origin, so the point sits on the coordinate. */
const PIN =
  "M0 0 C-7 -16 -22 -26 -22 -40 A22 22 0 1 1 22 -40 C22 -26 7 -16 0 0 Z";

type Box = [x: number, y: number, width: number, height: number];

const FULL = GHANA_MAP.viewBox.split(" ").map(Number) as Box;

/**
 * Ghana drawn rather than tiled.
 *
 * A slippy map would need a tile server, and the record has to work with no
 * network at all — the Artifact build runs under a CSP that blocks external
 * hosts. One projected path costs about 4 KB, never fails to load, and sits
 * with the traced silhouettes instead of against them.
 *
 * It is also the fastest way between two records: every monument is a target,
 * so you can move around the country rather than back through the skyline.
 */
export function GhanaMap({
  slug,
  onSelect,
}: {
  slug: string;
  onSelect?: (monument: Monument) => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<Box>(FULL);
  const frameRef = useRef(0);

  const here = mediaFor(slug)?.coordinates;
  const active = here ? project(here.lat, here.lon) : null;

  /**
   * Writes the frame straight to the DOM. Driving the viewBox through React
   * state re-rendered the outline and every marker sixty times a second, which
   * is what made the zoom feel rough.
   */
  const paint = useCallback((box: Box) => {
    const svg = svgRef.current;
    if (!svg) return;

    boxRef.current = box;
    svg.setAttribute("viewBox", box.join(" "));

    // Counter-scale the marks so zooming reveals position, not bigger blobs.
    const inverse = box[2] / FULL[2];
    for (const mark of svg.querySelectorAll("[data-mark]")) {
      mark.setAttribute("transform", `scale(${inverse})`);
    }
  }, []);

  // A new record always opens at country scale.
  useEffect(() => setZoomed(false), [slug]);

  useEffect(() => {
    if (!active) return;

    const target: Box = zoomed
      ? [
          active.x - FULL[2] / (2 * ZOOM),
          active.y - FULL[3] / (2 * ZOOM),
          FULL[2] / ZOOM,
          FULL[3] / ZOOM,
        ]
      : FULL;

    const from = boxRef.current;
    if (from.every((value, i) => Math.abs(value - target[i]) < 0.5)) {
      paint(target);
      return;
    }

    // A hidden tab gets no animation frames, so a tween there would never
    // arrive and would strand the map between states. Same for reduced motion.
    if (
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      paint(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 4);
      paint(
        from.map((value, i) => value + (target[i] - value) * eased) as Box
      );
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [zoomed, active?.x, active?.y, paint]);

  if (!here || !active) return null;

  const others = MONUMENTS.filter((m) => m.slug !== slug)
    .map((m) => {
      const point = mediaFor(m.slug)?.coordinates;
      return point ? { monument: m, ...project(point.lat, point.lon) } : null;
    })
    .filter((p): p is { monument: Monument; x: number; y: number } => p !== null);

  const toggle = () => setZoomed((value) => !value);

  return (
    <figure className="m-0 flex h-full flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={FULL.join(" ")}
        className="min-h-0 flex-1"
        role="group"
        aria-label="Map of Ghana. Every monument is marked; select one to open it."
      >
        <path
          d={GHANA_MAP.path}
          className="fill-ink/[0.04] stroke-ink/25"
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {others.map((point) => (
          <g
            key={point.monument.slug}
            transform={`translate(${point.x} ${point.y})`}
            className="group/pin"
          >
            <title>{`${point.monument.name} — ${point.monument.place}`}</title>
            <g data-mark>
              <circle
                r={16}
                className="fill-none stroke-ink/50 opacity-0 transition-opacity group-hover/pin:opacity-100"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <circle r={9} className="fill-ink/30" />
              {/* A generous, invisible hit area — the dot itself is tiny. */}
              <circle
                r={34}
                fill="transparent"
                className={onSelect ? "cursor-pointer" : undefined}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={onSelect ? `Open ${point.monument.name}` : undefined}
                onClick={() => onSelect?.(point.monument)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelect?.(point.monument);
                }}
              />
            </g>
          </g>
        ))}

        {/* This record's monument: a dropped pin, tip on the coordinate. */}
        <g transform={`translate(${active.x} ${active.y})`}>
          <title>
            {zoomed ? "Zoom back out to Ghana" : "Zoom to the exact position"}
          </title>
          <g data-mark>
            {/* Shadow on the ground, so the pin reads as standing on the point. */}
            <ellipse cy={2} rx={13} ry={4} className="fill-ink/20" />
            <path
              d={PIN}
              className="fill-gold stroke-ink/70"
              strokeWidth={3}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cy={-40} r={8} className="fill-paper" />
            <circle
              r={40}
              fill="transparent"
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-pressed={zoomed}
              aria-label={
                zoomed
                  ? "Zoom back out to the whole country"
                  : "Zoom to the exact position"
              }
              onClick={toggle}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggle();
              }}
            />
          </g>
        </g>
      </svg>

      <figcaption className="u-eyebrow shrink-0 text-center text-ink-faint">
        <button
          type="button"
          onClick={toggle}
          className="cursor-pointer underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
        >
          {zoomed ? "Whole country" : "Zoom to pin"}
        </button>
      </figcaption>
    </figure>
  );
}
