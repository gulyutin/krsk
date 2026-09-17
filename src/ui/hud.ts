const FADE_MS = 250;

/** On-screen overlays. For now: the fade when returning to the bank, and the debug panel. */
export class Hud {
  private readonly fadeEl: HTMLDivElement;
  private readonly debugEl: HTMLDivElement | null = null;
  private busy = false;

  constructor(debug: boolean) {
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    document.body.appendChild(this.fadeEl);
    if (debug) {
      this.debugEl = document.createElement('div');
      this.debugEl.className = 'debug';
      document.body.appendChild(this.debugEl);
    }
  }

  get fading(): boolean {
    return this.busy;
  }

  /** The screen fades to white, midpoint runs, then the screen fades back in. */
  fade(midpoint: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.fadeEl.classList.add('on');
    window.setTimeout(() => {
      midpoint();
      this.fadeEl.classList.remove('on');
      window.setTimeout(() => (this.busy = false), FADE_MS);
    }, FADE_MS);
  }

  setDebug(text: string): void {
    if (this.debugEl) this.debugEl.textContent = text;
  }
}
