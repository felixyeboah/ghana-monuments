"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { animate, motion, usePresence } from "motion/react";
import { MonumentSilhouette } from "@/components/monument-silhouette";
import { MonumentGallery } from "@/components/monument-gallery";
import { GhanaMap } from "@/components/ghana-map";
import { MONUMENT_ART } from "@/lib/monument-art";
import { mediaFor } from "@/data/monument-media";
import { EASE, SHARED_LAYOUT } from "@/lib/motion";
import type { Monument } from "@/data/monuments";

/**
 * The pinned silhouette, and nothing else.
 *
 * The flight between the skyline and here is an explicit FLIP rather than a
 * shared `layoutId`. Motion's layout projection walks the ancestor tree, and
 * the skyline slot lives inside a transform-driven track — so projection kept
 * resolving this element into the track's coordinate space and parking it
 * off-screen. Measuring the two boxes ourselves and animating between them
 * needs no projection tree at all, and works whether or not the skyline is
 * mounted.
 */
export function MonumentHero({ monument }: { monument: Monument }) {
  const art = MONUMENT_ART[monument.slug];
  const ref = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();

  /*
    Blank the skyline slot for exactly as long as this hero exists — including
    while it flies back out. Tying it to React state instead would reveal the
    slot the moment the record closed, showing the monument twice for the whole
    return flight. A hidden element still reports its rect, so it stays
    measurable.
  */
  useLayoutEffect(() => {
    const slot = document.querySelector<HTMLElement>(
      `[data-monument-slot="${monument.slug}"]`
    );
    if (!slot) return;
    slot.style.visibility = "hidden";
    return () => {
      slot.style.removeProperty("visibility");
    };
  }, [monument.slug]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const slot = document.querySelector<HTMLElement>(
      `[data-monument-slot="${monument.slug}"]`
    );

    // No skyline to fly from or back to — appear in place.
    if (!slot) {
      if (!isPresent) safeToRemove();
      return;
    }

    // Measure this element untransformed, so repeated flights stay stable.
    el.style.transform = "none";
    const here = el.getBoundingClientRect();
    const there = slot.getBoundingClientRect();
    if (!here.width || !there.width) {
      if (!isPresent) safeToRemove();
      return;
    }

    const from = {
      x: there.left - here.left,
      y: there.top - here.top,
      scale: there.width / here.width,
    };

    el.style.transformOrigin = "top left";

    if (!isPresent) {
      // Leaving: already at rest here, so fly back down to the slot. The
      // container's mask has to come off first — it is transparent below about
      // 47vh, so the monument dissolved partway down instead of arriving.
      el.parentElement?.setAttribute("data-flying", "");
      const controls = animate(el, { ...from }, SHARED_LAYOUT);
      controls.then(() => safeToRemove());
      return () => controls.stop();
    }

    // Arriving. Seat the opening frame synchronously — Motion writes its first
    // keyframe on its first animation frame, which would otherwise leave one
    // paint with the monument already full-size at the top of the record.
    el.style.transform = `translate(${from.x}px, ${from.y}px) scale(${from.scale})`;

    const controls = animate(
      el,
      { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1] },
      SHARED_LAYOUT
    );
    return () => controls.stop();
  }, [monument.slug, isPresent, safeToRemove]);

  return (
    <div
      className="hero-fade pointer-events-none fixed inset-x-0 top-0 z-[35] flex h-[50vh] items-end justify-center"
      aria-hidden="true"
    >
      <div
        ref={ref}
        className="text-ink"
        style={
          {
            aspectRatio: art?.aspect ?? 1,
            height: `min(42vh, calc(84vw / ${art?.aspect ?? 1}))`,
          } as CSSProperties
        }
      >
        <MonumentSilhouette slug={monument.slug} />
      </div>
    </div>
  );
}

/** Paper behind the record. Clears quickly so the returning monument is seen. */
export function MonumentBackdrop() {
  return (
    <motion.div
      className="fixed inset-0 z-30 bg-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
    />
  );
}

type MonumentRecordProps = {
  monument: Monument;
  previous: Monument | null;
  next: Monument | null;
  onBack: () => void;
  onNavigate: (monument: Monument) => void;
};

