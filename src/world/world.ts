import { Group } from 'three';
import type { Box, Vec3 } from './colliders';
import { placeLandmarks } from './landmarks/index';
import { enableShadows } from './lighting';
import { buildRiver } from './river';
import { heightAt } from './relief';
import { buildTerrain } from './terrain';

export interface World {
  root: Group;
  colliders: Box[];
  spawn: Vec3;
  /** Terrain height at (x, z), for walking and the camera. */
  groundAt: (x: number, z: number) => number;
  /** Initial camera yaw: looking from the bank towards the river. */
  spawnYaw: number;
  update(dt: number): void;
}

/** waterDetail: ripple normal map on the river (off on low quality). */
export function buildWorld(waterDetail = true, terrainCell = 6): World {
  const root = new Group();
  const terrain = buildTerrain(terrainCell);
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
    // On the city terrace by the bridgehead, looking over the river
    spawn: { x: 30, y: heightAt(30, -30), z: -30 },
    groundAt: heightAt,
    spawnYaw: Math.PI,
    update: (dt) => river.update(dt),
  };
}
