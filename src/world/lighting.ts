import { DirectionalLight, HemisphereLight, type Scene } from 'three';
import { PALETTE } from '../palette';

/**
 * Shared by the game and the landmark viewer, so screenshots match the game.
 * Soft fill from all sides plus a high side sun, so shaded faces never go black.
 */
export function addLighting(scene: Scene): void {
  scene.add(new HemisphereLight(PALETTE.white, PALETTE.groundBounce, 2.2));
  const sun = new DirectionalLight(PALETTE.white, 1.6);
  sun.position.set(70, 150, 30);
  scene.add(sun);
}
