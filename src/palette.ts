import { MeshLambertMaterial } from 'three';

/** The single source of 3D colors. Add new colors here. */
export const PALETTE = {
  sky: 0x8fd3ff,
  white: 0xffffff,
  black: 0x1b1b1f,

  grass: 0x6abe45,
  grassLight: 0x7fcf55,
  grassDark: 0x4d9a36,
  hedge: 0x3f7f2c,
  sand: 0xe9d38f,
  water: 0x2f86d0,
  waterLight: 0x74c0f0,

  skin: 0xf6c99c,
  pants: 0x34495e,
  shoes: 0x3b2b22,
  red: 0xe0453a,
  blue: 0x3b7ddd,
  green: 0x3fae5a,
  yellow: 0xf2c230,

  // Temporary collision test blocks (stage 1)
  testOrange: 0xf39c32,
  testPurple: 0x9b6bd6,
} as const;

export type ColorName = keyof typeof PALETTE;

export function hex(name: ColorName): string {
  return '#' + PALETTE[name].toString(16).padStart(6, '0');
}

const materials = new Map<ColorName, MeshLambertMaterial>();

/** One shared material per color. */
export function lambert(name: ColorName): MeshLambertMaterial {
  let m = materials.get(name);
  if (!m) {
    m = new MeshLambertMaterial({ color: PALETTE[name] });
    materials.set(name, m);
  }
  return m;
}
