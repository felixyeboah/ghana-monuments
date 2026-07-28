"""
Prepares the textures the immersive (WebXR) view stands in.

Three kinds of material:

- True 360-degree photospheres, dropped into assets/photospheres/<slug>.jpg
  by whoever shoots them on location. Commons has none of these monuments, so
  they arrive from contributors; an equirectangular image (2:1) is what every
  phone photosphere app produces. An optional <slug>.json sidecar carries
  {title, credit, licence, sourceUrl}. This script is authoritative: remove
  the source file and the sphere leaves the manifest on the next run.
- Wide panoramas from Wikimedia Commons, for the two monuments that have real
  ones (Elmina and Cape Coast). These are flat stitched sweeps, so the viewer
  wraps them across a partial cylinder arc rather than pretending to a wrap.
- The six gallery photographs per monument, downscaled to panel size for the
  3D room every monument gets.

Resumable and throttled: Commons rate-limits (429s bit the artifact pipeline
earlier), so existing files on disk are kept and requests are spaced out.

Outputs:
  public/immersive/<slug>/sphere.webp      (where a photosphere was dropped in)
  public/immersive/<slug>/pano.webp        (where a panorama exists)
  public/immersive/<slug>/photo-<n>.webp
  src/data/immersive-manifest.json         (sizes + attribution, the viewer's index)

Run: python3 scripts/build-immersive-assets.py
"""
import io
import json
import os
import time
import urllib.request

from PIL import Image

UA = "ghana-monuments/0.1 (educational; kennethjeffersonmensah@gmail.com)"
OUT_DIR = "public/immersive"
MANIFEST = "src/data/immersive-manifest.json"
SPHERES_DIR = "assets/photospheres"

# Sphere textures: the entire image surrounds the viewer, so this is the one
# place resolution is the whole experience. 8192x4096 suits an equirect 2:1.
SPHERE_WIDTH = 8192
SPHERE_QUALITY = 78
# Equirectangular means exactly two-to-one; anything else is a different
# projection and would warp on the sphere.
SPHERE_RATIO_TOLERANCE = 0.05

# Panel textures: several share the view at once, so 1024 wide is plenty.
PHOTO_WIDTH = 1024
PHOTO_QUALITY = 70
# Panorama textures: spread across a wide arc, so resolution is the experience.
# 8192 stays inside common GPU texture limits.
PANO_WIDTH = 8192
PANO_QUALITY = 74

PANOS = {
    "elmina-castle": {
        "src": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Castle%2C_Elmina_%28P1100203-Pano%29.jpg",
        "title": "Elmina Castle, panoramic sweep",
        "credit": "Matti Blume — Wikimedia Commons",
        "licence": "CC BY-SA 4.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Castle,_Elmina_(P1100203-Pano).jpg",
    },
    "cape-coast-castle": {
        "src": "https://upload.wikimedia.org/wikipedia/commons/3/33/Panorama_over_Town_from_Fort_Victoria_%E2%88%92_Cape_Coast_%E2%88%92_Central_region.jpg",
        "title": "Cape Coast from Fort Victoria",
        "credit": "Adam Jones — Wikimedia Commons",
        "licence": "CC BY-SA 2.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Panorama_over_Town_from_Fort_Victoria_%E2%88%92_Cape_Coast_%E2%88%92_Central_region.jpg",
    },
}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except Exception as error:  # noqa: BLE001 — back off and retry
            if attempt == 3:
                raise
            print(f"    retry {attempt + 1}: {error}")
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("unreachable")


def convert(raw: bytes, max_width: int, quality: int, path: str) -> tuple[int, int]:
    image = Image.open(io.BytesIO(raw))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), Image.LANCZOS)
    image.save(path, format="WEBP", quality=quality, method=6)
    return image.width, image.height


def find_sphere_source(slug: str) -> str | None:
    for ext in ("jpg", "jpeg", "png", "webp"):
        path = os.path.join(SPHERES_DIR, f"{slug}.{ext}")
        if os.path.exists(path):
            return path
    return None


