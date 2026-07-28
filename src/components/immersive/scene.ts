import * as THREE from "three";
import type { Monument } from "@/data/monuments";
import type { Community } from "@/data/monument-community";

/**
 * The immersive room, in plain three.js.
 *
 * Every monument gets a gallery: its photographs hung in an arc around the
 * viewer, the traced silhouette as a wall piece, and the community text as
 * plaques behind. Elmina and Cape Coast additionally carry a panorama mode —
 * their Commons panoramas are wide stitched sweeps, not 360° spheres (none
 * exist for these monuments), so they wrap a partial cylinder arc rather than
 * pretending to a full wrap.
 *
 * Materials are all unlit: the room is meant to read as the site's paper and
 * ink, not as a rendered space.
 */

const PAPER = 0xf7f5f0;
const PAPER_DEEP = 0xefece4;
const CARD = 0xfdfcfa;
const INK = "#14100e";
const INK_SOFT = "#4a423c";
const INK_FAINT = "#8c827a";
const GOLD = "#a6851f";

const EYE = 1.6;

export type PanoAsset = {
  file: string;
  width: number;
  height: number;
  title: string;
  credit: string;
};

export type PhotoAsset = {
  file: string;
  width: number;
  height: number;
  title: string;
  credit: string;
};

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  monument: Monument;
  community: Community | null;
  art: { viewBox: string; body: string };
  photos: PhotoAsset[];
  pano: PanoAsset | null;
  /** Fired once the room's centrepiece texture is in. */
  onReady: () => void;
};

export type ImmersiveHandle = {
  setMode: (mode: "gallery" | "pano") => void;
  enableGyro: () => Promise<boolean>;
  vrSupported: () => Promise<boolean>;
  enterVR: () => Promise<void>;
  dispose: () => void;
};

/** Position on a circle where angle 0 faces the camera's initial view (-Z). */
function onCircle(angleDeg: number, radius: number, y: number) {
  const a = (angleDeg * Math.PI) / 180;
  return new THREE.Vector3(radius * Math.sin(a), y, -radius * Math.cos(a));
}

function resolveSerif(): string {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-instrument-serif")
    .trim();
  return family || "Georgia, serif";
}

type TextBlock = {
  text: string;
  font: string;
  size: number;
  color: string;
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  spaceAfter?: number;
};

