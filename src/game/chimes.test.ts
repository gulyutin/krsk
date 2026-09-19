import { describe, expect, it } from 'vitest';
import { chimeLength, clockHour, fullHourChime } from './chimes';

describe('clock chimes', () => {
  it('plays four quarter changes, then strikes the hour', () => {
    const strikes = fullHourChime(3);
    expect(strikes).toHaveLength(16 + 3);
    const hourBells = strikes.slice(16);
    expect(new Set(hourBells.map((s) => s.freq)).size).toBe(1);
    expect(hourBells[0].freq).toBeLessThan(Math.min(...strikes.slice(0, 16).map((s) => s.freq)));
  });

  it('keeps the strikes in order and lasts under a minute even at 12', () => {
    const strikes = fullHourChime(12);
    for (let i = 1; i < strikes.length; i++) expect(strikes[i].at).toBeGreaterThan(strikes[i - 1].at);
    expect(chimeLength(strikes)).toBeLessThan(60);
  });

  it('counts hours like a clock face', () => {
    expect(clockHour(new Date(2026, 0, 1, 0, 30))).toBe(12);
    expect(clockHour(new Date(2026, 0, 1, 15, 0))).toBe(3);
    expect(clockHour(new Date(2026, 0, 1, 12, 5))).toBe(12);
  });
});
