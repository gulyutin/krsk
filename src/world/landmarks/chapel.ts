// Paraskeva Pyatnitsa chapel on Karaulnaya hill. References: refs/chapel/ (see notes.md).
// Origin is the center of the hilltop; the door faces +Z.
// Proportions are measured from the near-orthographic front photo, walls 5.4 wide.

import type { Group } from 'three';
import type { ColorName } from '../../palette';
import {
  type Placement,
  box,
  group,
  instances,
  mergeStatic,
  octPyramid,
  octagon,
  onCorner,
  onFace,
  shape,
  solid,
  unitArch,
  unitBox,
  unitSphere,
} from './kit';

const PLATFORM_TOP = 0.25;

// Bottom (y), height (h) and apothem (a) of each part, from the ground up
const PLINTH = { a: 2.92, y: PLATFORM_TOP, h: 0.65 };
const WALL = { a: 2.7, y: PLINTH.y + PLINTH.h, h: 5.7 };
const CORNICE = { y: WALL.y + WALL.h, h: 0.35 };
const DRUM = { a: 2.6, y: CORNICE.y + CORNICE.h + 0.06, h: 1.1 };
const SKIRT = { a0: 2.85, a1: 1.75, y: DRUM.y + DRUM.h, h: 3.7 };
const BELT = { a: 2.0, y: SKIRT.y + SKIRT.h, h: 0.4 };
const TENT = { a: 1.45, y: BELT.y + BELT.h, h: 3.7 };
const NECK = { a: 0.4, y: TENT.y + TENT.h - 0.35, h: 0.9 };

const DOOR_FACE = 0;
const ICON_FACE = 4;
const WINDOW_FACES = [1, 2, 3, 5, 6, 7];

// Windows and the icon share one opening size
const OPENING = { bottom: WALL.y + 0.75, w: 0.9, h: 2.0 };
const OPENING_ARCH_Y = OPENING.bottom + OPENING.h;

export function build(): Group {
  const root = group('chapel');
  const main = group('main');
  root.add(main);

  buildWalls(main);
  buildEntranceAndIcon(main);
  buildRoof(main);
  buildSurroundings(root);

  mergeStatic(root);
  return root;
}

function buildWalls(g: Group): void {
  solid(octagon(g, 'plinth', PLINTH.a, PLINTH.a, PLINTH.y, PLINTH.h));
  solid(octagon(g, 'chapelWhite', WALL.a, WALL.a, WALL.y, WALL.h));

  // Flat pilasters on every corner
  instances(
    g,
    unitBox,
    'chapelWhite',
    [...Array(8).keys()].map((k) => ({ ...onCorner(k, WALL.a, WALL.y + WALL.h / 2), scale: [0.4, WALL.h, 0.4] })),
  );

  // Relief band with a shadow line under the cornice, then the flared cornice
  octagon(g, 'chapelShade', WALL.a + 0.04, WALL.a + 0.04, CORNICE.y - 0.95, 0.06);
  octagon(g, 'chapelWhite', WALL.a + 0.1, WALL.a + 0.1, CORNICE.y - 0.3, 0.3);
  octagon(g, 'chapelWhite', WALL.a + 0.08, WALL.a + 0.42, CORNICE.y, CORNICE.h);
  octagon(g, 'roofGreen', WALL.a + 0.38, WALL.a + 0.34, CORNICE.y + CORNICE.h, 0.06);

  // Arched windows: white surround with a pointed top, brown lattice, relief gable above
  const frame: Placement[] = [];
  const frameArch: Placement[] = [];
  const pointedTip: Placement[] = [];
  const glass: Placement[] = [];
  const glassArch: Placement[] = [];
  const lattice: Placement[] = [];
  const gable: Placement[] = [];
  for (const k of WINDOW_FACES) {
    const f = (out: number, along: number, y: number) => onFace(k, WALL.a + out, along, y);
    frame.push({ ...f(0.05, 0, OPENING.bottom + OPENING.h / 2 - 0.05), scale: [OPENING.w + 0.44, OPENING.h + 0.1, 0.1] });
    frameArch.push({ ...f(0.05, 0, OPENING_ARCH_Y), scale: [0.67, 0.67, 0.1] });
    pointedTip.push({ ...f(0.05, 0, OPENING_ARCH_Y + 0.62), rotZ: Math.PI / 4, scale: [0.26, 0.26, 0.1] });
    glass.push({ ...f(0.1, 0, OPENING.bottom + OPENING.h / 2), scale: [OPENING.w, OPENING.h, 0.1] });
    glassArch.push({ ...f(0.1, 0, OPENING_ARCH_Y), scale: [OPENING.w / 2, OPENING.w / 2, 0.1] });
    for (const along of [-0.2, 0.2]) {
      lattice.push({ ...f(0.16, along, OPENING.bottom + OPENING.h / 2 + 0.15), scale: [0.05, OPENING.h + 0.3, 0.03] });
    }
    for (let i = 1; i <= 4; i++) {
      lattice.push({ ...f(0.16, 0, OPENING.bottom + (i * OPENING.h) / 5), scale: [OPENING.w, 0.05, 0.03] });
    }
    for (const side of [-1, 1]) {
      gable.push({ ...f(0.05, side * 0.42, OPENING_ARCH_Y + 1.45), rotZ: -side * 0.9, scale: [1.25, 0.1, 0.08] });
    }
  }
  instances(g, unitBox, 'chapelWhite', frame);
  instances(g, unitArch, 'chapelWhite', frameArch);
  instances(g, unitBox, 'chapelWhite', pointedTip);
  instances(g, unitBox, 'lattice', glass);
  instances(g, unitArch, 'lattice', glassArch);
  instances(g, unitBox, 'chapelShade', lattice);
  instances(g, unitBox, 'chapelShade', gable);
}

