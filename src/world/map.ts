/**
 * Schematic map of central Krasnoyarsk, see docs/map.md. The Yenisei is
 * straightened and flows towards +X (in reality east-north-east); the left
 * bank with the city centre is north (−Z), the right bank is south (+Z).
 * Directions between places follow the real map, distances are compressed.
 */
export const MAP = {
  west: -700,
  east: 520,
  north: -380,
  south: 440,
  /** Water starts at the left bank edge and ends at the right bank edge. */
  leftBankZ: 0,
  rightBankZ: 175,
  /**
   * Otdykha island between the main channel (north) and the narrow channel (south).
   * Long enough for the Palace of Sports in the west and the stadium and the
   * lighthouse east of the bridge.
   */
  island: { x0: -440, x1: 300, z0: 70, z1: 150 },
  /** Top of Karaulnaya hill, where the chapel stands. */
  hill: { x: -100, z: -290 },
  waterY: -1.2,
} as const;
