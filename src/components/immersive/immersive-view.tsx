"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  createImmersiveScene,
  type ImmersiveHandle,
} from "@/components/immersive/scene";
import { MONUMENT_ART } from "@/lib/monument-art";
import { communityFor } from "@/data/monument-community";
import manifest from "@/data/immersive-manifest.json";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Monument } from "@/data/monuments";

type ManifestEntry = {
  pano: {
    file: string;
    width: number;
    height: number;
    title: string;
    credit: string;
    licence: string;
    sourceUrl: string;
  } | null;
  photos: {
    file: string;
    width: number;
    height: number;
    title: string;
    credit: string;
    licence: string;
    sourceUrl: string;
  }[];
};

const MANIFEST = manifest as Record<string, ManifestEntry>;

/**
 * Full-screen shell around the three.js room: owns the canvas, the chrome and
 * the mode/gyro/VR affordances. The scene itself lives in scene.ts and is
 * loaded only when this component is — the record dynamic-imports the whole
 * module so three.js never touches the main bundle.
 */
export default function ImmersiveView({
  monument,
  onClose,
}: {
  monument: Monument;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ImmersiveHandle | null>(null);

  const entry = MANIFEST[monument.slug];
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"gallery" | "pano">(
    entry?.pano ? "pano" : "gallery"
  );
  const [vrAvailable, setVrAvailable] = useState(false);
  const [gyro, setGyro] = useState<"unavailable" | "offered" | "on">(
    "unavailable"
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const art = MONUMENT_ART[monument.slug];
    if (!canvas || !entry || !art) return;

    const handle = createImmersiveScene({
      canvas,
      monument,
      community: communityFor(monument.slug),
      art,
      photos: entry.photos,
      pano: entry.pano,
      onReady: () => setReady(true),
    });
    handleRef.current = handle;
    handle.setMode(entry.pano ? "pano" : "gallery");

    handle.vrSupported().then(setVrAvailable);
    if ("DeviceOrientationEvent" in window && "ontouchstart" in window) {
      setGyro("offered");
    }

    return () => {
      handleRef.current = null;
      handle.dispose();
    };
    // The record remounts this component per monument via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monument.slug]);

  // Escape closes the room, not the record beneath it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  const switchMode = (next: "gallery" | "pano") => {
    setMode(next);
    handleRef.current?.setMode(next);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] bg-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
      />

      {/* Loading veil, lifted once the silhouette wall is in. */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper"
        animate={{ opacity: ready ? 0 : 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p className="u-eyebrow text-ink-faint">Entering {monument.name}…</p>
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        className="u-eyebrow absolute left-5 top-5 cursor-pointer rounded-full border border-ink/15 bg-paper px-4 py-2 text-ink transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:left-8 sm:top-8"
      >
        ← Back to record
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-6 hidden text-center sm:block">
        <p className="u-eyebrow text-ink-faint">{monument.name}</p>
      </div>

      <p className="u-eyebrow pointer-events-none absolute inset-x-0 bottom-6 text-center text-ink-faint">
        {gyro === "on" ? "Move your phone to look around" : "Drag to look around"}
      </p>

      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
        {entry?.pano ? (
          <div className="flex overflow-hidden rounded-full border border-ink/15 bg-card">
            {(["pano", "gallery"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={cn(
                  "u-eyebrow cursor-pointer px-4 py-2 transition-colors",
                  mode === value
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                {value === "pano" ? "Panorama" : "Gallery"}
              </button>
            ))}
          </div>
        ) : null}

        {gyro === "offered" ? (
          <button
            type="button"
            onClick={async () => {
              const granted = await handleRef.current?.enableGyro();
              setGyro(granted ? "on" : "unavailable");
            }}
            className="u-eyebrow cursor-pointer rounded-full border border-ink/15 bg-card px-4 py-2 text-ink transition-colors hover:border-ink/40"
          >
            Use motion
          </button>
        ) : null}

        {vrAvailable ? (
          <button
            type="button"
            onClick={() => handleRef.current?.enterVR()}
            className="u-eyebrow cursor-pointer rounded-full bg-forest px-4 py-2 text-paper transition-opacity hover:opacity-90"
          >
            Enter VR
          </button>
        ) : null}
      </div>

      <p className="u-eyebrow pointer-events-none absolute bottom-6 left-5 hidden max-w-[46%] text-ink-faint/80 sm:left-8 sm:block">
        {mode === "pano" && entry?.pano
          ? `${entry.pano.title} — ${entry.pano.credit} · ${entry.pano.licence}`
          : "Photographs — Wikimedia Commons contributors"}
      </p>
    </motion.div>
  );
}
