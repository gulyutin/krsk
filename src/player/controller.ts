import { type Box, type Vec3, circleOverlapsBox, clamp } from '../world/colliders';

// The player is a vertical cylinder (a simplified capsule): it stands firmly
// on block edges instead of sliding off. Position is the center of the feet.

export interface ControllerConfig {
  radius: number;
  height: number;
  walkSpeed: number;
  jumpSpeed: number;
  gravity: number;
  /** Steps up to this height are climbed without jumping. */
  stepHeight: number;
  /** Below this height the player has fallen (into water) and returns to the bank. */
  killY: number;
  /** Jumping is still allowed shortly after walking off an edge. */
  coyoteTime: number;
  /** A jump pressed shortly before landing is not lost. */
  jumpBuffer: number;
}

export const DEFAULT_CONFIG: ControllerConfig = {
  radius: 0.45,
  height: 2.1,
  walkSpeed: 7,
  jumpSpeed: 10.5,
  gravity: 32,
  stepHeight: 0.55,
  killY: -1,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
};

const EPS = 1e-4;
const MAX_FALL_SPEED = 40;
/** How far the respawn point is kept from the edge of the ground block. */
const SAFE_MARGIN = 3;

export function dampAngle(from: number, to: number, k: number, dt: number): number {
  const diff = ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return from + diff * (1 - Math.exp(-k * dt));
}

export class PlayerController {
  readonly pos: Vec3;
  readonly vel: Vec3 = { x: 0, y: 0, z: 0 };
  onGround = false;
  /** Where the avatar faces (radians around Y, 0 = towards +Z). */
  facing = 0;
  /** Fell below killY; cleared by respawn(). */
  fell = false;

  private readonly safe: Vec3;
  private coyote = 0;
  private jumpTimer = 0;

  constructor(
    private readonly colliders: readonly Box[],
    spawn: Vec3,
    readonly cfg: ControllerConfig = DEFAULT_CONFIG,
  ) {
    this.pos = { ...spawn };
    this.safe = { ...spawn };
  }

  /**
   * moveX/moveZ: desired direction in world space (length up to 1).
   * jumpPressed: jump was pressed since the previous frame.
   */
  update(dt: number, moveX: number, moveZ: number, jumpPressed: boolean): void {
    const { cfg, vel } = this;

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    const blend = 1 - Math.exp(-(this.onGround ? 14 : 5) * dt);
    vel.x += (moveX * cfg.walkSpeed - vel.x) * blend;
    vel.z += (moveZ * cfg.walkSpeed - vel.z) * blend;

    if (len > 0.1) this.facing = dampAngle(this.facing, Math.atan2(moveX, moveZ), 12, dt);

    if (jumpPressed) this.jumpTimer = cfg.jumpBuffer;
    if (this.jumpTimer > 0 && this.coyote > 0) {
      vel.y = cfg.jumpSpeed;
      this.coyote = 0;
      this.jumpTimer = 0;
    }
    this.jumpTimer -= dt;

    vel.y = Math.max(vel.y - cfg.gravity * dt, -MAX_FALL_SPEED);

    // Substeps: move at most half the radius per step so a slow frame
    // cannot tunnel through a thin wall.
    const dist = Math.hypot(vel.x, vel.y, vel.z) * dt;
    const steps = Math.max(1, Math.ceil(dist / (cfg.radius * 0.5)));
    const h = dt / steps;
    this.onGround = false;
    let ground: Box | null = null;
    for (let i = 0; i < steps; i++) ground = this.step(h) ?? ground;

    this.coyote = this.onGround ? cfg.coyoteTime : this.coyote - dt;
    if (this.onGround && ground) this.rememberSafe(ground);
    if (this.pos.y < cfg.killY) this.fell = true;
  }

  respawn(): void {
    Object.assign(this.pos, this.safe);
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.fell = false;
    this.coyote = 0;
    this.jumpTimer = 0;
  }

  /** One substep. Returns the box the player landed on, if any. */
  private step(h: number): Box | null {
    const { pos: p, vel: v, cfg } = this;
    const r = cfg.radius;
    const H = cfg.height;
    let ground: Box | null = null;

    // Vertical
    const prevY = p.y;
    p.y += v.y * h;
    for (const b of this.colliders) {
      if (p.y >= b.maxY || p.y + H <= b.minY) continue;
      if (!circleOverlapsBox(p.x, p.z, r, b)) continue;
      if (v.y <= 0 && prevY >= b.maxY - EPS) {
        p.y = b.maxY;
        v.y = 0;
        this.onGround = true;
        ground = b;
      } else if (v.y > 0 && prevY + H <= b.minY + EPS) {
        p.y = b.minY - H;
        v.y = 0;
      }
    }

    // Horizontal; two passes to resolve corners properly.
    p.x += v.x * h;
    p.z += v.z * h;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.colliders) {
        if (p.y >= b.maxY - EPS || p.y + H <= b.minY + EPS) continue;
        const cx = clamp(p.x, b.minX, b.maxX);
        const cz = clamp(p.z, b.minZ, b.maxZ);
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;

        if (b.maxY - p.y <= cfg.stepHeight && this.fitsAt(p.x, b.maxY, p.z, b)) {
          p.y = b.maxY;
          if (v.y < 0) v.y = 0;
          this.onGround = true;
          ground = b;
          continue;
        }

        if (d2 > 1e-12) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const nz = dz / d;
          p.x += nx * (r - d);
          p.z += nz * (r - d);
          const vn = v.x * nx + v.z * nz;
          if (vn < 0) {
            v.x -= vn * nx;
            v.z -= vn * nz;
          }
        } else {
          // Center is inside the box footprint: push out along the shortest axis.
          const left = p.x - b.minX;
          const right = b.maxX - p.x;
          const back = p.z - b.minZ;
          const front = b.maxZ - p.z;
          const m = Math.min(left, right, back, front);
          if (m === left) {
            p.x = b.minX - r;
            v.x = Math.min(v.x, 0);
          } else if (m === right) {
            p.x = b.maxX + r;
            v.x = Math.max(v.x, 0);
          } else if (m === back) {
            p.z = b.minZ - r;
            v.z = Math.min(v.z, 0);
          } else {
            p.z = b.maxZ + r;
            v.z = Math.max(v.z, 0);
          }
        }
      }
    }
    return ground;
  }

  /** Whether the cylinder fits at the point (ignoring the box `except`). */
  private fitsAt(x: number, y: number, z: number, except: Box): boolean {
    const { radius: r, height: H } = this.cfg;
    for (const c of this.colliders) {
      if (c === except) continue;
      if (y >= c.maxY - EPS || y + H <= c.minY + EPS) continue;
      if (circleOverlapsBox(x, z, r, c)) return false;
    }
    return true;
  }

  private rememberSafe(b: Box): void {
    const mx = Math.min(SAFE_MARGIN, (b.maxX - b.minX) / 2);
    const mz = Math.min(SAFE_MARGIN, (b.maxZ - b.minZ) / 2);
    this.safe.x = clamp(this.pos.x, b.minX + mx, b.maxX - mx);
    this.safe.z = clamp(this.pos.z, b.minZ + mz, b.maxZ - mz);
    this.safe.y = b.maxY;
  }
}