def build_sphere(slug: str, folder: str) -> dict | None:
    """Converts a dropped-in photosphere, or clears its output if withdrawn."""
    out = os.path.join(folder, "sphere.webp")
    source = find_sphere_source(slug)

    if source is None:
        if os.path.exists(out):
            os.remove(out)
            print(f"{slug:26} sphere source withdrawn — output removed")
        return None

    with Image.open(source) as im:
        ratio = im.width / im.height
    if abs(ratio - 2.0) > 2.0 * SPHERE_RATIO_TOLERANCE:
        print(
            f"{slug:26} SKIPPED sphere: {ratio:.2f}:1 is not equirectangular "
            "(a photosphere app exports exactly 2:1)"
        )
        return None

    fresh = not os.path.exists(out) or os.path.getmtime(source) > os.path.getmtime(out)
    if fresh:
        with open(source, "rb") as f:
            width, height = convert(f.read(), SPHERE_WIDTH, SPHERE_QUALITY, out)
        print(f"{slug:26} sphere {width}x{height} {os.path.getsize(out)//1024} KB")
    else:
        with Image.open(out) as im:
            width, height = im.size
        print(f"{slug:26} sphere cached {width}x{height}")

    # Attribution rides in an optional sidecar next to the image.
    meta = {}
    sidecar = os.path.join(SPHERES_DIR, f"{slug}.json")
    if os.path.exists(sidecar):
        meta = json.load(open(sidecar))

    return {
        "file": f"/immersive/{slug}/sphere.webp",
        "width": width,
        "height": height,
        "title": meta.get("title", "Inside the site — 360° photosphere"),
        "credit": meta.get("credit", "Project contributor"),
        "licence": meta.get("licence", "All rights reserved"),
        "sourceUrl": meta.get("sourceUrl"),
    }


media = json.load(open("src/data/monument-media.json"))
manifest = {}

for slug, entry in media.items():
    folder = os.path.join(OUT_DIR, slug)
    os.makedirs(folder, exist_ok=True)
    record = {"sphere": build_sphere(slug, folder), "pano": None, "photos": []}

    pano = PANOS.get(slug)
    if pano:
        path = os.path.join(folder, "pano.webp")
        if os.path.exists(path):
            with Image.open(path) as im:
                width, height = im.size
            print(f"{slug:26} pano cached {width}x{height}")
        else:
            print(f"{slug:26} pano downloading…")
            width, height = convert(fetch(pano["src"]), PANO_WIDTH, PANO_QUALITY, path)
            print(f"{slug:26} pano {width}x{height} {os.path.getsize(path)//1024} KB")
            time.sleep(3)
        record["pano"] = {
            "file": f"/immersive/{slug}/pano.webp",
            "width": width,
            "height": height,
            "title": pano["title"],
            "credit": pano["credit"],
            "licence": pano["licence"],
            "sourceUrl": pano["sourceUrl"],
        }

    for index, photo in enumerate(entry.get("photos") or []):
        path = os.path.join(folder, f"photo-{index}.webp")
        if os.path.exists(path):
            with Image.open(path) as im:
                width, height = im.size
        else:
            try:
                width, height = convert(
                    fetch(photo["src"]), PHOTO_WIDTH, PHOTO_QUALITY, path
                )
                print(f"{slug:26} photo-{index} {os.path.getsize(path)//1024} KB")
                time.sleep(2)
            except Exception as error:  # noqa: BLE001 — skip, room lays out around it
                print(f"{slug:26} photo-{index} FAILED {error}")
                continue
        record["photos"].append(
            {
                "file": f"/immersive/{slug}/photo-{index}.webp",
                "width": width,
                "height": height,
                "title": photo["title"],
                "credit": photo["credit"],
                "licence": photo["licence"],
                "sourceUrl": photo["sourceUrl"],
            }
        )

    manifest[slug] = record

# Atomic replace: the dev server watches this file, and a plain open(..., "w")
# truncates first — the watcher catches the empty moment and errors.
with open(MANIFEST + ".tmp", "w") as f:
    json.dump(manifest, f, indent=1)
os.replace(MANIFEST + ".tmp", MANIFEST)

total = sum(
    os.path.getsize(os.path.join(root, f))
    for root, _, files in os.walk(OUT_DIR)
    for f in files
)
spheres = sum(1 for r in manifest.values() if r["sphere"])
panos = sum(1 for r in manifest.values() if r["pano"])
photos = sum(len(r["photos"]) for r in manifest.values())
print(
    f"\n→ {MANIFEST}: {spheres} spheres, {panos} panoramas, "
    f"{photos} photos, {total / 1e6:.1f} MB on disk"
)
