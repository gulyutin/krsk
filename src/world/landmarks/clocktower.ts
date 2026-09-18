// Clock tower ("Krasnoyarsk Big Ben") and the City Administration building.
// References: refs/clocktower/ (see notes.md).
// Origin is the center of the tower base; the facade and the square face +Z,
// the building stretches to +X, as seen from the square in the photos.

import { CylinderGeometry, type Group } from 'three';
import {
  type Placement,
  box,
  colliderBox,
  group,
  instances,
  mergeStatic,
  onFace,
  shape,
  solid,
  unitBox,
  unitCone,
  unitDisc,
  unitPyramid,
  unitSphere,
} from './kit';

// ---------- Tower ----------

const SHAFT = { w: 6.5, h: 15.5 };
/** The tower stands forward of the building line, towards the square. */
const TOWER_FORWARD = 2.6;
const UPPER_W = 4.6;
const FLUTED = { y: SHAFT.h + 0.4, h: 3.9 };
const CLOCK = { y: FLUTED.y + FLUTED.h, h: 4.8 };
const CAP_Y = CLOCK.y + CLOCK.h;
const ROOF = { y: CAP_Y + 1.4, h: 3.4 };
const SPIRE = { y: ROOF.y + ROOF.h - 0.2, h: 4.8 };

// ---------- Building ----------

const FLOOR_H = 2.2;
const FIN_STEP = 1.5;

/** A straight wing: origin at the front-left corner at ground level, facade facing its local +Z. */
interface Wing {
  /** Depth of the vertical fins on the facade; the tall wing has deep full-height blades. */
  fin: number;
  x: number;
  z: number;
  /** Rotation around Y; negative turns the far end towards the square. */
  angle: number;
  length: number;
  depth: number;
  floors: number;
}

// Next to the tower a long low wing; beyond the crease a taller wing angled towards the square
const LOW: Wing = { x: 3.2, z: 0, angle: 0, length: 30, depth: 13, floors: 5, fin: 0.45 };
const TALL: Wing = { x: LOW.x + LOW.length, z: 0, angle: -0.3, length: 34, depth: 14, floors: 6, fin: 0.8 };

export function build(): Group {
  const root = group('clocktower');
  const tower = group('main');
  tower.position.z = TOWER_FORWARD;
  root.add(tower);

  buildTower(tower);
  buildBuilding(root);
  buildSquare(root);

  mergeStatic(root);
  return root;
}

