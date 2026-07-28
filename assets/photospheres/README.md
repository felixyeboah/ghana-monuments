# Photospheres

Drop a true 360° photosphere of a monument in here and it becomes that
monument's opening immersive view — a full wrap you can look around in, on
desktop, phone and headset.

## Shooting one

Any of these produces the right kind of image:

- **Google Street View app** (Android/iOS) — Camera → photosphere, free
- A 360 camera (Insta360, Ricoh Theta, GoPro Max) — export equirectangular
- Most recent phones' panorama mode does **not** count — that's a flat sweep

Stand at one spot, ideally the centre of the space (a courtyard, a dungeon, a
rampart), and capture the full sphere. Interiors are the prize: they are what
no archive currently has.

## Adding it

1. The file must be **equirectangular** — exactly 2:1, e.g. 8192×4096. Every
   photosphere app exports this by default. The pipeline rejects other shapes.
2. Name it after the monument's slug:

   ```
   assets/photospheres/cape-coast-castle.jpg
   ```

   Slugs: `larabanga-mosque`, `elmina-castle`, `cape-coast-castle`,
   `jamestown-lighthouse`, `manhyia-palace`, `adomi-bridge`,
   `black-star-gate`, `independence-square`, `kwame-nkrumah-mausoleum`,
   `national-theatre-ghana`, `national-mosque-of-ghana`.

3. Credit yourself in a sidecar with the same name (optional but encouraged):

   ```json
   // assets/photospheres/cape-coast-castle.json
   {
     "title": "Inside the inner courtyard",
     "credit": "Your Name",
     "licence": "CC BY-SA 4.0",
     "sourceUrl": "https://…"
   }
   ```

4. Run the pipeline and the viewer picks it up:

   ```bash
   python3 scripts/build-immersive-assets.py
   ```

Removing the file and re-running removes the sphere everywhere — the script
is authoritative, nothing lingers.

## A note on permission

Some sites charge for or restrict photography — Ghana Museums and Monuments
Board manages the castles and forts, and Manhyia has its own rules. Get
permission where it's needed, and don't include people identifiably without
their consent.
