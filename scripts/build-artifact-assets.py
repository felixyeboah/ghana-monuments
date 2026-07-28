"""
Prepares the two things the Artifact must carry inside the file itself: one
photograph per monument, and the display face.

An Artifact is a single HTML document under a CSP that blocks every external
host, so nothing can be fetched at view time — images become data URIs and the
font becomes an inline @font-face. Everything here is sized against that: the
whole page should stay comfortably under a megabyte.

Run: python3 scripts/build-artifact-assets.py
"""
import base64
import io
import json
import os
import re
import time
import urllib.request

from PIL import Image

UA = "ghana-monuments/0.1 (educational project)"
WIDTH = 800
QUALITY = 72
OUT = "src/data/artifact-assets.json"


# Google Fonts serves woff2 only to a user agent it recognises as a modern
# browser; with our own UA it falls back to formats we do not want to inline.
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def fetch(url: str, browser: bool = False) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": BROWSER_UA if browser else UA}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def photo_data_uri(src: str) -> tuple[str, int, int]:
    image = Image.open(io.BytesIO(fetch(src)))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    if image.width > WIDTH:
        height = round(image.height * WIDTH / image.width)
        image = image.resize((WIDTH, height), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=QUALITY, method=6)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/webp;base64,{encoded}", image.width, image.height


def instrument_serif() -> str:
    """The woff2 Google serves to a modern browser, inlined."""
    css = fetch(
        "https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap",
        browser=True,
    ).decode("utf8")
    match = re.search(r"url\((https://[^)]+\.woff2)\)", css)
    if not match:
        raise SystemExit("could not find a woff2 in the Google Fonts CSS")
    encoded = base64.b64encode(fetch(match.group(1), browser=True)).decode("ascii")
    return f"data:font/woff2;base64,{encoded}"


media = json.load(open("src/data/monument-media.json"))

# Resumable: Commons rate-limits, so keep whatever a previous run already got.
assets = {"photos": {}, "font": ""}
if os.path.exists(OUT):
    assets = json.load(open(OUT))
if not assets.get("font"):
    assets["font"] = instrument_serif()
print(f"font          {len(assets['font']) / 1024:6.0f} KB (base64)")

for slug, entry in media.items():
    if slug in assets["photos"]:
        print(f"{slug:26} cached")
        continue

    photos = entry.get("photos") or []
    if not photos:
        print(f"{slug:26} no photo")
        continue

    uri = None
    for attempt, lead in enumerate(photos[:3]):
        try:
            uri, width, height = photo_data_uri(lead["src"])
            break
        except Exception as error:  # noqa: BLE001 — back off and try the next
            print(f"{slug:26} retry {attempt + 1} — {error}")
            time.sleep(3)
    if uri is None:
        print(f"{slug:26} FAILED")
        continue

    assets["photos"][slug] = {
        "src": uri,
        "width": width,
        "height": height,
        "title": lead["title"],
        "credit": lead["credit"],
        "licence": lead["licence"],
        "sourceUrl": lead["sourceUrl"],
    }
    print(f"{slug:26} {len(uri) / 1024:6.0f} KB  {width}x{height}")

# Immersive textures for the artifact's 3D room, re-encoded from the local
# files the app already uses. 4096 wide keeps the pair under a megabyte of
# base64 — the artifact pays for every byte at open. Spheres flow through the
# same way, so a dropped-in photosphere reaches the artifact on rebuild.
IMMERSIVE_WIDTH = 4096
IMMERSIVE_QUALITY = 68

immersive = json.load(open("src/data/immersive-manifest.json"))
assets["panos"] = {}
assets["spheres"] = {}

for slug, entry in immersive.items():
    for kind, plural in (("pano", "panos"), ("sphere", "spheres")):
        meta = entry.get(kind)
        if not meta:
            continue
        path = "public" + meta["file"]
        with Image.open(path) as im:
            if im.width > IMMERSIVE_WIDTH:
                im = im.resize(
                    (IMMERSIVE_WIDTH, round(im.height * IMMERSIVE_WIDTH / im.width)),
                    Image.LANCZOS,
                )
            buffer = io.BytesIO()
            im.save(buffer, format="WEBP", quality=IMMERSIVE_QUALITY, method=6)
            width, height = im.size
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        assets[plural][slug] = {
            "src": f"data:image/webp;base64,{encoded}",
            "width": width,
            "height": height,
            "title": meta["title"],
            "credit": meta["credit"],
            "licence": meta["licence"],
        }
        print(f"{slug:26} artifact {kind} {width}x{height} {len(encoded)//1024} KB (base64)")

json.dump(assets, open(OUT, "w"))

total = len(json.dumps(assets)) / 1024
print(f"\n→ {OUT}  ({total / 1024:.2f} MB of base64)")
