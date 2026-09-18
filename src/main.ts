import './style.css';
import { Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Avatar } from './player/avatar';
import { Bike } from './player/bike';
import { CameraRig } from './player/camera';
import { PlayerController, turnToward } from './player/controller';
import { Input } from './player/input';
import { Hud } from './ui/hud';
import { detectQuality } from './quality';
import { createEnvironment, enableShadows, setupRenderer } from './world/lighting';
import { buildWorld } from './world/world';

const MAX_DT = 0.05;
const debug = new URLSearchParams(location.search).has('debug');

const quality = detectQuality();

const renderer = new WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
setupRenderer(renderer, quality);
document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new Scene();
const environment = createEnvironment(scene, renderer, quality);

const camera = new PerspectiveCamera(60, 1, 0.1, 800);

const world = buildWorld(quality.waterDetail, quality.level === 'low' ? 10 : 6);
scene.add(world.root);

// The rider group holds the avatar and the bicycle; it turns with the player and leans into turns
const rider = new Group();
const avatar = new Avatar();
const bike = new Bike();
bike.root.visible = false;
rider.add(avatar.root, bike.root);
enableShadows(rider);
scene.add(rider);
const focus = new Vector3();
let lean = 0;
let lastFacing = 0;

const WALK_CAMERA_DISTANCE = 10;
const BIKE_CAMERA_DISTANCE = 13;

const controller = new PlayerController(world.colliders, world.spawn, undefined, world.groundAt);
controller.facing = world.spawnYaw + Math.PI; // back to the camera
const rig = new CameraRig(camera, world.colliders, world.groundAt);
rig.yaw = world.spawnYaw;
rig.snap(controller.pos);

const input = new Input(renderer.domElement);
const hud = new Hud(debug);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60; // wider view in portrait
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// iOS: block pinch and double-tap page zoom
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

let last = performance.now();
let visualY = controller.pos.y;
let fps = 60;

function frame(dt: number): void {
  const look = input.consumeLook();
  rig.rotate(look.x, look.y);

  // Input is camera-relative: forward points from the camera to the player
  const m = input.move;
  const sin = Math.sin(rig.yaw);
  const cos = Math.cos(rig.yaw);
  if (input.consumeBike()) {
    controller.setRiding(!controller.riding);
    bike.root.visible = controller.riding;
    input.setRiding(controller.riding);
    rig.distance = controller.riding ? BIKE_CAMERA_DISTANCE : WALK_CAMERA_DISTANCE;
  }
  controller.update(dt, cos * m.x - sin * m.y, -sin * m.x - cos * m.y, input.consumeJump());

  if (controller.fell && !hud.fading) {
    hud.fade(() => {
      controller.respawn();
      visualY = controller.pos.y;
      rig.snap(controller.pos);
    });
  }

  // Smooth step-ups visually only
  const p = controller.pos;
  const rise = p.y - visualY;
  if (controller.onGround && rise > 0 && rise < 0.7) visualY += rise * (1 - Math.exp(-18 * dt));
  else visualY = p.y;

  const speed = Math.hypot(controller.vel.x, controller.vel.z);
  // Lean into turns on the bike: the faster and the sharper, the more
  const turnRate = dt > 0 ? (turnToward(lastFacing, controller.facing, Math.PI) - lastFacing) / dt : 0;
  lastFacing = controller.facing;
  const targetLean = controller.riding ? Math.max(-0.35, Math.min(0.35, -turnRate * speed * 0.025)) : 0;
  lean += (targetLean - lean) * (1 - Math.exp(-8 * dt));

  rider.position.set(p.x, visualY, p.z);
  rider.rotation.set(0, controller.facing, lean);
  if (controller.riding) bike.update(dt, speed);
  avatar.update(dt, speed, controller.cfg.walkSpeed, controller.onGround, controller.riding ? bike.pedal : null);

  world.update(dt);
  rig.update(dt, { x: p.x, y: visualY, z: p.z });
  environment.update(focus.set(p.x, visualY, p.z), camera.position);
  renderer.render(scene, camera);
}

renderer.setAnimationLoop((now) => {
  const rawDt = (now - last) / 1000;
  last = now;
  frame(Math.min(rawDt, MAX_DT));

  if (debug && rawDt > 0) {
    fps += (1 / rawDt - fps) * 0.05;
    const info = renderer.info.render;
    const p = controller.pos;
    hud.setDebug(
      `fps ${fps.toFixed(0)}  calls ${info.calls}  tris ${info.triangles}  q ${quality.level}\n` +
        `pos ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}  ${controller.onGround ? 'ground' : 'air'}`,
    );
  }
});

if (debug) {
  // Manual stepping for automated checks: requestAnimationFrame is paused in hidden tabs.
  const tick = (frames = 1, dt = 1 / 60) => {
    for (let i = 0; i < frames; i++) frame(dt);
  };
  Object.assign(window, { game: { controller, rig, input, tick } });
}
