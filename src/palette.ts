import { MeshStandardMaterial } from 'three';
import { type Pattern, patternTexture } from './world/textures';

/** The single source of 3D colors. Add new colors here. */
export const PALETTE = {
  sky: 0x8fd3ff,
  skyZenith: 0x3f8fe0,
  skyHorizon: 0xcfe6f5,
  sun: 0xfff4d6,
  white: 0xffffff,
  black: 0x1b1b1f,

  grass: 0x6abe45,
  grassLight: 0x7fcf55,
  grassDark: 0x4d9a36,
  hedge: 0x3f7f2c,
  sand: 0xe9d38f,
  /** Light bouncing up from the ground; neutral so white stays white. */
  groundBounce: 0xd6d4cc,
  water: 0x2f86d0,
  waterLight: 0x74c0f0,

  skin: 0xf6c99c,
  pants: 0x34495e,
  shoes: 0x3b2b22,
  red: 0xe0453a,
  blue: 0x3b7ddd,
  green: 0x3fae5a,
  yellow: 0xf2c230,

  // Astronaut suit
  suitWhite: 0xf2f4f7,
  suitGrey: 0x8c96a3,
  visor: 0x1e2b45,
  visorGlint: 0x9fd0ff,

  // Paraskeva Pyatnitsa chapel
  chapelWhite: 0xf8f7f3,
  chapelShade: 0xe0ddd4,
  roofGreen: 0x23884a,
  roofGreenDark: 0x1a6b39,
  gold: 0xd9a93a,
  plinth: 0x4b5057,
  lattice: 0x9a7650,
  wood: 0x7a4a2a,
  iconBlue: 0x3d6fb0,
  paving: 0xc9ab9c,
  pavingLight: 0xdcd2c6,
  pavingEdge: 0x8a8580,
  iron: 0x26292d,
  lampGlobe: 0xf7f3e0,

  // Clock tower and City Administration
  towerStone: 0x8d8578,
  towerStoneDark: 0x6b645a,
  towerLight: 0xd9d5cc,
  dial: 0x1c2230,
  pyramidRoof: 0x5e5a52,
  officeWhite: 0xeef0f0,
  officeGlass: 0x6f8fa8,
  officeGlassDark: 0x3f5566,
  signRed: 0xd8322a,
  graniteRed: 0x9a5a4a,
  squarePaving: 0xb0a39a,
  firGreen: 0x2f5d3a,

  // Regional museum
  museumWall: 0xb9634f,
  museumDeep: 0xa8442c,
  museumDark: 0x7d3324,
  friezeYellow: 0xe3c76c,
  friezeGreen: 0x7fae7a,
  friezeBlue: 0x3f63a8,
  granite: 0x8d857a,
  graniteLight: 0xa9a196,
  atticRoof: 0x7a3b2c,
  cornice: 0xd8cfa8,

  // Landmark viewer
  viewerBg: 0xdfe6ee,
  viewerGround: 0xc3cad3,

} as const;

export type ColorName = keyof typeof PALETTE;

export function hex(name: ColorName): string {
  return '#' + PALETTE[name].toString(16).padStart(6, '0');
}

/** How a colour behaves under light, and which drawn texture (if any) it carries. */
interface Surface {
  roughness: number;
  metalness?: number;
  pattern?: Pattern;
  /** World units per texture repeat. */
  tile?: number;
}

const MATTE: Surface = { roughness: 0.9 };

const SURFACES: Partial<Record<ColorName, Surface>> = {
  grass: { roughness: 1, pattern: 'grass', tile: 6 },
  grassLight: { roughness: 1, pattern: 'grass', tile: 6 },
  grassDark: { roughness: 1, pattern: 'grass', tile: 10 },
  hedge: { roughness: 1, pattern: 'grass', tile: 3 },
  sand: { roughness: 1, pattern: 'noise', tile: 4 },
  firGreen: { roughness: 0.95, pattern: 'noise', tile: 2 },
  chapelWhite: { roughness: 0.85, pattern: 'plaster', tile: 3 },
  officeWhite: { roughness: 0.8, pattern: 'plaster', tile: 3 },
  towerStone: { roughness: 0.85, pattern: 'stone', tile: 4 },
  towerStoneDark: { roughness: 0.85, pattern: 'stone', tile: 4 },
  towerLight: { roughness: 0.8, pattern: 'plaster', tile: 3 },
  museumWall: { roughness: 0.9, pattern: 'plaster', tile: 3 },
  museumDeep: { roughness: 0.9, pattern: 'plaster', tile: 3 },
  plinth: { roughness: 0.8, pattern: 'stone', tile: 3 },
  granite: { roughness: 0.75, pattern: 'stone', tile: 3 },
  graniteRed: { roughness: 0.7, pattern: 'stone', tile: 2 },
  paving: { roughness: 0.9, pattern: 'paving', tile: 3 },
  pavingLight: { roughness: 0.9, pattern: 'paving', tile: 3 },
  pavingEdge: { roughness: 0.9, pattern: 'noise', tile: 3 },
  squarePaving: { roughness: 0.9, pattern: 'paving', tile: 3 },
  roofGreen: { roughness: 0.45, metalness: 0.3, pattern: 'seams', tile: 1.5 },
  roofGreenDark: { roughness: 0.5, metalness: 0.3 },
  pyramidRoof: { roughness: 0.4, metalness: 0.4, pattern: 'seams', tile: 1.5 },
  atticRoof: { roughness: 0.6, metalness: 0.2 },
  gold: { roughness: 0.25, metalness: 1 },
  iron: { roughness: 0.5, metalness: 0.6 },
  officeGlass: { roughness: 0.1, metalness: 0.6 },
  officeGlassDark: { roughness: 0.1, metalness: 0.6 },
  dial: { roughness: 0.3, metalness: 0.2 },
  lattice: { roughness: 0.5, metalness: 0.4 },
  visor: { roughness: 0.05, metalness: 0.8 },
  lampGlobe: { roughness: 0.2 },
  suitWhite: { roughness: 0.7 },
};

const materials = new Map<ColorName, MeshStandardMaterial>();

/** One shared material per colour, with its surface properties and drawn texture. */
export function material(name: ColorName): MeshStandardMaterial {
  let m = materials.get(name);
  if (!m) {
    const surface = SURFACES[name] ?? MATTE;
    const map = surface.pattern ? patternTexture(surface.pattern, PALETTE[name]) : null;
    m = new MeshStandardMaterial({
      // A textured material takes its colour from the texture
      color: map ? 0xffffff : PALETTE[name],
      map,
      roughness: surface.roughness,
      metalness: surface.metalness ?? 0,
    });
    // mergeStatic() reads this to lay the texture out in world units
    m.userData.tile = surface.tile ?? 3;
    materials.set(name, m);
  }
  return m;
}
