"""
Prepares the textures the immersive (WebXR) view stands in.

Two kinds of material, both from Wikimedia Commons:

- Wide panoramas, for the two monuments that have real ones (Elmina and Cape
  Coast). These are flat stitched sweeps, NOT 360-degree spheres — no usable
  spheres of these monuments exist on Commons at all — so the viewer wraps
  them across a partial cylinder arc rather than pretending to a full wrap.
- The six gallery photographs per monument, downscaled to panel size for the
  3D room every monument gets.

Resumable and throttled: Commons rate-limits (429s bit the artifact pipeline
earlier), so existing files on disk are kept and requests are spaced out.

Outputs:
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


media = json.load(open("src/data/monument-media.json"))
manifest = {}

for slug, entry in media.items():
    folder = os.path.join(OUT_DIR, slug)
    os.makedirs(folder, exist_ok=True)
    record = {"pano": None, "photos": []}

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

json.dump(manifest, open(MANIFEST, "w"), indent=1)

total = sum(
    os.path.getsize(os.path.join(root, f))
    for root, _, files in os.walk(OUT_DIR)
    for f in files
)
panos = sum(1 for r in manifest.values() if r["pano"])
photos = sum(len(r["photos"]) for r in manifest.values())
print(f"\n→ {MANIFEST}: {panos} panoramas, {photos} photos, {total / 1e6:.1f} MB on disk")
