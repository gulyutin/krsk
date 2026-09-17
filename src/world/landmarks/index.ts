import { Box3, type Group, Mesh, type Object3D } from 'three';
import type { Box } from '../colliders';
import placements from '../landmarks.json';
import { build as chapel } from './chapel';

/** Every landmark by id. Add new ones here. */
export const LANDMARKS: Record<string, () => Group> = {
  chapel,
};

export interface LandmarkPlacement {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
}

export const PLACEMENTS = placements as LandmarkPlacement[];

/**
 * Axis-aligned box colliders for every mesh marked solid inside `object`,
 * in world space. Call after the object is positioned.
 */
export function collidersOf(object: Object3D): Box[] {
  object.updateMatrixWorld(true);
  const out: Box[] = [];
  const b = new Box3();
  object.traverse((o) => {
    if (!(o instanceof Mesh) || !o.userData.solid) return;
    b.setFromObject(o, true);
    out.push({ minX: b.min.x, minY: b.min.y, minZ: b.min.z, maxX: b.max.x, maxY: b.max.y, maxZ: b.max.z });
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
