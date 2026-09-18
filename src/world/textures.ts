// Surface textures drawn in code from a palette colour: no image files, every
// shade is derived from the base colour. Textures need a DOM canvas; in tests
// (no document) callers get null and fall back to plain colours.

import {
  BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  Color,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

export type Pattern = 'noise' | 'grass' | 'plaster' | 'brick' | 'stone' | 'paving' | 'seams';

const SIZE = 256;

/** Deterministic pseudo-random numbers, so textures look the same on every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(base: Color, amount: number): string {
  const c = base.clone();
  c.offsetHSL(0, 0, amount);
  return '#' + c.getHexString();
}

export function canDrawTextures(): boolean {
  return typeof document !== 'undefined';
}

/** A tiling texture of the given pattern in shades of `color`. */
export function patternTexture(pattern: Pattern, color: number): Texture | null {
  if (!canDrawTextures()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const base = new Color(color);
  const rand = rng(color ^ pattern.length * 7919);
  ctx.fillStyle = '#' + base.getHexString();
  ctx.fillRect(0, 0, SIZE, SIZE);

  const speckle = (count: number, spread: number, maxSize: number) => {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = shade(base, (rand() - 0.5) * spread);
      const s = 1 + rand() * maxSize;
      ctx.fillRect(rand() * SIZE, rand() * SIZE, s, s);
    }
  };
  const blotches = (count: number, spread: number) => {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = shade(base, (rand() - 0.5) * spread);
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(rand() * SIZE, rand() * SIZE, 20 + rand() * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const blocks = (w: number, h: number, joint: string, spread: number, offsetRows: boolean) => {
    for (let y = 0; y < SIZE; y += h) {
      const shift = offsetRows && (y / h) % 2 === 1 ? w / 2 : 0;
      for (let x = -w; x < SIZE + w; x += w) {
        ctx.fillStyle = shade(base, (rand() - 0.5) * spread);
        ctx.fillRect(x + shift + 1, y + 1, w - 2, h - 2);
      }
    }
    ctx.strokeStyle = joint;
    ctx.lineWidth = 2;
    for (let y = 0; y <= SIZE; y += h) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
  };

  switch (pattern) {
    case 'noise':
      blotches(14, 0.08);
      speckle(2500, 0.1, 2);
      break;
    case 'grass':
      blotches(18, 0.1);
      speckle(1800, 0.12, 2);
      ctx.lineWidth = 1;
      for (let i = 0; i < 900; i++) {
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        ctx.strokeStyle = shade(base, (rand() - 0.3) * 0.16);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 3, y - 3 - rand() * 4);
        ctx.stroke();
      }
      break;
    case 'plaster':
      blotches(10, 0.035);
      speckle(3000, 0.03, 1.5);
      break;
    case 'brick':
      blocks(32, 12, shade(base, 0.12), 0.08, true);
      speckle(1200, 0.05, 1);
      break;
    case 'stone':
      blocks(128, 64, shade(base, -0.12), 0.06, true);
      speckle(2000, 0.06, 1.5);
      break;
    case 'paving':
      blocks(32, 32, shade(base, -0.1), 0.07, false);
      for (let x = 0; x <= SIZE; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, SIZE);
        ctx.stroke();
      }
      speckle(800, 0.05, 1);
      break;
    case 'seams': {
      const grad = ctx.createLinearGradient(0, 0, 32, 0);
      grad.addColorStop(0, shade(base, -0.04));
      grad.addColorStop(0.5, shade(base, 0.03));
      grad.addColorStop(1, shade(base, -0.04));
      for (let x = 0; x < SIZE; x += 32) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, SIZE);
        ctx.restore();
        ctx.fillStyle = shade(base, -0.12);
        ctx.fillRect(x, 0, 2, SIZE);
      }
      break;
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Replaces the UVs of a static geometry with world-space ones projected along each
 * face's dominant axis, so a texture has the same scale on every wall however the
 * boxes were stretched. `tile` is the size of one texture repeat in world units.
 */
export function applyWorldUV(geometry: BufferGeometry, tile: number): void {
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  if (!pos || !nrm) return;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

/** A tiling normal map of soft ripples for the river. */
export function rippleNormalMap(): Texture | null {
  if (!canDrawTextures()) return null;
  const n = 128;
  const height = new Float32Array(n * n);
  const rand = rng(42);
  const waves = Array.from({ length: 7 }, () => ({
    kx: Math.round(1 + rand() * 5),
    ky: Math.round(rand() * 4),
    phase: rand() * Math.PI * 2,
    amp: 0.4 + rand() * 0.6,
  }));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let h = 0;
      for (const w of waves) h += w.amp * Math.sin(((w.kx * x + w.ky * y) / n) * Math.PI * 2 + w.phase);
      height[y * n + x] = h;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  const strength = 0.9;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const hx = height[y * n + ((x + 1) % n)] - height[y * n + ((x - 1 + n) % n)];
      const hy = height[((y + 1) % n) * n + x] - height[((y - 1 + n) % n) * n + x];
      let nx = -hx * strength;
      let ny = -hy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * n + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}
