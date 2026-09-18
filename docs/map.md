# Map layout

The game map is a **schematic** of central Krasnoyarsk: directions between places match the real city,
distances are compressed so that neighbours are 15–40 seconds of walking apart (walking speed 7 units/s).

## Conventions

- The Yenisei is straightened and flows towards **+X**. In reality it flows east-north-east through the centre,
  so +X ≈ downstream ≈ east, −X ≈ upstream ≈ west.
- The **left bank** (city centre) is **−Z** (≈ north); the **right bank** is **+Z** (≈ south).
- 1 unit ≈ 1 m for building sizes; map distances are compressed (roughly logarithmically) from the real ones.
- All constants live in `MAP` in `src/world/terrain.ts`; placed landmarks are in `src/world/landmarks.json`.

## Terrain

| Feature | Game coordinates |
|---|---|
| Playable area | x −700…520, z −380…440 |
| Left bank edge (water starts) | z = 0 |
| Main channel | z 0…70 |
| Otdykha island | x −440…300, z 70…150 |
| Narrow channel (protoka) | z 150…175 |
| Right bank edge | z = 175 |
| Karaulnaya hill (chapel) | centre (−100, −290), 90×90 base, 12 terraces of 0.5, top 24×24 at y = 6 |
| Spawn | (30, 0, −12), on the embankment facing the river |

## Places

Real positions are from OpenStreetMap (Nominatim/Overpass, September 2026), measured from the left-bank end
of the Communal bridge (56.00709 N, 92.87207 E) along the river (bearing ≈ 70°) and inland from it.

| Place | Real: along / inland, m | Game (x, z) | Status |
|---|---|---|---|
| Regional Museum | +55 / 18 | (60, −32), facing the river | built |
| Clock tower + Administration | +153 / 200 | (120, −115), facing the river | built |
| Paraskeva chapel (Karaulnaya hill) | −95 / 1990 | (−100, −290), y = 6 | built |
| Communal bridge | from 0 / 0 across Otdykha island to +237 / −1822 | x = 10, straight across: ramp from z −22, deck at y 7 over z 0…175 (arches over the main channel, viaduct over the island, arches over the narrow channel), ramp down to z 197; placed with rotationY = −π/2 | built |
| Palace of Sports named after Ivan Yarygin (island) | −272 / −1263 | reserved ≈ (−197, 105) | planned |
| Central Stadium (island) | +425 / −1179 | reserved ≈ (250, 105), about 50 × 35 | planned |
| Lighthouse (island, south shore) | +318 / −1564 | reserved ≈ (214, 145) | planned |
| "Ostrov" centre and "Sportex" (island) | not found in OpenStreetMap | to be placed from the user's photos | planned |
| Opera and Ballet Theatre | −155 / 242 | reserved ≈ (−140, −120) | planned |
| Central Park with the Ferris wheel | ≈ −1090 / ≈ 470 | reserved ≈ (−330, −60) | planned |
| Steamer "Svyatitel Nikolay" at the Strelka (Kacha mouth) | +1470 / ≈ 0 | reserved ≈ (380, −5) | planned |
| Bobrovy Log (funicular) | −5510 / right bank | reserved ≈ (−420, 250) | planned |
| Stolby rocks | −9460 / right bank | reserved ≈ (−600, 340) | planned |

The Ferris wheel is in the Central Park (the spec's "island with the Ferris wheel" was a mistake);
there is another one in Roev Ruchey, far south-west on the right bank, not planned for now.
