// Landmark viewer: viewer.html?id=chapel[&view=front|side|back|top|iso|sheet]
// Without `view` the camera can be orbited with the mouse or a finger.
// id=world shows the whole map (views: overview, top, or any landmark id); id=avatar shows the player figure,
// id=bike the player on the bicycle.
// Sets window.viewerReady = true once the requested view has been rendered.

import './style.css';
import { Box3, CircleGeometry, Color, Group, Mesh, type Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PALETTE, material } from './palette';
import { Avatar } from './player/avatar';
import { Bike } from './player/bike';
import { LANDMARKS, PLACEMENTS } from './world/landmarks/index';
import { qualityLevel } from './quality';
import { createEnvironment, enableShadows, setupRenderer } from './world/lighting';
import { MAP } from './world/terrain';
import { buildWorld } from './world/world';

interface Angle {
  yaw: number;
  pitch: number;
  /** Frame only the part named "main" (the building without surroundings). */
  main: boolean;
}

const LANDMARK_VIEWS: Record<string, Angle> = {
  front: { yaw: 0, pitch: 0.06, main: true },
  // From −X: attached buildings (like the administration next to the tower) extend to +X
  side: { yaw: -Math.PI / 2, pitch: 0.06, main: true },
  back: { yaw: Math.PI, pitch: 0.06, main: true },
  top: { yaw: 0, pitch: Math.PI / 2 - 0.001, main: false },
  iso: { yaw: Math.PI / 4, pitch: 0.45, main: false },
};
const SHEET = ['front', 'side', 'iso', 'top'];

const params = new URLSearchParams(location.search);
const id = params.get('id') ?? 'chapel';
const view = params.get('view');

const quality = qualityLevel('high');
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
setupRenderer(renderer, quality);
document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new Scene();
const environment = createEnvironment(scene, renderer, quality);
// No fog here: the viewer is for judging shapes, and the world overview is far away
scene.fog = null;
const camera = new PerspectiveCamera(40, 1, 0.1, 3000);