function buildEntranceAndIcon(g: Group): void {
  const onWall = (face: number, color: ColorName, out: number, size: [number, number, number], y: number) => {
    const p = onFace(face, WALL.a + out, 0, y);
    return box(g, color, size, p.pos, [0, p.rotY, 0]);
  };

  // Entrance: white portal with a pointed arch, wooden door, gold plaque, two steps
  onWall(DOOR_FACE, 'chapelWhite', 0.06, [1.8, 2.7, 0.12], WALL.y + 1.35);
  placeArch(g, 'chapelWhite', onFace(DOOR_FACE, WALL.a + 0.06, 0, WALL.y + 2.7), 0.9, 0.12);
  onWall(DOOR_FACE, 'chapelWhite', 0.06, [0.34, 0.34, 0.12], WALL.y + 3.55).rotation.z = Math.PI / 4;
  onWall(DOOR_FACE, 'wood', 0.12, [1.1, 2.5, 0.1], WALL.y + 1.25);
  placeArch(g, 'wood', onFace(DOOR_FACE, WALL.a + 0.12, 0, WALL.y + 2.5), 0.55, 0.1);
  onWall(DOOR_FACE, 'gold', 0.14, [0.6, 0.16, 0.05], WALL.y + 3.95);
  solid(onWall(DOOR_FACE, 'plinth', 0.35, [2.0, 0.33, 0.7], PLATFORM_TOP + 0.33));
  solid(onWall(DOOR_FACE, 'plinth', 0.85, [2.0, 0.33, 0.6], PLATFORM_TOP + 0.165));

  // Icon of St. Paraskeva on the back face: gold ground, blue robe, halo
  onWall(ICON_FACE, 'chapelWhite', 0.05, [OPENING.w + 0.64, OPENING.h + 0.1, 0.1], OPENING.bottom + OPENING.h / 2 - 0.05);
  placeArch(g, 'chapelWhite', onFace(ICON_FACE, WALL.a + 0.05, 0, OPENING_ARCH_Y), 0.77, 0.1);
  onWall(ICON_FACE, 'gold', 0.1, [OPENING.w + 0.3, OPENING.h, 0.1], OPENING.bottom + OPENING.h / 2);
  placeArch(g, 'gold', onFace(ICON_FACE, WALL.a + 0.1, 0, OPENING_ARCH_Y), 0.6, 0.1);
  onWall(ICON_FACE, 'iconBlue', 0.15, [0.55, 1.5, 0.05], OPENING.bottom + 0.95);
  onWall(ICON_FACE, 'skin', 0.15, [0.24, 0.26, 0.05], OPENING.bottom + 1.85);
}

