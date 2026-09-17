import { BoxGeometry, Group, Mesh } from 'three';
import { type ColorName, lambert } from '../palette';

export type HatStyle = 'none' | 'cap' | 'beanie';

export interface AvatarOptions {
  shirt: ColorName;
  pants: ColorName;
  hat: HatStyle;
  hatColor: ColorName;
}

export const DEFAULT_AVATAR: AvatarOptions = {
  shirt: 'red',
  pants: 'pants',
  hat: 'cap',
  hatColor: 'blue',
};

const unit = new BoxGeometry(1, 1, 1);

function part(
  parent: Group,
  color: ColorName,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const m = new Mesh(unit, lambert(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function pivot(parent: Group, x: number, y: number): Group {
  const g = new Group();
  g.position.set(x, y, 0);
  parent.add(g);
  return g;
}

/**
 * Blocky figure, 2.1 tall. Origin is between the feet,
 * the face looks towards +Z.
 */
export class Avatar {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly legL: Group;
  private readonly legR: Group;
  private readonly armL: Group;
  private readonly armR: Group;
  private phase = 0;
  private amp = 0;

  constructor(opts: AvatarOptions = DEFAULT_AVATAR) {
    this.root.add(this.body);
    const b = this.body;

    // Legs pivot at the hips
    this.legL = pivot(b, -0.2, 0.8);
    this.legR = pivot(b, 0.2, 0.8);
    for (const leg of [this.legL, this.legR]) {
      part(leg, opts.pants, 0.38, 0.65, 0.4, 0, -0.325, 0);
      part(leg, 'shoes', 0.4, 0.15, 0.46, 0, -0.725, 0.02);
    }

    part(b, opts.shirt, 0.8, 0.8, 0.42, 0, 1.2, 0);

    // Arms pivot at the shoulders
    this.armL = pivot(b, -0.6, 1.55);
    this.armR = pivot(b, 0.6, 1.55);
    for (const arm of [this.armL, this.armR]) {
      part(arm, opts.shirt, 0.38, 0.35, 0.38, 0, -0.15, 0);
      part(arm, 'skin', 0.36, 0.45, 0.36, 0, -0.55, 0);
    }

    const head = pivot(b, 0, 1.6);
    part(head, 'skin', 0.5, 0.5, 0.5, 0, 0.25, 0);
    part(head, 'black', 0.07, 0.1, 0.02, -0.11, 0.3, 0.255);
    part(head, 'black', 0.07, 0.1, 0.02, 0.11, 0.3, 0.255);
    part(head, 'black', 0.18, 0.04, 0.02, 0, 0.15, 0.255);

    if (opts.hat === 'cap') {
      part(head, opts.hatColor, 0.54, 0.18, 0.54, 0, 0.56, 0);
      part(head, opts.hatColor, 0.5, 0.05, 0.26, 0, 0.49, 0.36);
    } else if (opts.hat === 'beanie') {
      part(head, opts.hatColor, 0.56, 0.26, 0.56, 0, 0.55, 0);
      part(head, 'white', 0.14, 0.14, 0.14, 0, 0.75, 0);
    }
  }

  /** speed: horizontal speed; maxSpeed: walking speed. */
  update(dt: number, speed: number, maxSpeed: number, grounded: boolean): void {
    const k = 1 - Math.exp(-14 * dt);
    const approach = (g: Group, target: number) => {
      g.rotation.x += (target - g.rotation.x) * k;
    };

    if (grounded) {
      const t = Math.min(speed / maxSpeed, 1);
      this.amp += (t * 0.9 - this.amp) * k;
      this.phase += dt * speed * 1.4;
      const s = Math.sin(this.phase) * this.amp;
      approach(this.legL, s);
      approach(this.legR, -s);
      approach(this.armL, -s);
      approach(this.armR, s);
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.06 * this.amp;
    } else {
      // Jump pose: arms up, one leg forward
      approach(this.legL, -0.5);
      approach(this.legR, 0.3);
      approach(this.armL, -2.6);
      approach(this.armR, -2.6);
      this.body.position.y *= 1 - k;
    }
  }
}
