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
