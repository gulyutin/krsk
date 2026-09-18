import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { type ColorName, PALETTE, material } from '../palette';
import { type Box, box } from './colliders';
import { mergeStatic } from './landmarks/kit';
import { MAP } from './map';
import { heightAt } from './relief';
import { applyWorldUV, patternTexture } from './textures';

const unit = new BoxGeometry(1, 1, 1);

/**
 * Solid block: a mesh plus a collider with the same bounds.
 * color = null makes an invisible wall.
 */
export function solidBox(parent: Group, colliders: Box[], b: Box, color: ColorName | null): Mesh | null {
  colliders.push(b);
  if (!color) return null;
  const m = new Mesh(unit, material(color));
  m.scale.set(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
  m.position.set((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2);
  parent.add(m);
  return m;
}

export interface Terrain {
  group: Group;
  colliders: Box[];
}

/** Grid coordinates: fine inside the playable area, coarse out to the horizon. */
function axis(min: number, max: number, cell: number): number[] {
  const far = 1400;
  const coarse = 60;
  const out: number[] = [];
  for (let v = min - far; v < min - 60; v += coarse) out.push(v);
  for (let v = min - 60; v < max + 60; v += cell) out.push(v);
  for (let v = max + 60; v <= max + far; v += coarse) out.push(v);
  return out;
}

/** The ground as one mesh following heightAt(), coloured by height and slope. */
function buildGround(cell: number): Mesh {
  const xs = axis(MAP.west, MAP.east, cell);
  const zs = axis(MAP.north, MAP.south, cell);
  const nx = xs.length;
  const nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3;
      pos[k] = xs[i];
      pos[k + 1] = heightAt(xs[i], zs[j]);
      pos[k + 2] = zs[j];
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();

  // Sand by the water, grass on flat ground, darker grass on slopes and beyond the map
  const grass = new Color(PALETTE.grass);
  const steep = new Color(PALETTE.grassDark);
  const sand = new Color(PALETTE.sand);
  const bed = new Color(PALETTE.sand).multiplyScalar(0.6);
  const colors = new Float32Array(nx * nz * 3);
  const normals = geo.attributes.normal;
  const c = new Color();
  for (let v = 0; v < nx * nz; v++) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    // Beyond the map edge the grass darkens gradually, with no visible border
    const outside = Math.max(MAP.west - x, x - MAP.east, MAP.north - z, z - MAP.south, 0);
    const slope = 1 - normals.getY(v);
    c.copy(grass).lerp(steep, Math.min(1, slope * 4 + 0.5 * Math.min(1, outside / 150)));
    if (y < 0.9) c.lerp(sand, Math.min(1, (0.9 - y) / 0.5));
    if (y < -0.8) c.copy(bed);
    colors[v * 3] = c.r;
    colors[v * 3 + 1] = c.g;
    colors[v * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  applyWorldUV(geo, 6);

  // A light grass pattern multiplied by the vertex colours
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    map: patternTexture('grass', PALETTE.white),
    roughness: 1,
  });
  const mesh = new Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/** cell: grid step in the playable area; larger on low quality. */
export function buildTerrain(cell = 6): Terrain {
  const group = new Group();
  const colliders: Box[] = [];
  const { west, east, north, south, leftBankZ: lz, rightBankZ: rz } = MAP;

  const ground = buildGround(cell);

  // Map edge: a low hedge following the ground, with a tall invisible wall behind it
  const edges = new Group();
  const hedge = (x0: number, z0: number, x1: number, z1: number) => {
    const h = heightAt((x0 + x1) / 2, (z0 + z1) / 2);
    solidBox(edges, colliders, box(x0, h - 1, z0, x1, h + 1.2, z1), 'hedge');
    solidBox(edges, colliders, { ...box(x0, -10, z0, x1, h + 30, z1), noCamera: true }, null);
  };
  const step = 20;
  for (let x = west; x < east; x += step) {
    hedge(x, north - 1, Math.min(x + step, east), north);
    hedge(x, south, Math.min(x + step, east), south + 1);
  }
  for (const [z0, z1] of [
    [north, lz],
    [rz, south],
  ]) {
    for (let z = z0; z < z1; z += step) {
      hedge(west - 1, z, west, Math.min(z + step, z1));
      hedge(east, z, east + 1, Math.min(z + step, z1));
    }
  }
  mergeStatic(edges);
  group.add(ground, edges);
  return { group, colliders };
}