function buildRoof(g: Group): void {
  // Drum with a ring of kokoshniks: a slab with a pointed arch on every face
  octagon(g, 'chapelWhite', DRUM.a, DRUM.a, DRUM.y, DRUM.h);
  const slab: Placement[] = [];
  const panel: Placement[] = [];
  const arch: Placement[] = [];
  const recess: Placement[] = [];
  const tip: Placement[] = [];
  const faceW = 2 * DRUM.a * Math.tan(Math.PI / 8);
  for (let k = 0; k < 8; k++) {
    const f = (out: number, y: number) => onFace(k, DRUM.a + out, 0, y);
    slab.push({ ...f(0.14, DRUM.y + DRUM.h / 2), scale: [faceW - 0.1, DRUM.h, 0.28] });
    panel.push({ ...f(0.29, DRUM.y + DRUM.h / 2 - 0.1), scale: [faceW * 0.6, 0.4, 0.03] });
    arch.push({ ...f(0.14, DRUM.y + DRUM.h), scale: [faceW / 2 - 0.05, 0.95, 0.28] });
    recess.push({ ...f(0.29, DRUM.y + DRUM.h), scale: [faceW / 2 - 0.3, 0.65, 0.03] });
    tip.push({ ...f(0.14, DRUM.y + DRUM.h + 0.88), rotZ: Math.PI / 4, scale: [0.34, 0.34, 0.28] });
  }
  instances(g, unitBox, 'chapelWhite', slab);
  instances(g, unitBox, 'chapelShade', panel);
  instances(g, unitArch, 'chapelWhite', arch);
  instances(g, unitArch, 'chapelShade', recess);
  instances(g, unitBox, 'chapelWhite', tip);

  // Tall flared lower roof with seams, a scalloped dark band and an overhanging belt
  octagon(g, 'roofGreen', SKIRT.a0, SKIRT.a1, SKIRT.y, SKIRT.h);
  const seams: Placement[] = [];
  const slope = Math.atan2(SKIRT.a0 - SKIRT.a1, SKIRT.h);
  for (let k = 0; k < 8; k++) {
    for (const along of [-0.35, 0.35]) {
      const midA = (SKIRT.a0 + SKIRT.a1) / 2 + 0.03;
      const p = onFace(k, midA, along * ((SKIRT.a0 + SKIRT.a1) / 2 / SKIRT.a0), SKIRT.y + SKIRT.h / 2);
      seams.push({ ...p, rotX: -slope, scale: [0.06, SKIRT.h / Math.cos(slope), 0.06] });
    }
  }
  instances(g, unitBox, 'roofGreenDark', seams);
  octagon(g, 'roofGreenDark', SKIRT.a1 + 0.12, SKIRT.a1 + 0.12, BELT.y - 0.35, 0.35);
  octagon(g, 'roofGreen', BELT.a + 0.05, BELT.a, BELT.y, BELT.h);
  octPyramid(g, 'roofGreen', TENT.a, TENT.y, TENT.h);

  // Small arched vents right above the belt, above the windows (odd faces):
  // the door and the icon get a pair of vents on either side, as in the photos
  const ventY = TENT.y + 0.45;
  const ventOut = TENT.a * (1 - (ventY - TENT.y) / TENT.h);
  const vent: Placement[] = [];
  const ventArch: Placement[] = [];
  const slot: Placement[] = [];
  for (const k of [1, 3, 5, 7]) {
    vent.push({ ...onFace(k, ventOut, 0, ventY), scale: [0.46, 0.5, 0.4] });
    ventArch.push({ ...onFace(k, ventOut, 0, ventY + 0.25), scale: [0.23, 0.23, 0.4] });
    slot.push({ ...onFace(k, ventOut + 0.21, 0, ventY + 0.06), scale: [0.26, 0.4, 0.02] });
  }
  instances(g, unitBox, 'chapelWhite', vent);
  instances(g, unitArch, 'chapelWhite', ventArch);
  instances(g, unitBox, 'iron', slot);

  // Neck, gilded pear-shaped cupola with a spike, cross
  octagon(g, 'chapelWhite', NECK.a, NECK.a, NECK.y, NECK.h);
  octagon(g, 'chapelWhite', NECK.a + 0.08, NECK.a + 0.08, NECK.y + NECK.h, 0.1);
  const domeY = NECK.y + NECK.h + 0.55;
  shape(g, unitSphere, 'gold', [0.46, 0.6, 0.46], [0, domeY, 0]);
  octPyramid(g, 'gold', 0.2, domeY + 0.4, 0.55);

  const crossY = domeY + 1.45;
  box(g, 'gold', [0.08, 1.2, 0.08], [0, crossY, 0]);
  box(g, 'gold', [0.34, 0.07, 0.07], [0, crossY + 0.36, 0]);
  box(g, 'gold', [0.62, 0.08, 0.08], [0, crossY + 0.15, 0]);
  box(g, 'gold', [0.42, 0.07, 0.07], [0, crossY - 0.24, 0], [0, 0, -0.35]);
}

