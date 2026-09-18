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
  /** Bicycle: top speed, acceleration and braking (units/s²), turn rate (rad/s), hop speed. */
  bikeSpeed: number;
  bikeAccel: number;
  bikeBrake: number;
  bikeTurnRate: number;
  bikeJumpSpeed: number;
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
  bikeSpeed: 16,
  bikeAccel: 9,
  bikeBrake: 16,
  bikeTurnRate: 3,
  bikeJumpSpeed: 7,
};

const EPS = 1e-4;
const MAX_FALL_SPEED = 40;
/** How far the respawn point is kept from the edge of the ground block. */
const SAFE_MARGIN = 3;
/** Terrain rise the player walks up within one substep; steeper than this acts as a wall. */
const MAX_CLIMB = 0.5;
/** Going downhill, stay on the ground if it is at most this far below. */
const SNAP_DOWN = 0.35;
/** Terrain lower than this is shore or water, not a place to respawn. */
const SAFE_TERRAIN_Y = 0.5;

function angleDiff(from: number, to: number): number {
  return ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
}

/** Turns towards `to` by at most `maxStep` radians. */
export function turnToward(from: number, to: number, maxStep: number): number {
  return from + clamp(angleDiff(from, to), -maxStep, maxStep);
}

export function dampAngle(from: number, to: number, k: number, dt: number): number {
  return from + angleDiff(from, to) * (1 - Math.exp(-k * dt));
}

export class PlayerController {
  readonly pos: Vec3;
  readonly vel: Vec3 = { x: 0, y: 0, z: 0 };
  onGround = false;
  /** Where the avatar faces (radians around Y, 0 = towards +Z). */
  facing = 0;
  /** Fell below killY; cleared by respawn(). */
  fell = false;
  /** On the bicycle: faster, turns along an arc instead of on the spot. */
  riding = false;
  /** Current bicycle speed along `facing`. */
  bikeSpeed = 0;

  private readonly safe: Vec3;
  private coyote = 0;
  private jumpTimer = 0;

  /** Standing on the terrain (not on a box) at the end of the last update. */
  private onTerrain = false;

  /** groundAt: terrain height at (x, z); without it the ground is boxes only. */
  constructor(
    private readonly colliders: readonly Box[],
    spawn: Vec3,
    readonly cfg: ControllerConfig = DEFAULT_CONFIG,
    private readonly groundAt?: (x: number, z: number) => number,
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

    if (this.riding) this.steerBike(dt, moveX, moveZ, Math.min(len, 1));
    else {
      const blend = 1 - Math.exp(-(this.onGround ? 14 : 5) * dt);
      vel.x += (moveX * cfg.walkSpeed - vel.x) * blend;
      vel.z += (moveZ * cfg.walkSpeed - vel.z) * blend;
      if (len > 0.1) this.facing = dampAngle(this.facing, Math.atan2(moveX, moveZ), 12, dt);
    }

    if (jumpPressed) this.jumpTimer = cfg.jumpBuffer;
    if (this.jumpTimer > 0 && this.coyote > 0) {
      vel.y = this.riding ? cfg.bikeJumpSpeed : cfg.jumpSpeed;
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
    let grounded = this.onGround;
    this.onGround = false;
    this.onTerrain = false;
    let ground: Box | null = null;
    for (let i = 0; i < steps; i++) {
      ground = this.step(h, grounded) ?? ground;
      grounded = this.onGround;
    }

    // A wall or a kerb that stopped the bike also takes its speed away
    if (this.riding) this.bikeSpeed = Math.min(this.bikeSpeed, Math.hypot(vel.x, vel.z));
    this.coyote = this.onGround ? cfg.coyoteTime : this.coyote - dt;
    if (this.onGround && ground && !this.onTerrain) this.rememberSafe(ground);
    else if (this.onGround && this.onTerrain && this.pos.y > SAFE_TERRAIN_Y) Object.assign(this.safe, this.pos);
    if (this.pos.y < cfg.killY) this.fell = true;
  }

  /** Get on or off the bicycle; the current speed carries over. */
  setRiding(on: boolean): void {
    if (on === this.riding) return;
    this.riding = on;
    this.bikeSpeed = on ? Math.hypot(this.vel.x, this.vel.z) : 0;
  }

  /**
   * Bicycle steering: the bike turns towards the stick direction at a limited rate
   * and rolls along its own heading, so it travels along arcs.
   */
  private steerBike(dt: number, moveX: number, moveZ: number, throttle: number): void {
    const { cfg, vel } = this;
    if (throttle > 0.1) this.facing = turnToward(this.facing, Math.atan2(moveX, moveZ), cfg.bikeTurnRate * dt);
    if (!this.onGround) return; // keep momentum in the air
    const target = throttle * cfg.bikeSpeed;
    const rate = target > this.bikeSpeed ? cfg.bikeAccel : cfg.bikeBrake;
    this.bikeSpeed += clamp(target - this.bikeSpeed, -rate * dt, rate * dt);
    vel.x = Math.sin(this.facing) * this.bikeSpeed;
    vel.z = Math.cos(this.facing) * this.bikeSpeed;
  }

  respawn(): void {
    Object.assign(this.pos, this.safe);
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.bikeSpeed = 0;
    this.fell = false;
    this.coyote = 0;
    this.jumpTimer = 0;
  }

  /** One substep. Returns the box the player landed on, if any. */
  private step(h: number, grounded: boolean): Box | null {
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

    this.landOnTerrain();

    // Horizontal; two passes to resolve corners properly.
    const beforeX = p.x;
    const beforeZ = p.z;
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

    if (this.groundAt) {
      const g = this.groundAt(p.x, p.z);
      if (p.y < g) {
        if (g - p.y <= MAX_CLIMB) {
          // Walking uphill
          p.y = g;
          if (v.y < 0) v.y = 0;
          this.onGround = this.onTerrain = true;
        } else {
          // Too steep: a wall
          p.x = beforeX;
          p.z = beforeZ;
          v.x = v.z = 0;
        }
      } else if ((grounded || this.onGround) && !ground && v.y <= 0 && p.y - g < SNAP_DOWN) {
        // Walking or riding downhill: stay on the ground instead of flying off each bump.
        // Not when standing on a box: paving just above the terrain must not be sunk into.
        p.y = g;
        this.onGround = this.onTerrain = true;
      }
    }
    return ground;
  }

  /** Stops a fall on the terrain surface. */
  private landOnTerrain(): void {
    if (!this.groundAt) return;
    const g = this.groundAt(this.pos.x, this.pos.z);
    if (this.pos.y <= g) {
      this.pos.y = g;
      if (this.vel.y < 0) this.vel.y = 0;
      this.onGround = this.onTerrain = true;
    }
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
