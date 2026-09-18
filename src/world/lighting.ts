import {
  ACESFilmicToneMapping,
  BackSide,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PCFSoftShadowMap,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { PALETTE } from '../palette';
import type { Quality } from '../quality';

/**
 * Direction towards the sun: high and from the east, slightly south. Facades facing the river
 * still get light, and the player seen from behind is side-lit rather than backlit.
 */
const SUN_DIR = new Vector3(0.55, 0.85, 0.2).normalize();
const SKY_RADIUS = 700;
/** Half-size of the area around the player that receives sun shadows. */
const SHADOW_HALF = 70;

export interface Environment {
  /** Keeps the sky around the camera and the shadow area around the player. */
  update(focus: Vector3, cameraPosition: Vector3): void;
}

/** Tone mapping and shadow settings shared by the game and the viewer. */
export function setupRenderer(renderer: WebGLRenderer, quality: Quality): void {
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadowMapSize > 0;
  renderer.shadowMap.type = PCFSoftShadowMap;
}

/** Sky dome with a gradient from the horizon to the zenith, plus the sun disc. */
function buildSky(): Object3D {
  const geo = new SphereGeometry(SKY_RADIUS, 32, 16);
  const pos = geo.attributes.position;
  const colors: number[] = [];
  const horizon = new Color(PALETTE.skyHorizon);
  const zenith = new Color(PALETTE.skyZenith);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / SKY_RADIUS);
    c.copy(horizon).lerp(zenith, Math.pow(t, 0.55));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const sky = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;

  const sun = new Mesh(
    new SphereGeometry(18, 16, 8),
    new MeshBasicMaterial({ color: PALETTE.sun, fog: false, depthWrite: false }),
  );
  sun.position.copy(SUN_DIR).multiplyScalar(SKY_RADIUS * 0.9);
  sky.add(sun);
  return sky;
}

/**
 * Sky, sun with (optional) shadows, soft fill light, fog matching the horizon
 * and an environment map made from the same sky, so glossy surfaces reflect it.
 */
export function createEnvironment(scene: Scene, renderer: WebGLRenderer, quality: Quality): Environment {
  const sky = buildSky();
  scene.add(sky);
  scene.background = new Color(PALETTE.skyHorizon);
  scene.fog = new Fog(PALETTE.skyHorizon, 140, 620);

  // Reflections: render the sky once into a prefiltered environment map
  const pmrem = new PMREMGenerator(renderer);
  const skyScene = new Scene();
  skyScene.add(buildSky());
  // far must reach the sky dome, or the captured environment is black and metals look black
  scene.environment = pmrem.fromScene(skyScene, 0.02, 0.1, SKY_RADIUS * 2).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();

  scene.add(new HemisphereLight(PALETTE.skyHorizon, PALETTE.groundBounce, 1.3));

  const sun = new DirectionalLight(PALETTE.sun, 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(150);
  scene.add(sun, sun.target);
  if (quality.shadowMapSize > 0) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -SHADOW_HALF;
    cam.right = cam.top = SHADOW_HALF;
    cam.near = 1;
    cam.far = 400;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
  }

  const texel = (SHADOW_HALF * 2) / Math.max(quality.shadowMapSize, 1);
  const snapped = new Vector3();
  return {
    update(focus, cameraPosition) {
      sky.position.copy(cameraPosition);
      // Snap to shadow-map texels so shadow edges don't shimmer while walking
      snapped.set(Math.round(focus.x / texel) * texel, 0, Math.round(focus.z / texel) * texel);
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).addScaledVector(SUN_DIR, 150);
    },
  };
}

/** Marks everything under `root` to cast and receive sun shadows. */
export function enableShadows(root: Object3D, cast = true): void {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = cast;
      o.receiveShadow = true;
    }
  });
}
