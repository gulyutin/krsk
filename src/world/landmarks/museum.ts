// Krasnoyarsk Regional Museum — an Egyptian-temple pastiche in terracotta.
// References: refs/museum/ (see notes.md). Origin is the middle of the facade
// at street level; the front faces +Z.

import { CylinderGeometry, type Group } from 'three';
import type { ColorName } from '../../palette';
import {
  type Placement,
  box,
  colliderBox,
  group,
  instances,
  mergeStatic,
  shape,
  solid,
  unitBox,
  unitCone,
  unitDisc,
  unitSphere,
} from './kit';

const HALF_W = 13; // half of the facade width
const DEPTH = 16;
const PLINTH_H = 1.6;
const PORTICO = { half: 5, floor: 2.4, back: -3.2, lintel: 8.8 };
const PYLON = { inner: 5, wall: 10.2, frieze: 1.4, comb: 0.9, cornice: 0.6, depth: 6 };
const FRIEZE_Y = PYLON.wall;
const COMB_Y = FRIEZE_Y + PYLON.frieze;
const CORNICE_Y = COMB_Y + PYLON.comb;

export function build(): Group {
  const root = group('museum');
  const main = group('main');
  root.add(main);

  buildBase(main);
  buildPylons(main);
  buildPortico(main);
  buildSurroundings(root);

  mergeStatic(root);
  return root;
}

function buildBase(g: Group): void {
  // Grey granite plinth with small basement windows
  solid(box(g, 'granite', [HALF_W * 2 + 0.8, PLINTH_H, DEPTH + 0.6], [0, PLINTH_H / 2, -DEPTH / 2 + 0.2]));
  const basement: Placement[] = [];
  for (const x of [-11, -8.4, 8.4, 11]) {
    basement.push({ pos: [x, 0.85, 0.45], scale: [1.4, 0.8, 0.1] });
  }
  instances(g, unitBox, 'museumDark', basement);

  // Main body behind the front blocks
  solid(box(g, 'museumWall', [HALF_W * 2, 10.4, DEPTH - 3], [0, PLINTH_H + 5.2, -DEPTH / 2 - 1.5 + 0.5]));
  box(g, 'granite', [HALF_W * 2 + 0.4, 0.4, DEPTH - 2.6], [0, PLINTH_H + 10.4, -DEPTH / 2 - 1]);

  // Side windows along the long walls
  const sideWindows: Placement[] = [];
  const sideFrames: Placement[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -6.5 - i * 2.8;
      sideFrames.push({ pos: [sx * (HALF_W + 0.04), PLINTH_H + 5.2, z], rotY: Math.PI / 2, scale: [2.0, 3.8, 0.1] });
      sideWindows.push({ pos: [sx * (HALF_W + 0.12), PLINTH_H + 5.2, z], rotY: Math.PI / 2, scale: [1.6, 3.4, 0.1] });
    }
  }
  instances(g, unitBox, 'cornice', sideFrames);
  instances(g, unitBox, 'museumDark', sideWindows);
}

