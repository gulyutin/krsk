import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { LANDMARKS, PLACEMENTS, collidersOf } from './index';

describe.each(Object.keys(LANDMARKS))('landmark %s', (id) => {
  const g = LANDMARKS[id]();

  it('has 30–150 meshes', () => {
    let meshes = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) meshes++;
    });
    expect(meshes).toBeGreaterThanOrEqual(30);
    expect(meshes).toBeLessThanOrEqual(150);
  });

  it('has a main part and solid colliders', () => {
    expect(g.getObjectByName('main')).toBeDefined();
    expect(collidersOf(g).length).toBeGreaterThan(0);
  });

  it('stands on y = 0', () => {
    const box = new Box3().setFromObject(g, true);
    expect(box.min.y).toBeCloseTo(0, 1);
  });

  it('is placed in landmarks.json', () => {
    expect(PLACEMENTS.some((p) => p.id === id)).toBe(true);
  });
});
