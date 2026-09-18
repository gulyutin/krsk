import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { hex } from '../palette';
import { rippleNormalMap } from './textures';
import { MAP } from './terrain';

const TILE = 12; // world units per texture repeat
const FLOW_SPEED = 0.06; // texture repeats per second

/** Ripple texture: dark water with light wavy strokes. */
function rippleTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hex('water');
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hex('waterLight');
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const strokes = [
    [10, 20, 40],
    [70, 52, 34],
    [24, 88, 46],
    [84, 112, 30],
  ];
  for (const [x, y, len] of strokes) {
    ctx.beginPath();
    for (let i = 0; i <= len; i += 2) {
      const px = (x + i) % size;
      const py = y + Math.sin((i / len) * Math.PI * 2) * 3;
      if (i === 0 || px < 2) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export interface River {
  mesh: Mesh;
  update(dt: number): void;
}

/** detail: add a moving ripple normal map, so the sun glints on the water. */
export function buildRiver(detail = true): River {
  const length = MAP.east - MAP.west + 1600;
  const width = MAP.rightBankZ - MAP.leftBankZ + 2; // tucks slightly under the banks so there is no gap
  const tex = rippleTexture();
  tex.repeat.set(length / TILE, width / TILE);
  const normals = detail ? rippleNormalMap() : null;
  normals?.repeat.set(length / (TILE * 2.5), width / (TILE * 2.5));

  const water = new MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05, normalMap: normals });
  water.normalScale.set(0.35, 0.35);
  const mesh = new Mesh(new PlaneGeometry(length, width), water);
  mesh.receiveShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((MAP.west + MAP.east) / 2, MAP.waterY, (MAP.leftBankZ + MAP.rightBankZ) / 2);

  let t = 0;
  return {
    mesh,
    update(dt) {
      t += dt;
      tex.offset.x = -t * FLOW_SPEED; // flows towards +X
      tex.offset.y = Math.sin(t * 0.7) * 0.03;
      if (normals) {
        normals.offset.x = -t * FLOW_SPEED * 1.7;
        normals.offset.y = t * 0.013;
      }
    },
  };
}