export function MonumentRecord({
  monument,
  previous,
  next,
  onBack,
  onNavigate,
}: MonumentRecordProps) {
  const media = mediaFor(monument.slug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  /*
    Leaving animates on the root alone. Fading the root *and* the article inside
    it meant two nested opacity layers compositing at once, over a subtree
    holding a photograph and the map — which is what made the exit drag. One
    layer moves; everything within it is static.
  */
  return (
    <motion.div
      // Promoted up front: this layer only exists while a record is open, and
      // letting the compositor create it on the exit's first frame is a hitch
      // exactly where the movement starts.
      style={{ willChange: "opacity, transform" }}
      className="fixed inset-0 z-40 overflow-y-auto overscroll-contain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Drops away rather than dissolving in place, so leaving reads as the
      // record being put down instead of the page blinking.
      exit={{ opacity: 0, y: 56 }}
      transition={{ duration: 0.34, ease: EASE }}
    >
      <motion.button
        type="button"
        onClick={onBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        /* Solid, not blurred: a backdrop-filter inside an animating layer is
           re-read and re-blurred every frame. */
        className="u-eyebrow fixed left-5 top-5 z-50 cursor-pointer rounded-full border border-ink/15 bg-paper px-4 py-2 text-ink transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:left-8 sm:top-8"
      >
        ← All monuments
      </motion.button>

      <motion.article
        initial={{ opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.6, ease: EASE }}
        className="relative mx-auto mt-[42vh] max-w-3xl px-4 pb-24 sm:px-8"
      >
        <div className="rounded-2xl border border-ink/10 bg-card p-5 shadow-[0_-24px_60px_-40px_rgb(20_16_14/0.5)] sm:p-10">
          <p className="u-eyebrow text-gold">
            {monument.yearLabel} · {monument.region}
          </p>

          <h1 className="mt-3 font-display text-[clamp(2.25rem,7vw,4rem)] leading-[1.05] text-ink">
            {monument.name}
          </h1>

          <p className="mt-3 font-display text-[clamp(1.125rem,2.5vw,1.5rem)] italic leading-snug text-ink-soft">
            {monument.tagline}
          </p>

          <div className="my-7 h-px bg-ink/10" />

          <p className="text-[0.975rem] leading-[1.75] text-ink-soft">
            {monument.description}
          </p>

          {media?.photos.length ? (
            <MonumentGallery
              photos={media.photos}
              monumentName={monument.name}
            />
          ) : null}

          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10">
            {monument.facts.map((fact) => (
              <div key={fact.label} className="bg-card p-4 sm:p-5">
                <dt className="u-eyebrow text-ink-faint">{fact.label}</dt>
                <dd className="mt-1.5 text-sm text-ink sm:text-base">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          {media?.extract ? (
            <section className="mt-9 rounded-xl border border-ink/10 bg-paper-deep/50 p-5 sm:p-6">
              <h2 className="u-eyebrow text-ink-faint">From Wikipedia</h2>
              <p className="mt-3 text-sm leading-[1.75] text-ink-soft">
                {media.extract}
              </p>
              {media.wikipediaUrl ? (
                <a
                  href={media.wikipediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="u-eyebrow mt-4 inline-block text-ink underline decoration-ink/20 underline-offset-4 transition-colors hover:decoration-ink"
                >
                  Read the full article ↗
                </a>
              ) : null}
            </section>
          ) : null}

          {media?.coordinates ? (
            <section className="mt-9 border-t border-ink/10 pt-7">
              <h2 className="u-eyebrow text-ink-faint">Where it stands</h2>

              <div className="mt-4 flex items-center gap-6 sm:gap-9">
                <div className="h-[17rem] w-[10rem] shrink-0 sm:h-[20rem] sm:w-[13rem]">
                  <GhanaMap slug={monument.slug} onSelect={onNavigate} />
                </div>

                <dl className="min-w-0">
                  <dt className="u-eyebrow text-ink-faint">Place</dt>
                  <dd className="mt-1 font-display text-xl leading-tight text-ink">
                    {monument.place}
                  </dd>

                  <dt className="u-eyebrow mt-5 text-ink-faint">Region</dt>
                  <dd className="mt-1 text-sm text-ink-soft">
                    {monument.region}
                  </dd>

                  <dt className="u-eyebrow mt-5 text-ink-faint">Coordinates</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums text-ink-soft">
                    {Math.abs(media.coordinates.lat).toFixed(4)}°
                    {media.coordinates.lat >= 0 ? "N" : "S"}
                    <br />
                    {Math.abs(media.coordinates.lon).toFixed(4)}°
                    {media.coordinates.lon >= 0 ? "E" : "W"}
                  </dd>

                  <dd className="mt-5 text-xs leading-relaxed text-ink-faint">
                    The faint marks are the other ten — select one to open it.
                  </dd>
                </dl>
              </div>
            </section>
          ) : null}
        </div>

        <nav className="mt-6 grid grid-cols-2 gap-3">
          <NeighbourLink
            monument={previous}
            direction="previous"
            onNavigate={onNavigate}
          />
          <NeighbourLink
            monument={next}
            direction="next"
            onNavigate={onNavigate}
          />
        </nav>
      </motion.article>
    </motion.div>
  );
}

function NeighbourLink({
  monument,
  direction,
  onNavigate,
}: {
  monument: Monument | null;
  direction: "previous" | "next";
  onNavigate: (monument: Monument) => void;
}) {
  const isNext = direction === "next";

  if (!monument) {
    return (
      <div
        className={`rounded-xl border border-dashed border-ink/10 p-4 ${
          isNext ? "text-right" : ""
        }`}
      >
        <p className="u-eyebrow text-ink-faint/60">
          {isNext ? "End of the line" : "Start of the line"}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(monument)}
      className={`cursor-pointer rounded-xl border border-ink/10 bg-card/60 p-4 transition-colors hover:border-ink/30 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        isNext ? "text-right" : "text-left"
      }`}
    >
      <p className="u-eyebrow text-ink-faint">
        {isNext ? "Later →" : "← Earlier"}
      </p>
      <p className="mt-1.5 font-display text-lg leading-tight text-ink">
        {monument.name}
      </p>
      <p className="u-eyebrow mt-1 text-ink-faint">{monument.yearLabel}</p>
    </button>
  );
}
