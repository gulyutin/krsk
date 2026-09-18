import { describe, expect, it } from 'vitest';
import { box, type Box } from '../world/colliders';
import { PlayerController } from './controller';

const ground = box(-50, -4, -50, 50, 0, 50);

function run(
  c: PlayerController,
  seconds: number,
  moveX: number,
  moveZ: number,
  { jump = false, dt = 1 / 60 } = {},
): void {
  const frames = Math.round(seconds / dt);
  for (let i = 0; i < frames; i++) c.update(dt, moveX, moveZ, jump && i === 0);
}

function make(boxes: Box[], y = 0): PlayerController {
  return new PlayerController(boxes, { x: 0, y, z: 0 });
}

describe('PlayerController', () => {
  it('stands on the ground', () => {
    const c = make([ground]);
    run(c, 1, 0, 0);
    expect(c.pos.y).toBeCloseTo(0, 5);
    expect(c.onGround).toBe(true);
  });

  it('lands on top of a box', () => {
    const c = make([ground, box(-2, 0, -2, 2, 3, 2)], 6);
    run(c, 2, 0, 0);
    expect(c.pos.y).toBeCloseTo(3, 5);
    expect(c.onGround).toBe(true);
  });

  it('does not pass through a thin wall even with slow frames', () => {
    const c = make([ground, box(4, 0, -5, 4.5, 3, 5)]);
    run(c, 3, 1, 0, { dt: 0.05 });
    expect(c.pos.x).toBeLessThanOrEqual(4 - c.cfg.radius + 1e-6);
  });

  it('does not fall through the floor at high speed', () => {
    const c = make([ground, box(-5, 0, -5, 5, 0.5, 5)], 30);
    run(c, 3, 0, 0, { dt: 0.05 });
    expect(c.pos.y).toBeCloseTo(0.5, 5);
  });

  it('walks up a low step without jumping', () => {
    const c = make([ground, box(2, 0, -5, 40, 0.5, 5)]);
    run(c, 2, 1, 0);
    expect(c.pos.x).toBeGreaterThan(3);
    expect(c.pos.y).toBeCloseTo(0.5, 5);
  });

  it('is blocked by a tall block but can jump onto it', () => {
    const c = make([ground, box(2, 0, -5, 40, 1.5, 5)]);
    run(c, 1, 1, 0);
    expect(c.pos.x).toBeLessThan(2);
    expect(c.pos.y).toBeCloseTo(0, 5);

    run(c, 1.5, 1, 0, { jump: true });
    expect(c.pos.x).toBeGreaterThan(2.5);
    expect(c.pos.y).toBeCloseTo(1.5, 5);
  });

  it('slides along a wall instead of sticking', () => {
    const c = make([ground, box(2, 0, -50, 3, 3, 50)]);
    run(c, 1, 1, 1);
    expect(c.pos.z).toBeGreaterThan(3);
  });

  it('falls into water and respawns on the bank away from the edge', () => {
    const bank = box(-20, -4, -20, 20, 0, 0); // water beyond +Z
    const c = make([bank], 0);
    c.pos.z = -3;
    let fell = false;
    for (let i = 0; i < 300 && !fell; i++) {
      c.update(1 / 60, 0, 1, false);
      fell = c.fell;
    }
    expect(fell).toBe(true);

    c.respawn();
    expect(c.fell).toBe(false);
    expect(c.pos.y).toBe(0);
    expect(c.pos.z).toBeLessThanOrEqual(-3);
    run(c, 0.5, 0, 0);
    expect(c.onGround).toBe(true);
  });
});

describe('PlayerController on a bicycle', () => {
  it('rides about twice as fast as walking', () => {
    const walker = make([ground]);
    run(walker, 3, 0, 1);
    const rider = make([ground]);
    rider.setRiding(true);
    run(rider, 3, 0, 1);
    expect(Math.hypot(walker.vel.x, walker.vel.z)).toBeCloseTo(walker.cfg.walkSpeed, 0);
    expect(Math.hypot(rider.vel.x, rider.vel.z)).toBeCloseTo(rider.cfg.bikeSpeed, 0);
  });

  it('accelerates gradually instead of instantly', () => {
    const c = make([ground]);
    c.setRiding(true);
    run(c, 0.5, 0, 1);
    expect(c.bikeSpeed).toBeLessThan(c.cfg.bikeSpeed * 0.5);
  });

  it('turns along an arc, not on the spot', () => {
    const c = make([ground]);
    c.setRiding(true);
    run(c, 2, 0, 1); // heading +Z
    run(c, 0.2, 1, 0); // ask for +X
    const turned = Math.abs(c.facing);
    expect(turned).toBeGreaterThan(0.3);
    expect(turned).toBeLessThanOrEqual(c.cfg.bikeTurnRate * 0.2 + 1e-6);
  });

  it('loses its speed on a wall and does not pass through', () => {
    const c = make([ground, box(-5, 0, 4, 5, 3, 4.5)]);
    c.setRiding(true);
    run(c, 3, 0, 1, { dt: 0.05 });
    expect(c.pos.z).toBeLessThanOrEqual(4 - c.cfg.radius + 1e-6);
    expect(c.bikeSpeed).toBeLessThan(1);
  });

  it('keeps walking speed after getting off', () => {
    const c = make([ground]);
    c.setRiding(true);
    run(c, 3, 0, 1);
    c.setRiding(false);
    run(c, 1, 0, 1);
    expect(Math.hypot(c.vel.x, c.vel.z)).toBeCloseTo(c.cfg.walkSpeed, 0);
  });
});
