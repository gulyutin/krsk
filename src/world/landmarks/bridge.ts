// Communal bridge: a concrete deck-arch bridge from the embankment by the museum,
// over the main channel, across Otdykha island on a viaduct and over the narrow
// channel to the right bank. References: refs/bridge/ (see notes.md), docs/map.md.
//
// Built along local +X (x = 0 is the left bank edge, x = 165 the right bank edge),
// so the viewer's front view shows the side elevation; landmarks.json turns it
// with rotationY = −π/2 to run along world +Z. Upstream is local +Z.

import type { Group } from 'three';
import { MAP } from '../terrain';
import {
  type Placement,
  box,
  colliderBox,
  group,
  instances,
  mergeStatic,
  solid,
  unitBox,
  unitSphere,
} from './kit';

const DECK_TOP = 7;
const DECK_THICK = 0.8;
const DECK_BOTTOM = DECK_TOP - DECK_THICK;
const HALF_WIDTH = 6;
const RIB_Z = 3.8;
const SPRING_Y = -0.8; // arches spring just above the water

const LEFT_EDGE = 0;
const ISLAND_START = MAP.island.z0 - MAP.leftBankZ; // 75
const ISLAND_END = MAP.island.z1 - MAP.leftBankZ; // 135
const RIGHT_EDGE = MAP.rightBankZ - MAP.leftBankZ; // 165
const RAMP_LENGTH = 22;

/** Pier positions: the main channel spans shrink away from the city bank. */
const MAIN_PIERS = [LEFT_EDGE, 26, 47, 63, ISLAND_START];
const CHANNEL_PIERS = [ISLAND_END, 150, RIGHT_EDGE];

export function build(): Group {
  const root = group('bridge');
  const main = group('main');
  root.add(main);

  // Main channel: deck, arches, piers — the part in the photos
  buildDeck(main, LEFT_EDGE, ISLAND_START);
  buildArches(main, MAIN_PIERS);

  // Viaduct across the island and the short arch bridge over the narrow channel
  buildDeck(root, ISLAND_START, RIGHT_EDGE);
  buildViaduct(root);
  buildArches(root, CHANNEL_PIERS);

  // Gentle ramps down to both banks
  buildRamp(root, LEFT_EDGE, -1);
  buildRamp(root, RIGHT_EDGE, 1);

  mergeStatic(root);
  return root;
}

function buildDeck(g: Group, x0: number, x1: number): void {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  solid(box(g, 'concrete', [len, DECK_THICK, HALF_WIDTH * 2], [cx, DECK_BOTTOM + DECK_THICK / 2, 0]));
  // Road in the middle, sidewalks on the sides, a cornice line under the edge
  box(g, 'asphalt', [len, 0.04, 8.6], [cx, DECK_TOP + 0.02, 0]);
  box(g, 'concreteDark', [len, 0.3, HALF_WIDTH * 2 + 0.4], [cx, DECK_BOTTOM + 0.1, 0]);

  // Railing: rails and posts on both sides, plus an invisible wall so nobody walks off
  const rails: Placement[] = [];
  const posts: Placement[] = [];
  for (const side of [-1, 1]) {
    const z = side * (HALF_WIDTH - 0.15);
    rails.push({ pos: [cx, DECK_TOP + 1.0, z], scale: [len, 0.08, 0.1] });
    rails.push({ pos: [cx, DECK_TOP + 0.45, z], scale: [len, 0.06, 0.06] });
    for (let x = x0 + 1; x < x1; x += 2) posts.push({ pos: [x, DECK_TOP + 0.5, z], scale: [0.08, 1.0, 0.08] });
    colliderBox(g, [len, 1.4, 0.3], [cx, DECK_TOP + 0.7, z]);
  }
  instances(g, unitBox, 'iron', rails);
  instances(g, unitBox, 'iron', posts);

  // Tall lamp posts along both sides
  const poles: Placement[] = [];
  const arms: Placement[] = [];
  const globes: Placement[] = [];
  for (let x = x0 + 5; x < x1; x += 10) {
    for (const side of [-1, 1]) {
      const z = side * (HALF_WIDTH - 0.4);
      poles.push({ pos: [x, DECK_TOP + 3, z], scale: [0.16, 6, 0.16] });
      arms.push({ pos: [x, DECK_TOP + 5.9, z - side * 0.6], scale: [0.1, 0.1, 1.3] });
      globes.push({ pos: [x, DECK_TOP + 5.75, z - side * 1.2], scale: [0.26, 0.2, 0.26] });
    }
  }
  instances(g, unitBox, 'iron', poles);
  instances(g, unitBox, 'iron', arms);
  instances(g, unitSphere, 'lampGlobe', globes);
}

