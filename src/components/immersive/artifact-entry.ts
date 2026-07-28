/**
 * The immersive room for the single-file Artifact.
 *
 * Bundled (with three.js and scene.ts) by build-artifact.mjs via esbuild and
 * inlined into the page, so the Artifact and the app render the identical
 * scene from the identical module — only the chrome differs: this one is
 * vanilla DOM against the artifact's own CSS classes instead of React.
 *
 * Exposes exactly one global, window.__immersive.open(payload).
 */
import {
  createImmersiveScene,
  type ImmersiveHandle,
  type ImmersiveMode,
  type PanoAsset,
  type PhotoAsset,
  type SphereAsset,
} from "./scene";
import type { Monument } from "@/data/monuments";
import type { Community } from "@/data/monument-community";

export type ImmersivePayload = {
  monument: Monument;
  community: Community | null;
  art: { viewBox: string; body: string };
  photos: PhotoAsset[];
  pano: (PanoAsset & { licence?: string }) | null;
  sphere: (SphereAsset & { licence?: string }) | null;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

let handle: ImmersiveHandle | null = null;
let overlay: HTMLDivElement | null = null;
let onKey: ((event: KeyboardEvent) => void) | null = null;

function close() {
  if (onKey) window.removeEventListener("keydown", onKey, { capture: true });
  onKey = null;
  handle?.dispose();
  handle = null;
  overlay?.remove();
  overlay = null;
}

function open(payload: ImmersivePayload) {
  close();
  const { monument, pano, sphere } = payload;

  overlay = el("div", "imm");
  const canvas = document.createElement("canvas");
  canvas.className = "imm-canvas";
  overlay.appendChild(canvas);

  const veil = el("div", "imm-veil");
  veil.appendChild(el("p", "eyebrow", `Entering ${monument.name}…`));
  overlay.appendChild(veil);

  const back = el("button", "back eyebrow", "← Back to record");
  back.type = "button";
  back.addEventListener("click", close);
  overlay.appendChild(back);

  const title = el("p", "imm-title eyebrow", monument.name);
  overlay.appendChild(title);

  const hint = el("p", "imm-hint eyebrow", "Drag to look around");
  overlay.appendChild(hint);

  const credit = el("p", "imm-credit eyebrow");
  overlay.appendChild(credit);

  const controls = el("div", "imm-controls");
  overlay.appendChild(controls);

  const setCredit = (mode: ImmersiveMode) => {
    credit.textContent =
      mode === "sphere" && sphere
        ? `${sphere.title} — ${sphere.credit} · ${sphere.licence ?? ""}`
        : mode === "pano" && pano
          ? `${pano.title} — ${pano.credit} · ${pano.licence ?? ""}`
          : "Photographs — Wikimedia Commons contributors";
  };

  document.body.appendChild(overlay);

  handle = createImmersiveScene({
    canvas,
    monument,
    community: payload.community,
    art: payload.art,
    photos: payload.photos,
    pano,
    sphere,
    onReady: () => veil.classList.add("imm-veil--lifted"),
  });

  const initial: ImmersiveMode = sphere ? "sphere" : pano ? "pano" : "gallery";
  handle.setMode(initial);
  setCredit(initial);

  // Mode chips, only when there is more than the gallery to switch to.
  const modes: { value: ImmersiveMode; label: string }[] = [
    ...(sphere ? [{ value: "sphere" as const, label: "360°" }] : []),
    ...(pano ? [{ value: "pano" as const, label: "Panorama" }] : []),
    { value: "gallery", label: "Gallery" },
  ];
  if (modes.length > 1) {
    const chips = el("div", "imm-chips");
    for (const { value, label } of modes) {
      const chip = el("button", "imm-chip eyebrow", label);
      chip.type = "button";
      if (value === initial) chip.classList.add("imm-chip--on");
      chip.addEventListener("click", () => {
        handle?.setMode(value);
        setCredit(value);
        for (const other of chips.children) other.classList.remove("imm-chip--on");
        chip.classList.add("imm-chip--on");
      });
      chips.appendChild(chip);
    }
    controls.appendChild(chips);
  }

  if ("DeviceOrientationEvent" in window && "ontouchstart" in window) {
    const gyro = el("button", "imm-btn eyebrow", "Use motion");
    gyro.type = "button";
    gyro.addEventListener("click", async () => {
      const granted = await handle?.enableGyro();
      if (granted) {
        gyro.remove();
        hint.textContent = "Move your phone to look around";
      }
    });
    controls.appendChild(gyro);
  }

  handle.vrSupported().then((supported) => {
    if (!supported || !overlay) return;
    const vr = el("button", "imm-btn imm-btn--vr eyebrow", "Enter VR");
    vr.type = "button";
    vr.addEventListener("click", () => handle?.enterVR());
    controls.appendChild(vr);
  });

  // Escape closes the room, not the record beneath it.
  onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopImmediatePropagation();
    close();
  };
  window.addEventListener("keydown", onKey, { capture: true });
}

declare global {
  interface Window {
    __immersive: { open: (payload: ImmersivePayload) => void; close: () => void };
  }
}

window.__immersive = { open, close };
