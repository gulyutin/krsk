// Clock tower chimes, synthesised with Web Audio — no audio files.
//
// The real Krasnoyarsk clock plays the city anthem (music by Oleg Prostitov), which is
// under copyright, so the game uses the Westminster Quarters instead (the London Big
// Ben chime, 1793, public domain — the reason the tower is called Krasnoyarsk Big Ben),
// followed by the hour strikes.

/** One bell strike: when (seconds from the start), which pitch (Hz), how loud (0..1). */
export interface Strike {
  at: number;
  freq: number;
  gain: number;
}

// The four quarter bells and the hour bell (E major, as in London)
const G4S = 415.3;
const F4S = 370.0;
const E4 = 329.63;
const B3 = 246.94;
const HOUR_BELL = 164.81; // E3

/** The five "changes" of the Westminster Quarters. */
const CHANGES = [
  [G4S, F4S, E4, B3],
  [E4, G4S, F4S, B3],
  [E4, F4S, G4S, E4],
  [G4S, E4, F4S, B3],
  [B3, F4S, G4S, E4],
];

const NOTE = 0.62; // seconds between notes of a change
const LAST_NOTE = 1.15; // the fourth note of a change is held longer
const BETWEEN_CHANGES = 0.35;
const BEFORE_HOUR = 1.6;
const HOUR_STRIKE = 2.1;

/**
 * The full-hour chime: changes 2, 3, 4 and 5, then the hour bell struck `hour` times
 * (1…12).
 */
export function fullHourChime(hour: number): Strike[] {
  const strikes: Strike[] = [];
  let t = 0;
  for (const change of CHANGES.slice(1)) {
    change.forEach((freq, i) => {
      strikes.push({ at: t, freq, gain: 0.55 });
      t += i === change.length - 1 ? LAST_NOTE : NOTE;
    });
    t += BETWEEN_CHANGES;
  }
  t += BEFORE_HOUR - BETWEEN_CHANGES;
  for (let i = 0; i < hour; i++) {
    strikes.push({ at: t, freq: HOUR_BELL, gain: 0.8 });
    t += HOUR_STRIKE;
  }
  return strikes;
}

/** 1…12 for the given time, as a clock face shows it. */
export function clockHour(date: Date): number {
  const h = date.getHours() % 12;
  return h === 0 ? 12 : h;
}

/** Length of a chime in seconds, including the last bell ringing out. */
export function chimeLength(strikes: Strike[]): number {
  return strikes.length ? strikes[strikes.length - 1].at + 4 : 0;
}

/**
 * A bell: a strike with inharmonic partials (hum, prime, minor third, fifth, octave,
 * upper partials) that ring out at different rates.
 */
function bell(ctx: BaseAudioContext, out: AudioNode, s: Strike, start: number): void {
  const partials: [ratio: number, level: number, decay: number][] = [
    [0.5, 0.45, 3.5],
    [1, 1, 2.6],
    [1.19, 0.4, 2.0],
    [1.5, 0.28, 1.6],
    [2, 0.35, 1.3],
    [2.74, 0.18, 0.8],
    [3.76, 0.1, 0.5],
  ];
  for (const [ratio, level, decay] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = s.freq * ratio;
    const g = ctx.createGain();
    const t = start + s.at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * s.gain * 0.18, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (s.freq < 200 ? 1.6 : 1));
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + decay * 1.7 + 0.1);
  }
}

/** Schedules the strikes on an audio context; `volume` 0..1. */
export function scheduleChime(ctx: BaseAudioContext, strikes: Strike[], volume: number, start = ctx.currentTime + 0.05): void {
  const master = ctx.createGain();
  master.gain.value = volume;
  // A little warmth: cut the harshest highs
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  master.connect(tone).connect(ctx.destination);
  for (const s of strikes) bell(ctx, master, s, start);
}

let context: AudioContext | null = null;

/**
 * Plays the full-hour chime for the current time. Must be called from a user gesture
 * (browsers only allow sound after one). Returns how long it lasts, in seconds.
 */
export function playClockChime(volume: number, now = new Date()): number {
  context ??= new AudioContext();
  void context.resume();
  const strikes = fullHourChime(clockHour(now));
  scheduleChime(context, strikes, volume);
  return chimeLength(strikes);
}
