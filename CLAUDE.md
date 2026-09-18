# Krasnoyarsk on Foot («Красноярск пешком»)

Browser 3D game for a first-grader. The full specification is in `SPEC.md` (in Russian) — check it before any work.

## Rules

- Geometry only from primitives; colors only from `palette.ts`.
- Look: "soft realism" (decided 2026-09-18, supersedes SPEC section 7 on materials and shadows). Materials are `MeshStandardMaterial` from `material()` in `palette.ts`; textures are drawn in code from the palette colour (`world/textures.ts`, no image files) and get world-space UVs in `mergeStatic()`; one sun shadow map that follows the player; sky dome, fog and an environment map from `world/lighting.ts`. Quality levels in `src/quality.ts` (`?q=low|medium|high`) must keep phones at 30+ fps.
- One landmark = one file with a single `build()` export.
- After any geometry change: take screenshots and look at the PNGs. Never claim "done" without that.
- Do not touch controls or the camera in landmark sessions.
- Plan first, then code. One stage = one session, ending with a commit.
- Everything in git (docs, code comments, test names, commit messages) is in English. In-game text for the player stays in Russian.
- Places keep their real geographic relation: check `docs/map.md` (real positions from OpenStreetMap and the reserved game coordinates) before placing anything new.

## Layout notes

- A landmark is `src/world/landmarks/<id>.ts` exporting `build(): Group`, registered in `landmarks/index.ts` and placed via `src/world/landmarks.json`. Mark solid meshes with `solid()` from `kit.ts`; the world turns them into box colliders. For rotated parts use several small `colliderBox()` pieces (data only, no meshes) instead — an axis-aligned box around a rotated wall is too big.
- End every `build()` with `mergeStatic(root)`: it bakes the static meshes into one mesh per color (a landmark drops from ~35 draw calls to ~15) and turns `solid()` meshes into colliders first. Keep the building itself in a group named `main`, which is merged separately. Name the building itself `main` (the viewer frames it).
- The ground is a heightfield (`world/relief.ts`, `heightAt`). Landmarks stand on it at their position; add a flat pad in `relief.ts` under every new building. The player and the camera follow the terrain.
- Reference photos in `refs/` are git-ignored (size, copyright); only `refs/<id>/notes.md` is committed.

## Commands

- `npm run dev` — dev server on http://localhost:5180 (`?debug` shows fps, draw calls, position and exposes `window.game`)
- `npm run shot -- <landmark id | world | avatar>` — screenshots into `shots/` (front, side, back, top, iso and a 2×2 sheet); open the PNGs and compare with `refs/<id>/`
- `viewer.html?id=<id>` — one landmark on a neutral background, orbit with the mouse; `&view=front|side|back|top|iso|sheet` for fixed angles
- `npm test` — Vitest
- `npm run build` — type-check + production build into `dist/`
- Push to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
