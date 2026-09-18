import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { type ColorName, material } from '../palette';
import { type Box, box } from './colliders';
import { mergeStatic } from './landmarks/kit';

/**
 * Schematic map of central Krasnoyarsk, see docs/map.md. The Yenisei is
 * straightened and flows towards +X (in reality east-north-east); the left
 * bank with the city centre is north (−Z), the right bank is south (+Z).
 * Directions between places follow the real map, distances are compressed.
 */
export const MAP = {
  west: -700,
  east: 520,
  north: -380,
  south: 440,
  /** Water starts at the left bank edge and ends at the right bank edge. */
  leftBankZ: 0,
  rightBankZ: 175,
  /**
   * Otdykha island between the main channel (north) and the narrow channel (south).
   * Long enough for the Palace of Sports in the west and the stadium and the
   * lighthouse east of the bridge.
   */
  island: { x0: -440, x1: 300, z0: 70, z1: 150 },
  /** Karaulnaya hill with the chapel on top. */
  hill: { x: -100, z: -290, base: 90, levels: 12, rise: 0.5, shrink: 3 },
  sandWidth: 6,
  waterY: -1.2,
  bankDepth: 4,
} as const;

/** Height of the top of Karaulnaya hill. */
export const HILL_TOP = MAP.hill.levels * MAP.hill.rise;

const unit = new BoxGeometry(1, 1, 1);

/**
 * Solid block: a mesh plus a collider with the same bounds.
 * color = null makes an invisible wall.
 */
export function solidBox(parent: Group, colliders: Box[], b: Box, color: ColorName | null): Mesh | null {
  colliders.push(b);
  if (!color) return null;
  const m = new Mesh(unit, material(color));
  m.scale.set(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
  m.position.set((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2);
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  parent.add(m);
  return m;
}

export interface Terrain {
  group: Group;
  colliders: Box[];
}

export function buildTerrain(): Terrain {
  const group = new Group();
  const colliders: Box[] = [];
  const { west, east, north, south, leftBankZ: lz, rightBankZ: rz, island: isl, sandWidth: sw, bankDepth: d } = MAP;

  // Left bank (city centre) and right bank, each with a sand strip at the water
  solidBox(group, colliders, box(west, -d, north, east, 0, lz - sw), 'grass');
  solidBox(group, colliders, box(west, -d, lz - sw, east, 0, lz), 'sand');
  solidBox(group, colliders, box(west, -d, rz, east, 0, rz + sw), 'sand');
  solidBox(group, colliders, box(west, -d, rz + sw, east, 0, south), 'grass');

  // Otdykha island: sand shore around a grass middle, tapered ends
  solidBox(group, colliders, box(isl.x0, -d, isl.z0, isl.x1, 0, isl.z1), 'sand');
  solidBox(group, colliders, box(isl.x0 + 12, 0, isl.z0 + 5, isl.x1 - 8, 0.3, isl.z1 - 5), 'grass');

  // Ground beyond the playable map — visual only, fades into fog
  const far = 2400;
  const cx = (west + east) / 2;
  const plane = (x0: number, x1: number, z0: number, z1: number) => {
    const p = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), material('grassDark'));
    p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, -0.1, (z0 + z1) / 2);
    group.add(p);
  };
  plane(cx - far / 2, cx + far / 2, north - far / 2, lz - 1);
  plane(cx - far / 2, cx + far / 2, rz + 1, south + far / 2);

  // Map edge: a low hedge with a tall invisible wall on top
  const hedge = (b: Box) => {
    solidBox(group, colliders, b, 'hedge');
    solidBox(group, colliders, { ...b, maxY: 30, noCamera: true }, null);
  };
  for (const [z0, z1] of [
    [north, lz],
    [rz, south],
  ]) {
    hedge(box(west - 1, 0, z0, west, 1.2, z1));
    hedge(box(east, 0, z0, east + 1, 1.2, z1));
  }
  hedge(box(west - 1, 0, north - 1, east + 1, 1.2, north));
  hedge(box(west - 1, 0, south, east + 1, 1.2, south + 1));

  // Karaulnaya hill: stepped terraces of 0.5, each walkable without jumping
  const h = MAP.hill;
  for (let i = 0; i < h.levels; i++) {
    const half = h.base / 2 - i * h.shrink;
    solidBox(
      group,
      colliders,
      box(h.x - half, 0, h.z - half, h.x + half, (i + 1) * h.rise, h.z + half),
      i % 2 === 0 ? 'grass' : 'grassLight',
    );
  }

  // One mesh per colour, textures laid out in world units; colliders are already collected
  mergeStatic(group);
  return { group, colliders };
}
