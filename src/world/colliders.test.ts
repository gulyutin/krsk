import { describe, expect, it } from 'vitest';
import { box, rayBox } from './colliders';

describe('rayBox', () => {
  const b = box(-1, -1, -1, 1, 1, 1);

  it('finds the distance to the near face', () => {
    expect(rayBox({ x: -5, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, b)).toBeCloseTo(4);
  });

  it('respects the margin', () => {
    expect(rayBox({ x: -5, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, b, 0.5)).toBeCloseTo(3.5);
  });

  it('returns Infinity for a miss or a box behind the ray', () => {
    expect(rayBox({ x: -5, y: 3, z: 0 }, { x: 1, y: 0, z: 0 }, b)).toBe(Infinity);
    expect(rayBox({ x: -5, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, b)).toBe(Infinity);
  });

  it('ignores a box that contains the ray origin', () => {
    expect(rayBox({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, b)).toBe(Infinity);
  });
});

describe('SpatialIndex', () => {
  it('finds exactly the boxes overlapping a rectangle', async () => {
    const { SpatialIndex } = await import('./colliders');
    const boxes = [box(0, 0, 0, 1, 1, 1), box(50, 0, 50, 51, 1, 51), box(-100, 0, -2, 100, 1, 2)];
    const index = new SpatialIndex(boxes);
    const out: ReturnType<typeof box>[] = [];
    const near = index.query(-2, -2, 2, 2, out);
    expect(near).toHaveLength(2);
    expect(near).toEqual(expect.arrayContaining([boxes[0], boxes[2]]));
    expect(index.query(49, 49, 52, 52, out)).toEqual([boxes[1]]);
    expect(index.query(200, 200, 210, 210, out)).toEqual([]);
  });
});
