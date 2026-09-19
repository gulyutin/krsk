// Krasnoyarsk Big Ben chimes, fully synthesized with WebAudio — no sound files.
// Melody "G G C, C D B C, C" (transcribed from a recording of the real chimes) played twice,
// then the hour bell strikes. Same sound as in the Pirate Ship game.
//
// Browsers only allow audio after a user gesture, so call it from a click handler.
// Returns the length of the whole piece in seconds.

export interface ChimeOptions {
  /** How many times the hour bell strikes. */
  strikes?: number;
  volume?: number;
}

export function playKrasnoyarskChimes(ctx: BaseAudioContext, { strikes = 12, volume = 0.5 }: ChimeOptions = {}): number {
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(ctx.destination);

  // one sine partial with an exponential decay
  const tone = (freq: number, dur: number, vol: number, at: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  };
  // small chime bell for the melody: bright and short so notes don't blur
  const chime = (f: number, at: number, vol: number) => {
    tone(f, 1.1, vol, at);
    tone(f * 2, 0.7, vol * 0.3, at);
    tone(f * 2.76, 0.4, vol * 0.2, at);
  };
  // big hour bell: fundamental plus inharmonic overtones, long decay
  const bell = (f: number, at: number, vol: number) => {
    tone(f, 2.4, vol, at);
    tone(f * 2.76, 1.2, vol * 0.3, at);
    tone(f * 5.4, 0.5, vol * 0.15, at);
  };

  const NOTE = { G5: 783.99, C6: 1046.5, D6: 1174.66, B5: 987.77, C5: 523.25 };
  const PHRASE: [keyof typeof NOTE, number][] = [
    ['G5', 1],
    ['G5', 1],
    ['C6', 3],
    ['C6', 1],
    ['D6', 2],
    ['B5', 2],
    ['C6', 2],
    ['C5', 4],
  ];
  const BEAT = 0.43; // seconds per beat, as in the recording

  const t0 = ctx.currentTime + 0.1;
  let t = t0;
  for (let rep = 0; rep < 2; rep++) {
    for (const [note, beats] of PHRASE) {
      chime(NOTE[note], t, 0.16);
      t += BEAT * beats;
    }
    t += 1.2; // pause between the two phrases and before the strikes
  }
  for (let i = 0; i < strikes; i++) {
    bell(277, t, 0.3); // the hour bell is about C#4, like in the recording
    t += 1.1;
  }
  return t - t0 + 2.4;
}
