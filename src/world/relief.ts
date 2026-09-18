// Terrain height as a pure function of (x, z), without three.js, so physics and tests
// can use it. Anchored to SRTM elevations around the Communal bridge (see docs/map.md),
// with heights scaled down about 3× — the map is compressed horizontally, and real
// slopes would otherwise be too steep to walk.

import { MAP } from './map';

/** City terrace on the left bank (real +25…30 m above the river). The bridge deck is level with it. */
export const TERRACE_Y = 7;
/** Otdykha island (real ≈ +8 m). */
export const ISLAND_Y = 2;
/** Right bank next to the bridge (real ≈ +15 m, low and flat near the water). */
export const RIGHT_BANK_Y = 1.5;
/** Karaulnaya hilltop with the chapel (real ≈ +120 m). */
export const HILL_TOP_Y = 36;

const SHORE_Y = 0.2;
const BED_Y = -4;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Distance from a point to a polyline. */
function distToPolyline(x: number, z: number, pts: readonly [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

/** Signed distance to Otdykha island (a rounded rectangle): negative inside. */
function islandDistance(x: number, z: number): number {
  const { x0, x1, z0, z1 } = MAP.island;
  const r = 28;
  const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - r);
  const qz = Math.abs(z - (z0 + z1) / 2) - ((z1 - z0) / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}

/** Kacha valley: from the north-west, past the north of the centre, into the Yenisei at the Strelka. */
const KACHA: readonly [number, number][] = [
  [-900, -178],
  [-150, -170],
  [150, -160],
  [300, -90],
  [380, -20],
  [392, 0],
];

/** Flat pads under buildings: axis-aligned rectangles, blended into the terrain around them. */
export interface Pad {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

const PADS: Pad[] = [
  // Regional Museum with its pavement, on the terrace edge
  { x0: 36, x1: 84, z0: -60, z1: -25, y: TERRACE_Y },
  // Clock tower, administration and the square
  { x0: 100, x1: 196, z0: -134, z1: -82, y: TERRACE_Y },
  // Right-bank end of the bridge
  { x0: -2, x1: 22, z0: MAP.rightBankZ + 8, z1: MAP.rightBankZ + 60, y: RIGHT_BANK_Y },
];
const PAD_MARGIN = 8;

/** Height of the ground (or the river bed) at (x, z). */
export function heightAt(x: number, z: number): number {
  const lz = MAP.leftBankZ;
  const rz = MAP.rightBankZ;
  let h: number;

  if (z > lz && z < rz) {
    // River, with Otdykha island in it
    const di = islandDistance(x, z);
    if (di <= 0) {
      h = SHORE_Y + (ISLAND_Y - SHORE_Y) * smoothstep(0, 7, -di);
    } else {
      const toLand = Math.min(z - lz, rz - z, di);
      h = SHORE_Y + (BED_Y - SHORE_Y) * smoothstep(0, 3, toLand);
    }
    return h;
  }

  if (z <= lz) {
    // Left bank: sand, the lower embankment promenade, a slope up to the city terrace
    const d = lz - z;
    h = SHORE_Y + 0.4 * smoothstep(0, 4, d) + (TERRACE_Y - 0.6) * smoothstep(10, 22, d);
    // Kacha valley north of the centre (not at the river's edge)
    h -= 4 * (1 - smoothstep(10, 40, distToPolyline(x, z, KACHA))) * smoothstep(30, 60, d);
    // Karaulnaya hill, with a flat top for the chapel
    const hill = MAP.hill;
    h += (HILL_TOP_Y - TERRACE_Y) * (1 - smoothstep(16, 150, Math.hypot(x - hill.x, z - hill.z)));
  } else {
    // Right bank: low by the water, rising to the south towards the Torgashinsky ridge
    const d = z - rz;
    h =
      SHORE_Y +
      (RIGHT_BANK_Y - SHORE_Y) * smoothstep(0, 6, d) +
      4.5 * smoothstep(60, 200, d) +
      20 * smoothstep(160, 265, d) +
      75 * smoothstep(265, 650, d);
    // South-western hills around Bobrovy Log and the Stolby, with the log (valley) itself
    h += 30 * Math.exp(-((x + 560) ** 2 + (z - 330) ** 2) / (2 * 120 ** 2));
    h += 18 * Math.exp(-((x + 330) ** 2 + (z - 380) ** 2) / (2 * 90 ** 2));
    h -= 8 * (1 - smoothstep(8, 30, Math.abs(x + 430))) * smoothstep(20, 60, d) * (z > 190 ? 1 : 0);
  }

  // Flatten the pads under buildings
  for (const p of PADS) {
    const dx = Math.max(p.x0 - x, 0, x - p.x1);
    const dz = Math.max(p.z0 - z, 0, z - p.z1);
    const w = 1 - smoothstep(0, PAD_MARGIN, Math.hypot(dx, dz));
    if (w > 0) h += (p.y - h) * w;
  }
  return h;
}
