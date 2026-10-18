import * as THREE from 'three';
import { IntelligenceRig, studio } from './intelligence-rig';

const host = document.querySelector<HTMLElement>('#core-scene');
if (host) {
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, .3, 9.6);
    const environment = studio(renderer);
    scene.environment = environment.texture;
    renderer.toneMappingExposure = 1.1;
    renderer.transmissionResolutionScale = .5;
    scene.add(new THREE.HemisphereLight('#c9e4ff', '#182028', .85));
    const key = new THREE.DirectionalLight('#daf0ff', 2); key.position.set(-9, 15, 9); scene.add(key);
    const rim = new THREE.DirectionalLight('#658aaa', 1.4); rim.position.set(10, 3, -12); scene.add(rim);
    const core = new IntelligenceRig();
    core.rotation.set(-.2, .2, 0);
    core.scale.setScalar(.82);
    scene.add(core);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, paused = reduced.matches, frame = 0, last = 0;
    const toggle = document.querySelector<HTMLButtonElement>('#motion-toggle');
    const render = () => renderer.render(scene, camera);
    const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); };
    new ResizeObserver(resize).observe(host); resize();
    host.classList.add('ready');
    if (toggle) toggle.hidden = false;
    function tick(now: number) {
      frame = 0;
      if (!visible || paused || document.hidden) return;
      if (now - last > 32) { core.update(now / 1000); render(); last = now; }
      frame = requestAnimationFrame(tick);
    }
    function sync() { cancelAnimationFrame(frame); if (visible && !paused && !document.hidden) frame = requestAnimationFrame(tick); }
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(host);
    document.addEventListener('visibilitychange', sync);
    function label() { if (toggle) { toggle.textContent = paused ? '動きを再生' : '動きを止める'; toggle.setAttribute('aria-pressed', String(paused)); } }
    toggle?.addEventListener('click', () => { paused = !paused; label(); sync(); });
    reduced.addEventListener('change', () => { paused = reduced.matches; label(); sync(); });
    label(); sync();
  } catch { host.classList.add('fallback'); document.querySelector('#motion-toggle')?.remove(); }
}
