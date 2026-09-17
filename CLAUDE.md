# Krasnoyarsk on Foot («Красноярск пешком»)

Browser 3D game for a first-grader. The full specification is in `SPEC.md` (in Russian) — check it before any work.

## Rules

- Geometry only from primitives; colors only from `palette.ts`.
- One landmark = one file with a single `build()` export.
- After any geometry change: take screenshots and look at the PNGs. Never claim "done" without that.
- Do not touch controls or the camera in landmark sessions.
- Plan first, then code. One stage = one session, ending with a commit.
- Everything in git (docs, code comments, test names, commit messages) is in English. In-game text for the player stays in Russian.

## Commands

- `npm run dev` — dev server on http://localhost:5180 (`?debug` shows fps, draw calls, position and exposes `window.game`)
- `npm test` — Vitest
- `npm run build` — type-check + production build into `dist/`
- Push to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
