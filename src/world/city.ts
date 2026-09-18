// The city around the landmarks: streets on the real grid (compressed like the rest
// of the map, see docs/map.md), perimeter blocks of houses, trees, lamps and benches.
// Generated from a fixed seed, so it is the same on every load. Everything repeated is
// merged into one mesh per material or drawn instanced, so the whole city costs a few
// dozen draw calls.

import {
  BufferGeometry,
  CylinderGeometry,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  Object3D,
  BoxGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type ColorName, material } from '../palette';
import type { Box } from './colliders';
import { MAP } from './map';
import { heightAt } from './relief';

/** Axis-aligned rectangle on the ground. */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const FLOOR = 3; // height of one floor, also one window tile
const BAY = 3; // width of one window bay

// ---------- Street grid ----------

interface Street {
  name: string;
  /** Position across the street direction (z for streets along the river, x for cross streets). */
  at: number;
  from: number;
  to: number;
  width: number;
}

/** Streets along the river, from the embankment inland (real order, compressed). */
const ALONG: Street[] = [
  { name: 'Dubrovinskogo', at: -24.5, from: MAP.west, to: MAP.east, width: 5 },
  { name: 'Karla Marksa', at: -80, from: MAP.west, to: MAP.east, width: 8 },
  { name: 'prospekt Mira', at: -150, from: MAP.west, to: MAP.east, width: 9 },
  { name: 'Lenina', at: -205, from: MAP.west, to: 330, width: 8 },
  // Right bank and the island
  { name: 'right bank street', at: 262, from: -330, to: MAP.east, width: 8 },
  { name: 'Yaryginsky proyezd', at: 111, from: MAP.island.x0 + 20, to: MAP.island.x1 - 20, width: 6 },
];

/** Cross streets, west to east (real order, compressed). */
const ACROSS: Street[] = [
  { name: 'Dekabristov', at: -470, from: MAP.north, to: -24.5, width: 7 },
  { name: 'Gorkogo', at: -395, from: MAP.north, to: -24.5, width: 7 },
  { name: 'Diktatury Proletariata', at: -270, from: MAP.north, to: -24.5, width: 7 },
  { name: 'Kirova', at: -205, from: MAP.north, to: -24.5, width: 7 },
  { name: 'Perensona', at: -70, from: -250, to: -24.5, width: 7 },
  { name: 'bridgehead', at: 10, from: -150, to: -24.5, width: 10 },
  { name: 'Veinbauma', at: 96, from: MAP.north, to: -24.5, width: 7 },
  { name: 'Surikova', at: 262, from: MAP.north, to: -24.5, width: 8 },
  { name: 'Parizhskoy Kommuny', at: 330, from: MAP.north, to: -24.5, width: 7 },
  { name: '9 Yanvarya', at: 420, from: MAP.north, to: -24.5, width: 7 },
  // Right bank: the road from the bridge to the south
  { name: 'bridge road', at: 10, from: MAP.rightBankZ + 22, to: MAP.south, width: 10 },
  { name: 'right bank cross', at: 180, from: MAP.rightBankZ + 30, to: 330, width: 7 },
  { name: 'right bank west', at: -170, from: MAP.rightBankZ + 30, to: 330, width: 7 },
  { name: 'right bank far west', at: -330, from: MAP.rightBankZ + 30, to: 330, width: 7 },
  { name: 'right bank east', at: 360, from: MAP.rightBankZ + 30, to: 330, width: 7 },
];

/**
 * Places kept free of houses: sites of future landmarks from docs/map.md
 * (trees may still grow in parks).
 */
const RESERVED: (Rect & { name: string; trees: boolean })[] = [
  { name: 'Opera and Ballet Theatre', x0: -180, x1: -100, z0: -140, z1: -88, trees: false },
  { name: 'Central Park', x0: -385, x1: -280, z0: -75, z1: -29, trees: true },
  { name: 'Strelka and the steamer', x0: 340, x1: 440, z0: -60, z1: 0, trees: false },
  { name: 'Bobrovy Log', x0: -480, x1: -360, z0: 190, z1: 320, trees: false },
  { name: 'Stolby', x0: -690, x1: -510, z0: 270, z1: 410, trees: true },
  { name: 'Palace of Sports', x0: -235, x1: -160, z0: 80, z1: 130, trees: false },
  { name: 'Central Stadium', x0: 210, x1: 292, z0: 80, z1: 132, trees: false },
  { name: 'Lighthouse', x0: 195, x1: 235, z0: 128, z1: 150, trees: false },
];

