import { type PerspectiveCamera, Vector3 } from 'three';
import { type Box, type Vec3, clamp, rayBox } from '../world/colliders';

const PIVOT_HEIGHT = 1.7; // the camera orbits around head height
const MIN_PITCH = -0.25;
const MAX_PITCH = 1.25;
const MIN_DISTANCE = 1.2;
/** Distance kept from walls so the near plane doesn't clip them. */
const WALL_MARGIN = 0.3;

/** Third-person camera: orbits the player and never goes inside boxes. */
export class CameraRig {
  yaw = 0;
  pitch = 0.35;
  distance = 10;

  private current = 10;
  private readonly pivot = new Vector3();
  private readonly dir = new Vector3();

  /** groundAt: terrain height, so the camera never ends up under a hill. */
  constructor(
    readonly camera: PerspectiveCamera,
    private readonly colliders: readonly Box[],
    private readonly groundAt?: (x: number, z: number) => number,
  ) {}

  rotate(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch + dy, MIN_PITCH, MAX_PITCH);
  }

  /** Place the camera instantly (after a teleport). */
  snap(target: Vec3): void {
    this.pivot.set(target.x, target.y + PIVOT_HEIGHT, target.z);
    this.current = this.distance;
    this.place(0);
  }

  update(dt: number, target: Vec3): void {
    const p = this.pivot;
    const kh = 1 - Math.exp(-14 * dt);
    const kv = 1 - Math.exp(-8 * dt);
    p.x += (target.x - p.x) * kh;
    p.z += (target.z - p.z) * kh;
    p.y += (target.y + PIVOT_HEIGHT - p.y) * kv;
    this.place(dt);
  }

  private place(dt: number): void {
    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    let want = this.distance;
    for (const b of this.colliders) {
      if (b.noCamera) continue;
      const t = rayBox(this.pivot, this.dir, b, WALL_MARGIN);
      if (t < want) want = t;
    }
    // March along the ray and stop in front of the terrain
    if (this.groundAt) {
      for (let t = 1; t < want; t += 1) {
        const x = this.pivot.x + this.dir.x * t;
        const z = this.pivot.z + this.dir.z * t;
        if (this.pivot.y + this.dir.y * t < this.groundAt(x, z) + WALL_MARGIN * 2) {
          want = t - 1;
          break;
        }
      }
    }
    want = Math.max(want, MIN_DISTANCE);

    // Move in immediately (never peek through a wall), move back out smoothly.
    if (want < this.current || dt === 0) this.current = want;
    else this.current += (want - this.current) * (1 - Math.exp(-3 * dt));

    this.camera.position.copy(this.pivot).addScaledVector(this.dir, this.current);
    if (this.groundAt) {
      const floor = this.groundAt(this.camera.position.x, this.camera.position.z) + WALL_MARGIN * 2;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
    }
    this.camera.lookAt(this.pivot);
  }
}
