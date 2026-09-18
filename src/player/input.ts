// Keyboard, mouse and touch are merged into one state:
// movement direction (x = right, y = forward), jump, camera rotation.

export interface Vec2 {
  x: number;
  y: number;
}

const MOUSE_LOOK = 0.005; // radians per pixel
const TOUCH_LOOK = 0.009;
const JOY_RADIUS = 60; // px, joystick knob travel
const JOY_DEADZONE = 0.15;
const JOY_EDGE = 80; // px, keeps the joystick base on screen

const KEYS_FORWARD = ['KeyW', 'ArrowUp'];
const KEYS_BACK = ['KeyS', 'ArrowDown'];
const KEYS_LEFT = ['KeyA', 'ArrowLeft'];
const KEYS_RIGHT = ['KeyD', 'ArrowRight'];
const KEYS_BIKE = ['KeyE', 'KeyB'];
const GAME_KEYS = new Set([...KEYS_FORWARD, ...KEYS_BACK, ...KEYS_LEFT, ...KEYS_RIGHT, ...KEYS_BIKE, 'Space']);

/** Bicycle icon for the touch button: two wheels, frame, seat and handlebar. */
const BIKE_ICON = `<svg viewBox="0 0 48 32" width="52" height="36" fill="none" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="22" r="8"/><circle cx="38" cy="22" r="8"/><path d="M10 22 L19 10 L31 10 L38 22 M19 10 L24 22 L31 10 M16 7 H23 M31 10 L29 5 H34"/></svg>`;

export function keyboardVector(keys: ReadonlySet<string>): Vec2 {
  const any = (codes: string[]) => (codes.some((c) => keys.has(c)) ? 1 : 0);
  const x = any(KEYS_RIGHT) - any(KEYS_LEFT);
  const y = any(KEYS_FORWARD) - any(KEYS_BACK);
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

/** Finger offset from center (screen px, y down) → vector of length ≤ 1, y forward. */
export function joystickVector(dx: number, dy: number, radius = JOY_RADIUS, deadzone = JOY_DEADZONE): Vec2 {
  const len = Math.hypot(dx, dy) / radius;
  if (len < deadzone) return { x: 0, y: 0 };
  const scaled = Math.min((len - deadzone) / (1 - deadzone), 1);
  const k = scaled / len / radius;
  return { x: dx * k, y: -dy * k };
}

export class Input {
  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private bikeQueued = false;
  private lookDX = 0;
  private lookDY = 0;

  private mouseId = -1;
  private lookId = -1;
  private lastX = 0;
  private lastY = 0;

  private joyId = -1;
  private joyCX = 0;
  private joyCY = 0;
  private joy: Vec2 = { x: 0, y: 0 };

  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly jumpBtn: HTMLButtonElement;
  private readonly bikeBtn: HTMLButtonElement;

  constructor(private readonly surface: HTMLElement) {
    this.base = document.createElement('div');
    this.base.className = 'joy-base';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.base.appendChild(this.knob);
    this.jumpBtn = document.createElement('button');
    this.jumpBtn.className = 'jump-btn';
    this.jumpBtn.setAttribute('aria-label', 'Прыжок');
    this.bikeBtn = document.createElement('button');
    this.bikeBtn.className = 'bike-btn';
    this.bikeBtn.setAttribute('aria-label', 'Велосипед');
    this.bikeBtn.innerHTML = BIKE_ICON;
    document.body.append(this.base, this.jumpBtn, this.bikeBtn);
    this.placeJoystickIdle();

    if (window.matchMedia('(pointer: coarse)').matches) this.enableTouchUi();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
    window.addEventListener('resize', () => this.joyId < 0 && this.placeJoystickIdle());

    surface.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    const release = () => this.jumpBtn.classList.remove('pressed');
    this.jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.jumpQueued = true;
      this.jumpBtn.classList.add('pressed');
    });
    this.bikeBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.bikeQueued = true;
    });
    this.jumpBtn.addEventListener('pointerup', release);
    this.jumpBtn.addEventListener('pointercancel', release);
    this.jumpBtn.addEventListener('pointerleave', release);
  }

  /** Movement direction: keyboard + joystick, length ≤ 1. */
  get move(): Vec2 {
    const k = keyboardVector(this.keys);
    const x = k.x + this.joy.x;
    const y = k.y + this.joy.y;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /** Get on or off the bicycle was requested since the last frame. */
  consumeBike(): boolean {
    const b = this.bikeQueued;
    this.bikeQueued = false;
    return b;
  }

  /** Shows whether the player is riding, so the bike button can light up. */
  setRiding(on: boolean): void {
    this.bikeBtn.classList.toggle('on', on);
  }

  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Accumulated camera rotation in radians: x horizontal, y vertical. */
  consumeLook(): Vec2 {
    const d = { x: this.lookDX, y: this.lookDY };
    this.lookDX = this.lookDY = 0;
    return d;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
    if (KEYS_BIKE.includes(e.code) && !e.repeat) this.bikeQueued = true;
    this.keys.add(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      if (this.mouseId >= 0) return;
      this.mouseId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.surface.setPointerCapture(e.pointerId);
      this.surface.classList.add('dragging');
      return;
    }

    this.enableTouchUi();
    if (e.clientX < window.innerWidth / 2) {
      if (this.joyId >= 0) return;
      this.joyId = e.pointerId;
      this.joyCX = clampNum(e.clientX, JOY_EDGE, window.innerWidth - JOY_EDGE);
      this.joyCY = clampNum(e.clientY, JOY_EDGE, window.innerHeight - JOY_EDGE);
      this.moveBase(this.joyCX, this.joyCY);
      this.base.classList.add('active');
      this.updateJoystick(e.clientX, e.clientY);
    } else {
      if (this.lookId >= 0) return;
      this.lookId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === this.joyId) {
      this.updateJoystick(e.clientX, e.clientY);
    } else if (e.pointerId === this.lookId || e.pointerId === this.mouseId) {
      const k = e.pointerId === this.mouseId ? MOUSE_LOOK : TOUCH_LOOK;
      this.lookDX += (e.clientX - this.lastX) * k;
      this.lookDY += (e.clientY - this.lastY) * k;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.joyId) {
      this.joyId = -1;
      this.joy = { x: 0, y: 0 };
      this.base.classList.remove('active');
      this.placeJoystickIdle();
    } else if (e.pointerId === this.lookId) {
      this.lookId = -1;
    } else if (e.pointerId === this.mouseId) {
      this.mouseId = -1;
      this.surface.classList.remove('dragging');
    }
  };

  private updateJoystick(px: number, py: number): void {
    const dx = px - this.joyCX;
    const dy = py - this.joyCY;
    this.joy = joystickVector(dx, dy);
    const len = Math.hypot(dx, dy);
    const k = len > JOY_RADIUS ? JOY_RADIUS / len : 1;
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }

  private placeJoystickIdle(): void {
    this.moveBase(JOY_EDGE + 40, window.innerHeight - JOY_EDGE - 50);
  }

  private moveBase(x: number, y: number): void {
    this.base.style.transform = `translate(${x}px, ${y}px)`;
    this.knob.style.transform = '';
  }

  private enableTouchUi(): void {
    document.body.classList.add('touch');
  }

  private reset(): void {
    this.keys.clear();
    this.joy = { x: 0, y: 0 };
    this.joyId = this.lookId = this.mouseId = -1;
    this.base.classList.remove('active');
    this.surface.classList.remove('dragging');
    this.placeJoystickIdle();
  }
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
