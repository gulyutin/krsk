import { BoxGeometry, CylinderGeometry, Group, Mesh, TorusGeometry, Vector3 } from 'three';
import { type ColorName, material } from '../palette';
import { mergeStatic } from '../world/landmarks/kit';

// A city bicycle built from primitives. Origin is on the ground between the wheels,
// the front wheel points to +Z, like the avatar.

/** The whole bike is scaled up a little so it reads well next to the chunky avatar. */
const SCALE = 1.15;
const WHEEL_R = 0.42;
const CRANK = 0.34;
const WHEELBASE = 1.3;
const BB = new Vector3(0, 0.36, 0); // bottom bracket, where the cranks turn
const SEAT = new Vector3(0, 0.98, -0.22);
const HEAD = new Vector3(0, 0.98, 0.46);
const REAR_HUB = new Vector3(0, WHEEL_R, -WHEELBASE / 2);
const FRONT_HUB = new Vector3(0, WHEEL_R, WHEELBASE / 2);

const unit = new BoxGeometry(1, 1, 1);
const tire = new TorusGeometry(WHEEL_R - 0.04, 0.045, 8, 28).rotateY(Math.PI / 2);
const rim = new TorusGeometry(WHEEL_R - 0.1, 0.02, 6, 28).rotateY(Math.PI / 2);
const hub = new CylinderGeometry(0.05, 0.05, 0.12, 10).rotateZ(Math.PI / 2);

function part(parent: Group, color: ColorName, size: [number, number, number], pos: Vector3 | [number, number, number]): Mesh {
  const m = new Mesh(unit, material(color));
  m.scale.set(...size);
  if (pos instanceof Vector3) m.position.copy(pos);
  else m.position.set(...pos);
  parent.add(m);
  return m;
}

/** A thin tube between two points in the YZ plane (the frame is symmetric in X). */
function tube(parent: Group, color: ColorName, a: Vector3, b: Vector3, thick = 0.07, x = 0): Mesh {
  const m = part(parent, color, [thick, a.distanceTo(b), thick], new Vector3(x, (a.y + b.y) / 2, (a.z + b.z) / 2));
  m.rotation.x = Math.atan2(b.z - a.z, b.y - a.y);
  return m;
}

function wheel(parent: Group, at: Vector3): Group {
  const g = new Group();
  g.position.copy(at);
  g.add(new Mesh(tire, material('black')), new Mesh(rim, material('iron')), new Mesh(hub, material('iron')));
  for (let i = 0; i < 6; i++) {
    const spoke = part(g, 'iron', [0.015, (WHEEL_R - 0.1) * 2, 0.015], [0, 0, 0]);
    spoke.rotation.x = (i * Math.PI) / 6;
  }
  parent.add(g);
  return g;
}

/** Where the rider sits and pedals, in the rider group's space (scale applied). */
export const RIDING_POSE = {
  saddleY: (SEAT.y + 0.095) * SCALE,
  seatZ: SEAT.z * SCALE + 0.04,
  bottomBracketY: BB.y * SCALE,
  crank: CRANK * SCALE,
};

export class Bike {
  readonly root = new Group();
  private readonly front: Group;
  private readonly rear: Group;
  private readonly crank = new Group();
  /** Pedal angle, shared with the rider's legs. */
  pedal = 0;

  constructor(frameColor: ColorName = 'red') {
    const g = this.root;
    g.scale.setScalar(SCALE);
    this.rear = wheel(g, REAR_HUB);
    this.front = wheel(g, FRONT_HUB);

    // Frame: top, down and seat tubes, stays to the rear hub, fork to the front hub
    tube(g, frameColor, SEAT, HEAD);
    tube(g, frameColor, HEAD, BB);
    tube(g, frameColor, BB, SEAT);
    for (const x of [-0.07, 0.07]) {
      tube(g, frameColor, BB, REAR_HUB, 0.045, x);
      tube(g, frameColor, SEAT, REAR_HUB, 0.045, x);
      tube(g, 'iron', HEAD, FRONT_HUB, 0.045, x);
    }

    // Seat, stem and handlebar with black grips
    part(g, 'black', [0.18, 0.07, 0.32], [0, SEAT.y + 0.06, SEAT.z - 0.02]);
    tube(g, 'iron', HEAD, new Vector3(0, HEAD.y + 0.2, HEAD.z - 0.02), 0.05);
    part(g, 'iron', [0.62, 0.05, 0.05], [0, HEAD.y + 0.2, HEAD.z - 0.04]);
    for (const x of [-0.3, 0.3]) part(g, 'black', [0.12, 0.07, 0.07], [x, HEAD.y + 0.2, HEAD.z - 0.04]);

    // Cranks with pedals on both sides, turning around the bottom bracket
    this.crank.position.copy(BB);
    g.add(this.crank);
    part(this.crank, 'iron', [0.22, 0.08, 0.08], [0, 0, 0]);
    for (const side of [-1, 1]) {
      const arm = new Group();
      arm.position.x = side * 0.13;
      arm.rotation.x = side === 1 ? 0 : Math.PI;
      part(arm, 'iron', [0.04, CRANK, 0.04], [0, -CRANK / 2, 0]);
      part(arm, 'black', [0.16, 0.04, 0.1], [side * 0.08, -CRANK, 0]);
      this.crank.add(arm);
    }

    // One mesh per colour in each moving part: the bike drops from ~40 draw calls to ~10
    mergeStatic(g);
  }

  /** Spins the wheels and cranks for the given speed (units/s). */
  update(dt: number, speed: number): void {
    const spin = (speed / (WHEEL_R * SCALE)) * dt; // rolls without slipping
    this.front.rotation.x += spin;
    this.rear.rotation.x += spin;
    this.pedal += spin * 0.45;
    this.crank.rotation.x = this.pedal;
  }
}
