import { describe, expect, it } from 'vitest';
import { MAP } from './map';
import { HILL_TOP_Y, ISLAND_Y, RIGHT_BANK_Y, TERRACE_Y, heightAt } from './relief';

describe('heightAt', () => {
  it('has a river bed below the water, deep enough to fall in', () => {
    expect(heightAt(-600, 35)).toBeLessThan(-1);
    expect(heightAt(0, 162)).toBeLessThan(-1);
  });

  it('puts the city centre on a terrace above the embankment', () => {
    expect(heightAt(60, -42)).toBeCloseTo(TERRACE_Y, 1); // museum
    expect(heightAt(120, -115)).toBeCloseTo(TERRACE_Y, 1); // clock tower
    expect(heightAt(200, -6)).toBeLessThan(1); // promenade by the water
  });

  it('lifts the chapel onto Karaulnaya hill', () => {
    expect(heightAt(MAP.hill.x, MAP.hill.z)).toBeCloseTo(HILL_TOP_Y, 0);
    // Flat enough on top for the chapel platform
    expect(Math.abs(heightAt(MAP.hill.x + 10, MAP.hill.z) - HILL_TOP_Y)).toBeLessThan(0.3);
  });

  it('keeps the island and the right bank low near the bridge', () => {
    expect(heightAt(10, 110)).toBeCloseTo(ISLAND_Y, 1);
    expect(heightAt(10, MAP.rightBankZ + 30)).toBeCloseTo(RIGHT_BANK_Y, 1);
  });

  it('rises towards the ridge in the south', () => {
    expect(heightAt(100, MAP.south)).toBeGreaterThan(15);
    expect(heightAt(100, MAP.south + 400)).toBeGreaterThan(heightAt(100, MAP.south));
  });

  it('has walkable slopes across the playable area', () => {
    let steepest = 0;
    for (let x = MAP.west; x < MAP.east; x += 7) {
      for (let z = MAP.north; z < MAP.south; z += 7) {
        const h = heightAt(x, z);
        if (h < 0.5) continue; // shores and river banks may be steep
        const g = Math.max(Math.abs(heightAt(x + 1, z) - h), Math.abs(heightAt(x, z + 1) - h));
        steepest = Math.max(steepest, g);
      }
    }
    // Under 1:1 everywhere on land, so the player (who climbs 0.5 per 0.225 step) never gets stuck
    expect(steepest).toBeLessThan(1);
  });
});
