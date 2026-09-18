import { Group } from 'three';
import type { Box, Vec3 } from './colliders';
import { placeLandmarks } from './landmarks/index';
import { enableShadows } from './lighting';
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

/** waterDetail: ripple normal map on the river (off on low quality). */
export function buildWorld(waterDetail = true): World {
  const root = new Group();
  const terrain = buildTerrain();
  root.add(terrain.group);
  const colliders = terrain.colliders;

  const river = buildRiver(waterDetail);
  enableShadows(terrain.group, false);
  enableShadows(river.mesh, false);
  root.add(river.mesh);

  const landmarks = new Group();
  root.add(landmarks);
  placeLandmarks(landmarks, colliders);
  enableShadows(landmarks);

  return {
    root,
    colliders,
    // On the embankment next to the museum, where the Communal bridge starts
    spawn: { x: 30, y: 0, z: -12 },
    spawnYaw: Math.PI,
    update: (dt) => river.update(dt),
  };
}
