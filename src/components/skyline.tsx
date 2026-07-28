"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionStyle,
} from "motion/react";
import { MonumentSilhouette } from "@/components/monument-silhouette";
import { MONUMENT_ART } from "@/lib/monument-art";
import { matchesQuery, type Monument } from "@/data/monuments";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Heavy enough to carry momentum, damped enough never to bounce past a monument. */
const GLIDE = { stiffness: 120, damping: 26, mass: 0.9, restDelta: 0.4 };
const INSTANT = { stiffness: 800, damping: 60, mass: 0.2, restDelta: 0.5 };

/** Below this, a pointer gesture is a click on a monument rather than a drag. */
const DRAG_THRESHOLD = 8;

/**
 * The skyline's resting position must be set before paint: on the way back from
 * a record, Motion measures the returning silhouette's target rect during the
 * layout phase, and a position restored in a passive effect lands too late —
 * the monument flies to where the skyline *was* and then snaps.
 */
const useLayoutSync =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type Metrics = {
  /** Centre of each monument along the scroll axis, relative to the track. */
  centres: Map<string, number>;
  min: number;
  max: number;
  viewport: number;
};

type SkylineProps = {
  monuments: Monument[];
  query: string;
  /** Mobile lays the skyline out as a vertical stack instead of a horizon. */
  vertical: boolean;
  onSelect: (monument: Monument) => void;
  /**
   * The monument whose record is open, if any.
   *
   * The skyline stays mounted underneath an open record. Remounting eleven
   * inline SVGs on the very frame the return flight begins is enough work to
   * eat its opening frames, which reads as lag. Instead only the selected
   * monument gives up its shared `layoutId` while its record is open, so
   * exactly one element ever claims it.
   */
  selectedSlug?: string | null;
};

/**
 * The skyline does not use native scrolling. Wheel, drag and keyboard all write
 * to a single target offset; a spring follows it and the track is moved by
 * transform. That keeps the glide, the settle onto a monument and the focus
 * falloff on one clock, instead of letting CSS scroll-snap fight the wheel.
 */
