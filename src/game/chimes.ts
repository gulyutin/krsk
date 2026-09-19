// The clock tower button: the Krasnoyarsk Big Ben chimes (see krasnoyarsk-chimes.ts),
// then the hour bell strikes as many times as the clock face shows.

import { playKrasnoyarskChimes } from './krasnoyarsk-chimes';

/** 1…12 for the given time, as a clock face shows it. */
export function clockHour(date: Date): number {
  const h = date.getHours() % 12;
  return h === 0 ? 12 : h;
}

// One context for the whole game: browsers allow only a few at a time
let context: AudioContext | null = null;

/**
 * Plays the chimes for the current time. Must be called from a user gesture (browsers
 * only allow sound after one). Returns how long it lasts, in seconds.
 */
export function playClockChime(volume: number, now = new Date()): number {
  context ??= new AudioContext();
  void context.resume();
  return playKrasnoyarskChimes(context, { strikes: clockHour(now), volume });
}
