// Pure collision geometry without three.js, so it can be tested in Vitest.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Box {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** Ignored by the camera (invisible walls at the map edge). */
  noCamera?: boolean;
}

export function box(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): Box {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Whether a circle of radius r in the XZ plane overlaps the box's footprint. */
export function circleOverlapsBox(x: number, z: number, r: number, b: Box): boolean {
  const dx = x - clamp(x, b.minX, b.maxX);
  const dz = z - clamp(z, b.minZ, b.maxZ);
  return dx * dx + dz * dz < r * r;
}

/**
 * Ray against a box grown by margin. Returns the distance to the entry point
 * or Infinity. A box that already contains the ray origin is ignored.
 */
export function rayBox(o: Vec3, d: Vec3, b: Box, margin = 0): number {
  let tmin = 0;
  let tmax = Infinity;
  const axes: [number, number, number, number][] = [
    [o.x, d.x, b.minX - margin, b.maxX + margin],
    [o.y, d.y, b.minY - margin, b.maxY + margin],
    [o.z, d.z, b.minZ - margin, b.maxZ + margin],
  ];
  let inside = true;
  for (const [oa, da, lo, hi] of axes) {
    if (oa < lo || oa > hi) inside = false;
    if (Math.abs(da) < 1e-9) {
      if (oa < lo || oa > hi) return Infinity;
      continue;
    }
    let t1 = (lo - oa) / da;
    let t2 = (hi - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  return inside ? Infinity : tmin;
}