/** Renders stacked text blocks onto a card and returns it as a texture. */
function makeCardTexture(
  blocks: TextBlock[],
  {
    widthPx = 640,
    pad = 44,
    background = CARD,
    borderless = false,
  }: { widthPx?: number; pad?: number; background?: number; borderless?: boolean } = {}
): { texture: THREE.CanvasTexture; aspect: number } {
  const dpr = 2;
  const measure = document.createElement("canvas").getContext("2d")!;

  type Line = { text: string; block: TextBlock };
  const lines: Line[] = [];
  const inner = widthPx - pad * 2;

  for (const block of blocks) {
    measure.font = `${block.size}px ${block.font}`;
    const words = (block.uppercase ? block.text.toUpperCase() : block.text).split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure.measureText(candidate).width > inner && current) {
        lines.push({ text: current, block });
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push({ text: current, block });
    lines[lines.length - 1].block = { ...block, spaceAfter: block.spaceAfter ?? 0 };
  }

  let heightPx = pad * 2;
  for (const line of lines) {
    heightPx += line.block.size * (line.block.lineHeight ?? 1.45);
    heightPx += line.block.spaceAfter ?? 0;
  }

  const canvas = document.createElement("canvas");
  canvas.width = widthPx * dpr;
  canvas.height = Math.round(heightPx) * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = `#${background.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, widthPx, heightPx);
  if (!borderless) {
    ctx.strokeStyle = "rgba(20, 16, 14, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, widthPx - 2, heightPx - 2);
  }

  let y = pad;
  for (const line of lines) {
    const b = line.block;
    ctx.font = `${b.size}px ${b.font}`;
    ctx.fillStyle = b.color;
    // Supported in current engines; silently ignored elsewhere, which is fine.
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      b.letterSpacing ? `${b.letterSpacing}px` : "0px";
    y += b.size;
    ctx.fillText(line.text, pad, y);
    y += b.size * ((b.lineHeight ?? 1.45) - 1);
    y += b.spaceAfter ?? 0;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: widthPx / heightPx };
}

/** A flat plane that fades in when its texture is ready. */
function makePanel(
  texture: THREE.Texture,
  width: number,
  aspect: number
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / aspect),
    material
  );
  mesh.userData.fadeIn = true;
  return mesh;
}

export function createImmersiveScene(options: SceneOptions): ImmersiveHandle {
  const { canvas, monument, community, art, photos, pano, onReady } = options;
  const serif = resolveSerif();
  const mono = "ui-monospace, Menlo, monospace";
  const sans = "-apple-system, 'Segoe UI', Roboto, sans-serif";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.xr.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 9, 17);

  // Rig: gyro writes the inner rotation, drag adds yaw on the outer.
  const yawRig = new THREE.Group();
  const gyroRig = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    60
  );
  camera.position.set(0, EYE, 0);
  gyroRig.add(camera);
  yawRig.add(gyroRig);
  scene.add(yawRig);

  // Ground: a paper disc with a hairline ring where the room stands.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshBasicMaterial({ color: PAPER_DEEP })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.55, 4.6, 96),
    new THREE.MeshBasicMaterial({
      color: 0x14100e,
      transparent: true,
      opacity: 0.12,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  const gallery = new THREE.Group();
  const panoGroup = new THREE.Group();
  panoGroup.visible = false;
  scene.add(gallery, panoGroup);

  const disposables: { dispose: () => void }[] = [renderer];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const loader = new THREE.TextureLoader();
  const loadTexture = (file: string, onLoad?: (t: THREE.Texture) => void) =>
    track(
      loader.load(file, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        onLoad?.(t);
      })
    );

  /* ---------- gallery room ---------- */

  // The silhouette, rasterised from the same traced SVG the skyline uses.
  {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}" style="color:${INK}">${art.body}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const aspect = image.width / image.height;
      const raster = document.createElement("canvas");
      raster.width = 2048;
      raster.height = Math.round(2048 / aspect);
      raster.getContext("2d")!.drawImage(image, 0, 0, raster.width, raster.height);

      const texture = track(new THREE.CanvasTexture(raster));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;

      const width = Math.min(4.4, 3.0 * aspect);
      const wall = makePanel(texture, width, aspect);
      wall.position.copy(onCircle(0, 4.5, 0.55 + width / aspect / 2));
      wall.lookAt(0, wall.position.y, 0);
      gallery.add(wall);
      onReady();
    };
    image.onerror = () => onReady();
    image.src = url;
  }

  // Name plaque under the silhouette.
  {
    const { texture, aspect } = makeCardTexture(
      [
        {
          text: `${monument.yearLabel} · ${monument.region}`,
          font: mono,
          size: 20,
          color: GOLD,
          uppercase: true,
          letterSpacing: 3,
          spaceAfter: 14,
        },
        { text: monument.name, font: serif, size: 58, color: INK, spaceAfter: 10 },
        {
          text: monument.tagline,
          font: `italic ${serif}`,
          size: 30,
          color: INK_SOFT,
        },
      ],
      { widthPx: 760 }
    );
    const plaque = makePanel(texture, 1.9, aspect);
    plaque.position.copy(onCircle(0, 4.3, 0.02));
    plaque.position.y = 1.9 / aspect / 2 + 0.32;
    plaque.lookAt(0, plaque.position.y, 0);
    gallery.add(plaque);
  }

  // Photographs, hung in symmetric pairs working outward from the front.
  const anglesFor = (count: number) => {
    const slots = [50, -50, 95, -95, 140, -140];
    return slots.slice(0, count);
  };
  photos.slice(0, 6).forEach((photo, index) => {
    const angle = anglesFor(Math.min(photos.length, 6))[index];
    const aspect = photo.width / photo.height;
    const width = aspect >= 1 ? 1.7 : 1.15;

    const texture = loadTexture(photo.file);
    const panel = makePanel(texture, width, aspect);
    panel.position.copy(onCircle(angle, 4.1, 0));
    panel.position.y = EYE + 0.05;
    panel.lookAt(0, panel.position.y, 0);

    // Card backing, standing in for a frame.
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.12, width / aspect + 0.12),
      new THREE.MeshBasicMaterial({ color: CARD })
    );
    backing.position.copy(onCircle(angle, 4.16, 0));
    backing.position.y = panel.position.y;
    backing.lookAt(0, backing.position.y, 0);

    const caption = makeCardTexture(
      [
        { text: photo.title || monument.name, font: sans, size: 22, color: INK, spaceAfter: 6 },
        { text: photo.credit, font: mono, size: 15, color: INK_FAINT, uppercase: true, letterSpacing: 2 },
      ],
      { widthPx: 560, pad: 26, borderless: true }
    );
    const captionPanel = makePanel(caption.texture, width * 0.82, caption.aspect);
    captionPanel.position.copy(onCircle(angle, 4.08, 0));
    captionPanel.position.y =
      panel.position.y - width / aspect / 2 - (width * 0.82) / caption.aspect / 2 - 0.09;
    captionPanel.lookAt(0, captionPanel.position.y, 0);

    gallery.add(backing, panel, captionPanel);
  });

  // The community, at your back: turn around and the people are there.
  if (community) {
    const life = makeCardTexture(
      [
        { text: "Life around it", font: mono, size: 18, color: GOLD, uppercase: true, letterSpacing: 3, spaceAfter: 16 },
        { text: community.people, font: serif, size: 34, color: INK, spaceAfter: 14 },
        { text: community.life, font: sans, size: 21, color: INK_SOFT, lineHeight: 1.6 },
      ],
      { widthPx: 700 }
    );
    const culture = makeCardTexture(
      [
        { text: "Culture", font: mono, size: 18, color: GOLD, uppercase: true, letterSpacing: 3, spaceAfter: 16 },
        { text: community.culture, font: sans, size: 21, color: INK_SOFT, lineHeight: 1.6, spaceAfter: community.festival ? 18 : 0 },
        ...(community.festival
          ? [
              { text: `The year turns on ${community.festival.name}`, font: serif, size: 28, color: INK, spaceAfter: 6 } as TextBlock,
              { text: community.festival.when, font: mono, size: 15, color: INK_FAINT, uppercase: true, letterSpacing: 2 } as TextBlock,
            ]
          : []),
      ],
      { widthPx: 700 }
    );

    for (const [angle, card] of [
      [168, life],
      [-168, culture],
    ] as const) {
      const panel = makePanel(card.texture, 1.75, card.aspect);
      panel.position.copy(onCircle(angle, 4.05, 0));
      panel.position.y = EYE + 0.02;
      panel.lookAt(0, panel.position.y, 0);
      gallery.add(panel);
    }
  }

  /* ---------- panorama mode ---------- */

  if (pano) {
    // A partial arc sized so the pixels stay square: these are wide stitches,
    // not spheres, and wrapping them further than they cover would be a lie.
    const height = 3.1;
    const radius = 6;
    const arc = Math.min(
      (pano.width / pano.height) * (height / radius),
      Math.PI * 1.6
    );

    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      96,
      1,
      true,
      Math.PI - arc / 2,
      arc
    );
    const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    const texture = loadTexture(pano.file, () => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      material.map = texture;
      material.needsUpdate = true;
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.y = EYE;
    panoGroup.add(wall);
    // No plaque inside the view — the overlay chrome carries title and credit,
    // and anything floating mid-sweep reads as a watermark.
  }

  /* ---------- controls ---------- */

  let yaw = 0;
  let pitch = 0;
  let yawVelocity = 0;
  let pitchVelocity = 0;
  let pitchLimit = 0.55;
  let dragging: { id: number; x: number; y: number } | null = null;
  let gyroActive = false;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onPointerDown = (event: PointerEvent) => {
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const k = 2.2 / canvas.clientHeight;
    yaw += dx * k;
    yawVelocity = dx * k;
    if (!gyroActive) {
      pitch = THREE.MathUtils.clamp(pitch + dy * k, -pitchLimit, pitchLimit);
      pitchVelocity = dy * k;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    if (dragging?.id === event.pointerId) dragging = null;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  // Device orientation, using the classic three.js mapping.
  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const qScreen = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha === null) return;
    gyroActive = true;
    const alpha = THREE.MathUtils.degToRad(event.alpha);
    const beta = THREE.MathUtils.degToRad(event.beta ?? 0);
    const gamma = THREE.MathUtils.degToRad(event.gamma ?? 0);
    const orient = THREE.MathUtils.degToRad(
      (screen.orientation?.angle as number) ?? 0
    );
    euler.set(beta, alpha, -gamma, "YXZ");
    gyroRig.quaternion.setFromEuler(euler);
    gyroRig.quaternion.multiply(qScreen);
    gyroRig.quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  };

  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener("resize", onResize);

  /* ---------- loop ---------- */

  const render = () => {
    if (!dragging && !reduceMotion) {
      yaw += yawVelocity;
      yawVelocity *= 0.92;
      if (!gyroActive) {
        pitch = THREE.MathUtils.clamp(pitch + pitchVelocity, -pitchLimit, pitchLimit);
        pitchVelocity *= 0.92;
      }
    }
    yawRig.rotation.y = -yaw;
    if (!gyroActive && !renderer.xr.isPresenting) {
      camera.rotation.x = -pitch;
    }

    // Panels fade in as their textures arrive.
    scene.traverse((object) => {
      if (!object.userData.fadeIn) return;
      const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (material.map?.image && material.opacity < 1) {
        material.opacity = Math.min(1, material.opacity + 0.06);
      }
    });

    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(render);
  // One synchronous frame so even a hidden tab has painted the room once.
  render();

  /* ---------- handle ---------- */

  return {
    setMode(mode) {
      const showPano = mode === "pano" && !!pano;
      panoGroup.visible = showPano;
      gallery.visible = !showPano;
      pitchLimit = showPano ? 0.26 : 0.55;
      pitch = THREE.MathUtils.clamp(pitch, -pitchLimit, pitchLimit);
    },

    async enableGyro() {
      type PermissionAPI = { requestPermission?: () => Promise<string> };
      const api = DeviceOrientationEvent as unknown as PermissionAPI;
      if (typeof api.requestPermission === "function") {
        try {
          if ((await api.requestPermission()) !== "granted") return false;
        } catch {
          return false;
        }
      }
      window.addEventListener("deviceorientation", onOrientation);
      return true;
    },

    async vrSupported() {
      try {
        return (await navigator.xr?.isSessionSupported("immersive-vr")) ?? false;
      } catch {
        return false;
      }
    },

    async enterVR() {
      const session = await navigator.xr!.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor"],
      });
      await renderer.xr.setSession(session);
    },

    dispose() {
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("resize", onResize);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.MeshBasicMaterial | undefined;
        if (material) {
          material.map?.dispose();
          material.dispose();
        }
      });
      for (const d of disposables) d.dispose();
    },
  };
}
