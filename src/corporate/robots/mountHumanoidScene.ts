import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createHumanoid, disposeHumanoid } from './createHumanoid';

export type HumanoidFocus = 'full' | 'face' | 'core' | 'hand';
export type HumanoidPhase = 'boot' | 'online';
export interface HumanoidController {
  focus: (part: HumanoidFocus) => void;
  greet: () => boolean;
  replay: () => void;
  setAnchors: (anchors: Partial<Record<Exclude<HumanoidFocus, 'full'>, HTMLElement | null>>) => void;
  dispose: () => void;
}
interface Events { onReady: () => void; onFailure: () => void; onPhase: (phase: HumanoidPhase) => void; onFocus: (part: HumanoidFocus) => void }

const BOOT = 3.6, GREET = 3.8;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const window01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  draw(ctx, size);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}

export function mountHumanoidScene(container: HTMLDivElement, events: Events): HumanoidController {
  const cleanup: Array<() => void> = [];
  let disposed = false;
  const release = () => { for (const fn of cleanup.splice(0).reverse()) { try { fn(); } catch { /* Complete remaining cleanup. */ } } };
  try {
  const mobile = () => container.clientWidth < 560;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  cleanup.push(() => renderer.dispose(), () => renderer.domElement.remove());
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75)); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true'); container.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#040608'); scene.fog = new T.Fog('#040608', 4.5, 11);
  cleanup.push(() => disposeHumanoid(scene));
  const camera = new T.PerspectiveCamera(34, 1, .02, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08; controls.rotateSpeed = .7;
  controls.minPolarAngle = .75; controls.maxPolarAngle = 1.7; controls.touches.ONE = T.TOUCH.ROTATE; controls.touches.TWO = T.TOUCH.DOLLY_ROTATE;
  renderer.domElement.style.touchAction = 'pan-y';
  cleanup.push(() => controls.dispose());

  // Studio softboxes give the white shells long, readable reflections.
  const pmrem = new T.PMREMGenerator(renderer); cleanup.push(() => pmrem.dispose());
  const studio = new T.Scene(); studio.background = new T.Color('#101318');
  const softbox = (w: number, h: number, p: number[], i: number, color = '#ffffff') => {
    const card = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(i), side: T.DoubleSide }));
    card.position.set(p[0], p[1], p[2]); card.lookAt(0, 1, 0); studio.add(card);
  };
  softbox(1.1, 5, [-2.5, 2.7, 3], 4.2); softbox(.5, 4, [2.3, 2.2, 1.8], 3); softbox(3, 2, [0, 5, -1], 3.2); softbox(.65, 4, [1.4, 2, -3], 6, '#7fdcff'); softbox(.65, 4, [-1.6, 2, -2.6], 5, '#7fdcff');
  let env: T.WebGLRenderTarget;
  try { env = pmrem.fromScene(studio, .025); } finally { disposeHumanoid(studio); }
  cleanup.push(() => env.dispose()); scene.environment = env.texture;

  const key = new T.DirectionalLight('#fffaf5', 3.2); key.position.set(-3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  cleanup.push(() => key.shadow.dispose());
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.3, bottom: -.5, near: .1, far: 10 }); key.shadow.normalBias = .012; key.shadow.bias = -.0002; key.shadow.radius = 6; scene.add(key);
  const fill = new T.DirectionalLight('#dfe8f2', .7); fill.position.set(3, 3, 2); scene.add(fill);
  // Cyan rim lights trace the silhouette from behind, so the body separates from the dark stage.
  const rimL = new T.DirectionalLight('#59d2ff', 4.2); rimL.position.set(-2.6, 2.6, -3.2); scene.add(rimL);
  const rimR = new T.DirectionalLight('#8fe3ff', 3.2); rimR.position.set(2.8, 2.2, -2.6); scene.add(rimR);
  const lights: Array<[T.Light, number]> = [[key, 3.2], [fill, .7], [rimL, 4.2], [rimR, 3.2]];

  // Stage: a matte floor that ignores the cyan environment light, a projected ring platform and faint drifting particles.
  const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshLambertMaterial({ color: '#0c0f13' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .040; floor.receiveShadow = true; scene.add(floor);
  const stageTexture = canvasTexture(1024, (c, s) => {
    const m = s / 2;
    const g = c.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, 'rgba(70,214,255,.30)'); g.addColorStop(.35, 'rgba(70,214,255,.08)'); g.addColorStop(1, 'rgba(70,214,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(120,225,255,.9)';
    for (const [r, w, a] of [[.17, 3, .95], [.205, 1.5, .55], [.32, 1, .35], [.46, 1, .2]] as const) { c.globalAlpha = a; c.lineWidth = w; c.beginPath(); c.arc(m, m, s * r, 0, Math.PI * 2); c.stroke(); }
    c.globalAlpha = .5; c.lineWidth = 2;
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r0 = s * .215, r1 = s * (i % 4 ? .228 : .25); c.beginPath(); c.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); c.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); c.stroke(); }
    c.globalAlpha = .12; c.lineWidth = 1;
    for (let i = 1; i < 16; i++) { const p = i / 16 * s; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, s); c.moveTo(0, p); c.lineTo(s, p); c.stroke(); }
    c.globalCompositeOperation = 'destination-in'; const fade = c.createRadialGradient(m, m, s * .1, m, m, m); fade.addColorStop(0, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = fade; c.globalAlpha = 1; c.fillRect(0, 0, s, s);
  });
  const stageMat = new T.MeshBasicMaterial({ map: stageTexture, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, opacity: 0 });
  const stage = new T.Mesh(new T.PlaneGeometry(3.2, 3.2), stageMat); stage.rotation.x = -Math.PI / 2; stage.position.y = .042; scene.add(stage);
  const sprite = canvasTexture(64, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(130,225,255,.6)'); g.addColorStop(1, 'rgba(70,214,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const dustCount = 140, dust = new Float32Array(dustCount * 3), dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) { const a = Math.random() * Math.PI * 2, r = .35 + Math.random() * 1.5; dust[i * 3] = Math.cos(a) * r; dust[i * 3 + 1] = Math.random() * 2.6; dust[i * 3 + 2] = Math.sin(a) * r - .2; dustSeed[i] = Math.random(); }
  const dustGeometry = new T.BufferGeometry(); dustGeometry.setAttribute('position', new T.BufferAttribute(dust, 3));
  const dustMat = new T.PointsMaterial({ map: sprite, size: .028, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, color: '#9fe8ff' });
  const dustPoints = new T.Points(dustGeometry, dustMat); scene.add(dustPoints);
  // Boot scan: a ring of light with a soft curtain rises through the body.
  const curtainTexture = canvasTexture(64, (c, s) => { const g = c.createLinearGradient(0, s, 0, 0); g.addColorStop(0, 'rgba(70,214,255,0)'); g.addColorStop(.85, 'rgba(70,214,255,.55)'); g.addColorStop(1, 'rgba(200,245,255,1)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const scan = new T.Group(); scan.visible = false; scene.add(scan);
  const scanRingMat = new T.MeshBasicMaterial({ color: new T.Color('#46d6ff').multiplyScalar(7), toneMapped: false, transparent: true });
  const scanRing = new T.Mesh(new T.TorusGeometry(.36, .0022, 8, 160), scanRingMat); scanRing.rotation.x = Math.PI / 2; scan.add(scanRing);
  const curtainMat = new T.MeshBasicMaterial({ map: curtainTexture, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
  const curtain = new T.Mesh(new T.CylinderGeometry(.36, .36, .22, 96, 1, true), curtainMat); curtain.position.y = -.11; scan.add(curtain);

  // Bloom is what turns the HDR glow materials into light; resolution is kept modest for phones.
  // Selective bloom: only the light elements are rendered into the bloom buffer (everything else
  // drawn black, so it still occludes), and that glow is added over the normal render. The white
  // shell and the chest branding therefore stay crisp instead of being lifted by a haze.
  const bloomComposer = new EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType }));
  bloomComposer.renderToScreen = false; cleanup.push(() => bloomComposer.dispose());
  bloomComposer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(256, 256), .9, .3, .2); bloomComposer.addPass(bloom); cleanup.push(() => bloom.dispose());
  const composer = new EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4 }));
  cleanup.push(() => composer.dispose());
  composer.addPass(new RenderPass(scene, camera));
  const mix = new ShaderPass(new T.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(baseTexture, vUv) + vec4(texture2D(bloomTexture, vUv).rgb, 0.0); }',
  }), 'baseTexture');
  composer.addPass(mix); cleanup.push(() => { mix.material.dispose(); mix.dispose(); });
  const output = new OutputPass(); composer.addPass(output); cleanup.push(() => output.dispose());
  const black = new T.MeshBasicMaterial({ color: '#000000' }); cleanup.push(() => black.dispose());
  const swapped = new Map<T.Mesh, T.Material | T.Material[]>();
  const glows = new Set<T.Object3D>([scanRing, curtain]);
  function renderBloom() {
    scene.traverse(o => { if (o instanceof T.Mesh && !glows.has(o)) { swapped.set(o, o.material); o.material = black; } });
    const background = scene.background, dustVisible = dustPoints.visible, stageVisible = stage.visible;
    scene.background = null; dustPoints.visible = false; stage.visible = false; renderer.shadowMap.autoUpdate = false;
    bloomComposer.render();
    renderer.shadowMap.autoUpdate = true; scene.background = background; dustPoints.visible = dustVisible; stage.visible = stageVisible;
    for (const [o, m] of swapped) o.material = m; swapped.clear();
  }

  let root: T.Group | undefined, head: T.Object3D | undefined, armR: T.Object3D | undefined, elbowR: T.Object3D | undefined, armL: T.Object3D | undefined, handR: T.Object3D | undefined;
  let faceLine: T.Mesh | undefined, eyeBar: T.Mesh | undefined, eyeFocus: T.Mesh | undefined;
  const seams: T.Mesh[] = [], rings: Array<{ mesh: T.Mesh; y: number }> = [];
  let ready = false, visible = true, frame = 0, last = 0, clock = 0, bootT = 0, greetT = -1, onlineSent = false;
  let focus: HumanoidFocus = 'full';
  const tween = { from: new T.Vector3(), to: new T.Vector3(), fromTarget: new T.Vector3(), toTarget: new T.Vector3(), t: 1 };
  const gaze = { x: 0, y: 0, tx: 0, ty: 0, pointer: false, px: 0, py: 0 };
  let anchors: Partial<Record<Exclude<HumanoidFocus, 'full'>, HTMLElement | null>> = {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  cleanup.push(() => { cancelAnimationFrame(frame); });

  function shot(part: HumanoidFocus) {
    // On phones the part card sits at the bottom, so the subject is framed higher.
    const small = mobile(), lift = small ? 1 : 0;
    switch (part) {
      case 'face': return { target: new T.Vector3(0, 1.865 - .075 * lift, .02), pos: new T.Vector3(.30, 1.92 - .05 * lift, small ? 1.0 : .82) };
      case 'core': return { target: new T.Vector3(0, 1.47 - .13 * lift, .03), pos: new T.Vector3(.48, 1.58 - .08 * lift, small ? 1.75 : 1.38) };
      case 'hand': return { target: new T.Vector3(.25, 1.0 - .1 * lift, .02), pos: new T.Vector3(.85, 1.2 - .06 * lift, small ? 1.25 : .98) };
      default: return { target: new T.Vector3(0, 1.0, 0), pos: new T.Vector3(1.05, 1.42, small ? 4.0 : 3.55) };
    }
  }
  function moveTo(part: HumanoidFocus, instant: boolean) {
    const s = shot(part);
    tween.from.copy(camera.position); tween.fromTarget.copy(controls.target); tween.to.copy(s.pos); tween.toTarget.copy(s.target);
    tween.t = instant ? 1 : 0;
    if (instant) { camera.position.copy(s.pos); controls.target.copy(s.target); controls.update(); }
  }
  function setGlow(item: T.Mesh | undefined, level: number) {
    if (!item) return; const m = item.material as T.MeshBasicMaterial; m.color.copy(m.userData.base as T.Color).multiplyScalar(Math.max(level, 0)); item.visible = level > .002;
  }

  // Everything time-based is derived from bootT/clock/greetT, so a reduced-motion user simply gets the end state.
  function apply(dt: number) {
    if (!root) return;
    const motion = !reduced.matches;
    const b = motion ? bootT : BOOT;
    const lit = ease(window01(b, .1, 1.7));
    for (const [light, max] of lights) light.intensity = max * (.08 + .92 * lit);
    scene.environmentIntensity = .6 * (.15 + .85 * lit);
    stageMat.opacity = ease(window01(b, .2, 1.4)) * (.85 + (motion ? .15 * Math.sin(clock * 1.3) : .15));
    dustMat.opacity = .55 * ease(window01(b, 1.0, 2.6));
    // Scan rises from the floor to the crown, igniting rings as it passes.
    const scanY = -.05 + 2.15 * ease(window01(b, .35, 2.1));
    scan.visible = motion && b > .35 && b < 2.3; scan.position.y = scanY;
    const fade = 1 - window01(b, 2.0, 2.3); scanRingMat.opacity = fade; curtainMat.opacity = fade;
    const pulse = motion ? .82 + .18 * Math.sin(clock * 2.2) : 1;
    for (const r of rings) setGlow(r.mesh, (b >= BOOT ? 1 : clamp((scanY - r.y) * 9, 0, 1) * (1 + 1.6 * clamp(1 - (scanY - r.y) * 3, 0, 1))) * (b >= BOOT ? pulse : 1));
    for (const s of seams) setGlow(s, ease(window01(b, 1.5, 2.0)) * pulse);
    // Face contour draws itself, then flares and settles.
    if (faceLine) {
      const draw = ease(window01(b, 1.85, 2.75)), index = faceLine.geometry.index!.count;
      faceLine.geometry.setDrawRange(0, Math.ceil(index * draw / 6) * 6);
      setGlow(faceLine, draw * (1 + 1.2 * Math.exp(-Math.max(0, b - 2.75) * 4)) * (b >= BOOT ? .9 + .1 * Math.sin(clock * 1.6) : 1));
    }
    const eye = ease(window01(b, 2.6, 3.15));
    if (eyeBar) { eyeBar.scale.x = .02 + .98 * eye; setGlow(eyeBar, eye * (1 + 1.4 * Math.exp(-Math.max(0, b - 3.1) * 5)) * pulse); }
    // Gaze: the head turns toward the camera (the viewer) and leans toward the pointer.
    if (head) {
      const hw = head.getWorldPosition(new T.Vector3()), to = camera.position.clone().sub(hw);
      const baseYaw = Math.atan2(to.x, to.z), basePitch = Math.atan2(to.y, Math.hypot(to.x, to.z));
      const live = motion && b > 2.4;
      gaze.tx = live ? clamp(baseYaw + (gaze.pointer ? gaze.px * .9 : 0), -.75, .75) : 0;
      gaze.ty = live ? clamp(basePitch + (gaze.pointer ? -gaze.py * .45 : 0), -.35, .3) : 0;
      if (!motion) { gaze.tx = clamp(baseYaw, -.75, .75); gaze.ty = clamp(basePitch, -.35, .3); }
      const k = motion ? 1 - Math.exp(-dt * 5) : 1;
      gaze.x += (gaze.tx - gaze.x) * k; gaze.y += (gaze.ty - gaze.y) * k;
      head.rotation.y = gaze.x; head.rotation.x = -.025 - gaze.y;
      // A short "look up" as the system comes online.
      head.rotation.x += motion ? .22 * (1 - ease(window01(b, 1.9, 2.8))) : 0;
    }
    if (eyeFocus) {
      const curve = eyeFocus.userData.curve as T.Curve<T.Vector3>;
      const u = clamp(.5 + (gaze.tx - gaze.x) * 1.4 + (motion ? .04 * Math.sin(clock * .9) : 0), .12, .88);
      eyeFocus.position.copy(curve.getPoint(u));
      setGlow(eyeFocus, eye * (motion ? .85 + .15 * Math.sin(clock * 3.1) : 1));
    }
    // Idle breathing and the greeting gesture.
    const breathe = motion ? Math.sin(clock * 1.25) : 0;
    root.position.y = breathe * .0025;
    if (armL) armL.rotation.x = breathe * .02;
    if (armR && elbowR) {
      let raise = 0, wave = 0;
      if (greetT >= 0) {
        raise = ease(window01(greetT, 0, .8)) * (1 - ease(window01(greetT, GREET - .9, GREET)));
        wave = Math.sin(window01(greetT, .8, GREET - .9) * Math.PI * 6) * raise;
      }
      armR.rotation.x = breathe * .02 - raise * .18;
      armR.rotation.z = .05 + raise * 1.2;
      elbowR.rotation.z = raise * 1.75 + wave * .32;
      elbowR.rotation.x = -.08 - raise * .1;
    }
  }

  const tmp = new T.Vector3(), normal = new T.Vector3();
  function placeAnchors() {
    if (!root) return;
    const w = container.clientWidth, h = container.clientHeight, b = reduced.matches ? BOOT : bootT;
    const entries: Array<[Exclude<HumanoidFocus, 'full'>, () => [T.Vector3, T.Vector3 | null]]> = [
      ['face', () => [head!.localToWorld(new T.Vector3(.05, .045, .075)), new T.Vector3(0, 0, 1).applyQuaternion(head!.getWorldQuaternion(new T.Quaternion()))]],
      ['core', () => [new T.Vector3(.085, 1.415, .165), new T.Vector3(0, 0, 1)]],
      ['hand', () => [handR!.localToWorld(new T.Vector3(0, -.05, .02)), null]],
    ];
    for (const [id, get] of entries) {
      const el = anchors[id]; if (!el) continue;
      const [p, n] = get();
      let show = b > 3.2 && focus === 'full' && greetT < 0 && tween.t >= 1;
      if (n) show &&= normal.copy(camera.position).sub(p).normalize().dot(n) > .15;
      tmp.copy(p).project(camera);
      show &&= tmp.z < 1 && Math.abs(tmp.x) < .95 && Math.abs(tmp.y) < .92;
      el.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px,${((1 - tmp.y) / 2 * h).toFixed(1)}px)`;
      el.dataset.show = show ? 'true' : 'false';
    }
  }
  function render() { if (disposed) return; placeAnchors(); tuneBloom(); renderBloom(); composer.render(); }
  function step(dt: number) {
    clock += dt;
    if (bootT < BOOT) { bootT = Math.min(BOOT, bootT + dt); }
    if (!onlineSent && bootT >= BOOT) { onlineSent = true; events.onPhase('online'); }
    if (greetT >= 0) { greetT += dt; if (greetT > GREET) greetT = -1; }
    if (tween.t < 1) {
      tween.t = Math.min(1, tween.t + dt / 1.15); const e = ease(tween.t);
      camera.position.lerpVectors(tween.from, tween.to, e); controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
    }
    controls.update(); apply(dt);
  }
  // Glow fills more of the frame in close-ups, so bloom eases off with camera distance.
  function tuneBloom() { const d = camera.position.distanceTo(controls.target); bloom.strength = .22 + .48 * clamp((d - .8) / 2.6, 0, 1); bloom.radius = .12 + .2 * clamp((d - .8) / 2.6, 0, 1); }
  function tick(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden || reduced.matches) { last = 0; return; }
    const dt = last ? Math.min((time - last) / 1000, .1) : 1 / 60; last = time;
    step(dt); render();
    frame = requestAnimationFrame(tick);
  }
  function start() { if (!frame && ready && visible && !document.hidden && !reduced.matches) { last = 0; frame = requestAnimationFrame(tick); } }
  function still() { if (reduced.matches) { controls.update(); apply(0); render(); } }

  function resize() {
    if (disposed) return; const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloomComposer.setPixelRatio(renderer.getPixelRatio()); bloomComposer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix(); if (tween.t >= 1) moveTo(focus, true); still();
  }
  function onPointer(e: PointerEvent) {
    if (!head) return; const rect = container.getBoundingClientRect();
    const hp = head.getWorldPosition(new T.Vector3()).project(camera);
    gaze.px = clamp(((e.clientX - rect.left) / rect.width * 2 - 1) - hp.x, -1, 1);
    gaze.py = clamp((-(e.clientY - rect.top) / rect.height * 2 + 1) - hp.y, -1, 1);
    gaze.pointer = true;
  }
  const onLeave = () => { gaze.pointer = false; };
  const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); };
  const onReduced = () => { if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; greetT = -1; moveTo(focus, true); still(); } else start(); };
  const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(frame); frame = 0; events.onFailure(); };
  const onControls = () => { if (reduced.matches) render(); };
  const observer = new ResizeObserver(resize); cleanup.push(() => observer.disconnect()); observer.observe(container);
  const intersection = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: .02 });
  cleanup.push(() => intersection.disconnect()); intersection.observe(container);
  controls.addEventListener('change', onControls);
  container.addEventListener('pointermove', onPointer); container.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility); reduced.addEventListener('change', onReduced); renderer.domElement.addEventListener('webglcontextlost', onLost);
  cleanup.push(() => {
    controls.removeEventListener('change', onControls);
    container.removeEventListener('pointermove', onPointer); container.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onReduced); renderer.domElement.removeEventListener('webglcontextlost', onLost);
  });
  moveTo('full', true);

  void createHumanoid().then(model => {
    if (disposed) { disposeHumanoid(model); return; }
    root = model; scene.add(model); model.updateMatrixWorld(true);
    head = model.getObjectByName('sensor_head'); armR = model.getObjectByName('shoulder_right'); elbowR = model.getObjectByName('elbow_right');
    armL = model.getObjectByName('shoulder_left'); handR = model.getObjectByName('hand_right');
    model.traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      if (o.name.startsWith('glow_')) glows.add(o);
      if (o.name === 'glow_face_outline') faceLine = o; else if (o.name === 'glow_eye_bar') eyeBar = o; else if (o.name === 'glow_eye_focus') eyeFocus = o;
      else if (o.name === 'glow_seam') seams.push(o); else if (o.name === 'glow_ring') rings.push({ mesh: o, y: o.getWorldPosition(new T.Vector3()).y });
    });
    ready = true; container.dataset.model = 'core-humanoid';
    bootT = 0; resize(); apply(0);
    events.onPhase(reduced.matches ? 'online' : 'boot'); onlineSent = reduced.matches;
    events.onReady(); render(); start();
  }).catch(() => { if (!disposed) events.onFailure(); });

  return {
    focus(part) { focus = part; greetT = -1; moveTo(part, reduced.matches); events.onFocus(part); still(); start(); },
    greet() {
      if (!ready || reduced.matches) return false;
      if (focus === 'face' || focus === 'hand') { focus = 'full'; moveTo('full', false); events.onFocus('full'); }
      greetT = 0; start(); return true;
    },
    replay() {
      if (!ready) return;
      greetT = -1; focus = 'full'; moveTo('full', reduced.matches); events.onFocus('full');
      if (reduced.matches) { still(); return; }
      bootT = 0; onlineSent = false; events.onPhase('boot'); start();
    },
    setAnchors(next) { anchors = next; if (ready) placeAnchors(); },
    dispose() { if (disposed) return; disposed = true; release(); },
  };
  } catch (error) { disposed = true; release(); throw error; }
}
