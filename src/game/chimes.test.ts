import { describe, expect, it } from 'vitest';
import { clockHour } from './chimes';
import { playKrasnoyarskChimes } from './krasnoyarsk-chimes';

/** Just enough of an AudioContext to count what gets scheduled. */
function fakeContext() {
  const started: number[] = [];
  const node = () => ({ connect: (n: unknown) => n ?? node() });
  const ctx = {
    currentTime: 0,
    destination: {},
    createGain: () => ({ ...node(), gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
    createOscillator: () => ({ ...node(), type: '', frequency: { value: 0 }, start: (t: number) => started.push(t), stop() {} }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, started };
}

describe('Krasnoyarsk chimes', () => {
  it('plays the phrase twice, then the hour bell, three partials per note', () => {
    const { ctx, started } = fakeContext();
    playKrasnoyarskChimes(ctx, { strikes: 3 });
    expect(started).toHaveLength((2 * 8 + 3) * 3);
    for (let i = 1; i < started.length; i++) expect(started[i]).toBeGreaterThanOrEqual(started[i - 1]);
  });

  it('lasts about half a minute with twelve strikes', () => {
    const { ctx } = fakeContext();
    expect(playKrasnoyarskChimes(ctx, { strikes: 12 })).toBeCloseTo(2 * (16 * 0.43 + 1.2) + 12 * 1.1 + 2.4, 5);
  });

  it('counts hours like a clock face', () => {
    expect(clockHour(new Date(2026, 0, 1, 0, 30))).toBe(12);
    expect(clockHour(new Date(2026, 0, 1, 15, 0))).toBe(3);
    expect(clockHour(new Date(2026, 0, 1, 12, 5))).toBe(12);
  });
});
