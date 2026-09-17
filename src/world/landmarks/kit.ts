// Shared building blocks for landmarks. Everything is a primitive with a palette color.

import {
  Box3,
  BoxGeometry,
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { type ColorName, lambert } from '../../palette';

/** Rotation that turns an 8-sided cylinder so a flat face (not a corner) points to +Z. */
export const OCT_TURN = Math.PI / 8;
/** Circumradius of a regular octagon with apothem 1. */
const OCT_R = 1 / Math.cos(Math.PI / 8);

export const unitBox = new BoxGeometry(1, 1, 1);
/** Half disc of radius 1 and depth 1 in the XY plane, curved side up — tops of arches. */
export const unitArch = new CylinderGeometry(1, 1, 1, 12, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
export const unitSphere = new SphereGeometry(1, 10, 8);
/** Disc of radius 1 and thickness 1 facing +Z — clock dials, round plaques. */
export const unitDisc = new CylinderGeometry(1, 1, 1, 32).rotateX(Math.PI / 2);
/** Square pyramid with base half-width 1 and height 1, faces aligned with the axes. */
export const unitPyramid = new ConeGeometry(Math.SQRT2, 1, 4).rotateY(Math.PI / 4);
export const unitCone = new ConeGeometry(1, 1, 8);

/** Mark a mesh as solid: the world turns it into a box collider. */
export function solid<T extends Object3D>(o: T): T {
  o.userData.solid = true;
  return o;
}

/**
 * Collider without any mesh: an axis-aligned box in the parent's local space,
 * stored as data. Use it where a rotated part would get an oversized collider.
 */
export function colliderBox(parent: Object3D, size: [number, number, number], pos: [number, number, number]): void {
  const list: Box3[] = (parent.userData.colliders ??= []);
  list.push(
    new Box3(
      new Vector3(pos[0] - size[0] / 2, pos[1] - size[1] / 2, pos[2] - size[2] / 2),
      new Vector3(pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2),
    ),
  );
}

/** Any unit-sized geometry, scaled, placed and rotated. */
export function shape(
  parent: Object3D,
  geometry: BufferGeometry,
  color: ColorName,
  size: [number, number, number],
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
): Mesh {
  const m = new Mesh(geometry, lambert(color));
  m.scale.set(...size);
  m.position.set(...pos);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}

export function box(
  parent: Object3D,
  color: ColorName,
  size: [number, number, number],
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
): Mesh {
  return shape(parent, unitBox, color, size, pos, rot);
}

/**
 * Octagonal prism or frustum standing on y = bottom. Sizes are apothems
 * (center to the middle of a face), which is what photos let us measure.
 */
export function octagon(
  parent: Object3D,
  color: ColorName,
  apothemBottom: number,
  apothemTop: number,
  bottom: number,
  height: number,
): Mesh {
  const geo = new CylinderGeometry(apothemTop * OCT_R, apothemBottom * OCT_R, height, 8);
  const m = new Mesh(geo, lambert(color));
  m.rotation.y = OCT_TURN;
  m.position.y = bottom + height / 2;
  parent.add(m);
  return m;
}

/** Octagonal pyramid (tent roof) standing on y = bottom. */
export function octPyramid(parent: Object3D, color: ColorName, apothem: number, bottom: number, height: number): Mesh {
  const m = new Mesh(new ConeGeometry(apothem * OCT_R, height, 8), lambert(color));
  m.rotation.y = OCT_TURN;
  m.position.y = bottom + height / 2;
  parent.add(m);
  return m;
}

/** A transform for one instance. */
export interface Placement {
  pos: [number, number, number];
  rotY?: number;
  /** Tilt around the local X axis, applied after rotY. */
  rotX?: number;
  rotZ?: number;
  scale: [number, number, number];
}

/** Many copies of one geometry in one draw call. */
export function instances(
  parent: Object3D,
  geometry: BufferGeometry,
  color: ColorName,
  placements: Placement[],
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, lambert(color), placements.length);
  const dummy = new Object3D();
  dummy.rotation.order = 'YXZ';
  placements.forEach((p, i) => {
    dummy.position.set(...p.pos);
    dummy.rotation.set(p.rotX ?? 0, p.rotY ?? 0, p.rotZ ?? 0);
    dummy.scale.set(...p.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

/**
 * Point on face k of an octagon (k = 0 faces +Z, k = 2 faces +X, k = 4 faces −Z).
 * `along` shifts sideways within the face, `out` is the distance from the center.
 */
export function onFace(
  k: number,
  out: number,
  along: number,
  y: number,
): { pos: [number, number, number]; rotY: number } {
  const a = (k * Math.PI) / 4;
  const nx = Math.sin(a);
  const nz = Math.cos(a);
  return { pos: [nx * out + nz * along, y, nz * out - nx * along], rotY: a };
}

/** Point on corner k of an octagon with the given apothem (corner k sits between faces k and k+1). */
export function onCorner(k: number, apothem: number, y: number): { pos: [number, number, number]; rotY: number } {
  const a = (k * Math.PI) / 4 + Math.PI / 8;
  const r = apothem * OCT_R;
  return { pos: [Math.sin(a) * r, y, Math.cos(a) * r], rotY: a };
}

export function group(name?: string): Group {
  const g = new Group();
  if (name) g.name = name;
  return g;
}
