import type { CSSProperties } from "react";
import { MONUMENT_ART } from "@/lib/monument-art";
import { cn } from "@/lib/utils";

/**
 * Renders a traced monument silhouette. The generated art uses
 * `fill="currentColor"`, so the colour comes entirely from the `color` of an
 * ancestor — which is what lets the focus and ghost states be pure CSS.
 */
export function MonumentSilhouette({
  slug,
  className,
  style,
}: {
  slug: string;
  className?: string;
  style?: CSSProperties;
}) {
  const art = MONUMENT_ART[slug];
  if (!art) return null;

  return (
    <svg
      viewBox={art.viewBox}
      preserveAspectRatio="xMidYMax meet"
      className={cn("block h-full w-full", className)}
      style={style}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: art.body }}
    />
  );
}
