import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xceeaff, 0x071326, 2));
    const key = new THREE.DirectionalLight(0xb9e7ff, 5); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.PointLight(0x168bff, 12); rim.position.set(3, -1, 2); scene.add(rim);
    const core = new THREE.Group(); core.rotation.set(.15, -.25, -.25); scene.add(core);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xbacbdd, metalness: 1, roughness: .18 });
    const darkChrome = new THREE.MeshStandardMaterial({ color: 0x163957, metalness: .9, roughness: .25 });
    const blue = new THREE.MeshPhysicalMaterial({ color: 0x083258, metalness: .85, roughness: .38, clearcoat: .4 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1.16, 80, 56), blue); core.add(globe);
    const dots: number[] = [];
    for (let i = 0; i < 10000; i++) {
      const y = 1 - (i / 9999) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
      const modulation = Math.sin(a * 3 + y * 12) + Math.cos(a * 7 - y * 9);
      if (modulation > -.3) dots.push(Math.cos(a) * r * 1.18, y * 1.18, Math.sin(a) * r * 1.18);
    }
    const points = new THREE.BufferGeometry(); points.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
    const constellation = new THREE.Points(points, new THREE.PointsMaterial({ color: 0xbceaff, size: .022, transparent: true, opacity: .8 })); core.add(constellation);
    const ringGroups: THREE.Group[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const group = new THREE.Group(); group.rotation.set(layer * .62, layer * .44, layer * .6); core.add(group); ringGroups.push(group);
      for (let part = 0; part < 3; part++) {
        const radius = 1.42 + layer * .27;
        const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, .055 + layer * .018, 12, 100, Math.PI * .55), part === 1 ? darkChrome : chrome);
        arc.rotation.z = part * Math.PI * 2 / 3; group.add(arc);
        const light = new THREE.Mesh(new THREE.TorusGeometry(radius + .07, .009, 6, 100, Math.PI * .45), new THREE.MeshBasicMaterial({ color: 0x68c7ff }));
        light.rotation.z = arc.rotation.z; group.add(light);
      }
    }
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.3, .006, 6, 180), new THREE.MeshBasicMaterial({ color: 0x376d96, transparent: true, opacity: .55 }));
    orbit.rotation.set(1.15, .2, -.4); core.add(orbit);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, paused = reduced.matches, frame = 0, last = 0;
    const toggle = document.querySelector<HTMLButtonElement>('#motion-toggle');
    const render = () => renderer.render(scene, camera);
    const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); };
    new ResizeObserver(resize).observe(host); resize();
    host.classList.add('ready');
    function tick(now: number) {
      frame = 0;
      if (!visible || paused || document.hidden) return;
      if (now - last > 32) { core.rotation.y += .003; constellation.rotation.y += .001; ringGroups[1].rotation.z += .002; render(); last = now; }
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