function buildPylons(g: Group): void {
  const width = HALF_W - PYLON.inner;
  for (const sx of [-1, 1]) {
    const cx = sx * (PYLON.inner + width / 2);
    solid(box(g, 'museumWall', [width, PYLON.wall - PLINTH_H, PYLON.depth], [cx, (PYLON.wall + PLINTH_H) / 2, -PYLON.depth / 2]));
    // Painted frieze, palmette comb and the flat cornice slab on top
    box(g, 'friezeYellow', [width + 0.2, PYLON.frieze, PYLON.depth + 0.2], [cx, FRIEZE_Y + PYLON.frieze / 2, -PYLON.depth / 2]);
    box(g, 'cornice', [width + 0.5, PYLON.cornice, PYLON.depth + 0.5], [cx, CORNICE_Y + PYLON.cornice / 2, -PYLON.depth / 2]);
  }

  // Figures on the frieze: a repeating row of small blocks, read as a painted band
  const figures: Placement[] = [];
  const comb: Placement[] = [];
  const combGreen: Placement[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = sx * (PYLON.inner + 1.2 + i * 1.8);
      const z = 0.16;
      if (i % 2 === 0) {
        // A walking hunter: legs, body, head and one arm reaching forward
        figures.push({ pos: [x - 0.12, FRIEZE_Y + 0.35, z], rotZ: 0.25, scale: [0.11, 0.5, 0.06] });
        figures.push({ pos: [x + 0.14, FRIEZE_Y + 0.35, z], rotZ: -0.2, scale: [0.11, 0.5, 0.06] });
        figures.push({ pos: [x, FRIEZE_Y + 0.82, z], scale: [0.24, 0.5, 0.06] });
        figures.push({ pos: [x, FRIEZE_Y + 1.14, z], scale: [0.2, 0.2, 0.06] });
        figures.push({ pos: [x + 0.26 * sx, FRIEZE_Y + 0.95, z], rotZ: -0.5 * sx, scale: [0.33, 0.1, 0.06] });
      } else {
        // A deer: body, four legs, neck, head and antlers
        figures.push({ pos: [x, FRIEZE_Y + 0.72, z], scale: [0.8, 0.3, 0.06] });
        for (const dx of [-0.3, -0.16, 0.16, 0.3]) {
          figures.push({ pos: [x + dx, FRIEZE_Y + 0.34, z], scale: [0.09, 0.5, 0.06] });
        }
        figures.push({ pos: [x + 0.38 * sx, FRIEZE_Y + 0.92, z], rotZ: -0.4 * sx, scale: [0.1, 0.44, 0.06] });
        figures.push({ pos: [x + 0.5 * sx, FRIEZE_Y + 1.1, z], scale: [0.26, 0.14, 0.06] });
        figures.push({ pos: [x + 0.44 * sx, FRIEZE_Y + 1.26, z], rotZ: 0.5 * sx, scale: [0.08, 0.3, 0.06] });
      }
    }
    // Comb of palmettes above the frieze
    for (let i = 0; i < 9; i++) {
      const x = sx * (PYLON.inner + 0.55 + i * 0.85);
      comb.push({ pos: [x, COMB_Y + PYLON.comb / 2 + 0.05, 0.16], scale: [0.4, PYLON.comb - 0.1, 0.06] });
      combGreen.push({ pos: [x, COMB_Y + 0.14, 0.17], scale: [0.66, 0.24, 0.06] });
    }
  }
  instances(g, unitBox, 'museumDark', figures);
  instances(g, unitBox, 'friezeGreen', comb);
  instances(g, unitBox, 'friezeBlue', combGreen);

  // Tall windows with light frames and grilles
  const frames: Placement[] = [];
  const glass: Placement[] = [];
  const bars: Placement[] = [];
  for (const x of [-10.8, -7.2, 7.2, 10.8]) {
    frames.push({ pos: [x, 6.4, 0.06], scale: [2.0, 4.0, 0.12] });
    glass.push({ pos: [x, 6.4, 0.14], scale: [1.66, 3.66, 0.08] });
    for (const dx of [-0.55, 0, 0.55]) bars.push({ pos: [x + dx, 6.4, 0.2], scale: [0.08, 3.66, 0.05] });
    for (let i = 1; i <= 4; i++) bars.push({ pos: [x, 4.57 + i * 0.73, 0.2], scale: [1.66, 0.08, 0.05] });
  }
  instances(g, unitBox, 'cornice', frames);
  instances(g, unitBox, 'museumDark', glass);
  instances(g, unitBox, 'graniteLight', bars);
}

function buildPortico(g: Group): void {
  const { half, floor, back, lintel } = PORTICO;

  // Recessed wall behind the columns, portico floor and ceiling
  box(g, 'museumDeep', [half * 2, lintel - PLINTH_H, 0.6], [0, (lintel + PLINTH_H) / 2, back]);
  solid(box(g, 'granite', [half * 2, 0.3, 3.8], [0, floor - 0.15, back / 2 + 0.2]));
  box(g, 'museumDeep', [half * 2, 0.4, 3.8], [0, lintel - 0.2, back / 2 + 0.2]);

  // Door with a light frame
  box(g, 'cornice', [2.6, 3.8, 0.12], [0, floor + 1.9, back + 0.36]);
  box(g, 'museumDark', [2.2, 3.4, 0.1], [0, floor + 1.7, back + 0.44]);
  box(g, 'friezeYellow', [1.6, 0.22, 0.06], [0, floor + 3.7, back + 0.5]);

  // Four painted columns
  const rings: Placement[] = [];
  const stripes: Placement[] = [];
  const capitals: Placement[] = [];
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    solid(box(g, 'museumDeep', [1.2, lintel - floor, 1.0], [x, (lintel + floor) / 2, -0.8]));
    for (const [dy, color, h] of [
      [0.25, 'friezeGreen', 0.3],
      [0.75, 'friezeBlue', 0.25],
      [1.15, 'friezeYellow', 0.18],
      [5.0, 'friezeGreen', 0.3],
      [5.5, 'friezeBlue', 0.25],
    ] as [number, ColorName, number][]) {
      rings.push({ pos: [x, floor + dy, -0.8], scale: [1.26, h, 1.06] });
      if (color === 'friezeBlue') stripes.push({ pos: [x, floor + dy, -0.8], scale: [1.27, h * 0.5, 1.07] });
    }
    for (const dx of [-0.36, 0, 0.36]) {
      stripes.push({ pos: [x + dx, floor + 3.2, -0.29], scale: [0.14, 3.6, 0.06] });
    }
    capitals.push({ pos: [x, lintel - 0.55, -0.8], scale: [1.4, 0.7, 1.2] });
  }
  instances(g, unitBox, 'friezeGreen', rings);
  instances(g, unitBox, 'friezeBlue', stripes);
  instances(g, unitBox, 'friezeYellow', capitals);

  // Lintel over the columns, then the band carrying the winged sun disk
  box(g, 'museumDeep', [half * 2 + 0.6, 0.8, 1.6], [0, lintel + 0.4, -0.5]);
  box(g, 'friezeYellow', [half * 2 + 0.6, 2.2, 0.8], [0, lintel + 1.7, 0]);
  buildWingedDisk(g, lintel + 1.7);

  // Narrow tapered pilasters flanking the portico
  for (const sx of [-1, 1]) {
    const taper = new CylinderGeometry(0.34, 0.5, lintel + 1.0 - PLINTH_H, 4).rotateY(Math.PI / 4);
    shape(g, taper, 'museumDeep', [1, 1, 1], [sx * 4.75, (lintel + 1.0 + PLINTH_H) / 2, 0.2]);
  }

  // Raised attic block with a dark roof above the middle
  box(g, 'museumWall', [4.6, 2.0, 4.4], [0, lintel + 3.2, -1.6]);
  box(g, 'atticRoof', [5.2, 0.5, 5.0], [0, lintel + 4.4, -1.6]);

  // Central staircase up to the portico floor, plus a side platform each way
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const h = (floor / steps) * (i + 1);
    solid(box(g, 'granite', [6.4, h, 0.6], [0, h / 2, 1.0 + (steps - i) * 0.6]));
  }
  for (const sx of [-1, 1]) {
    solid(box(g, 'granite', [3.2, PLINTH_H, 2.2], [sx * 5.2, PLINTH_H / 2, 1.1]));
  }
}