// ---------- Helpers ----------

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.x0 < b.x1 + margin && a.x1 > b.x0 - margin && a.z0 < b.z1 + margin && a.z1 > b.z0 - margin;
}

function inside(x: number, z: number, r: Rect): boolean {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

function streetRect(s: Street, along: boolean): Rect {
  const h = s.width / 2 + 2; // plus sidewalks
  return along ? { x0: s.from, x1: s.to, z0: s.at - h, z1: s.at + h } : { x0: s.at - h, x1: s.at + h, z0: s.from, z1: s.to };
}

/** Geometry assembled face by face, with UVs in window tiles for facades. */
class Builder {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly uv: number[] = [];

  quad(p: number[][], n: number[], uv: number[][]): void {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(...p[i]);
      this.nor.push(...n);
      this.uv.push(...uv[i]);
    }
  }

  tri(p: number[][], n: number[], uv: number[][]): void {
    for (let i = 0; i < 3; i++) {
      this.pos.push(...p[i]);
      this.nor.push(...n);
      this.uv.push(...uv[i]);
    }
  }

  geometry(): BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

class Builders {
  private readonly map = new Map<ColorName, Builder>();
  get(color: ColorName): Builder {
    let b = this.map.get(color);
    if (!b) this.map.set(color, (b = new Builder()));
    return b;
  }
  meshes(): Mesh[] {
    const out: Mesh[] = [];
    for (const [color, b] of this.map) {
      const g = b.geometry();
      if (g) out.push(new Mesh(g, material(color)));
    }
    return out;
  }
}

/** Four walls of a box, UVs counting window bays across and floors up from `ground`. */
function walls(b: Builder, r: Rect, y0: number, y1: number, ground: number): void {
  const { x0, x1, z0, z1 } = r;
  const v0 = (y0 - ground) / FLOOR;
  const v1 = (y1 - ground) / FLOOR;
  const face = (p: number[][], n: number[], len: number) =>
    b.quad(p, n, [
      [0, v0],
      [len / BAY, v0],
      [len / BAY, v1],
      [0, v1],
    ]);
  face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], x1 - x0);
  face([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], x1 - x0);
  face([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], z1 - z0);
  face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], z1 - z0);
}

/** Flat roof slab with world-space UVs. */
function flatRoof(b: Builder, r: Rect, y: number): void {
  const { x0, x1, z0, z1 } = r;
  const t = 3;
  b.quad(
    [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]],
    [0, 1, 0],
    [[x0 / t, z1 / t], [x1 / t, z1 / t], [x1 / t, z0 / t], [x0 / t, z0 / t]],
  );
}

/** Pitched roof with the ridge along the longer side, gables filled with the facade colour. */
function pitchedRoof(roof: Builder, wall: Builder, r: Rect, y: number, rise: number): void {
  const { x0, x1, z0, z1 } = r;
  const alongX = x1 - x0 >= z1 - z0;
  const t = 1.5;
  if (alongX) {
    const zm = (z0 + z1) / 2;
    const top = y + rise;
    const slope = Math.hypot(rise, (z1 - z0) / 2);
    const ny = (z1 - z0) / 2 / slope;
    const nz = rise / slope;
    roof.quad([[x0, y, z1], [x1, y, z1], [x1, top, zm], [x0, top, zm]], [0, ny, nz], [[x0 / t, 0], [x1 / t, 0], [x1 / t, slope / t], [x0 / t, slope / t]]);
    roof.quad([[x1, y, z0], [x0, y, z0], [x0, top, zm], [x1, top, zm]], [0, ny, -nz], [[x1 / t, 0], [x0 / t, 0], [x0 / t, slope / t], [x1 / t, slope / t]]);
    wall.tri([[x1, y, z1], [x1, y, z0], [x1, top, zm]], [1, 0, 0], [[0, 0], [0, 0], [0, 0]]);
    wall.tri([[x0, y, z0], [x0, y, z1], [x0, top, zm]], [-1, 0, 0], [[0, 0], [0, 0], [0, 0]]);
  } else {
    const xm = (x0 + x1) / 2;
    const top = y + rise;
    const slope = Math.hypot(rise, (x1 - x0) / 2);
    const ny = (x1 - x0) / 2 / slope;
    const nx = rise / slope;
    roof.quad([[x1, y, z1], [x1, y, z0], [xm, top, z0], [xm, top, z1]], [nx, ny, 0], [[z1 / t, 0], [z0 / t, 0], [z0 / t, slope / t], [z1 / t, slope / t]]);
    roof.quad([[x0, y, z0], [x0, y, z1], [xm, top, z1], [xm, top, z0]], [-nx, ny, 0], [[z0 / t, 0], [z1 / t, 0], [z1 / t, slope / t], [z0 / t, slope / t]]);
    wall.tri([[x0, y, z1], [x1, y, z1], [xm, top, z1]], [0, 0, 1], [[0, 0], [0, 0], [0, 0]]);
    wall.tri([[x1, y, z0], [x0, y, z0], [xm, top, z0]], [0, 0, -1], [[0, 0], [0, 0], [0, 0]]);
  }
}

