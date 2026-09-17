import { describe, expect, it } from 'vitest';
import { joystickVector, keyboardVector } from './input';

describe('keyboardVector', () => {
  it('W and ArrowUp mean forward', () => {
    expect(keyboardVector(new Set(['KeyW']))).toEqual({ x: 0, y: 1 });
    expect(keyboardVector(new Set(['ArrowUp']))).toEqual({ x: 0, y: 1 });
  });

  it('diagonal is normalized', () => {
    const v = keyboardVector(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });

  it('opposite keys cancel out', () => {
    expect(keyboardVector(new Set(['KeyW', 'KeyS']))).toEqual({ x: 0, y: 0 });
  });
});

describe('joystickVector', () => {
  it('dead zone', () => {
    expect(joystickVector(5, 5, 60, 0.15)).toEqual({ x: 0, y: 0 });
  });

  it('finger up means forward', () => {
    const v = joystickVector(0, -60, 60, 0.15);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it('length is capped at 1 beyond the edge', () => {
    const v = joystickVector(200, 200, 60, 0.15);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('grows smoothly from the dead zone edge', () => {
    const v = joystickVector(30, 0, 60, 0.2); // half the radius
    expect(v.x).toBeCloseTo((0.5 - 0.2) / 0.8);
  });
});