/** Twin arch ribs with spandrel columns for each span between consecutive piers, and the piers. */
function buildArches(g: Group, piers: number[]): void {
  const ribs: Placement[] = [];
  const columns: Placement[] = [];
  for (let i = 0; i < piers.length - 1; i++) {
    const a = piers[i] + (i === 0 ? 0 : 1.6);
    const b = piers[i + 1] - (i === piers.length - 2 ? 0 : 1.6);
    const span = b - a;
    const rise = Math.min(span * 0.22, DECK_BOTTOM - 0.3 - SPRING_Y);
    // Circle through both springings and the crown
    const r = (span * span) / 4 / (2 * rise) + rise / 2;
    const xm = (a + b) / 2;
    const yc = SPRING_Y + rise - r;
    const phi = Math.asin(span / 2 / r);
    const segments = 14;
    for (let s = 0; s < segments; s++) {
      const t0 = -phi + (2 * phi * s) / segments;
      const t1 = -phi + (2 * phi * (s + 1)) / segments;
      const t = (t0 + t1) / 2;
      const len = r * (t1 - t0) * 1.06;
      for (const z of [-RIB_Z, RIB_Z]) {
        ribs.push({ pos: [xm + r * Math.sin(t), yc + r * Math.cos(t), z], rotZ: -t, scale: [len, 0.9, 1.0] });
      }
    }
    // Spandrel columns from the rib up to the deck
    for (let x = a + 1.5; x < b - 1; x += 2.2) {
      const archTop = yc + Math.sqrt(Math.max(0, r * r - (x - xm) ** 2)) + 0.45;
      const h = DECK_BOTTOM - archTop;
      if (h < 0.3) continue;
      for (const z of [-RIB_Z, RIB_Z]) columns.push({ pos: [x, archTop + h / 2, z], scale: [0.45, h, 0.7] });
    }
  }
  instances(g, unitBox, 'concrete', ribs);
  instances(g, unitBox, 'concrete', columns);

  // River piers: granite at the water with a pointed ice-breaker upstream, concrete cap
  for (let i = 1; i < piers.length - 1; i++) {
    const x = piers[i];
    solid(box(g, 'graniteRed', [3.2, 5.4, HALF_WIDTH * 2 - 1], [x, -2.5, 0]));
    box(g, 'graniteRed', [2.26, 5.4, 2.26], [x, -2.5, HALF_WIDTH - 0.5], [0, Math.PI / 4, 0]);
    box(g, 'concreteDark', [3.6, 0.5, HALF_WIDTH * 2 - 0.6], [x, 0.45, 0]);
    // Slim concrete pier shaft between the arches, up to the deck
    box(g, 'concrete', [1.6, DECK_BOTTOM - 0.7, HALF_WIDTH * 2 - 2], [x, (DECK_BOTTOM + 0.7) / 2, 0]);
  }
}

function buildViaduct(g: Group): void {
  const cols: Placement[] = [];
  const beams: Placement[] = [];
  const ground = 0.3;
  for (let x = ISLAND_START + 5; x < ISLAND_END; x += 10) {
    for (const z of [-RIB_Z, RIB_Z]) {
      cols.push({ pos: [x, (ground + DECK_BOTTOM) / 2, z], scale: [1.1, DECK_BOTTOM - ground, 1.1] });
      colliderBox(g, [1.1, DECK_BOTTOM - ground, 1.1], [x, (ground + DECK_BOTTOM) / 2, z]);
    }
    beams.push({ pos: [x, DECK_BOTTOM - 0.4, 0], scale: [1.2, 0.8, RIB_Z * 2 + 1.2] });
  }
  instances(g, unitBox, 'concrete', cols);
  instances(g, unitBox, 'concreteDark', beams);
}

/**
 * Ramp from the deck down to a bank. The visible surface is a smooth slab; underneath,
 * mesh-less colliders form low steps the player walks up without jumping.
 */
function buildRamp(g: Group, edge: number, dir: 1 | -1): void {
  const steps = 28; // 0.25 each, well under the step-up height
  const run = RAMP_LENGTH / steps;
  for (let i = 0; i < steps; i++) {
    const h = DECK_TOP * ((steps - i) / steps);
    const x = edge + dir * (i + 0.5) * run;
    colliderBox(g, [run, h, HALF_WIDTH * 2], [x, h / 2, 0]);
  }
  const slope = Math.atan2(DECK_TOP, RAMP_LENGTH);
  const slabLen = Math.hypot(DECK_TOP, RAMP_LENGTH);
  const cx = edge + (dir * RAMP_LENGTH) / 2;
  box(g, 'asphalt', [slabLen, 0.4, 8.6], [cx, DECK_TOP / 2 - 0.1, 0], [0, 0, -dir * slope]);
  box(g, 'concrete', [slabLen, 0.5, HALF_WIDTH * 2], [cx, DECK_TOP / 2 - 0.3, 0], [0, 0, -dir * slope]);

  // Retaining walls under the ramp, stepping down with it
  const walls: Placement[] = [];
  const pieces = 8;
  for (let i = 0; i < pieces; i++) {
    // Top follows the lower end of each piece, so the wall stays under the sloping slab
    const h = DECK_TOP * ((pieces - i - 1) / pieces) + 0.1;
    const w = RAMP_LENGTH / pieces;
    walls.push({ pos: [edge + dir * (i + 0.5) * w, h / 2, 0], scale: [w, h, HALF_WIDTH * 2 - 0.4] });
  }
  instances(g, unitBox, 'concreteDark', walls);

  // Side railings on the ramp
  for (const side of [-1, 1]) {
    colliderBox(g, [RAMP_LENGTH, DECK_TOP + 1.4, 0.3], [cx, (DECK_TOP + 1.4) / 2, side * (HALF_WIDTH - 0.15)]);
    box(g, 'iron', [slabLen, 0.08, 0.1], [cx, DECK_TOP / 2 + 1.0, side * (HALF_WIDTH - 0.15)], [0, 0, -dir * slope]);
  }
}
