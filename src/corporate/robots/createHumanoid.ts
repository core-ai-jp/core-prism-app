import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Section = [y: number, halfWidth: number, halfDepth: number, centerZ?: number];
type Arc = [start: number, end: number];
type Profile = { outline: T.Curve<T.Vector3>; offset: T.Curve<T.Vector3>; roundness: number };
interface PlateOptions {
  /** Angular coverage around the loft axis (0 = front/+z, PI/2 = +x). May vary along the height. */
  arc: Arc | ((v: number) => Arc);
  /** Height coverage (0..1 along the profile) per column, so plate edges can curve and point. */
  span?: (u: number) => [number, number];
  thickness?: number;
  bevel?: number;
  roundness?: number;
  /** Radial offset of the plate surface, e.g. pectoral volume or a spine channel. */
  relief?: (angle: number, v: number) => number;
  position?: number[];
  rows?: number;
  cols?: number;
}

/** CORE appearance study. Illustrative geometry, not a physical robot or mechanical specification. */
export async function createHumanoid(): Promise<T.Group> {
  const root = new T.Group();
  root.name = 'CORE_HUMANOID_CONCEPT';
  // Satin pearl ceramic armour: a soft base under a light clearcoat, like painted composite panels.
  const ceramic = new T.MeshPhysicalMaterial({ color: '#e9ebea', metalness: .02, roughness: .4, clearcoat: .55, clearcoatRoughness: .16, ior: 1.5, sheen: .22, sheenColor: new T.Color('#dfe9f3'), sheenRoughness: .5 });
  // Mechanical layer under the armour: anodised dark alloy, gunmetal hardware, satin titanium and polished rods.
  const graphite = new T.MeshPhysicalMaterial({ color: '#16181c', metalness: .55, roughness: .4, clearcoat: .35, clearcoatRoughness: .3 });
  const gunmetal = new T.MeshPhysicalMaterial({ color: '#2a2e34', metalness: .9, roughness: .3, clearcoat: .5, clearcoatRoughness: .18 });
  const satin = new T.MeshPhysicalMaterial({ color: '#b2b7bd', metalness: 1, roughness: .3, clearcoat: .3, clearcoatRoughness: .2 });
  const chrome = new T.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: .1 });
  const gap = new T.MeshStandardMaterial({ color: '#05070a', roughness: .65 });
  const elastomer = new T.MeshStandardMaterial({ color: '#0e1013', roughness: .78 });
  const backing = new T.MeshStandardMaterial({ color: '#0b0d10', roughness: .7 });
  const titanium = new T.MeshStandardMaterial({ color: '#8f959b', metalness: .95, roughness: .2 });
  const visor = new T.MeshPhysicalMaterial({ color: '#030405', metalness: .5, roughness: .05, clearcoat: 1, clearcoatRoughness: .03, ior: 1.52 });
  const headCowl = new T.MeshPhysicalMaterial({ color: '#0b0c0e', metalness: .4, roughness: .2, clearcoat: .8, clearcoatRoughness: .08 });
  // Light elements. HDR colours (>1) are picked up by the scene's bloom pass; each mesh owns its
  // material so the boot sequence can ignite parts independently. Kept restrained: accents, not neon.
  const glowColor = new T.Color('#46d6ff');
  function glowMaterial(strength: number) {
    const material = new T.MeshBasicMaterial({ color: glowColor.clone().multiplyScalar(strength), toneMapped: false, transparent: true });
    material.userData.base = material.color.clone();
    return material;
  }
  function glow(parent: T.Object3D, name: string, geometry: T.BufferGeometry, strength: number, position: number[] = [0, 0, 0]) {
    const item = mesh(parent, name, geometry, glowMaterial(strength), position);
    item.castShadow = false; item.receiveShadow = false;
    return item;
  }
  function ring(parent: T.Object3D, radius: number, position: number[], depth = 1, strength = 2.6) {
    const item = glow(parent, 'glow_ring', new T.TorusGeometry(radius, .0013, 8, 96), strength, position);
    item.rotation.x = Math.PI / 2; item.scale.set(1, depth, 1);
    return item;
  }

  function mesh(parent: T.Object3D, name: string, geometry: T.BufferGeometry, material: T.Material | T.Material[], position: number[] = [0, 0, 0]) {
    const item = new T.Mesh(geometry, material);
    item.name = name;
    item.position.set(position[0], position[1], position[2]);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  const curves = (sections: Section[]) => ({
    outline: new T.CatmullRomCurve3(sections.map(s => new T.Vector3(s[1], s[0], s[2])), false, 'centripetal'),
    offset: new T.CatmullRomCurve3(sections.map(s => new T.Vector3(0, s[0], s[3] ?? 0)), false, 'centripetal'),
  });
  // Superellipse cross-section point; `roundness` < 1 squares the section off.
  const around = (a: number, w: number, d: number, z: number, roundness: number, out: number[]) => {
    const sx = Math.sin(a), cz = Math.cos(a);
    out.push(Math.sign(sx) * Math.pow(Math.abs(sx), roundness) * Math.max(.001, w), 0, Math.sign(cz) * Math.pow(Math.abs(cz), roundness) * Math.max(.001, d) + z);
  };

  // Continuous closed lofts: the mechanical core, joints and the helmet base.
  function shell(parent: T.Object3D, name: string, sections: Section[], material: T.Material, position: number[] = [0, 0, 0], roundness = .78, rings = 48) {
    const { outline, offset } = curves(sections);
    const sides = 48, vertices: number[] = [], indices: number[] = [], tmp: number[] = [];
    for (let j = 0; j <= rings; j++) {
      const p = outline.getPoint(j / rings), o = offset.getPoint(j / rings);
      for (let i = 0; i <= sides; i++) { tmp.length = 0; around(i / sides * Math.PI * 2, p.x, p.z, o.z, roundness, tmp); vertices.push(tmp[0], p.y, tmp[2]); }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < sides; i++) {
      const a = j * (sides + 1) + i, b = a + sides + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const bottom = vertices.length / 3;
    vertices.push(0, sections[0][0], sections[0][3] ?? 0);
    const top = vertices.length / 3;
    vertices.push(0, sections.at(-1)![0], sections.at(-1)![3] ?? 0);
    for (let i = 0; i < sides; i++) {
      indices.push(bottom, i + 1, i);
      const a = rings * (sides + 1) + i;
      indices.push(top, a, a + 1);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const item = mesh(parent, name, geometry, material, position);
    // Curved concept shells use studio reflections; avoid self-shadow striping at grazing angles.
    item.receiveShadow = false;
    item.userData.profile = { outline, offset, roundness } satisfies Profile;
    return item;
  }

  /**
   * Armour panel: a partial loft with real thickness and a rounded edge. Panels sit over the dark
   * mechanical core, so every split between them is an actual shadowed gap rather than a drawn line.
   */
  function plate(parent: T.Object3D, name: string, sections: Section[], material: T.Material, o: PlateOptions) {
    const { outline, offset } = curves(sections);
    const rows = o.rows ?? 40, cols = o.cols ?? 48, th = o.thickness ?? .011, bevel = Math.min(o.bevel ?? .005, th * .9), rn = o.roundness ?? .82;
    const arcAt = typeof o.arc === 'function' ? o.arc : () => o.arc as Arc;
    const spanAt = o.span ?? (() => [0, 1] as [number, number]);
    const height = Math.abs(sections.at(-1)![0] - sections[0][0]);
    // Cosine spacing packs vertices into the edges, keeping the rounded rims crisp.
    const dense = (t: number) => .5 - .5 * Math.cos(Math.PI * t);
    const vertices: number[] = [], indices: number[] = [], tmp: number[] = [];
    const idx = (layer: number, j: number, i: number) => layer * (rows + 1) * (cols + 1) + j * (cols + 1) + i;
    for (let layer = 0; layer < 2; layer++) for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = dense(i / cols), s = dense(j / rows), [v0, v1] = spanAt(u), v = v0 + (v1 - v0) * s;
      const p = outline.getPoint(v), c = offset.getPoint(v), [a0, a1] = arcAt(v), a = a0 + (a1 - a0) * u;
      const across = Math.min(u, 1 - u) * Math.abs(a1 - a0) * (p.x + p.z) * .5, along = Math.min(s, 1 - s) * Math.abs(v1 - v0) * height;
      const e = Math.min(1, across / bevel, along / bevel), round = Math.sqrt(Math.max(0, 1 - (1 - e) * (1 - e)));
      const r = (o.relief?.(a, v) ?? 0) + (layer ? -th : -bevel * (1 - round));
      tmp.length = 0; around(a, p.x + r, p.z + r, c.z, rn, tmp);
      vertices.push(tmp[0], p.y, tmp[2]);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = idx(0, j, i), b = idx(0, j + 1, i);
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const outer = indices.length;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const c = idx(1, j, i), d = idx(1, j + 1, i);
      indices.push(c, d, c + 1, d, d + 1, c + 1);
    }
    const inner = indices.length;
    // Side walls joining the outer rim to the inner face, walked counter-clockwise in (i, j).
    const loop: Array<[number, number]> = [];
    for (let i = 0; i < cols; i++) loop.push([0, i]);
    for (let j = 0; j < rows; j++) loop.push([j, cols]);
    for (let i = cols; i > 0; i--) loop.push([rows, i]);
    for (let j = rows; j > 0; j--) loop.push([j, 0]);
    for (let k = 0; k < loop.length; k++) {
      const [pj, pi] = loop[k], [qj, qi] = loop[(k + 1) % loop.length];
      const op = idx(0, pj, pi), oq = idx(0, qj, qi), ip = idx(1, pj, pi), iq = idx(1, qj, qi);
      indices.push(op, ip, oq, oq, ip, iq);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    // Outer skin and rim take the panel finish; the underside is a dark backing, as on real armour.
    geometry.addGroup(0, outer, 0); geometry.addGroup(outer, inner - outer, 1); geometry.addGroup(inner, indices.length - inner, 0);
    const item = mesh(parent, name, geometry, [material, backing], o.position);
    item.receiveShadow = false;
    return item;
  }
  /** Mirrors an arc to the other side of the body (x -> -x). */
  const mirror = ([a0, a1]: Arc, side: number): Arc => side > 0 ? [a0, a1] : [-a1, -a0];
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

  // ---- Detailing helpers ----
  /** Closed cross-section loop of a lofted shell at height y (shell-local), pushed out by `lift`. */
  function sectionLoop(target: T.Mesh, y: number, lift: number) {
    const { outline, offset, roundness } = target.userData.profile as Profile;
    let best = 0, distance = Infinity;
    for (let k = 0; k <= 400; k++) { const d = Math.abs(outline.getPoint(k / 400).y - y); if (d < distance) { distance = d; best = k / 400; } }
    const p = outline.getPoint(best), o = offset.getPoint(best), points: T.Vector3[] = [], tmp: number[] = [];
    for (let i = 0; i < 96; i++) { tmp.length = 0; around(i / 96 * Math.PI * 2, p.x + lift, p.z + lift, o.z, roundness, tmp); points.push(new T.Vector3(tmp[0], p.y, tmp[2])); }
    return new T.CatmullRomCurve3(points, true, 'centripetal');
  }
  /** A machined band wrapping a closed shell. */
  function band(target: T.Mesh, y: number, material: T.Material = satin, radius = .002, lift = .0004) {
    const item = new T.Mesh(new T.TubeGeometry(sectionLoop(target, y, lift), 192, radius, 8, true), material);
    item.name = 'trim_band'; item.castShadow = false; target.add(item);
    return item;
  }
  /** Projects a 2D path (x,y in root space) onto a surface from the front (+z) or back (-z). */
  function onSurface(target: T.Object3D, path: Array<[number, number]>, side: 1 | -1, lift: number, samples = 64) {
    const guide = new T.CatmullRomCurve3(path.map(([x, y]) => new T.Vector3(x, y, 0)), false, 'centripetal');
    const ray = new T.Raycaster(), points: T.Vector3[] = [], normals: T.Vector3[] = [];
    for (const p of guide.getPoints(samples)) {
      ray.set(new T.Vector3(p.x, p.y, side), new T.Vector3(0, 0, -side));
      const hit = ray.intersectObject(target, false)[0];
      if (!hit?.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      points.push(hit.point.addScaledVector(n, lift)); normals.push(n);
    }
    return { points, normals };
  }
  // Hex-head fastener used around machined bearings.
  const boltGeometry = new T.CylinderGeometry(.0034, .0036, .0016, 6);
  /** Machined actuator housing: a brushed bearing, gunmetal hub, optional light ring and a ring of fasteners. */
  function housing(parent: T.Object3D, side: number, radius: number, position: number[], glowRing = false) {
    const group = new T.Group(); group.name = 'actuator_housing';
    group.position.set(position[0], position[1], position[2]); group.rotation.z = -side * Math.PI / 2; parent.add(group);
    mesh(group, 'bearing_race', new T.CylinderGeometry(radius, radius * 1.04, radius * .34, 48), gunmetal);
    mesh(group, 'bearing_ring', new T.CylinderGeometry(radius * .8, radius * .84, radius * .42, 48), satin);
    mesh(group, 'bearing_hub', new T.CylinderGeometry(radius * .56, radius * .6, radius * .5, 48), gunmetal);
    mesh(group, 'hub_cap', new T.CylinderGeometry(radius * .24, radius * .28, radius * .6, 32), chrome);
    const groove = mesh(group, 'race_groove', new T.TorusGeometry(radius * .92, radius * .03, 6, 64), gap, [0, radius * .175, 0]);
    groove.rotation.x = Math.PI / 2; groove.castShadow = false;
    if (glowRing) { const light = glow(group, 'glow_ring', new T.TorusGeometry(radius * .7, .0009, 8, 72), 2.2, [0, radius * .215, 0]); light.rotation.x = Math.PI / 2; }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      mesh(group, 'hex_fastener', boltGeometry, titanium, [Math.cos(a) * radius * .67, radius * .26, Math.sin(a) * radius * .67]).castShadow = false;
    }
    return group;
  }
  /** Linear actuator between two points: gunmetal cylinder, machined collar, polished rod and rod ends. */
  function actuator(parent: T.Object3D, from: number[], to: number[], radius: number) {
    const a = new T.Vector3(...from), b = new T.Vector3(...to), dir = b.clone().sub(a), length = dir.length();
    const group = new T.Group(); group.name = 'linear_actuator'; group.position.copy(a);
    group.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize()); parent.add(group);
    mesh(group, 'actuator_body', new T.CylinderGeometry(radius, radius, length * .56, 24), gunmetal, [0, length * .3, 0]);
    mesh(group, 'actuator_collar', new T.CylinderGeometry(radius * 1.12, radius * 1.12, length * .05, 24), satin, [0, length * .58, 0]);
    mesh(group, 'actuator_collar', new T.CylinderGeometry(radius * 1.1, radius * 1.1, length * .04, 24), satin, [0, length * .04, 0]);
    mesh(group, 'actuator_rod', new T.CylinderGeometry(radius * .46, radius * .46, length * .4, 16), chrome, [0, length * .78, 0]);
    for (const y of [0, length]) mesh(group, 'rod_end', new T.SphereGeometry(radius * .82, 16, 12), satin, [0, y, 0]);
    return group;
  }
  /** Sheathed cable or tendon routed through points. */
  function cable(parent: T.Object3D, points: number[][], radius: number, material: T.Material = elastomer) {
    const item = mesh(parent, 'cable', new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 48, radius, 8, false), material);
    item.castShadow = false;
    return item;
  }

  /** Scales a profile's width and depth (not its length). */
  const bulk = (sections: Section[], k: number, add = 0): Section[] => sections.map(([y, w, d, z]) => [y, w * k + add, d * k + add, z === undefined ? undefined : z * k]);
  function ellipsoid(parent: T.Object3D, name: string, scale: number[], position: number[], material: T.Material) {
    const item = mesh(parent, name, new T.SphereGeometry(1, 36, 24), material, position);
    item.scale.set(scale[0], scale[1], scale[2]);
    return item;
  }
  function box(parent: T.Object3D, name: string, size: number[], position: number[], material: T.Material, radius = .008) {
    return mesh(parent, name, new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material, position);
  }
  function axle(parent: T.Object3D, name: string, radius: number, length: number, position: number[], material: T.Material = titanium) {
    const item = mesh(parent, name, new T.CylinderGeometry(radius, radius, length, 32), material, position);
    item.rotation.z = Math.PI / 2;
    return item;
  }

  // ================= TORSO =================
  // Mechanical core: the dark structure every armour panel is mounted on.
  shell(root, 'thoracic_chassis', [[1.14,.088,.072,.006],[1.25,.106,.082,.008],[1.36,.146,.098,.010],[1.50,.178,.106,.010],[1.62,.180,.096,.004],[1.69,.112,.064,0]], graphite);
  // Flexible waist: a corrugated bellows between ribcage and pelvis.
  const bellows: Section[] = [];
  for (let k = 0; k <= 16; k++) { const y = 1.12 + k * .0135, w = .084 + (y - 1.12) * .19 + (k % 2 ? .0055 : 0); bellows.push([y, w, w * .86, .018]); }
  shell(root, 'abdominal_bellows', bellows, elastomer, [0, 0, 0], .8, 160);

  // Breastplate: sculpted pectoral volume, a sternum channel and a lower edge that sweeps up to the flanks.
  const chestSections: Section[] = [[1.345,.150,.104,.030],[1.40,.170,.114,.032],[1.48,.196,.120,.030],[1.56,.212,.114,.024],[1.625,.204,.098,.016],[1.672,.160,.072,.008]];
  const chest = plate(root, 'ceramic_chest', chestSections, ceramic, {
    arc: v => { const h = 1.08 + .42 * v; return [-h, h]; },
    span: u => { const x = Math.abs(2 * u - 1); return [.24 * Math.pow(x, 1.7), 1 - .07 * bump(x, 0, .3)]; },
    relief: (a, v) => .011 * bump(Math.abs(a), .52, .4) * bump(v, .46, .34) - .0055 * bump(a, 0, .07) * (1 - smooth(.7, .95, v)) + .006,
    thickness: .016, bevel: .007, roundness: .86, rows: 56, cols: 72,
  });
  // Back armour with shoulder-blade volumes and a recessed spine channel.
  plate(root, 'back_plate', [[1.30,.140,.100,-.002],[1.40,.166,.108,-.006],[1.50,.188,.112,-.008],[1.60,.200,.104,-.010],[1.665,.168,.080,-.008]], ceramic, {
    arc: [Math.PI - 1.12, Math.PI + 1.12],
    span: u => [.22 * Math.abs(2 * u - 1), .97],
    relief: (a, v) => .007 * bump(Math.abs(a - Math.PI), .55, .3) * bump(v, .62, .28) - .007 * bump(a, Math.PI, .07) + .006,
    thickness: .014, bevel: .006, roundness: .86,
  });
  // Segmented abdominal armour: three rows, split down the centre line, over the bellows.
  const abdomen: Section[] = [[1.125,.096,.084,.026],[1.18,.101,.088,.030],[1.25,.113,.094,.031],[1.31,.128,.100,.030],[1.36,.140,.104,.028]];
  for (const [v0, v1, w] of [[.02, .29, .82], [.335, .61, .94], [.655, .955, 1.04]] as const) {
    for (const side of [-1, 1]) plate(root, 'abdominal_plate', abdomen, ceramic, {
      // Chevron rows: each edge rises toward the flank, like layered abdominal armour.
      arc: mirror([.024, w], side), span: u => { const x = side > 0 ? u : 1 - u; return [v0 + .09 * x * x, v1 + .05 * x * x]; },
      relief: (a, v) => .012 + .005 * Math.sin(Math.PI * Math.min(1, Math.max(0, (v - v0) / (v1 - v0 + .05)))) * bump(Math.abs(a), .45, .45),
      thickness: .012, bevel: .0055, rows: 22, cols: 30,
    });
  }
  // Flank ribs: gunmetal slats between breastplate and back armour.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const y = 1.285 + k * .024, w = .118 + k * .012;
      plate(root, 'flank_rib', [[y - .008, w, w * .72, .01], [y + .008, w + .003, w * .74, .01]], gunmetal, { arc: mirror([Math.PI / 2 - .42, Math.PI / 2 + .3], side), thickness: .008, bevel: .003, rows: 6, cols: 20 });
    }
    // Oblique actuators bridging ribcage and pelvis behind the abdominal plates.
    actuator(root, [side * .086, 1.15, -.012], [side * .118, 1.29, -.004], .0085);
  }
  // Pelvis: dark chassis, a pointed front plate, a rear plate and side hip armour.
  const pelvisSections: Section[] = [[1.0,.064,.064,.008],[1.05,.106,.078,.008],[1.10,.114,.083,.008],[1.14,.108,.081,.008]];
  const pelvis = shell(root, 'pelvic_chassis', bulk(pelvisSections, .93), graphite);
  plate(root, 'pelvis_front_plate', pelvisSections, ceramic, {
    arc: [-.98, .98], span: u => [.42 * Math.pow(Math.abs(2 * u - 1), 1.4), .9], relief: () => .008, thickness: .011, bevel: .005,
  });
  plate(root, 'pelvis_rear_plate', pelvisSections, ceramic, { arc: [Math.PI - .92, Math.PI + .92], span: u => [.3 * Math.abs(2 * u - 1) + .1, .9], relief: () => .008, thickness: .011, bevel: .005 });
  for (const side of [-1, 1]) plate(root, 'hip_plate', bulk(pelvisSections, 1, .014), ceramic, {
    arc: mirror([Math.PI / 2 - .55, Math.PI / 2 + .48], side), span: u => [.12 + .1 * Math.abs(2 * u - 1), .86], thickness: .01, bevel: .0045,
  });
  band(pelvis, 1.122, satin, .0028, .006);
  // Segmented spine visible through the lower back.
  for (let i = 0; i < 7; i++) {
    const y = 1.135 + i * .024, w = .05 - Math.abs(i - 3) * .003;
    box(root, 'spine_vertebra', [w, .014, .022], [0, y, -.082 - Math.sin(i / 6 * Math.PI) * .005], i % 2 ? satin : gunmetal, .005);
  }
  for (let i = 0; i < 5; i++) box(root, 'rear_cooling_slot', [.11, .0028, .004], [0, 1.43 + i * .015, -.137], gap, .0012);

  root.updateMatrixWorld(true);
  // AI core: a recessed, machined light module seated in the sternum channel between the pectorals.
  {
    const { points, normals } = onSurface(chest, [[0, 1.452], [0, 1.4521]], 1, 0, 1);
    if (points[0]) {
      const core = new T.Group(); core.name = 'ai_core';
      core.position.copy(points[0]); core.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normals[0]); root.add(core);
      mesh(core, 'core_bezel', new T.CylinderGeometry(.0235, .0255, .006, 64), satin, [0, .0004, 0]);
      mesh(core, 'core_well', new T.CylinderGeometry(.019, .019, .007, 64), gunmetal, [0, .0008, 0]);
      mesh(core, 'core_lens', new T.CylinderGeometry(.0138, .0138, .0074, 64), visor, [0, .0011, 0]);
      const halo = glow(core, 'glow_ring', new T.TorusGeometry(.0158, .0008, 8, 96), 3.4, [0, .0046, 0]); halo.rotation.x = Math.PI / 2;
      const heart = glow(core, 'glow_ring', new T.CircleGeometry(.0038, 6), 2.2, [0, .0049, 0]); heart.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, tick = mesh(core, 'core_index', new T.BoxGeometry(.0008, .0012, i % 4 ? .002 : .0034), gap, [Math.sin(a) * .0214, .0034, Math.cos(a) * .0214]);
        tick.rotation.y = a; tick.castShadow = false;
      }
    }
  }

  // ================= LEGS =================
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? 'leg_left' : 'leg_right';
    leg.position.set(side*.104,1.085,side<0?.012:-.006);
    leg.rotation.z = -side*.018;
    root.add(leg);
    ellipsoid(leg, 'hip_flexure', [.055,.062,.060], [0,-.010,-.006], graphite);
    housing(leg, side, .038, [side*.064,-.014,-.004]);
    const thighSections = bulk([[-.432,.033,.033,.014],[-.388,.042,.044,.015],[-.23,.062,.062,.010],[-.105,.069,.067,0],[.018,.051,.050,-.003]], 1.13);
    shell(leg, 'thigh_chassis', bulk(thighSections, .82), graphite);
    // Hamstring actuator and cable loom along the open back of the thigh.
    actuator(leg, [0,-.05,-.052], [0,-.40,-.040], .012);
    cable(leg, [[side*.03,-.04,-.05],[side*.04,-.2,-.06],[side*.032,-.38,-.045]], .0032);
    // Thigh armour in two panels, open at the back so the actuator reads through.
    plate(leg, 'thigh_plate', thighSections, ceramic, { arc: mirror([-1.85, 1.22], side), span: () => [.5, .96], thickness: .013, bevel: .006, relief: (a, v) => .004 * bump(a, side * .55, .5) * bump(v, .7, .2) });
    plate(leg, 'thigh_plate', thighSections, ceramic, { arc: mirror([-1.6, 1.22], side), span: () => [.07, .465], thickness: .013, bevel: .006, relief: (a, v) => .005 * bump(a, -side * .35, .45) * bump(v, .3, .18) });
    // Outer thigh panel, set slightly proud with a shadow gap to the front armour.
    plate(leg, 'thigh_side_plate', thighSections, ceramic, { arc: mirror([1.3, 2.25], side), span: u => [.16 + .1 * u, .84 - .06 * u], thickness: .012, bevel: .005, relief: () => .003 });
    // Knee: exposed joint, dual bearings and a floating knee cap.
    ellipsoid(leg, 'knee_flexure', [.040,.042,.042], [0,-.457,.0], graphite);
    axle(leg, 'recessed_knee_pin', .021,.086,[0,-.457,-.006]);
    housing(leg, side, .028, [side*.039,-.457,-.006]);
    housing(leg, -side, .024, [-side*.037,-.457,-.006]);
    actuator(leg, [0,-.40,-.046], [0,-.52,-.058], .009);
    plate(leg, 'knee_cap', [[-.5,.018,.02,.036],[-.472,.034,.03,.038],[-.432,.032,.028,.038],[-.405,.016,.016,.036]], ceramic, { arc: [-1.35, 1.35], thickness: .01, bevel: .0045 });
    const shinSections = bulk([[-.947,.023,.024,.007],[-.89,.027,.032,.009],[-.72,.043,.048,.003],[-.575,.047,.050,0],[-.488,.034,.033,.008],[-.439,.025,.021,.028]], 1.1);
    shell(leg, 'calf_chassis', bulk(shinSections, .8), graphite);
    plate(leg, 'shin_side_plate', shinSections, ceramic, { arc: mirror([1.12, 1.9], side), span: () => [.3, .74], thickness: .011, bevel: .0045, relief: () => .003 });
    plate(leg, 'shin_plate', shinSections, ceramic, { arc: mirror([-1.6, 1.02], side), span: u => [.05, .9 - .12 * Math.abs(2 * u - 1)], thickness: .012, bevel: .0055, relief: (a) => .004 * bump(a, 0, .22) - .0024 * bump(Math.abs(a), .62, .04) });
    plate(leg, 'calf_plate', shinSections, ceramic, { arc: [Math.PI - 1.25, Math.PI + 1.25], span: u => [.5 + .08 * Math.abs(2 * u - 1), .82], thickness: .012, bevel: .005 });
    // Twin calf actuators drive the ankle; visible below the calf armour.
    for (const x of [-.016, .016]) actuator(leg, [x,-.56,-.05], [x*1.1,-.93,-.034], .0085);
    ellipsoid(leg, 'ankle_flexure', [.028,.031,.030], [0,-.962,.002], graphite);
    housing(leg, side, .02, [side*.027,-.962,.000]);
    housing(leg, -side, .018, [-side*.026,-.962,.000]);
    ring(leg, .029, [0,-.938,.004], 1.05, 1.5);
    // Foot: armoured instep, split toe, machined heel and a treaded sole.
    plate(leg, 'instep', [[-1.024,.044,.094,.036],[-1.003,.048,.104,.038],[-.977,.040,.076,.024],[-.949,.024,.028,0]], ceramic, { arc: [-2.3, 2.3], span: () => [.05, 1], thickness: .01, bevel: .0045, roundness: .72 });
    box(leg, 'toe_cap', [.088,.022,.05], [0,-1.018,.128], ceramic, .009);
    box(leg, 'toe_joint', [.084,.012,.012], [0,-1.022,.1], gunmetal, .004);
    box(leg, 'foot_sole', [.1,.014,.226], [0,-1.033,.038], elastomer, .006);
    box(leg, 'sole_trim', [.1015,.004,.2275], [0,-1.0255,.038], gunmetal, .0018);
    box(leg, 'heel_insert', [.064,.02,.045], [0,-1.014,-.048], titanium, .006);
    for (let i = 0; i < 6; i++) box(leg, 'sole_tread', [.09,.003,.006], [0,-1.0405,-.04 + i*.032], gap, .001);

    // ================= ARMS =================
    const arm = new T.Group();
    arm.name = side < 0 ? 'shoulder_left' : 'shoulder_right';
    arm.position.set(side*.254,1.618,0);
    arm.rotation.z = side*.050;
    root.add(arm);
    const out = side * Math.PI / 2;
    ellipsoid(arm, 'shoulder_flexure', [.058,.066,.064], [0,.008,0], graphite);
    const upperSections = bulk([[-.293,.026,.029],[-.24,.035,.039],[-.14,.046,.050],[-.045,.062,.063],[.028,.056,.055],[.066,.026,.025]], 1.14);
    shell(arm, 'upper_arm_core', bulk(upperSections, .8), graphite, [side*.012,0,.006]);
    plate(arm, 'upper_arm_plate', upperSections, ceramic, { arc: [out - 2.25, out + .25], span: () => [.08, .44], thickness: .012, bevel: .0055, position: [side*.012,0,.006] });
    plate(arm, 'upper_arm_plate', upperSections, ceramic, { arc: [out + .31, out + 2.1], span: () => [.12, .4], thickness: .012, bevel: .0055, position: [side*.012,0,.006] });
    actuator(arm, [-side*.022,-.06,.02], [-side*.018,-.27,.014], .0085);
    // Deltoid armour capping the shoulder, its lower edge pointing down the outside of the arm.
    plate(arm, 'shoulder_armour', [[-.12,.064,.066,.004],[-.05,.084,.08,.004],[.02,.086,.08,.002],[.066,.064,.06,0],[.094,.024,.024,0]], ceramic, {
      arc: [out - 2.15, out + 2.15], span: u => [.3 * (1 - bump(u, .5, .28)), 1], thickness: .014, bevel: .006, position: [side*.014,0,.004], roundness: .88,
    });
    housing(arm, side, .036, [side*.098,-.024,.004], true);
    const elbow = new T.Group();
    elbow.name = side < 0 ? 'elbow_left' : 'elbow_right';
    elbow.position.set(side*.012,-.324,0);
    elbow.rotation.x = -.08;
    arm.add(elbow);
    ellipsoid(elbow, 'elbow_flexure', [.034,.037,.036], [0,0,0], graphite);
    axle(elbow, 'elbow_pin', .018,.068,[0,0,0]);
    housing(elbow, side, .026, [side*.035,0,0]);
    housing(elbow, -side, .021, [-side*.033,0,0]);
    const foreSections = bulk([[-.275,.020,.023],[-.23,.026,.030],[-.12,.040,.045],[-.055,.037,.039],[-.028,.025,.026]], 1.12);
    shell(elbow, 'forearm_core', bulk(foreSections, .8), graphite, [0,0,.006]);
    plate(elbow, 'forearm_plate', foreSections, ceramic, { arc: [side * .7 - 2.05, side * .7 + 2.05], span: () => [.43, .93], thickness: .011, bevel: .005, position: [0,0,.006] });
    plate(elbow, 'forearm_plate', foreSections, ceramic, { arc: [side * .7 - 1.85, side * .7 + 1.85], span: () => [.1, .4], thickness: .011, bevel: .005, position: [0,0,.006] });
    // Tendons run along the open inner forearm into the wrist.
    for (let k = 0; k < 3; k++) cable(elbow, [[-side*(.018 + k*.004),-.04,-.008 - k*.008],[-side*(.026 + k*.003),-.14,-.012 - k*.008],[-side*(.012 + k*.002),-.27,-.004 - k*.005]], .0022, k % 2 ? satin : elastomer);
    // Status pips on the outer forearm, read like a watch complication.
    for (let i = 0; i < 3; i++) glow(elbow, 'glow_ring', new T.SphereGeometry(.0016, 10, 8), 3 - i * .7, [side*.0488, -.135 - i*.011, .014]);
    mesh(elbow, 'wrist_coupling', new T.CylinderGeometry(.021,.023,.032,32), gunmetal, [0,-.293,0]);
    band(shell(elbow, 'wrist_collar', [[-.305,.022,.022],[-.29,.024,.024],[-.276,.022,.022]], satin), -.29, gunmetal, .0012, .0003);
    ring(elbow, .0246, [0,-.281,0], 1, 1.5);
    const hand = new T.Group();
    hand.name = side < 0 ? 'hand_left' : 'hand_right';
    hand.position.set(0,-.322,.007);
    hand.rotation.y = side*.10;
    hand.scale.setScalar(1.04);
    elbow.add(hand);
    shell(hand, 'palm_chassis', [[-.058,.031,.015],[-.02,.035,.019],[.024,.023,.015]], graphite, [0,0,0], .76);
    plate(hand, 'metacarpal_plate', [[-.052,.03,.016,.004],[-.018,.035,.02,.004],[.02,.024,.016,.002]], ceramic, { arc: [-1.25, 1.25], thickness: .006, bevel: .0025, rows: 16, cols: 24 });
    // Articulated digits: three capsule phalanges per finger on machined joint pins, curling progressively.
    const phalanx = (parent: T.Object3D, name: string, length: number, radius: number) => {
      const item = mesh(parent, name, new T.CapsuleGeometry(radius, Math.max(.001, length - radius * 2), 6, 16), ceramic, [0,-length/2,0]);
      item.scale.z = 1.12; return item;
    };
    const knuckle = (parent: T.Object3D, radius: number, y: number, material: T.Material = gunmetal) => axle(parent, 'finger_joint', radius, radius * 2.3, [0,y,0], material);
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger-1.5)*.0178, length = [.030,.036,.034,.026][finger], r = .0066 - finger*.0002;
      const digit = new T.Group();
      digit.position.set(x,-.060,.002);
      digit.rotation.z = (finger-1.5)*.045;
      digit.rotation.x = -.14 - finger*.02;
      hand.add(digit);
      knuckle(digit, r*1.08, 0, satin);
      phalanx(digit, 'proximal_phalanx', length, r);
      const middle = new T.Group(); middle.position.y = -length; middle.rotation.x = -.26; digit.add(middle);
      knuckle(middle, r*.92, 0);
      phalanx(middle, 'middle_phalanx', length*.68, r*.94);
      const distal = new T.Group(); distal.position.y = -length*.68; distal.rotation.x = -.24; middle.add(distal);
      knuckle(distal, r*.84, 0);
      phalanx(distal, 'distal_phalanx', length*.55, r*.88);
    }
    const thumb = new T.Group();
    thumb.position.set(-side*.036,-.008,.010);
    thumb.rotation.z = -side*.5;
    thumb.rotation.x = -.28;
    hand.add(thumb);
    knuckle(thumb, .0085, 0, satin);
    phalanx(thumb, 'thumb_proximal', .034, .0085);
    const thumbTip = new T.Group(); thumbTip.position.y = -.034; thumbTip.rotation.x = -.3; thumb.add(thumbTip);
    knuckle(thumbTip, .0074, 0);
    phalanx(thumbTip, 'thumb_distal', .026, .0076);
  }

  // ================= NECK & HEAD =================
  const neck = shell(root, 'neck', [[1.65,.098,.056],[1.69,.062,.046],[1.735,.040,.036],[1.80,.044,.042]], elastomer, [0,0,-.009], .90);
  for (const y of [1.705, 1.725, 1.745, 1.765]) band(neck, y, gunmetal, .0026, .0008);
  // Neck actuators: four struts from the collar to the skull base.
  for (const [x, z] of [[-.042,.018],[.042,.018],[-.04,-.034],[.04,-.034]]) actuator(root, [x*1.25,1.672,z*1.15-.009], [x*.72,1.80,z*.8-.009], .0055);
  const collar = mesh(root, 'collar_ring', new T.TorusGeometry(.07, .006, 16, 96), satin, [0, 1.674, -.008]);
  collar.rotation.x = Math.PI / 2; collar.scale.set(1, .74, 1);
  ring(root, .046, [0,1.79,-.009], .95, 2.2);
  const head = new T.Group();
  head.name = 'sensor_head';
  head.position.set(0,1.870,.008);
  head.rotation.x = -.025;
  root.add(head);
  const headProfile:Section[]=[[-.115,.029,.037,-.012],[-.077,.058,.065,-.020],[.025,.079,.076,-.020],[.085,.073,.065,-.016],[.120,.043,.040,-.012],[.133,.003,.003,-.008]];
  shell(head, 'rear_head_cowl', headProfile, headCowl, [0,0,0], .77);
  // The glass is an open patch on the same helmet surface, not a second overlapping head.
  const headOutline=new T.CatmullRomCurve3(headProfile.map(s=>new T.Vector3(s[1],s[0],s[2])),false,'centripetal');
  const headOffset=new T.CatmullRomCurve3(headProfile.map(s=>new T.Vector3(0,s[0],s[3]??0)),false,'centripetal');
  const glassVertices:number[]=[],glassIndices:number[]=[];
  const rows=40,columns=40;
  const glassSpan=(v:number)=>.67+.49*Math.pow(Math.sin(v*Math.PI),.65);
  for(let j=0;j<=rows;j++){
    const v=j/rows,t=.13+v*.79,p=headOutline.getPoint(t),o=headOffset.getPoint(t);
    const span=glassSpan(v);
    for(let i=0;i<=columns;i++){
      const a=(i/columns*2-1)*span,s=Math.sin(a),c=Math.cos(a);
      glassVertices.push(Math.sign(s)*Math.pow(Math.abs(s),.77)*(p.x+.0016),p.y,Math.pow(c,.77)*(p.z+.0016)+o.z);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;glassIndices.push(a,a+1,b,b,a+1,b+1);}
  const glassGeometry=new T.BufferGeometry();glassGeometry.setAttribute('position',new T.Float32BufferAttribute(glassVertices,3));glassGeometry.setIndex(glassIndices);glassGeometry.computeVertexNormals();
  mesh(head,'full_face_visor',glassGeometry,visor).receiveShadow=false;
  // Helmet: a pearl shell framing the black face, closing over the crown.
  plate(head, 'helmet_shell', headProfile, ceramic, {
    arc: t => {
      const g = Math.min(1, Math.max(0, (t - .13) / .79)), s = glassSpan(g) * .74 * smooth(.1, .24, t) * (1 - smooth(.55, .67, t));
      return [s, Math.PI * 2 - s];
    },
    span: () => [.03, .985], relief: () => .0055, thickness: .006, bevel: .0035, roundness: .77, rows: 56, cols: 64,
  });
  // The face contour is traced in light along the gap between helmet and glass.
  const glassNormals=glassGeometry.getAttribute('normal');
  const lifted=(j:number,i:number,lift:number)=>{const k=j*(columns+1)+i;return new T.Vector3(glassVertices[k*3],glassVertices[k*3+1],glassVertices[k*3+2]).addScaledVector(new T.Vector3().fromBufferAttribute(glassNormals,k),lift);};
  const contour:T.Vector3[]=[];
  for(let i=0;i<=columns;i++)contour.push(lifted(0,i,.001));
  for(let j=1;j<=rows;j++)contour.push(lifted(j,columns,.001));
  for(let i=columns-1;i>=0;i--)contour.push(lifted(rows,i,.001));
  for(let j=rows-1;j>=1;j--)contour.push(lifted(j,0,.001));
  glow(head,'glow_face_outline',new T.TubeGeometry(new T.CatmullRomCurve3(contour,true,'centripetal'),360,.0006,6,true),.75);
  // Eye band: a sensor line behind the glass, with a brighter focus point that follows the viewer.
  const eyeRow=Math.round(rows*.47),eyePoints:T.Vector3[]=[];
  for(let i=9;i<=columns-9;i++)eyePoints.push(lifted(eyeRow,i,.0018));
  const eyeCurve=new T.CatmullRomCurve3(eyePoints,false,'centripetal');
  glow(head,'glow_eye_bar',new T.TubeGeometry(eyeCurve,96,.0016,8,false),3.6);
  const focus=glow(head,'glow_eye_focus',new T.SphereGeometry(.0036,16,12),9,eyeCurve.getPoint(.5).toArray());
  focus.scale.set(2.4,1,1);focus.userData.curve=eyeCurve;
  // Temple sensor modules: machined, lit apertures on each side of the helmet.
  for (const side of [-1,1]) {
    const pod = new T.Group(); pod.name = 'temple_sensor'; pod.position.set(side*.078,.006,-.034); pod.rotation.z = -side*Math.PI/2; head.add(pod);
    mesh(pod, 'temple_cap', new T.CylinderGeometry(.03,.033,.012,48), gunmetal, [0,.004,0]);
    mesh(pod, 'temple_race', new T.CylinderGeometry(.022,.023,.008,48), satin, [0,.011,0]);
    mesh(pod, 'temple_lens', new T.CylinderGeometry(.0135,.0145,.006,48), visor, [0,.0155,0]);
    const halo = glow(pod, 'glow_ring', new T.TorusGeometry(.0172,.0008,8,72), 2.4, [0,.0155,0]); halo.rotation.x = Math.PI/2;
  }
  // Occipital cooling vent.
  for (let i = 0; i < 4; i++) box(head, 'occipital_vent', [.036,.0024,.006], [0,-.03+i*.011,-.098+i*.0012], gap, .001);

  try {
    const logo = await new T.TextureLoader().loadAsync('/core-logo-mark-v3.png');
    logo.colorSpace = T.SRGBColorSpace;
    logo.anisotropy = 4;
    root.updateMatrixWorld(true);
    const chestSurface=root.getObjectByName('ceramic_chest')!;
    // Prints wrap the curved chest like a decal: every vertex is projected onto the shell,
    // so a larger mark stays crisp and never sinks into the surface at its edges.
    function chestPrint(name:string,width:number,height:number,x:number,y:number,material:T.Material){
      const geometry=new T.PlaneGeometry(width,height,24,6),pos=geometry.getAttribute('position');
      for(let i=0;i<pos.count;i++){
        const px=x+pos.getX(i),py=y+pos.getY(i);
        const hit=new T.Raycaster(new T.Vector3(px,py,1),new T.Vector3(0,0,-1)).intersectObject(chestSurface)[0];
        if(hit?.face){hit.point.addScaledVector(hit.face.normal,.0012);pos.setXYZ(i,hit.point.x,hit.point.y,hit.point.z);}
        else pos.setXYZ(i,px,py,.1); // Transparent margin past the shell edge; never fail the model over it.
      }
      geometry.computeVertexNormals();
      const item=mesh(root,name,geometry,material);item.castShadow=false;item.receiveShadow=false;item.renderOrder=2;
      return item;
    }
    const print=(map:T.Texture)=>new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
    chestPrint('official_CORE_logo',.04,.044,-.118,1.565,print(logo));
    // The CORE wordmark (cut from the brand logotype, white glyphs) tinted a quiet slate.
    const wordmark = await new T.TextureLoader().loadAsync('/corp/robots/core-wordmark-v1.png');
    wordmark.colorSpace = T.SRGBColorSpace; wordmark.anisotropy = 4;
    const lettering = print(wordmark); lettering.color.set('#5f6b76');
    chestPrint('CORE_chest_lettering',.092,.026,-.052,1.565,lettering);
  } catch (error) { disposeHumanoid(root); throw error; }
  root.userData = { status: 'CONCEPT', version: 7, description: 'Original CORE appearance concept; not a physical robot or engineering specification.' };
  return root;
}

export function disposeHumanoid(object: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  object.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) textures.add(v); }); m.dispose(); });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose());
}