function buildSurroundings(root: Group): void {
  // Octagonal paved platform: dark edge, pink paving, light ring around the chapel
  solid(octagon(root, 'pavingEdge', 9.5, 9.5, 0, PLATFORM_TOP - 0.03));
  solid(octagon(root, 'paving', 9.2, 9.2, 0, PLATFORM_TOP));
  octagon(root, 'pavingLight', 4.2, 4.2, 0, PLATFORM_TOP + 0.02);

  // Low iron fence along the edge, with an opening in front of the door
  const fenceA = 9.0;
  const side = 2 * fenceA * Math.tan(Math.PI / 8);
  const gap = 3.2;
  const rails: Placement[] = [];
  const bars: Placement[] = [];
  const posts: Placement[] = [];
  for (let k = 0; k < 8; k++) {
    const spans: [number, number][] =
      k === DOOR_FACE
        ? [
            [-side / 2, -gap / 2],
            [gap / 2, side / 2],
          ]
        : [[-side / 2, side / 2]];
    for (const [s0, s1] of spans) {
      const mid = (s0 + s1) / 2;
      const len = s1 - s0;
      for (const y of [PLATFORM_TOP + 0.35, PLATFORM_TOP + 1.05]) {
        rails.push({ ...onFace(k, fenceA, mid, y), scale: [len, 0.07, 0.07] });
      }
      for (let s = s0 + 0.3; s < s1 - 0.1; s += 0.3) {
        bars.push({ ...onFace(k, fenceA, s, PLATFORM_TOP + 0.6), scale: [0.04, 1.0, 0.04] });
      }
      for (const s of [s0, s1]) {
        posts.push({ ...onFace(k, fenceA, s, PLATFORM_TOP + 0.6), scale: [0.12, 1.2, 0.12] });
      }
    }
  }
  instances(root, unitBox, 'iron', rails);
  instances(root, unitBox, 'iron', bars);
  instances(root, unitBox, 'iron', posts);

  // Two street lamps by the entrance: post, crossbar, two globes
  const lampXs = [-2.6, 2.6];
  const lampZ = 6.8;
  instances(root, unitBox, 'iron', lampXs.map((x) => ({ pos: [x, PLATFORM_TOP + 1.7, lampZ], scale: [0.12, 3.4, 0.12] })));
  instances(root, unitBox, 'iron', lampXs.map((x) => ({ pos: [x, PLATFORM_TOP + 3.25, lampZ], scale: [1.0, 0.07, 0.07] })));
  instances(
    root,
    unitSphere,
    'lampGlobe',
    lampXs.flatMap((x) => [-0.48, 0.48].map((dx): Placement => ({ pos: [x + dx, PLATFORM_TOP + 3.5, lampZ], scale: [0.2, 0.2, 0.2] }))),
  );

  // Tall dark memorial cross on a stone base, outside the platform corner
  const cx = 9.3;
  const cz = -9.3;
  solid(box(root, 'plinth', [1.4, 0.5, 1.4], [cx, 0.25, cz]));
  solid(box(root, 'iron', [0.26, 4.4, 0.26], [cx, 2.7, cz]));
  box(root, 'iron', [1.7, 0.24, 0.24], [cx, 3.7, cz]);
  box(root, 'iron', [0.9, 0.2, 0.2], [cx, 4.4, cz]);
  box(root, 'iron', [1.1, 0.2, 0.2], [cx, 1.9, cz], [0, 0, -0.35]);
}

/** Arch top (half disc) placed on a face. */
function placeArch(
  g: Group,
  color: ColorName,
  at: { pos: [number, number, number]; rotY: number },
  radius: number,
  depth: number,
): void {
  shape(g, unitArch, color, [radius, radius, depth], at.pos, [0, at.rotY, 0]);
}
