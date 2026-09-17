import { Group } from 'three';
import { type Box, type Vec3, box } from './colliders';
import { buildRiver } from './river';
import { buildTerrain, solidBox } from './terrain';

export interface World {
  root: Group;
  colliders: Box[];
  spawn: Vec3;
  /** Initial camera yaw: looking from the bank towards the river. */
  spawnYaw: number;
  update(dt: number): void;
}

export function buildWorld(): World {
  const root = new Group();
  const terrain = buildTerrain();
  root.add(terrain.group);
  const colliders = terrain.colliders;

  const river = buildRiver();
  root.add(river.mesh);

  addTestBlocks(root, colliders);

  return {
    root,
    colliders,
    spawn: { x: 0, y: 0, z: -45 },
    spawnYaw: Math.PI,
    update: (dt) => river.update(dt),
  };
}

/** TEMPORARY (stage 1): blocks for testing steps, jumps and the camera. Remove in stage 5. */
function addTestBlocks(root: Group, colliders: Box[]): void {
  // Staircase of 0.5 steps going north — walkable without jumping
  for (let i = 0; i < 4; i++) {
    const z = -50 - i * 2;
    solidBox(root, colliders, box(-14, 0, z - 2, -10, 0.5 * (i + 1), z), i % 2 ? 'testPurple' : 'testOrange');
  }
  // 1.5 block — jump only
  solidBox(root, colliders, box(8, 0, -54, 12, 1.5, -50), 'testPurple');
  // Wall — the camera must not pass through it
  solidBox(root, colliders, box(-6, 0, -66, 6, 5, -65), 'testOrange');
  // Pillar
  solidBox(root, colliders, box(14, 0, -62, 15, 6, -61), 'testPurple');
}
