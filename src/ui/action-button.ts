/** A big round button that appears near places where the player can do something. */
export class ActionButton {
  private readonly el: HTMLButtonElement;
  private icon = '';
  private busyUntil = 0;

  constructor(onPress: () => void) {
    this.el = document.createElement('button');
    this.el.className = 'action-btn';
    this.el.setAttribute('aria-label', 'Действие');
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPress();
    });
    document.body.appendChild(this.el);
  }

  /** Shows the button with this icon, or hides it (null). */
  show(icon: string | null): void {
    this.el.classList.toggle('visible', icon !== null);
    if (icon !== null && icon !== this.icon) {
      this.icon = icon;
      this.el.innerHTML = icon;
    }
  }

  /** The action runs for `seconds`: the button wobbles and ignores presses meanwhile. */
  setBusy(seconds: number): void {
    this.busyUntil = performance.now() + seconds * 1000;
    this.el.classList.add('busy');
    window.setTimeout(() => this.el.classList.remove('busy'), seconds * 1000);
  }

  get busy(): boolean {
    return performance.now() < this.busyUntil;
  }
}