/** A road or sidewalk ribbon draped over the terrain. */
function ribbon(b: Builder, s: Street, along: boolean, halfWidth: number, lift: number, skip: Rect[]): void {
  const step = 4;
  const t = 3;
  for (let a = s.from; a < s.to; a += step) {
    const a1 = Math.min(a + step, s.to);
    const mid = (a + a1) / 2;
    const [mx, mz] = along ? [mid, s.at] : [s.at, mid];
    if (skip.some((r) => inside(mx, mz, r))) continue;
    const c = (u: number, w: number): number[] => {
      const [x, z] = along ? [u, s.at + w] : [s.at + w, u];
      return [x, heightAt(x, z) + lift, z];
    };
    const p = [c(a, halfWidth), c(a1, halfWidth), c(a1, -halfWidth), c(a, -halfWidth)];
    const uv = p.map((q) => [q[0] / t, q[2] / t]);
    // Keep the winding facing up in both directions
    if (along) b.quad([p[0], p[1], p[2], p[3]], [0, 1, 0], uv);
    else b.quad([p[3], p[2], p[1], p[0]], [0, 1, 0], [uv[3], uv[2], uv[1], uv[0]]);
  }
}

// ---------- Trees and furniture ----------

type TreeKind = 'birch' | 'poplar' | 'spruce';

interface TreePlacement {
  kind: TreeKind;
  x: number;
  z: number;
  scale: number;
  turn: number;
}