let subject: Object3D;
let focus: Object3D;
if (id === 'world') {
  const world = buildWorld();
  scene.add(world.root);
  subject = focus = world.root;
  const avatar = new Avatar();
  avatar.root.position.set(world.spawn.x, world.spawn.y, world.spawn.z);
  scene.add(avatar.root);
} else {
  scene.background = new Color(PALETTE.viewerBg);
  const ground = new Mesh(new CircleGeometry(200, 48), material('viewerGround'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);
  if (id === 'avatar') {
    subject = focus = new Avatar().root;
    scene.add(subject);
  } else if (id === 'bike') {
    // The astronaut on the bicycle, pedals mid-stroke
    const bike = new Bike();
    const rider = new Avatar();
    bike.update(0, 0);
    bike.pedal = 0.9;
    bike.update(0, 0);
    for (let i = 0; i < 60; i++) rider.update(1 / 30, 0, 7, true, bike.pedal);
    subject = focus = new Group();
    subject.add(bike.root, rider.root);
    scene.add(subject);
  } else {
    const build = LANDMARKS[id];
    if (!build) throw new Error(`Unknown landmark: ${id}`);
    subject = build();
    scene.add(subject);
    focus = subject.getObjectByName('main') ?? subject;
    addScaleFigure(focus);
  }
}

function addScaleFigure(main: Object3D): void {
  // A player figure in front of the building, to judge the scale
  const b = boundsOf(main);
  const avatar = new Avatar();
  const standOn = boundsOf(subject);
  const x = b.max.x + 1.2;
  const z = b.max.z + 1.5;
  avatar.root.position.set(x, groundAt(x, z, standOn.max.y), z);
  scene.add(avatar.root);
}

/** Height of the landmark's surface at (x, z), found by casting a ray down. */
function groundAt(x: number, z: number, top: number): number {
  const hits: number[] = [];
  const probe = new Box3();
  subject.traverse((o) => {
    if (!(o instanceof Mesh) || !o.userData.solid) return;
    probe.setFromObject(o, true);
    if (x >= probe.min.x && x <= probe.max.x && z >= probe.min.z && z <= probe.max.z && probe.max.y <= top) {
      hits.push(probe.max.y);
    }
  });
  return hits.length ? Math.max(...hits) : 0;
}

function boundsOf(o: Object3D): Box3 {
  return new Box3().setFromObject(o, true);
}

/** Places `cam` to look at `box` from the given angle, fitting the whole box into the frame. */
function aim(cam: PerspectiveCamera, box: Box3, yaw: number, pitch: number): void {
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const dir = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const vHalf = (cam.fov * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
  const radius = size.length() / 2;
  let dist: number;
  if (pitch < 0.2) {
    // Near-horizontal: fit height and width separately, it frames tall buildings tighter
    const width = Math.abs(Math.cos(yaw)) * size.x + Math.abs(Math.sin(yaw)) * size.z;
    const depth = Math.abs(Math.sin(yaw)) * size.x + Math.abs(Math.cos(yaw)) * size.z;
    dist = Math.max(size.y / 2 / Math.tan(vHalf), width / 2 / Math.tan(hHalf)) * 1.08 + depth / 2;
  } else {
    dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.02;
  }
  cam.position.copy(center).addScaledVector(dir, dist);
  cam.up.set(0, 1, 0);
  cam.lookAt(center);
  cam.near = Math.max(0.05, dist / 200);
  cam.far = dist * 10;
  cam.updateProjectionMatrix();
}

function worldAngle(name: string): { box: Box3; yaw: number; pitch: number } {
  // The playable map only, not the decorative ground beyond its edge
  const map = new Box3(new Vector3(MAP.west, -1, MAP.north), new Vector3(MAP.east, 10, MAP.south));
  if (name === 'top') return { box: map, yaw: 0, pitch: Math.PI / 2 - 0.001 };
  const placement = PLACEMENTS.find((p) => p.id === name);
  if (placement) {
    // Each landmark's root group is named after its id
    const lm = subject.getObjectByName(placement.id);
    if (lm) return { box: boundsOf(lm), yaw: 0.5, pitch: 0.3 };
  }
  return { box: map, yaw: 0.5, pitch: 0.75 };
}

function draw(): void {
  environment.update(boundsOf(focus).getCenter(new Vector3()), camera.position);
  renderer.render(scene, camera);
}

function render(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);

  if (view === 'sheet' && id !== 'world') {
    renderer.setScissorTest(true);
    const cw = Math.floor(w / 2);
    const ch = Math.floor(h / 2);
    SHEET.forEach((name, i) => {
      const a = LANDMARK_VIEWS[name];
      const x = (i % 2) * cw;
      const y = (i < 2 ? 1 : 0) * ch;
      camera.aspect = cw / ch;
      aim(camera, boundsOf(a.main ? focus : subject), a.yaw, a.pitch);
      renderer.setViewport(x, y, cw, ch);
      renderer.setScissor(x, y, cw, ch);
      draw();
    });
    renderer.setScissorTest(false);
  } else {
    camera.aspect = w / h;
    if (id === 'world') {
      const a = worldAngle(view ?? 'overview');
      aim(camera, a.box, a.yaw, a.pitch);
    } else {
      const a = LANDMARK_VIEWS[view ?? 'iso'] ?? LANDMARK_VIEWS.iso;
      aim(camera, boundsOf(a.main ? focus : subject), a.yaw, a.pitch);
    }
    draw();
  }
}

enableShadows(subject);
render();

if (view) {
  requestAnimationFrame(() => {
    render();
    (window as unknown as { viewerReady: boolean }).viewerReady = true;
  });
} else {
  // Interactive: orbit around the landmark
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(boundsOf(focus).getCenter(new Vector3()));
  controls.enableDamping = true;
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    draw();
  });
  (window as unknown as { viewerReady: boolean }).viewerReady = true;
}
