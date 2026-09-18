import { BoxGeometry, Group, Mesh } from 'three';
import { type ColorName, material } from '../palette';

export type HatStyle = 'none' | 'cap' | 'beanie';
export type Outfit = 'astronaut' | 'kid';

export interface AvatarOptions {
  outfit: Outfit;
  /** Shirt, pants and hat apply to the 'kid' outfit. */
  shirt: ColorName;
  pants: ColorName;
  hat: HatStyle;
  hatColor: ColorName;
}

export const DEFAULT_AVATAR: AvatarOptions = {
  outfit: 'astronaut',
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
  const m = new Mesh(unit, material(color));
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

    // Legs pivot at the hips, arms at the shoulders
    this.legL = pivot(b, -0.2, 0.8);
    this.legR = pivot(b, 0.2, 0.8);
    this.armL = pivot(b, -0.6, 1.55);
    this.armR = pivot(b, 0.6, 1.55);
    const head = pivot(b, 0, 1.6);

    if (opts.outfit === 'astronaut') this.buildAstronaut(head);
    else this.buildKid(head, opts);
  }

  private buildAstronaut(head: Group): void {
    const b = this.body;
    for (const leg of [this.legL, this.legR]) {
      part(leg, 'suitWhite', 0.4, 0.6, 0.42, 0, -0.3, 0);
      part(leg, 'suitGrey', 0.42, 0.08, 0.44, 0, -0.34, 0); // knee ring
      part(leg, 'suitGrey', 0.44, 0.22, 0.52, 0, -0.69, 0.03); // boot
    }

    part(b, 'suitWhite', 0.84, 0.82, 0.46, 0, 1.2, 0);
    part(b, 'suitGrey', 0.86, 0.1, 0.48, 0, 0.84, 0); // belt
    part(b, 'suitGrey', 0.36, 0.22, 0.04, 0, 1.3, 0.24); // chest control panel
    part(b, 'red', 0.07, 0.07, 0.03, -0.1, 1.3, 0.27);
    part(b, 'yellow', 0.07, 0.07, 0.03, 0, 1.3, 0.27);
    part(b, 'blue', 0.07, 0.07, 0.03, 0.1, 1.3, 0.27);
    part(b, 'suitGrey', 0.64, 0.72, 0.3, 0, 1.22, -0.38); // life-support backpack
    part(b, 'suitWhite', 0.5, 0.12, 0.2, 0, 1.52, -0.38);

    for (const arm of [this.armL, this.armR]) {
      part(arm, 'suitWhite', 0.4, 0.58, 0.4, 0, -0.26, 0);
      part(arm, 'suitGrey', 0.42, 0.3, 0.42, 0, -0.66, 0); // glove
    }
    // Russian flag patch on the chest
    const flag = [['white', 1.53], ['blue', 1.48], ['red', 1.43]] as const;
    for (const [color, y] of flag) part(b, color, 0.18, 0.05, 0.03, 0.24, y, 0.24);

    // Helmet with a dark visor and a glint
    part(head, 'suitGrey', 0.52, 0.08, 0.52, 0, 0.02, 0); // neck ring
    part(head, 'suitWhite', 0.66, 0.56, 0.62, 0, 0.33, 0);
    part(head, 'suitWhite', 0.56, 0.1, 0.52, 0, 0.66, 0); // rounded top
    part(head, 'suitGrey', 0.56, 0.42, 0.03, 0, 0.36, 0.315); // visor rim
    part(head, 'visor', 0.48, 0.34, 0.04, 0, 0.36, 0.33);
    part(head, 'visorGlint', 0.1, 0.08, 0.02, 0.14, 0.45, 0.355);
    part(head, 'suitGrey', 0.06, 0.2, 0.06, 0.36, 0.5, -0.1); // antenna
  }

  private buildKid(head: Group, opts: AvatarOptions): void {
    const b = this.body;
    for (const leg of [this.legL, this.legR]) {
      part(leg, opts.pants, 0.38, 0.65, 0.4, 0, -0.325, 0);
      part(leg, 'shoes', 0.4, 0.15, 0.46, 0, -0.725, 0.02);
    }

    part(b, opts.shirt, 0.8, 0.8, 0.42, 0, 1.2, 0);

    for (const arm of [this.armL, this.armR]) {
      part(arm, opts.shirt, 0.38, 0.35, 0.38, 0, -0.15, 0);
      part(arm, 'skin', 0.36, 0.45, 0.36, 0, -0.55, 0);
    }

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