/** Winged sun disk: a red disk with cobras and wings made of tapering feather blocks. */
function buildWingedDisk(g: Group, y: number): void {
  shape(g, unitDisc, 'museumDeep', [0.85, 0.85, 0.14], [0, y, 0.45]);
  const feathers: Placement[] = [];
  const tips: Placement[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      // Wings droop outwards: each feather block is shorter and sits lower
      const h = 0.92 - i * 0.1;
      const x = sx * (1.3 + i * 0.72);
      const yy = y + 0.1 - i * 0.1;
      feathers.push({ pos: [x, yy, 0.42], scale: [0.68, h, 0.1] });
      tips.push({ pos: [x, yy - h / 2 + 0.16, 0.47], scale: [0.68, 0.3, 0.1] });
    }
    // Cobra beside the disk
    shape(g, unitSphere, 'friezeBlue', [0.18, 0.28, 0.12], [sx * 0.58, y + 0.5, 0.58]);
  }
  instances(g, unitBox, 'cornice', feathers);
  instances(g, unitBox, 'museumDeep', tips);
}

function buildSurroundings(root: Group): void {
  // Pavement in front
  solid(box(root, 'squarePaving', [40, 0.1, 14], [0, 0.05, 8]));

  // Street lamps with three globes each
  const lampXs = [-9.5, 9.5];
  const lampZ = 5.5;
  instances(root, unitBox, 'iron', lampXs.map((x): Placement => ({ pos: [x, 2.1, lampZ], scale: [0.2, 4.2, 0.2] })));
  instances(root, unitBox, 'iron', lampXs.map((x): Placement => ({ pos: [x, 3.9, lampZ], scale: [1.5, 0.1, 0.1] })));
  instances(
    root,
    unitSphere,
    'lampGlobe',
    lampXs.flatMap((x) =>
      [-0.72, 0, 0.72].map((dx): Placement => ({ pos: [x + dx, dx === 0 ? 4.4 : 4.0, lampZ], scale: [0.26, 0.26, 0.26] })),
    ),
  );
  for (const x of lampXs) colliderBox(root, [0.4, 4, 0.4], [x, 2, lampZ]);

  // Fir trees and a flower bed
  const firs: [number, number][] = [
    [-6.5, 3.2],
    [6.5, 3.2],
    [-15, 6],
    [15, 6],
  ];
  instances(root, unitBox, 'wood', firs.map(([x, z]): Placement => ({ pos: [x, 0.7, z], scale: [0.4, 1.4, 0.4] })));
  instances(
    root,
    unitCone,
    'firGreen',
    firs.flatMap(([x, z]): Placement[] => [
      { pos: [x, 2.6, z], scale: [1.7, 3.0, 1.7] },
      { pos: [x, 4.4, z], scale: [1.2, 2.4, 1.2] },
    ]),
  );
  for (const [x, z] of firs) colliderBox(root, [0.6, 2.6, 0.6], [x, 1.3, z]);

  instances(
    root,
    unitBox,
    'firGreen',
    [-3, -1.5, 0, 1.5, 3].map((dx): Placement => ({ pos: [dx * 2.2, 0.2, 12], scale: [1.9, 0.26, 1.1] })),
  );
  instances(
    root,
    unitBox,
    'red',
    [-3, -1.5, 0, 1.5, 3].map((dx): Placement => ({ pos: [dx * 2.2, 0.32, 12], scale: [1.5, 0.12, 0.7] })),
  );
}
