/** One easing curve for the whole system — mirrors `--ease-editorial` in CSS. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Must be identical on both ends of the shared `layoutId`. If the skyline and
 * the record disagree about duration or easing, Motion animates the handoff
 * twice on two clocks and the monument visibly stutters mid-flight.
 */
export const SHARED_LAYOUT = {
  duration: 0.58,
  ease: EASE,
} as const;
