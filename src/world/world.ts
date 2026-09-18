import { Box3, Group } from 'three';
import { type Rect, buildCity } from './city';
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

export interface WorldOptions {
  /** Ripple normal map on the river. */
  waterDetail?: boolean;
  /** Terrain grid step in the playable area. */
  terrainCell?: number;
  /** Trees cast sun shadows. */
  treeShadows?: boolean;
}

export function buildWorld({ waterDetail = true, terrainCell = 6, treeShadows = true }: WorldOptions = {}): World {
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

  // The city fills the rest, keeping clear of every landmark's footprint
  const occupied: Rect[] = landmarks.children.map((lm) => {
    const b = new Box3().setFromObject(lm);
    return { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z };
  });
  const city = buildCity(occupied, treeShadows);
  root.add(city.group);
  colliders.push(...city.colliders);

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
