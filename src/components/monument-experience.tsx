"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Skyline } from "@/components/skyline";
import {
  MonumentBackdrop,
  MonumentHero,
  MonumentRecord,
} from "@/components/monument-detail";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Input } from "@/components/ui/input";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Monument } from "@/data/monuments";

export function MonumentExperience({ monuments }: { monuments: Monument[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Monument | null>(null);

  const vertical = useMediaQuery("(max-width: 767px)");

  // The detail view owns its own scrolling; stop the page moving underneath it.
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  const open = (monument: Monument) => setSelected(monument);

  const index = selected
    ? monuments.findIndex((m) => m.slug === selected.slug)
    : -1;

  /** Chrome that is not an ancestor of the shared silhouette, so it may fade. */
  const chrome = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.45, ease: EASE, delay: 0.1 },
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/*
        The skyline is never unmounted — it sits under an open record. Tearing
        down and rebuilding eleven inline SVGs on the frame the return flight
        begins costs enough to eat its opening frames, and that reads as lag.

        The monument's flight is an explicit FLIP owned by MonumentHero, not a
        shared `layoutId`: the skyline slot lives inside a transform-driven
        track, and Motion's layout projection kept resolving the hero into that
        track's coordinate space. Measuring both boxes directly sidesteps the
        projection tree entirely.
      */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            selected && "pointer-events-none"
          )}
          aria-hidden={selected ? true : undefined}
        >
              <motion.header
                {...chrome}
                className="flex shrink-0 items-baseline justify-between px-5 pt-5 sm:px-8 sm:pt-7"
              >
                <p className="u-eyebrow text-ink">Monuments of Ghana</p>
                <p className="u-eyebrow hidden text-ink-faint sm:block">
                  {monuments.length} standing · 1421–2021
                </p>
              </motion.header>

              <motion.div
                {...chrome}
                className="shrink-0 px-5 pb-3 pt-5 text-center sm:pb-4 sm:pt-7"
              >
                <h1 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.05] text-ink">
                  Six centuries of Ghana, standing in a row.
                </h1>
                <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-ink-soft">
                  {vertical ? "Scroll" : "Scroll sideways"} along the horizon —
                  everything is in the order it was built.
                </p>

                <div className="relative mx-auto mt-5 w-full max-w-sm">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Accra, Kumasi, castle, 1957…"
                    aria-label="Search monuments"
                    className="h-11 rounded-full border-ink/15 bg-card/70 px-5 text-center text-sm placeholder:text-ink-faint/70 focus-visible:border-gold focus-visible:ring-gold/25"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-ink-faint transition-colors hover:text-ink"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </motion.div>

              <Skyline
                monuments={monuments}
                query={query}
                vertical={vertical}
                onSelect={open}
                selectedSlug={selected?.slug ?? null}
              />
        </div>

        <AnimatePresence>
          {selected && <MonumentBackdrop key="backdrop" />}
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <MonumentHero key={`hero-${selected.slug}`} monument={selected} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <MonumentRecord
              key={`record-${selected.slug}`}
              monument={selected}
              previous={index > 0 ? monuments[index - 1] : null}
              next={index < monuments.length - 1 ? monuments[index + 1] : null}
              onBack={() => setSelected(null)}
              onNavigate={open}
            />
          )}
        </AnimatePresence>
    </main>
  );
}