function instanced(geometry: BufferGeometry, mat: Material, matrices: Matrix4[], castShadow = true): InstancedMesh | null {
  if (!matrices.length) return null;
  const m = new InstancedMesh(geometry, mat, matrices.length);
  matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
  m.computeBoundingSphere();
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

function buildTrees(trees: TreePlacement[], colliders: Box[], shadows: boolean): Object3D[] {
  const parts: Record<TreeKind, { trunk: BufferGeometry; crown: BufferGeometry; trunkColor: ColorName; crownColor: ColorName }> = {
    birch: {
      trunk: new CylinderGeometry(0.14, 0.2, 5, 5, 1, true).translate(0, 2.5, 0),
      crown: mergeGeometries([
        new IcosahedronGeometry(1.6, 0).translate(0, 5.2, 0),
        new IcosahedronGeometry(1.2, 0).translate(0.4, 6.6, 0.2),
      ])!,
      trunkColor: 'birchBark',
      crownColor: 'birchLeaves',
    },
    poplar: {
      trunk: new CylinderGeometry(0.2, 0.3, 4, 5, 1, true).translate(0, 2, 0),
      crown: new IcosahedronGeometry(1, 0).scale(1.7, 4, 1.7).translate(0, 6.5, 0),
      trunkColor: 'wood',
      crownColor: 'poplarLeaves',
    },
    spruce: {
      trunk: new CylinderGeometry(0.15, 0.25, 2, 5, 1, true).translate(0, 1, 0),
      crown: mergeGeometries([
        new ConeGeometry(2.2, 3.4, 7, 1, true).translate(0, 3, 0),
        new ConeGeometry(1.7, 3, 7, 1, true).translate(0, 4.8, 0),
        new ConeGeometry(1.1, 2.6, 7, 1, true).translate(0, 6.4, 0),
      ])!,
      trunkColor: 'wood',
      crownColor: 'firGreen',
    },
  };
  const out: Object3D[] = [];
  const dummy = new Object3D();
  for (const kind of Object.keys(parts) as TreeKind[]) {
    const list = trees.filter((t) => t.kind === kind);
    const matrices = list.map((t) => {
      dummy.position.set(t.x, heightAt(t.x, t.z) - 0.1, t.z);
      dummy.rotation.set(0, t.turn, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
    const p = parts[kind];
    for (const [geo, color] of [
      [p.trunk, p.trunkColor],
      [p.crown, p.crownColor],
    ] as const) {
      const m = instanced(geo, material(color), matrices, shadows);
      if (m) out.push(m);
    }
    for (const t of list) {
      const y = heightAt(t.x, t.z);
      colliders.push({ minX: t.x - 0.3, maxX: t.x + 0.3, minY: y, maxY: y + 3, minZ: t.z - 0.3, maxZ: t.z + 0.3 });
    }
  }
  return out;
}

function buildLamps(points: [number, number][], colliders: Box[]): Object3D[] {
  const pole = new CylinderGeometry(0.08, 0.12, 5, 6).translate(0, 2.5, 0);
  const head = mergeGeometries([new BoxGeometry(0.9, 0.08, 0.1).translate(0.35, 5, 0), new BoxGeometry(0.3, 0.14, 0.3).translate(0.75, 4.92, 0)])!;
  const dummy = new Object3D();
  const matrices = points.map(([x, z]) => {
    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
  for (const [x, z] of points) {
    const y = heightAt(x, z);
    colliders.push({ minX: x - 0.15, maxX: x + 0.15, minY: y, maxY: y + 5, minZ: z - 0.15, maxZ: z + 0.15 });
  }
  return [instanced(pole, material('iron'), matrices), instanced(head, material('iron'), matrices)].filter((m): m is InstancedMesh => !!m);
}

function buildBenches(points: [number, number, number][]): Object3D[] {
  const bench = mergeGeometries([
    new BoxGeometry(2, 0.08, 0.5).translate(0, 0.45, 0),
    new BoxGeometry(2, 0.5, 0.08).translate(0, 0.75, -0.24),
    new BoxGeometry(0.08, 0.45, 0.45).translate(-0.9, 0.22, 0),
    new BoxGeometry(0.08, 0.45, 0.45).translate(0.9, 0.22, 0),
  ])!;
  const dummy = new Object3D();
  const matrices = points.map(([x, z, turn]) => {
    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.set(0, turn, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
  const m = instanced(bench, material('benchWood'), matrices);
  return m ? [m] : [];
}

// ---------- City ----------

export interface City {
  group: Group;
  colliders: Box[];
}

/**
 * `occupied`: footprints of landmarks, kept free of houses and trees.
 * `treeShadows`: thousands of trees in the shadow pass are too much for phones.
 */
export function buildCity(occupied: Rect[], treeShadows = true): City {
  const rand = rng(20260918);
  const group = new Group();
  const colliders: Box[] = [];
  const builders = new Builders();
  const trees: TreePlacement[] = [];
  const lamps: [number, number][] = [];
  const benches: [number, number, number][] = [];

  const noHouses = [...occupied, ...RESERVED];
  const noTrees = [...occupied, ...RESERVED.filter((r) => !r.trees)];
  const roads = [...ALONG.map((s) => streetRect(s, true)), ...ACROSS.map((s) => streetRect(s, false))];

  // Streets: asphalt on top of the sidewalks, so crossings show asphalt
  for (const [list, along] of [
    [ALONG, true],
    [ACROSS, false],
  ] as const) {
    for (const s of list) {
      ribbon(builders.get('asphalt'), s, along, s.width / 2, 0.1, occupied);
      ribbon(builders.get('squarePaving'), s, along, s.width / 2 + 2, 0.04, occupied);
    }
  }

  const treeOk = (x: number, z: number) =>
    !noTrees.some((r) => inside(x, z, r)) && !roads.some((r) => inside(x, z, r)) && heightAt(x, z) > 0.4;
  const addTree = (kind: TreeKind, x: number, z: number) => {
    if (treeOk(x, z)) trees.push({ kind, x, z, scale: 0.8 + rand() * 0.5, turn: rand() * Math.PI * 2 });
  };

  // Street trees and lamps
  for (const [list, along] of [
    [ALONG, true],
    [ACROSS, false],
  ] as const) {
    for (const s of list) {
      const off = s.width / 2 + 3;
      for (let a = s.from + 6; a < s.to; a += 11) {
        for (const side of [-1, 1]) {
          const [x, z] = along ? [a, s.at + side * off] : [s.at + side * off, a];
          if (rand() < 0.8) addTree(rand() < 0.5 ? 'poplar' : 'birch', x, z);
        }
      }
      for (let a = s.from + 10; a < s.to; a += 20) {
        const [x, z] = along ? [a, s.at + s.width / 2 + 1] : [s.at + s.width / 2 + 1, a];
        if (!occupied.some((r) => inside(x, z, r)) && heightAt(x, z) > 0.4) lamps.push([x, z]);
      }
    }
  }

  // Embankment promenade: a row of birches, lamps and benches facing the river
  for (let x = MAP.west + 10; x < MAP.east - 10; x += 10) {
    addTree('birch', x + rand() * 3, -11 - rand() * 2);
    if (Math.round(x) % 20 === 0) {
      if (!occupied.some((r) => inside(x, -5, r))) {
        lamps.push([x + 5, -5]);
        benches.push([x, -7, 0]); // facing the river
      }
    }
  }

  // Houses: perimeter blocks between the streets
  // Blocks are kept roomy: houses only along the two long sides with wide passages
  // between them, open ends, lawns and some blocks left as squares
  const blocks = (along: Street[], across: Street[], zone: (z: number) => 'old' | 'soviet' | 'panel') => {
    const zs = along.map((s) => s.at).sort((a, b) => a - b);
    const xs = across.map((s) => s.at).sort((a, b) => a - b);
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < xs.length - 1; j++) {
        const inset = 12;
        const block: Rect = { x0: xs[j] + inset, x1: xs[j + 1] - inset, z0: zs[i] + inset, z1: zs[i + 1] - inset };
        if (block.x1 - block.x0 < 16 || block.z1 - block.z0 < 16) continue;
        if (rand() < 0.2) square(block);
        else fillBlock(block, zone((block.z0 + block.z1) / 2));
      }
    }
  };

  /** A green square instead of houses: trees around, benches in the middle. */
  const square = (block: Rect) => {
    const cx = (block.x0 + block.x1) / 2;
    const cz = (block.z0 + block.z1) / 2;
    for (let k = 0; k < 14; k++) {
      const x = block.x0 + rand() * (block.x1 - block.x0);
      const z = block.z0 + rand() * (block.z1 - block.z0);
      if (Math.hypot(x - cx, z - cz) > 8) addTree(rand() < 0.6 ? 'birch' : 'poplar', x, z);
    }
    if (!occupied.some((r) => inside(cx, cz, r))) {
      benches.push([cx - 2.5, cz, 0], [cx + 2.5, cz, Math.PI]);
      lamps.push([cx, cz + 3]);
    }
  };

  const fillBlock = (block: Rect, kind: 'old' | 'soviet' | 'panel') => {
    const depth = kind === 'old' ? 10 : 12;
    // Deep blocks keep a building row on both long sides, shallow ones only on one
    const rows: Rect[] = [{ ...block, z0: block.z1 - depth }];
    if (block.z1 - block.z0 > depth * 2 + 14) rows.push({ ...block, z1: block.z0 + depth });
    for (const r of rows) {
      const len = r.x1 - r.x0;
      let a = 2 + rand() * 4;
      while (a < len - 8) {
        const size = Math.min(len - a, kind === 'old' ? 12 + rand() * 10 : 18 + rand() * 14);
        const piece: Rect = { ...r, x0: r.x0 + a, x1: r.x0 + a + size };
        // Some plots stay lawns
        if (rand() > 0.25) house(piece, kind);
        a += size + 6 + rand() * 6;
      }
    }
    // Trees in the courtyard
    for (let k = 0; k < 5; k++) {
      addTree(
        rand() < 0.5 ? 'birch' : 'poplar',
        block.x0 + rand() * (block.x1 - block.x0),
        block.z0 + depth + 4 + rand() * Math.max(1, block.z1 - block.z0 - 2 * depth - 8),
      );
    }
  };

  const OLD_COLORS: ColorName[] = ['facadeOchre', 'facadePink', 'facadeCream', 'facadeMint', 'facadeBrick', 'facadeBlue'];
  const house = (r: Rect, kind: 'old' | 'soviet' | 'panel') => {
    if (noHouses.some((o) => overlaps(r, o, 3))) return;
    // Build only on fairly flat ground; sink the base into the lowest corner
    const hs = [heightAt(r.x0, r.z0), heightAt(r.x1, r.z0), heightAt(r.x0, r.z1), heightAt(r.x1, r.z1), heightAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)];
    const lo = Math.min(...hs);
    const hi = Math.max(...hs);
    if (hi - lo > 1.6 || lo < 0.5) return;
    const floors = kind === 'old' ? 2 + Math.floor(rand() * 3) : kind === 'soviet' ? (rand() < 0.7 ? 5 : 9) : rand() < 0.5 ? 9 : 12;
    const color: ColorName = kind === 'old' ? OLD_COLORS[Math.floor(rand() * OLD_COLORS.length)] : rand() < 0.5 ? 'panelWhite' : 'panelGrey';
    const ground = hi;
    const base = lo - 0.5;
    const top = ground + floors * FLOOR + 0.4;
    walls(builders.get(color), r, base, top, ground);
    if (kind === 'old' && rand() < 0.7) {
      pitchedRoof(builders.get(rand() < 0.5 ? 'roofRed' : 'roofTin'), builders.get(color), r, top, 2.2);
    } else {
      flatRoof(builders.get('roofGrey'), r, top);
    }
    colliders.push({ minX: r.x0, maxX: r.x1, minY: base, maxY: top, minZ: r.z0, maxZ: r.z1 });
  };

  // Left bank: old houses near the river, Soviet blocks further in
  const leftAlong = ALONG.filter((s) => s.at < 0);
  const leftAcross = ACROSS.filter((s) => s.from < 0 && s.to <= 0);
  blocks(leftAlong, leftAcross, (z) => (z > -100 ? 'old' : 'soviet'));
  // Beyond Lenina to the north edge, around the hill
  blocks([ALONG.find((s) => s.name === 'Lenina')!, { name: 'north edge', at: MAP.north + 6, from: MAP.west, to: MAP.east, width: 0 }], leftAcross, () => 'soviet');
  // Right bank: panel blocks
  const rightAlong = [
    { name: 'right bank shore', at: MAP.rightBankZ + 30, from: MAP.west, to: MAP.east, width: 0 },
    ...ALONG.filter((s) => s.at > MAP.rightBankZ),
    { name: 'ridge foot', at: 335, from: MAP.west, to: MAP.east, width: 0 },
  ];
  blocks(rightAlong, ACROSS.filter((s) => s.from > MAP.rightBankZ), () => 'panel');

  // Parks and forests
  const scatter = (r: Rect, count: number, kinds: TreeKind[], ok: (x: number, z: number) => boolean = () => true) => {
    for (let k = 0; k < count; k++) {
      const x = r.x0 + rand() * (r.x1 - r.x0);
      const z = r.z0 + rand() * (r.z1 - r.z0);
      if (ok(x, z)) addTree(kinds[Math.floor(rand() * kinds.length)], x, z);
    }
  };
  const central = RESERVED.find((r) => r.name === 'Central Park')!;
  scatter(central, 120, ['birch', 'poplar', 'spruce'], (x) => Math.abs(x - (central.x0 + central.x1) / 2) > 4);
  // Karaulnaya hill slopes: a forest around the chapel
  const hill = MAP.hill;
  scatter({ x0: hill.x - 150, x1: hill.x + 150, z0: hill.z - 90, z1: hill.z + 130 }, 420, ['spruce', 'birch', 'spruce'], (x, z) => {
    const d = Math.hypot(x - hill.x, z - hill.z);
    return d > 24 && d < 145;
  });
  // Right bank: forest on the rising ground in the south and around the Stolby
  scatter({ x0: MAP.west, x1: MAP.east, z0: 300, z1: MAP.south - 4 }, 450, ['spruce', 'spruce', 'birch']);
  // Otdykha island: poplars and birches
  scatter({ x0: MAP.island.x0 + 20, x1: MAP.island.x1 - 20, z0: MAP.island.z0 + 8, z1: MAP.island.z1 - 8 }, 160, ['poplar', 'birch']);

  for (const m of builders.meshes()) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  group.add(...buildTrees(trees, colliders, treeShadows), ...buildLamps(lamps, colliders), ...buildBenches(benches));
  return { group, colliders };
}