function buildTower(g: Group): void {
  // Massive lower shaft with faint vertical panel lines and a collar on top
  solid(box(g, 'towerStone', [SHAFT.w, SHAFT.h, SHAFT.w], [0, SHAFT.h / 2, 0]));
  const lines: Placement[] = [];
  for (let k = 0; k < 4; k++) {
    for (const along of [-2.4, -0.8, 0.8, 2.4]) {
      lines.push({ ...onFace(k * 2, SHAFT.w / 2 + 0.02, along, SHAFT.h / 2 - 0.5), scale: [0.08, SHAFT.h - 1, 0.05] });
    }
  }
  instances(g, unitBox, 'towerStoneDark', lines);
  box(g, 'towerStone', [SHAFT.w + 0.4, 1.0, SHAFT.w + 0.4], [0, SHAFT.h - 0.5, 0]);

  // Ledge with a railing where the tower steps in
  box(g, 'towerLight', [UPPER_W + 1.6, 0.2, UPPER_W + 1.6], [0, SHAFT.h + 0.1, 0]);
  const rail: Placement[] = [];
  for (let k = 0; k < 4; k++) {
    const out = UPPER_W / 2 + 0.7;
    rail.push({ ...onFace(k * 2, out, 0, SHAFT.h + 0.75), scale: [UPPER_W + 1.4, 0.06, 0.06] });
    for (const along of [-2.6, -1.3, 0, 1.3, 2.6]) {
      rail.push({ ...onFace(k * 2, out, along, SHAFT.h + 0.45), scale: [0.06, 0.6, 0.06] });
    }
  }
  instances(g, unitBox, 'iron', rail);

  // Fluted stage: dark core, light vertical ribs, square corners
  box(g, 'towerStoneDark', [UPPER_W - 0.3, FLUTED.h, UPPER_W - 0.3], [0, FLUTED.y + FLUTED.h / 2, 0]);
  const ribs: Placement[] = [];
  for (let k = 0; k < 4; k++) {
    for (const along of [-1.4, -0.7, 0, 0.7, 1.4]) {
      ribs.push({ ...onFace(k * 2, UPPER_W / 2 - 0.2, along, FLUTED.y + FLUTED.h / 2), scale: [0.36, FLUTED.h, 0.4] });
    }
  }
  for (const [sx, sz] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    ribs.push({ pos: [(sx * (UPPER_W - 0.5)) / 2, FLUTED.y + FLUTED.h / 2, (sz * (UPPER_W - 0.5)) / 2], scale: [0.5, FLUTED.h, 0.5] });
  }
  instances(g, unitBox, 'towerStone', ribs);
  box(g, 'towerStone', [UPPER_W + 0.2, 0.3, UPPER_W + 0.2], [0, FLUTED.y + FLUTED.h - 0.15, 0]);

  // Clock stage: black dials with a white rim, hour marks and hands on all four sides
  box(g, 'towerStone', [UPPER_W, CLOCK.h, UPPER_W], [0, CLOCK.y + CLOCK.h / 2, 0]);
  const cy = CLOCK.y + CLOCK.h / 2;
  const face = UPPER_W / 2;
  const rims: Placement[] = [];
  const dials: Placement[] = [];
  const marks: Placement[] = [];
  for (let k = 0; k < 4; k++) {
    const f = k * 2;
    rims.push({ ...onFace(f, face + 0.05, 0, cy), scale: [2.0, 2.0, 0.1] });
    dials.push({ ...onFace(f, face + 0.1, 0, cy), scale: [1.82, 1.82, 0.1] });
    for (let h = 0; h < 12; h++) {
      const t = (h / 12) * Math.PI * 2;
      const long = h % 3 === 0;
      const r = long ? 1.45 : 1.52;
      marks.push({
        ...onFace(f, face + 0.17, Math.sin(t) * r, cy + Math.cos(t) * r),
        rotZ: -t,
        scale: [long ? 0.16 : 0.1, long ? 0.5 : 0.34, 0.04],
      });
    }
    // 10:10, the classic clock-face time: hour hand to 10, minute hand to 2
    for (const [t, len, width] of [
      [(10 / 12) * Math.PI * 2 + (10 / 60 / 12) * Math.PI * 2, 1.0, 0.18],
      [(2 / 12) * Math.PI * 2, 1.45, 0.12],
    ]) {
      marks.push({
        ...onFace(f, face + 0.2, (Math.sin(t) * len) / 2, cy + (Math.cos(t) * len) / 2),
        rotZ: -t,
        scale: [width, len, 0.04],
      });
    }
    marks.push({ ...onFace(f, face + 0.22, 0, cy), scale: [0.2, 0.2, 0.05] });
  }
  instances(g, unitDisc, 'white', rims);
  instances(g, unitDisc, 'dial', dials);
  instances(g, unitBox, 'white', marks);

  // Light stepped cap, steep dark pyramid, needle spire with a gilded finial
  box(g, 'towerLight', [UPPER_W + 0.5, 0.4, UPPER_W + 0.5], [0, CAP_Y + 0.2, 0]);
  const capTop = UPPER_W / 2 - 0.35;
  const cap = new CylinderGeometry(capTop * Math.SQRT2, (UPPER_W / 2 + 0.1) * Math.SQRT2, 1.0, 4).rotateY(Math.PI / 4);
  shape(g, cap, 'towerLight', [1, 1, 1], [0, CAP_Y + 0.9, 0]);
  shape(g, unitPyramid, 'pyramidRoof', [capTop, ROOF.h, capTop], [0, ROOF.y + ROOF.h / 2, 0]);
  shape(g, unitCone, 'towerLight', [0.15, SPIRE.h, 0.15], [0, SPIRE.y + SPIRE.h / 2, 0]);
  shape(g, unitSphere, 'gold', [0.22, 0.22, 0.22], [0, SPIRE.y + SPIRE.h * 0.7, 0]);
  box(g, 'gold', [0.06, 0.9, 0.06], [0, SPIRE.y + SPIRE.h * 0.7 + 0.5, 0]);
}