export function Skyline({
  monuments,
  query,
  vertical,
  onSelect,
  selectedSlug,
}: SkylineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());
  const metricsRef = useRef<Metrics>({
    centres: new Map(),
    min: 0,
    max: 0,
    viewport: 0,
  });

  const activeRef = useRef<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  /**
   * Where a deliberate step is heading. Pressing an arrow names its destination
   * straight away instead of waiting for the spring to carry that monument to
   * the centre, and stops the caption flicking through everything in between.
   */
  const travellingToRef = useRef<string | null>(null);
  /**
   * Until the reader moves the skyline themselves, the resting position is
   * re-derived on every measurement. The first measure can land before
   * `clamp()` and the webfonts resolve, and a position computed from that
   * geometry is wrong by roughly a monument.
   */
  const userMovedRef = useRef(false);

  const reduceMotion = useReducedMotion();
  const target = useMotionValue(0);
  const glide = useSpring(target, reduceMotion ? INSTANT : GLIDE);
  const translate = useTransform(glide, (value) => -value);

  const matched = useMemo(
    () =>
      new Set(
        monuments.filter((m) => matchesQuery(m, query)).map((m) => m.slug)
      ),
    [monuments, query]
  );

  // Read inside pointer handlers and the spring subscriber, which must not be
  // rebuilt on every keystroke.
  const matchedRef = useRef(matched);
  matchedRef.current = matched;

  const clamp = useCallback((value: number) => {
    const { min, max } = metricsRef.current;
    return Math.min(max, Math.max(min, value));
  }, []);

  /** Re-reads the laid-out geometry. Cheap, and only on mount / resize. */
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const size = vertical ? viewport.clientHeight : viewport.clientWidth;
    const centres = new Map<string, number>();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const [slug, el] of itemsRef.current) {
      const centre = vertical
        ? el.offsetTop + el.offsetHeight / 2
        : el.offsetLeft + el.offsetWidth / 2;
      centres.set(slug, centre);

      const offset = centre - size / 2;
      min = Math.min(min, offset);
      max = Math.max(max, offset);
    }

    if (!Number.isFinite(min)) return;
    metricsRef.current = { centres, min, max, viewport: size };
  }, [vertical]);

  /** The resting offset that centres a given monument. */
  const offsetFor = useCallback((slug: string) => {
    const { centres, viewport } = metricsRef.current;
    const centre = centres.get(slug);
    return centre === undefined ? null : centre - viewport / 2;
  }, []);

  /** Nearest monument the skyline is allowed to rest on — never a ghost. */
  const nearestRest = useCallback(
    (offset: number) => {
      const { centres, viewport } = metricsRef.current;
      let best = offset;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const [slug, centre] of centres) {
        if (!matchedRef.current.has(slug)) continue;
        const candidate = centre - viewport / 2;
        const distance = Math.abs(candidate - offset);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = candidate;
        }
      }
      return best;
    },
    []
  );

  /**
   * Writes `--focus` on every monument from its distance to the centre, and
   * promotes the nearest surviving match to active. Driven by the spring, so it
   * stays in step with what is actually on screen.
   */
  const applyFocus = useCallback(
    (offset: number) => {
      const { centres, viewport } = metricsRef.current;
      if (!viewport) return;

      const centre = offset + viewport / 2;
      const falloff = viewport * (vertical ? 0.5 : 0.3);

      let bestSlug: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const [slug, el] of itemsRef.current) {
        const itemCentre = centres.get(slug);
        if (itemCentre === undefined) continue;

        const distance = Math.abs(itemCentre - centre);
        const t = Math.max(0, 1 - distance / falloff);
        el.style.setProperty("--focus", (t * t * (3 - 2 * t)).toFixed(3));

        if (matchedRef.current.has(slug) && distance < bestDistance) {
          bestDistance = distance;
          bestSlug = slug;
        }
      }

      // Hold the named destination until the skyline actually reaches it, then
      // fall through so the arrival is synced like any other move.
      if (travellingToRef.current) {
        if (bestSlug !== travellingToRef.current) return;
        travellingToRef.current = null;
      }

      if (bestSlug !== activeRef.current) {
        activeRef.current = bestSlug;
        setActiveSlug(bestSlug);
      }
    },
    [vertical]
  );

  useMotionValueEvent(glide, "change", applyFocus);

  /**
   * Moves the skyline to an offset. The spring normally carries it there, but a
   * hidden tab gets no animation frames and reduced motion asks for none — in
   * both cases the value is jumped so the destination is still reached.
   */
  const glideTo = useCallback(
    (offset: number) => {
      const next = clamp(offset);
      userMovedRef.current = true;
      target.set(next);

      if (reduceMotion || document.hidden) {
        glide.jump(next);
        applyFocus(next);
      }
    },
    [clamp, target, glide, reduceMotion, applyFocus]
  );

  // Measure once laid out, and whenever the box changes.
  useLayoutSync(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const sync = () => {
      measure();
      if (!userMovedRef.current) {
        const slug = monuments[0]?.slug;
        const resting = slug ? offsetFor(slug) : null;
        const start = clamp(resting ?? metricsRef.current.min);
        target.set(start);
        glide.jump(start);
      }
      applyFocus(glide.get());
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    // Also watch the track: fonts loading or clamp() resolving changes the
    // monuments' own widths, which moves every centre.
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [
    measure,
    applyFocus,
    offsetFor,
    clamp,
    target,
    glide,
    monuments,
  ]);

  /*
    Centre the open monument while its record covers the skyline. Jumped, not
    glided: the return flight measures this slot the instant the record closes,
    so it has to already be in its final place — and none of it is visible.
  */
  useLayoutSync(() => {
    if (!selectedSlug) return;
    const offset = offsetFor(selectedSlug);
    if (offset === null) return;

    const resting = clamp(offset);
    userMovedRef.current = true;
    target.set(resting);
    glide.jump(resting);
    applyFocus(resting);
  }, [selectedSlug, offsetFor, clamp, target, glide, applyFocus]);

  // Wheel and trackpad. Both axes are accepted so a sideways swipe works too.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let settle: ReturnType<typeof setTimeout>;

    const onWheel = (event: WheelEvent) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (!delta) return;

      event.preventDefault();
      userMovedRef.current = true;
      // Taking the wheel abandons any step in progress.
      travellingToRef.current = null;
      target.set(clamp(target.get() + delta));

      // Let the gesture finish, then ease onto the nearest monument.
      clearTimeout(settle);
      settle = setTimeout(() => target.set(nearestRest(target.get())), 140);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      clearTimeout(settle);
    };
  }, [clamp, nearestRest, target]);

  // Pointer drag — this is also what carries touch on mobile.
  const dragRef = useRef<{
    id: number;
    from: number;
    origin: number;
    travelled: number;
    captured: boolean;
  } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = {
      id: event.pointerId,
      from: vertical ? event.clientY : event.clientX,
      origin: target.get(),
      travelled: 0,
      captured: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const position = vertical ? event.clientY : event.clientX;
    const moved = position - drag.from;
    drag.travelled = Math.max(drag.travelled, Math.abs(moved));

    // Capture is deferred until the gesture is unambiguously a drag: capturing
    // on pointerdown would retarget the click away from the monument, and the
    // silhouette is the only way into a record.
    if (!drag.captured) {
      if (drag.travelled <= DRAG_THRESHOLD) return;
      drag.captured = true;
      userMovedRef.current = true;
      travellingToRef.current = null;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    target.set(clamp(drag.origin - moved));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    dragRef.current = null;
    if (drag.captured) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      target.set(nearestRest(target.get()));
    }
    lastTravelRef.current = drag.travelled;
  };

  // A drag that ends over a monument must not also open it.
  const lastTravelRef = useRef(0);
  const onClickCapture = (event: React.MouseEvent) => {
    if (lastTravelRef.current > DRAG_THRESHOLD) {
      event.preventDefault();
      event.stopPropagation();
    }
    lastTravelRef.current = 0;
  };

  // Ghost out everything the search no longer matches.
  useEffect(() => {
    for (const [slug, el] of itemsRef.current) {
      el.style.setProperty("--dim", matched.has(slug) ? "1" : "0.07");
    }
  }, [matched]);

  // Glide to the first surviving match as the query narrows.
  useEffect(() => {
    if (!query.trim()) return;
    const first = monuments.find((m) => matched.has(m.slug));
    if (!first) return;

    const offset = offsetFor(first.slug);
    if (offset !== null) glideTo(offset);
  }, [query, matched, monuments, offsetFor, glideTo]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const order = monuments.filter((m) => matched.has(m.slug));
      const index = order.findIndex((m) => m.slug === activeRef.current);
      const next = order[index + direction];
      if (!next) return;

      const offset = offsetFor(next.slug);
      if (offset === null) return;

      // Name the destination now; the spring catches up.
      travellingToRef.current = next.slug;
      activeRef.current = next.slug;
      setActiveSlug(next.slug);
      glideTo(offset);
    },
    [monuments, matched, offsetFor, glideTo]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    if (event.key !== forward && event.key !== back) return;
    event.preventDefault();
    step(event.key === forward ? 1 : -1);
  };

  const active = activeSlug
    ? monuments.find((m) => m.slug === activeSlug) ?? null
    : null;

  // Stepping walks the surviving matches, so the arrows never land on a ghost.
  const order = monuments.filter((m) => matched.has(m.slug));
  const position = order.findIndex((m) => m.slug === activeSlug);
  const earlier = position > 0 ? order[position - 1] : null;
  const later =
    position >= 0 && position < order.length - 1 ? order[position + 1] : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
      >
        <motion.ul
          ref={trackRef}
          style={vertical ? { y: translate } : { x: translate }}
          className={cn(
            "skyline-track relative flex will-change-transform",
            vertical
              ? "flex-col items-center px-6"
              : "h-full items-end gap-[clamp(3rem,7vw,8rem)] px-[50%]"
          )}
        >
          {monuments.map((monument, index) => (
            <SkylineItem
              key={monument.slug}
              monument={monument}
              index={index}
              vertical={vertical}
              isActive={monument.slug === activeSlug}
              onSelect={onSelect}
              register={(el) => {
                if (el) itemsRef.current.set(monument.slug, el);
                else itemsRef.current.delete(monument.slug);
              }}
            />
          ))}
        </motion.ul>

        {/* Ground. Sits over the track so it swallows the monuments' feet. */}
        <div
          className="skyline-ground pointer-events-none absolute inset-x-0 bottom-0 h-[15%]"
          aria-hidden="true"
        />
      </div>

      <SkylineCaption
        active={active}
        nothingMatched={matched.size === 0}
        query={query}
        vertical={vertical}
        earlier={earlier}
        later={later}
        onStep={step}
      />
    </div>
  );
}

