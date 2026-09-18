import { Group } from 'three';
import { type Box, type Vec3, box } from './colliders';
import { placeLandmarks } from './landmarks/index';
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

  placeLandmarks(root, colliders);
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
  // Kept east of the spawn point, clear of the landmarks
  // Staircase of 0.5 steps going north — walkable without jumping
  for (let i = 0; i < 4; i++) {
    const z = -42 - i * 2;
    solidBox(root, colliders, box(20, 0, z - 2, 24, 0.5 * (i + 1), z), i % 2 ? 'testPurple' : 'testOrange');
  }
  // 1.5 block — jump only
  solidBox(root, colliders, box(28, 0, -48, 32, 1.5, -44), 'testPurple');
  // Wall — the camera must not pass through it
  solidBox(root, colliders, box(34, 0, -56, 44, 5, -55), 'testOrange');
  // Pillar
  solidBox(root, colliders, box(48, 0, -52, 49, 6, -51), 'testPurple');
}