/** World position and rotation of a point on a wing: u along the facade, v up, out from the facade. */
function onWing(w: Wing, u: number, v: number, out: number): { pos: [number, number, number]; rotY: number } {
  const c = Math.cos(w.angle);
  const s = Math.sin(w.angle);
  // Local +X (along) is (cos, −sin) in XZ, local +Z (out) is (sin, cos)
  return { pos: [w.x + c * u + s * out, v, w.z - s * u + c * out], rotY: w.angle };
}

function buildBuilding(root: Group): void {
  const wings = [LOW, TALL];
  const glass: Placement[] = [];
  const glassDark: Placement[] = [];
  const spandrels: Placement[] = [];
  const fins: Placement[] = [];
  const parapets: Placement[] = [];
  const roofs: Placement[] = [];

  for (const w of wings) {
    const height = w.floors * FLOOR_H;
    const slab = onWing(w, w.length / 2, height / 2, -w.depth / 2);
    const mesh = box(root, 'officeWhite', [w.length, height, w.depth], slab.pos, [0, slab.rotY, 0]);
    if (w.angle === 0) solid(mesh);
    else {
      // Rotated wing: a ring of small colliders along the facade, the back and the far end.
      // Each covers a 1×1 piece of the wall, so the axis-aligned box sticks out by < 0.4.
      const c = Math.abs(Math.cos(w.angle));
      const sn = Math.abs(Math.sin(w.angle));
      const piece = (u: number, out: number) =>
        colliderBox(root, [c + sn, height, sn + c], onWing(w, u, height / 2, out).pos);
      for (let u = 0.5; u < w.length; u += 1) {
        piece(u, -0.5);
        piece(u, -w.depth + 0.5);
      }
      for (let out = -1.5; out > -w.depth + 1; out -= 1) piece(w.length - 0.5, out);
    }

    // Ground floor: dark recessed glazing; upper floors: glass bands with white spandrels
    glassDark.push({ ...onWing(w, w.length / 2, FLOOR_H / 2, 0.02), scale: [w.length - 0.4, FLOOR_H - 0.3, 0.1] });
    for (let f = 1; f < w.floors; f++) {
      glass.push({ ...onWing(w, w.length / 2, f * FLOOR_H + 1.25, 0.02), scale: [w.length - 0.4, 1.5, 0.1] });
      spandrels.push({ ...onWing(w, w.length / 2, f * FLOOR_H + 0.2, 0.08), scale: [w.length, 0.4, 0.16] });
    }
    // Vertical fins from the first floor up — the building's signature rhythm
    for (let u = FIN_STEP / 2; u < w.length; u += FIN_STEP) {
      fins.push({ ...onWing(w, u, (FLOOR_H + height) / 2, w.fin / 2), scale: [0.26, height - FLOOR_H, w.fin] });
    }
    // Window bands on the end walls that stay visible from the side
    const ends: [number, number][] = w === TALL ? [[w.length + 0.05, 1]] : [[-0.05, 1]];
    for (const [u, fromFloor] of ends) {
      for (let f = fromFloor; f < w.floors; f++) {
        glass.push({ ...onWing(w, u, f * FLOOR_H + 1.25, -w.depth / 2), rotY: w.angle + Math.PI / 2, scale: [w.depth - 1, 1.5, 0.1] });
      }
    }
    parapets.push({ ...onWing(w, w.length / 2, height + 0.3, 0.1), scale: [w.length, 0.6, 0.4] });
    roofs.push({ ...onWing(w, w.length / 2, height + 0.03, -w.depth / 2), scale: [w.length - 0.2, 0.1, w.depth - 0.2] });
  }
  instances(root, unitBox, 'officeGlass', glass);
  instances(root, unitBox, 'officeGlassDark', glassDark);
  instances(root, unitBox, 'officeWhite', spandrels);
  instances(root, unitBox, 'officeWhite', fins);
  instances(root, unitBox, 'officeWhite', parapets);
  instances(root, unitBox, 'towerLight', roofs);

  // Block filling the wedge behind the crease between the two wings, up to the tall roof
  const wedgeH = TALL.floors * FLOOR_H;
  box(root, 'officeWhite', [7, wedgeH, LOW.depth + 1], [TALL.x + 3, wedgeH / 2, LOW.z - (LOW.depth + 1) / 2]);
  box(root, 'towerLight', [7, 0.1, LOW.depth + 1], [TALL.x + 3, wedgeH + 0.03, LOW.z - (LOW.depth + 1) / 2]);

  // Vertical pylon closing the joint where the two wings meet
  const jointH = TALL.floors * FLOOR_H;
  const joint = onWing(TALL, 0.5, jointH / 2, 0.5);
  box(root, 'officeWhite', [1.6, jointH, 1.6], joint.pos, [0, TALL.angle, 0]);

  // Entrance canopy on thin columns, near the crease on the tall wing
  const canopyU = 9;
  const c = onWing(TALL, canopyU, 3.0, 1.8);
  box(root, 'officeWhite', [15, 0.35, 3.6], c.pos, [0, TALL.angle, 0]);
  instances(
    root,
    unitBox,
    'towerLight',
    [-6.5, -3.2, 0, 3.2, 6.5].map((du): Placement => ({ ...onWing(TALL, canopyU + du, 1.4, 3.3), scale: [0.25, 2.8, 0.25] })),
  );

  buildRoofSign(root);
}

