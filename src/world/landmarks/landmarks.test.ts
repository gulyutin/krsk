import { Box3, InstancedMesh, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { LANDMARKS, PLACEMENTS, collidersOf } from './index';

describe.each(Object.keys(LANDMARKS))('landmark %s', (id) => {
  const g = LANDMARKS[id]();

  it('draws in at most 25 calls after merging', () => {
    let drawCalls = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) drawCalls++;
    });
    expect(drawCalls).toBeLessThanOrEqual(25);
  });

  it('still has the detail of dozens of primitives', () => {
    let triangles = 0;
    g.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const position = o.geometry.attributes.position;
      const count = o.geometry.index ? o.geometry.index.count : position.count;
      triangles += (count / 3) * (o instanceof InstancedMesh ? o.count : 1);
    });
    // A box is 12 triangles, so this is well over 30 primitives
    expect(triangles).toBeGreaterThan(600);
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

describe('collidersOf', () => {
  it('moves mesh-less colliderBox() boxes into world space', async () => {
    const { Group } = await import('three');
    const { colliderBox } = await import('./kit');
    const g = new Group();
    colliderBox(g, [2, 2, 2], [0, 1, 0]);
    g.position.set(10, 0, -5);
    const [b] = collidersOf(g);
    expect(b.minX).toBeCloseTo(9);
    expect(b.maxX).toBeCloseTo(11);
    expect(b.minZ).toBeCloseTo(-6);
    expect(b.maxY).toBeCloseTo(2);
  });
});

describe('mergeStatic colliders', () => {
  it('keeps the collider of a rotated octagon tight', () => {
    // The chapel platform is an octagon with apothem 9.5: its box must be 19 wide, not ~27
    const widest = Math.max(...collidersOf(LANDMARKS.chapel()).map((b) => b.maxX - b.minX));
    expect(widest).toBeLessThan(19.5);
  });
});
