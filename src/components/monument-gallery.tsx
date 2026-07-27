"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { EASE } from "@/lib/motion";
import type { MonumentPhoto } from "@/data/monument-media";
import { cn } from "@/lib/utils";

/**
 * Every photograph here was taken and licensed by a Wikimedia Commons
 * contributor, so the credit line is part of the component rather than a
 * footnote — it moves with the photo it belongs to.
 */
export function MonumentGallery({
  photos,
  monumentName,
}: {
  photos: MonumentPhoto[];
  monumentName: string;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (next: number) => {
      const wrapped = (next + photos.length) % photos.length;
      setDirection(next > index ? 1 : -1);
      setIndex(wrapped);
    },
    [index, photos.length]
  );

  useEffect(() => {
    setIndex(0);
  }, [monumentName]);

  if (!photos.length) return null;
  const photo = photos[index];

  return (
    <section aria-label={`Photographs of ${monumentName}`} className="mt-9">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="u-eyebrow text-ink-faint">Photographs</h2>
        <p className="u-eyebrow text-ink-faint/70">
          {index + 1} / {photos.length}
        </p>
      </div>

      <div
        className="group relative mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-paper-deep sm:aspect-[3/2]"
        // Arrow keys move through the set once the frame has focus.
        tabIndex={0}
        role="group"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(index + 1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(index - 1);
          }
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={photo.src}
            initial={{ opacity: 0, scale: 1.04, x: direction * 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute inset-0"
          >
            <Image
              src={photo.src}
              alt={photo.title || monumentName}
              fill
              sizes="(max-width: 768px) 100vw, 704px"
              className="object-cover"
              priority={index === 0}
            />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous photograph"
          className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-paper/85 px-3 py-2 text-ink opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gold group-hover:opacity-100"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next photograph"
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-paper/85 px-3 py-2 text-ink opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gold group-hover:opacity-100"
        >
          →
        </button>
      </div>

      {/*
        Padded on every side because the selected thumbnail's ring sits 4px
        outside its box (2px offset + 2px width). A scroll container clips both
        axes once either one is not `visible`, so without this the ring is cut
        off top and bottom.
      */}
      <div className="mt-2 flex gap-2 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((thumb, i) => (
          <button
            key={thumb.src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show photograph ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md transition-all",
              i === index
                ? "opacity-100 ring-2 ring-gold ring-offset-2 ring-offset-card"
                : "opacity-55 hover:opacity-85"
            )}
          >
            <Image
              src={thumb.src}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        <span className="text-ink-soft">{photo.title}</span>
        {" — "}
        {photo.credit}
        {" · "}
        <a
          href={photo.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-ink/20 underline-offset-2 transition-colors hover:text-ink"
        >
          {photo.licence}
        </a>
      </p>
    </section>
  );
}