function SkylineItem({
  monument,
  index,
  vertical,
  isActive,
  onSelect,
  register,
}: {
  monument: Monument;
  index: number;
  vertical: boolean;
  isActive: boolean;
  onSelect: (monument: Monument) => void;
  register: (el: HTMLElement | null) => void;
}) {
  const art = MONUMENT_ART[monument.slug];

  const artStyle: CSSProperties = vertical
    ? {
        width: "calc(var(--sky-w) * (0.72 + 0.28 * var(--sky-scale)))",
        height:
          "calc(var(--sky-w) * (0.72 + 0.28 * var(--sky-scale)) / var(--sky-aspect))",
      }
    : {
        // Compressed rather than literal: real relative heights would leave the
        // low, wide monuments too small to read next to a 60 m minaret.
        height: "calc(var(--sky-h) * (0.5 + 0.5 * var(--sky-scale)))",
        width:
          "calc(var(--sky-h) * (0.5 + 0.5 * var(--sky-scale)) * var(--sky-aspect))",
      };

  return (
    <li
      ref={register}
      className={cn(
        "monument-item relative shrink-0",
        vertical
          ? "flex min-h-[58vh] w-full items-center justify-center"
          : "flex items-end"
      )}
      style={
        {
          "--sky-scale": monument.scale,
          "--sky-aspect": art?.aspect ?? 1,
        } as CSSProperties
      }
    >
      {/* Oversized year, sitting behind the silhouette. */}
      <span
        aria-hidden="true"
        className="monument-item__year pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-[clamp(5rem,14vw,13rem)] leading-none text-ink"
        style={{ bottom: vertical ? "50%" : "18%" }}
      >
        {monument.year}
      </span>

      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="u-eyebrow pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/50 bg-paper/85 px-3 py-1.5 text-ink backdrop-blur-sm"
            style={{ bottom: vertical ? "84%" : "calc(100% + 0.75rem)" }}
          >
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-gold align-middle" />
            {monument.place}
          </motion.span>
        )}
      </AnimatePresence>

      {/*
        Entrance lives on its own wrapper: the `<li>` opacity belongs to the
        focus state, and the button's transform belongs to the focus lift, so
        neither can be overwritten by an inline animated style.
      */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: Math.min(index * 0.06, 0.6),
          duration: 0.7,
          ease: EASE,
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(monument)}
          aria-label={`${monument.name}, ${monument.place}, ${monument.yearLabel}`}
          className="monument-item__lift block cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-gold"
          style={artStyle}
        >
          {/*
            Hidden rather than unmounted while its record is open. The record
            hero measures this exact box to fly from and back to, and a hidden
            element still reports its rect — so the slot stays measurable, the
            eleven silhouettes never rebuild, and nothing reflows.
          */}
          <span
            data-monument-slot={monument.slug}
            className="block h-full w-full"
          >
            <MonumentSilhouette slug={monument.slug} />
          </span>
        </button>
      </motion.div>
    </li>
  );
}

