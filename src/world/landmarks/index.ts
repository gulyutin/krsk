import { Box3, type Group, Mesh, type Object3D } from 'three';
import type { Box } from '../colliders';
import placements from '../landmarks.json';
import { build as bridge } from './bridge';
import { build as chapel } from './chapel';
import { build as clocktower } from './clocktower';
import { build as museum } from './museum';

/** Every landmark by id. Add new ones here. */
export const LANDMARKS: Record<string, () => Group> = {
  bridge,
  chapel,
  clocktower,
  museum,
};

export interface LandmarkPlacement {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
}

export const PLACEMENTS = placements as LandmarkPlacement[];

/**
 * Axis-aligned box colliders for every mesh marked solid inside `object` and every colliderBox(),
 * in world space. Call after the object is positioned.
 */
export function collidersOf(object: Object3D): Box[] {
  object.updateMatrixWorld(true);
  const out: Box[] = [];
  const b = new Box3();
  const push = () => out.push({ minX: b.min.x, minY: b.min.y, minZ: b.min.z, maxX: b.max.x, maxY: b.max.y, maxZ: b.max.z });
  object.traverse((o) => {
    if (o instanceof Mesh && o.userData.solid) {
      b.setFromObject(o, true);
      push();
    }
    // Mesh-less colliders from colliderBox(), in the object's local space
    for (const local of (o.userData.colliders ?? []) as Box3[]) {
      b.copy(local).applyMatrix4(o.matrixWorld);
      push();
    }
  });
  return out;
}

/** Builds all landmarks from landmarks.json into `root` and appends their colliders. */
export function placeLandmarks(root: Group, colliders: Box[]): void {
  for (const p of PLACEMENTS) {
    const build = LANDMARKS[p.id];
    if (!build) throw new Error(`Unknown landmark id in landmarks.json: ${p.id}`);
    const g = build();
    g.position.set(...p.position);
    g.rotation.y = p.rotationY;
    root.add(g);
    colliders.push(...collidersOf(g));
  }
}
