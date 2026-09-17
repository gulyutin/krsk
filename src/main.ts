import './style.css';
import { Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { PALETTE } from './palette';
import { Avatar } from './player/avatar';
import { CameraRig } from './player/camera';
import { PlayerController } from './player/controller';
import { Input } from './player/input';
import { Hud } from './ui/hud';
import { addLighting } from './world/lighting';
import { buildWorld } from './world/world';

const MAX_DT = 0.05;
const debug = new URLSearchParams(location.search).has('debug');

const renderer = new WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(PALETTE.sky);
scene.fog = new Fog(PALETTE.sky, 90, 340);
addLighting(scene);

const camera = new PerspectiveCamera(60, 1, 0.1, 800);

const world = buildWorld();
scene.add(world.root);

const avatar = new Avatar();
scene.add(avatar.root);

const controller = new PlayerController(world.colliders, world.spawn);
controller.facing = world.spawnYaw + Math.PI; // back to the camera
const rig = new CameraRig(camera, world.colliders);
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

  avatar.root.position.set(p.x, visualY, p.z);
  avatar.root.rotation.y = controller.facing;
  avatar.update(dt, Math.hypot(controller.vel.x, controller.vel.z), controller.cfg.walkSpeed, controller.onGround);

  world.update(dt);
  rig.update(dt, { x: p.x, y: visualY, z: p.z });
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
      `fps ${fps.toFixed(0)}  calls ${info.calls}  tris ${info.triangles}\n` +
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