function SkylineCaption({
  active,
  nothingMatched,
  query,
  vertical,
  earlier,
  later,
  onStep,
}: {
  active: Monument | null;
  nothingMatched: boolean;
  query: string;
  vertical: boolean;
  earlier: Monument | null;
  later: Monument | null;
  onStep: (direction: 1 | -1) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center gap-3 bg-paper px-4 pb-7 text-center sm:gap-6 sm:px-8",
        vertical ? "min-h-[4.5rem]" : "min-h-[5.5rem]"
      )}
    >
      <StepButton
        monument={earlier}
        direction={-1}
        vertical={vertical}
        onStep={onStep}
      />

      <div className="min-w-0 flex-1">
      <AnimatePresence mode="wait">
        {nothingMatched ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-ink-faint"
          >
            No monument matches <span className="text-ink">“{query}”</span>.
          </motion.p>
        ) : active ? (
          <motion.div
            key={active.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto max-w-xl"
          >
            <h2 className="font-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1] text-ink">
              {active.name}
            </h2>
            <p className="u-eyebrow mt-1.5 text-ink-faint">
              {active.yearLabel} · {active.region}
            </p>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </div>

      <StepButton
        monument={later}
        direction={1}
        vertical={vertical}
        onStep={onStep}
      />
    </div>
  );
}

/**
 * Sits at the outer edge of the caption row. Disabled rather than hidden at
 * either end of the line, so the title never shifts sideways as you step.
 */
function StepButton({
  monument,
  direction,
  vertical,
  onStep,
}: {
  monument: Monument | null;
  direction: 1 | -1;
  vertical: boolean;
  onStep: (direction: 1 | -1) => void;
}) {
  const isLater = direction === 1;
  const glyph = vertical ? (isLater ? "↓" : "↑") : isLater ? "→" : "←";

  return (
    <button
      type="button"
      disabled={!monument}
      onClick={() => onStep(direction)}
      aria-label={
        monument
          ? `${isLater ? "Later" : "Earlier"}: ${monument.name}, ${monument.yearLabel}`
          : `No ${isLater ? "later" : "earlier"} monument`
      }
      title={monument ? monument.name : undefined}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border text-lg transition-colors",
        monument
          ? "cursor-pointer border-ink/15 text-ink hover:border-ink/40 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          : "cursor-default border-ink/5 text-ink-faint/40"
      )}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
