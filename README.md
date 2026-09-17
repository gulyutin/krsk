# Krasnoyarsk on Foot

A browser 3D game in a Roblox-like blocky style: a little figure walks around a stylized Krasnoyarsk and discovers its landmarks. Made for a first-grader — nothing to lose, no reading required. Works on phones and desktops.

**Play:** https://gulyutin.github.io/krsk/

## Controls

| | Desktop | Phone |
|---|---|---|
| Move | WASD / arrow keys | joystick — touch anywhere on the left half |
| Jump | Space | round button, bottom right |
| Camera | drag with the mouse | swipe on the right half |

## Development

```bash
npm install
npm run dev      # http://localhost:5180, add ?debug for fps / draw calls
npm test         # Vitest
npm run build    # type-check + build into dist/
```

Stack: Vite, TypeScript, three.js. No physics engine and no model files — all geometry is built in code from primitives. Pushing to `main` deploys to GitHub Pages.

See `SPEC.md` for the full specification (in Russian) and `CLAUDE.md` for working rules.