// 3×5 pixel letters for the roof sign
const LETTERS: Record<string, string[]> = {
  К: ['X.X', 'XX.', 'X..', 'XX.', 'X.X'],
  Р: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  А: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  С: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  Н: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  О: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  Я: ['.XX', 'X.X', '.XX', 'X.X', 'X.X'],
};

function buildRoofSign(root: Group): void {
  const text = 'КРАСНОЯРСК';
  const px = 0.36;
  const width = (text.length * 4 - 1) * px;
  const start = TALL.length / 2 - width / 2;
  const base = TALL.floors * FLOOR_H + 0.9;
  const pixels: Placement[] = [];
  [...text].forEach((ch, i) => {
    LETTERS[ch].forEach((row, r) => {
      [...row].forEach((cell, col) => {
        if (cell !== 'X') return;
        const u = start + (i * 4 + col + 0.5) * px;
        const v = base + (4 - r + 0.5) * px;
        pixels.push({ ...onWing(TALL, u, v, -0.3), scale: [px, px, 0.15] });
      });
    });
  });
  instances(root, unitBox, 'signRed', pixels);
}

function buildSquare(root: Group): void {
  // Paved square in front of the building
  solid(box(root, 'squarePaving', [88, 0.1, 26], [26, 0.05, 15]));

  // Fountain: low red granite basin, water, a bowl and jets
  const fx = 20;
  const fz = 17;
  solid(box(root, 'graniteRed', [7, 0.6, 7], [fx, 0.3, fz]));
  box(root, 'water', [6.2, 0.1, 6.2], [fx, 0.58, fz]);
  shape(root, unitDisc, 'graniteRed', [1.2, 1.2, 1.4], [fx, 1.1, fz], [Math.PI / 2, 0, 0]);
  instances(
    root,
    unitBox,
    'waterLight',
    [
      [0, 0],
      [-1.8, -1.8],
      [1.8, -1.8],
      [-1.8, 1.8],
      [1.8, 1.8],
    ].map(([dx, dz], i): Placement => ({ pos: [fx + dx, i === 0 ? 2.4 : 1.3, fz + dz], scale: [0.12, i === 0 ? 1.8 : 1.4, 0.12] })),
  );

  // Flagpole with the red city flag
  const flagX = -9;
  const flagZ = 14;
  solid(box(root, 'towerLight', [0.2, 12, 0.2], [flagX, 6, flagZ]));
  box(root, 'signRed', [2.6, 1.7, 0.05], [flagX + 1.4, 11, flagZ]);
  box(root, 'gold', [0.7, 0.8, 0.07], [flagX + 1.4, 11, flagZ]);

  // Fir trees at the sides of the square
  const firs: [number, number][] = [
    [-8, 6],
    [-12, 11],
    [54, 24],
  ];
  instances(root, unitBox, 'wood', firs.map(([x, z]): Placement => ({ pos: [x, 0.8, z], scale: [0.4, 1.6, 0.4] })));
  instances(
    root,
    unitCone,
    'firGreen',
    firs.flatMap(([x, z]) => [
      { pos: [x, 3.2, z], scale: [2.2, 3.6, 2.2] } as Placement,
      { pos: [x, 5.6, z], scale: [1.5, 3.0, 1.5] } as Placement,
    ]),
  );
  for (const [x, z] of firs) colliderBox(root, [0.6, 3, 0.6], [x, 1.5, z]);
}
