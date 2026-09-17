import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { type ColorName, lambert } from '../palette';
import { type Box, box } from './colliders';

/**
 * Schematic map, not to scale. X runs along the Yenisei (flowing towards +X),
 * the left bank is north (−Z), the right bank is south (+Z). 1 unit ≈ 1 m.
 */
export const MAP = {
  halfX: 200,
  north: -150,
  south: 150,
  riverHalfWidth: 25,
  sandWidth: 6,
  waterY: -1.2,
  bankDepth: 4,
} as const;

const unit = new BoxGeometry(1, 1, 1);

/**
 * Solid block: a mesh plus a collider with the same bounds.
 * color = null makes an invisible wall.
 */
export function solidBox(
  parent: Group,
  colliders: Box[],
  b: Box,
  color: ColorName | null,
): Mesh | null {
  colliders.push(b);
  if (!color) return null;
  const m = new Mesh(unit, lambert(color));
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
  const { halfX, north, south, riverHalfWidth: rw, sandWidth: sw, bankDepth: d } = MAP;

  // Banks: grass plus a sand strip by the water
  solidBox(group, colliders, box(-halfX, -d, north, halfX, 0, -rw - sw), 'grass');
  solidBox(group, colliders, box(-halfX, -d, -rw - sw, halfX, 0, -rw), 'sand');
  solidBox(group, colliders, box(-halfX, -d, rw + sw, halfX, 0, south), 'grass');
  solidBox(group, colliders, box(-halfX, -d, rw, halfX, 0, rw + sw), 'sand');

  // Ground beyond the map edge — visual only, fades into fog
  const far = 1200;
  for (const side of [-1, 1]) {
    const depth = far / 2 - rw;
    const plane = new Mesh(new PlaneGeometry(far, depth), lambert('grassDark'));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -0.1, side * (rw + depth / 2));
    group.add(plane);
  }

  // Map edge: a low hedge with a tall invisible wall on top
  const hedge = (b: Box) => {
    solidBox(group, colliders, b, 'hedge');
    solidBox(group, colliders, { ...b, maxY: 30, noCamera: true }, null);
  };
  for (const [z0, z1] of [
    [north, -rw],
    [rw, south],
  ]) {
    hedge(box(-halfX - 1, 0, z0, -halfX, 1.2, z1));
    hedge(box(halfX, 0, z0, halfX + 1, 1.2, z1));
  }
  hedge(box(-halfX - 1, 0, north - 1, halfX + 1, 1.2, north));
  hedge(box(-halfX - 1, 0, south, halfX + 1, 1.2, south + 1));

  // Hill for the Paraskeva Pyatnitsa chapel: stepped terraces of 0.5,
  // each walkable without jumping.
  const hill = { x: -70, z: -110, base: 50, levels: 10, rise: 0.5, shrink: 2 };
  for (let i = 0; i < hill.levels; i++) {
    const half = hill.base / 2 - i * hill.shrink;
    solidBox(
      group,
      colliders,
      box(hill.x - half, 0, hill.z - half, hill.x + half, (i + 1) * hill.rise, hill.z + half),
      i % 2 === 0 ? 'grass' : 'grassLight',
    );
  }

  return { group, colliders };
}
