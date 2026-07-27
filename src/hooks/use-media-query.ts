"use client";

import { useEffect, useState } from "react";

/**
 * Returns false during SSR and the first client render, so the server markup
 * and the hydration pass always agree. Callers should treat false as "not yet
 * known" and pick a layout that is safe either way.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
