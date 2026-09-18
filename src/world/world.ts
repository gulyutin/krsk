import { Group } from 'three';
import type { Box, Vec3 } from './colliders';
import { placeLandmarks } from './landmarks/index';
import { buildRiver } from './river';
import { buildTerrain } from './terrain';

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

  return {
    root,
    colliders,
    // On the embankment next to the museum, where the Communal bridge starts
    spawn: { x: 30, y: 0, z: -12 },
    spawnYaw: Math.PI,
    update: (dt) => river.update(dt),
  };
}
