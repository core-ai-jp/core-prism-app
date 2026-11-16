import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface SorterController {
  play: (on: boolean) => boolean;
  reset: () => void;
  rotate: (direction: number) => void;
  view: (wide: boolean) => void;
  dispose: () => void;
}
interface Events { onReady: () => void; onFailure: () => void; onStop: () => void; onView: (wide: boolean) => void }

/** Original concept asset and analytic illustration rig; no physics or measured robot data. */
export function mountSorterScene(container: HTMLDivElement, events: Events): SorterController {
  const setupCleanup: Array<() => void> = [];
  let disposed = false;
  try {
    const abort = new AbortController();
    setupCleanup.push(() => abort.abort());
    let ready = false, frameId = 0, running = false, visible = true;
    let elapsed = 0, previousTime = 0, previousRender = 0, wide = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    setupCleanup.push(() => renderer.dispose(), () => renderer.domElement.remove());
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf0f3');
    const camera = new THREE.PerspectiveCamera(37, 1, .02, 30);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false;
    controls.minPolarAngle = .48; controls.maxPolarAngle = 1.48;
    controls.touches.ONE = THREE.TOUCH.PAN; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    renderer.domElement.style.touchAction = 'pan-y';
    setupCleanup.push(() => controls.dispose());
    const pmrem = new THREE.PMREMGenerator(renderer);
    setupCleanup.push(() => pmrem.dispose());
    let environment: THREE.WebGLRenderTarget | undefined;
    const room = new RoomEnvironment();
    try { environment = pmrem.fromScene(room, .04); } finally { room.dispose(); }
    setupCleanup.push(() => environment?.dispose(), () => disposeObject(scene));
    scene.environment = environment.texture;
    scene.environmentIntensity = .60;
    scene.environmentRotation.y = 1.25;
    const key = new THREE.DirectionalLight('#fff7f0', 3.0);
    key.position.set(-1.8, 3.0, -.25); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1.35, right: 1.35, top: 1.35, bottom: -1.35, near: .1, far: 7 });
    key.shadow.bias = -.0001; key.shadow.normalBias = .003;
    key.shadow.radius = 6; key.shadow.blurSamples = 12; scene.add(key);
    setupCleanup.push(() => key.shadow.dispose());
    const edge = new THREE.DirectionalLight('#dceaff', .8); edge.position.set(1.2, 2.2, -1.4); scene.add(edge);
    const backdropVertices: number[] = [];
    const profile: [number, number][] = [[5, -.146], [-1.6, -.146]];
    for (let i = 1; i <= 32; i++) { const a = i / 32 * Math.PI / 2; profile.push([-1.6 - 2 * Math.sin(a), -.146 + 2 * (1 - Math.cos(a))]); }
    profile.push([-3.6, 10]);
    const backdropIndices: number[] = [];
    profile.forEach(([z, y], i) => { backdropVertices.push(-20, y, z, 20, y, z); if (i) backdropIndices.push(2*i-2, 2*i-1, 2*i, 2*i-1, 2*i+1, 2*i); });
    const backdropGeometry = new THREE.BufferGeometry(); backdropGeometry.setAttribute('position', new THREE.Float32BufferAttribute(backdropVertices, 3)); backdropGeometry.setIndex(backdropIndices); backdropGeometry.computeVertexNormals();
    const floor = new THREE.Mesh(backdropGeometry, new THREE.MeshStandardMaterial({ color: '#e5e9ee', roughness: .72, side: THREE.DoubleSide }));
    floor.receiveShadow = true; scene.add(floor);
    const renderTarget = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, samples: 4 });
    setupCleanup.push(() => renderTarget.dispose());
    const composer = new EffectComposer(renderer, renderTarget);
    setupCleanup.push(() => { composer.passes.forEach(pass => pass.dispose()); composer.dispose(); });
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 512, 512);
    ao.blendIntensity = .45;
    ao.updateGtaoMaterial({ radius: .018, distanceExponent: 2, thickness: .012, distanceFallOff: .6, scale: 1, samples: 12, screenSpaceRadius: false });
    ao.updatePdMaterial({ radius: 4, rings: 2, samples: 12 });
    composer.addPass(ao); composer.addPass(new OutputPass());
    const draco = new DRACOLoader(); draco.setDecoderPath('/corp/robots/draco/'); draco.setWorkerLimit(1);
    setupCleanup.push(() => draco.dispose());
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let root: THREE.Group | undefined;
    let base: THREE.Object3D, shoulder: THREE.Object3D, elbow: THREE.Object3D, wrist: THREE.Object3D;
    let left: THREE.Object3D, right: THREE.Object3D, carried: THREE.Object3D;
    const startPart = new THREE.Vector3(-.445, .01, .235);
    const target = new THREE.Vector3();

    function render() { if (!disposed) composer.render(); }
    function setView() {
      controls.target.set(wide ? -.01 : .01, wide ? .25 : .32, wide ? 0 : -.015);
      camera.position.set(wide ? -1.35 : -.758, wide ? 1.23 : .72, wide ? 1.65 : .997);
      camera.fov = wide ? 43 : 37;
      if (root) { const cameraStage = root.getObjectByName('camera_stage'); if (cameraStage) cameraStage.visible = wide; }
      camera.updateProjectionMatrix(); controls.update(); render();
    }
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h || disposed) return;
      renderer.setSize(w, h, false); composer.setSize(w, h);
      camera.aspect = w / h; setView();
    }
    function pose(tip: THREE.Vector3, gap: number) {
      if (!root) return;
      const dx = tip.x, dz = tip.z + .18;
      const radius = Math.hypot(dx, dz), height = tip.y + .177 - .22;
      const l1 = .38, l2 = .395;
      const c = THREE.MathUtils.clamp((radius * radius + height * height - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1);
      const a2 = -Math.acos(c);
      const a1 = Math.atan2(height, radius) - Math.atan2(l2 * Math.sin(a2), l1 + l2 * Math.cos(a2));
      const q1 = Math.PI / 2 - a1, q2 = -a2;
      base.rotation.set(0, Math.atan2(-dz, dx), 0);
      shoulder.rotation.set(0, 0, -q1); elbow.rotation.set(0, 0, -q2);
      wrist.rotation.set(0, 0, -(Math.PI - q1 - q2));
      left.position.x = -gap / 2; right.position.x = gap / 2;
      root.updateMatrixWorld(true);
    }
    // Targets are illustrative TCP positions; timings do not represent device performance.
    const keys = [
      [0, .32, .18, .16, .068], [2.2, -.445, .24, .235, .068],
      [3.8, -.445, .026, .235, .068], [4.5, -.445, .026, .235, .054],
      [6.2, -.445, .24, .235, .054], [9.0, .405, .24, .19, .054],
      [10.5, .405, .026, .19, .054], [11.2, .405, .026, .19, .068],
      [12.7, .405, .24, .19, .068], [15.5, .32, .18, .16, .068],
    ];
    function animatePose(t: number) {
      let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
      const a = keys[i], b = keys[i + 1];
      let u = THREE.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1); u = u * u * (3 - 2 * u);
      target.set(THREE.MathUtils.lerp(a[1], b[1], u), THREE.MathUtils.lerp(a[2], b[2], u), THREE.MathUtils.lerp(a[3], b[3], u));
      pose(target, THREE.MathUtils.lerp(a[4], b[4], u));
      if (t < 4.2) carried.position.copy(startPart);
      else if (t <= 10.9) carried.position.set(target.x, target.y - .016, target.z);
      else carried.position.set(.405, .01, .19);
    }
    function stop() { running = false; cancelAnimationFrame(frameId); events.onStop(); }
    function frame(time: number) {
      if (!running || !visible || disposed) return;
      if (!previousTime) previousTime = time;
      elapsed += Math.min((time - previousTime) / 1000, .08); previousTime = time;
      if (time - previousRender >= 1000 / 30) { animatePose(elapsed); render(); previousRender = time; }
      if (elapsed >= 15.5) { stop(); return; }
      frameId = requestAnimationFrame(frame);
    }
    const onVisibility = () => { if (document.hidden) stop(); };
    const onReduced = () => { if (reduced.matches) stop(); };
    const onContextLost = (e: Event) => { e.preventDefault(); stop(); events.onFailure(); };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) stop(); }, { threshold: .04 });
    setupCleanup.push(() => intersection.disconnect());
    intersection.observe(container);
    const resizeObserver = new ResizeObserver(resize); setupCleanup.push(() => resizeObserver.disconnect()); resizeObserver.observe(container);
    controls.addEventListener('change', render);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    document.addEventListener('visibilitychange', onVisibility); reduced.addEventListener('change', onReduced);
    setupCleanup.push(() => { renderer.domElement.removeEventListener('webglcontextlost', onContextLost); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onReduced); });

    async function initialise() {
      try {
        const modelRequest = fetch('/corp/robots/sorter-01-v2.glb', { signal: abort.signal }).then(async response => {
          if (!response.ok) throw new Error('Concept asset unavailable');
          return loader.parseAsync(await response.arrayBuffer(), '/corp/robots/');
        });
        const environmentRequest = fetch('/corp/robots/studio-small-09-1k.hdr', { signal: abort.signal }).then(async response => {
          if (!response.ok) return null;
          return new HDRLoader().parse(await response.arrayBuffer());
        }).catch(() => null);
        const [asset, hdr] = await Promise.all([modelRequest, environmentRequest]);
        if (disposed) { disposeObject(asset.scene); return; }
        root = asset.scene; scene.add(root);
        for (const name of ['joint_base', 'joint_shoulder', 'joint_elbow', 'joint_wrist_pitch', 'finger_left', 'finger_right', 'workpiece_carried']) {
          if (!root.getObjectByName(name)) throw new Error('Incomplete illustration rig');
        }
        base = root.getObjectByName('joint_base')!; shoulder = root.getObjectByName('joint_shoulder')!;
        elbow = root.getObjectByName('joint_elbow')!; wrist = root.getObjectByName('joint_wrist_pitch')!;
        left = root.getObjectByName('finger_left')!; right = root.getObjectByName('finger_right')!; carried = root.getObjectByName('workpiece_carried')!;
        root.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        if (hdr) {
          const texture = new THREE.DataTexture(hdr.data, hdr.width, hdr.height, THREE.RGBAFormat, hdr.type);
          texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.LinearSRGBColorSpace; texture.needsUpdate = true;
          const studio = pmrem.fromEquirectangular(texture); texture.dispose(); environment?.dispose(); environment = studio;
          scene.environment = studio.texture;
        }
        pose(new THREE.Vector3(.32, .18, .16), .068); resize(); ready = true;
        container.dataset.environment = hdr ? 'studio' : 'fallback'; events.onReady();
      } catch (error) {
        if (!disposed) { container.dataset.environment = ready ? 'fallback' : 'failed'; container.dataset.assetError = String(error); }
        if (!disposed && !ready) events.onFailure();
      }
    }
    void initialise();
    function disposeObject(object: THREE.Object3D) {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      object.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => { for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose(); m.dispose(); });
    }
    return {
      play(on) { if (!on || !ready || !visible || document.hidden) { stop(); return false; } if (running) return true; if (!wide) { wide = true; setView(); events.onView(true); } if (elapsed >= 15.5) elapsed = 0; running = true; previousTime = 0; previousRender = 0; frameId = requestAnimationFrame(frame); return true; },
      reset() { stop(); elapsed = 0; if (ready) animatePose(0); wide = false; setView(); },
      rotate(direction) { stop(); const delta = camera.position.clone().sub(controls.target); delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .25); camera.position.copy(delta.add(controls.target)); controls.update(); render(); },
      view(next) { stop(); wide = next; setView(); },
      dispose() {
        if (disposed) return;
        disposed = true; running = false; abort.abort(); cancelAnimationFrame(frameId); intersection.disconnect(); resizeObserver.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onReduced);
        controls.dispose(); draco.dispose(); environment?.dispose(); pmrem.dispose(); composer.passes.forEach(pass => pass.dispose()); composer.dispose(); key.shadow.dispose(); disposeObject(scene); renderer.dispose(); renderer.domElement.remove();
      },
    };
  } catch (error) {
    disposed = true;
    for (const cleanup of setupCleanup.reverse()) { try { cleanup(); } catch { /* Preserve the original setup error. */ } }
    throw error;
  }
}
