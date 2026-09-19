// Places where the player can do something with the action button (or F on a keyboard).

import { PLACEMENTS } from '../world/landmarks/index';
import { playClockChime } from './chimes';

export interface Interaction {
  id: string;
  x: number;
  z: number;
  /** The button appears within this distance. */
  radius: number;
  /** Icon on the button (inline SVG, no text). */
  icon: string;
  /** Runs the action; returns for how many seconds it is busy (the button waits). */
  run(distance: number): number;
}

const BELL_ICON = `<svg viewBox="0 0 48 48" width="56" height="56" fill="white"><path d="M24 5c-1.7 0-3 1.3-3 3v1.3C14.9 10.7 11 16 11 22v9l-4 5v2h34v-2l-4-5v-9c0-6-3.9-11.3-10-12.7V8c0-1.7-1.3-3-3-3z"/><circle cx="24" cy="42" r="4"/></svg>`;

/** Where the clock tower stands: its placement, moved forward like the tower itself. */
function clockTowerSpot(): { x: number; z: number } {
  const p = PLACEMENTS.find((pl) => pl.id === 'clocktower');
  return p ? { x: p.position[0], z: p.position[2] + 2.6 } : { x: 0, z: 0 };
}

export function createInteractions(): Interaction[] {
  const tower = clockTowerSpot();
  return [
    {
      id: 'clock-chime',
      ...tower,
      radius: 22,
      icon: BELL_ICON,
      // Louder right under the tower, still audible across the square
      run: (distance) => playClockChime(Math.max(0.35, 1 - distance / 60)),
    },
  ];
}

/** The closest interaction within its radius, or null. */
export function nearestInteraction(list: Interaction[], x: number, z: number): { item: Interaction; distance: number } | null {
  let best: { item: Interaction; distance: number } | null = null;
  for (const item of list) {
    const d = Math.hypot(x - item.x, z - item.z);
    if (d <= item.radius && (!best || d < best.distance)) best = { item, distance: d };
  }
  return best;
}
