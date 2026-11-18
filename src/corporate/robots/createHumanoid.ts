import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Section = [y: number, halfWidth: number, halfDepth: number, centerZ?: number];

/** CORE appearance study. Illustrative geometry, not a physical robot or mechanical specification. */
export async function createHumanoid(): Promise<T.Group> {
  const root = new T.Group();
  root.name = 'CORE_HUMANOID_CONCEPT';
  // Lacquered pearl ceramic: a satin base under a mirror clearcoat, with a faint cool sheen at grazing angles.
  const ceramic = new T.MeshPhysicalMaterial({ color: '#eceeed', metalness: .06, roughness: .3, clearcoat: 1, clearcoatRoughness: .04, ior: 1.5, sheen: .35, sheenColor: new T.Color('#dce8f5'), sheenRoughness: .45 });
  // Machined accents: brushed satin titanium for bearings and collars, gunmetal for caps and joints.
  const satin = new T.MeshPhysicalMaterial({ color: '#b4b9bf', metalness: 1, roughness: .3, clearcoat: .35, clearcoatRoughness: .2 });
  const gunmetal = new T.MeshPhysicalMaterial({ color: '#2b2f35', metalness: .9, roughness: .28, clearcoat: .6, clearcoatRoughness: .14 });
  const gap = new T.MeshStandardMaterial({ color: '#05070a', roughness: .65 });
  const graphite = new T.MeshPhysicalMaterial({ color: '#111215', metalness: .68, roughness: .22, clearcoat: .8, clearcoatRoughness: .12 });
  const elastomer = new T.MeshStandardMaterial({ color: '#101315', roughness: .72 });
  const titanium = new T.MeshStandardMaterial({ color: '#91979d', metalness: .95, roughness: .17 });
  const visor = new T.MeshPhysicalMaterial({ color: '#040507', metalness: .55, roughness: .065, clearcoat: 1, clearcoatRoughness: .045, ior: 1.52 });
  const headCowl = new T.MeshPhysicalMaterial({ color: '#171a1e', metalness: .32, roughness: .26, clearcoat: .55, clearcoatRoughness: .16 });
  // Light elements. HDR colours (>1) are picked up by the scene's bloom pass; each mesh owns its
  // material so the boot sequence can ignite parts independently.
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
  function ring(parent: T.Object3D, radius: number, position: number[], depth = 1, strength = 4.5) {
    const item = glow(parent, 'glow_ring', new T.TorusGeometry(radius, .0016, 8, 96), strength, position);
    item.rotation.x = Math.PI / 2; item.scale.set(1, depth, 1);
    return item;
  }

  function mesh(parent: T.Object3D, name: string, geometry: T.BufferGeometry, material: T.Material, position: number[] = [0, 0, 0]) {
    const item = new T.Mesh(geometry, material);
    item.name = name;
    item.position.set(position[0], position[1], position[2]);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  // Continuous lofts replace stacked boxes. Each profile controls the actual silhouette.
  function shell(parent: T.Object3D, name: string, sections: Section[], material: T.Material, position: number[] = [0, 0, 0], roundness = .78) {
    const outline = new T.CatmullRomCurve3(sections.map(s => new T.Vector3(s[1], s[0], s[2])), false, 'centripetal');
    const offset = new T.CatmullRomCurve3(sections.map(s => new T.Vector3(0, s[0], s[3] ?? 0)), false, 'centripetal');
    const rings = 48, sides = 48;
    const vertices: number[] = [], indices: number[] = [];
    for (let j = 0; j <= rings; j++) {
      const p = outline.getPoint(j / rings), o = offset.getPoint(j / rings);
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a);
        vertices.push(Math.sign(sx) * Math.pow(Math.abs(sx), roundness) * Math.max(.001, p.x), p.y, Math.sign(cz) * Math.pow(Math.abs(cz), roundness) * Math.max(.001, p.z) + o.z);
      }
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
    item.userData.profile = { outline, offset, roundness };
    return item;
  }

  // ---- Detailing: panel gaps, machined rings and fasteners that follow the actual shell surfaces. ----
  type Profile = { outline: T.Curve<T.Vector3>; offset: T.Curve<T.Vector3>; roundness: number };
  /** Closed cross-section loop of a lofted shell at height y (shell-local), pushed out by `lift`. */
  function sectionLoop(target: T.Mesh, y: number, lift: number) {
    const { outline, offset, roundness } = target.userData.profile as Profile;
    let best = 0, distance = Infinity;
    for (let k = 0; k <= 400; k++) { const d = Math.abs(outline.getPoint(k / 400).y - y); if (d < distance) { distance = d; best = k / 400; } }
    const p = outline.getPoint(best), o = offset.getPoint(best), points: T.Vector3[] = [];
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a);
      points.push(new T.Vector3(Math.sign(sx) * Math.pow(Math.abs(sx), roundness) * (p.x + lift), p.y, Math.sign(cz) * Math.pow(Math.abs(cz), roundness) * (p.z + lift) + o.z));
    }
    return new T.CatmullRomCurve3(points, true, 'centripetal');
  }
  /** A recessed panel gap wrapping a limb or torso shell. */
  function seam(target: T.Mesh, y: number, material: T.Material = gap, radius = .0008, lift = .0002) {
    const item = new T.Mesh(new T.TubeGeometry(sectionLoop(target, y, lift), 192, radius, 6, true), material);
    item.name = material === gap ? 'panel_gap' : 'trim_band'; target.add(item);
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
  function surfaceLine(target: T.Object3D, path: Array<[number, number]>, side: 1 | -1 = 1, material: T.Material = gap, radius = .00095) {
    const { points } = onSurface(target, path, side, radius * .25, 96);
    if (points.length < 4) return;
    const item = mesh(root, material === gap ? 'panel_gap' : 'glow_seam', new T.TubeGeometry(new T.CatmullRomCurve3(points), 160, radius, 6, false), material);
    item.castShadow = false; item.receiveShadow = false;
    return item;
  }
  // Hex-head fastener used around machined bearings.
  const boltGeometry = new T.CylinderGeometry(.0034, .0036, .0016, 6);
  /** Machined actuator housing: a brushed bearing, gunmetal hub, light ring and a ring of fasteners. */
  function housing(parent: T.Object3D, side: number, radius: number, position: number[], glowRing = true) {
    const group = new T.Group(); group.name = 'actuator_housing';
    group.position.set(position[0], position[1], position[2]); group.rotation.z = -side * Math.PI / 2; parent.add(group);
    mesh(group, 'bearing_race', new T.CylinderGeometry(radius, radius * 1.04, radius * .34, 48), satin);
    mesh(group, 'bearing_hub', new T.CylinderGeometry(radius * .62, radius * .68, radius * .46, 48), gunmetal);
    mesh(group, 'hub_cap', new T.CylinderGeometry(radius * .26, radius * .3, radius * .56, 32), satin);
    const groove = mesh(group, 'race_groove', new T.TorusGeometry(radius * .82, radius * .035, 6, 64), gap, [0, radius * .175, 0]);
    groove.rotation.x = Math.PI / 2; groove.castShadow = false;
    if (glowRing) { const light = glow(group, 'glow_ring', new T.TorusGeometry(radius * .7, .0011, 8, 72), 3.2, [0, radius * .235, 0]); light.rotation.x = Math.PI / 2; }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.PI / 6;
      mesh(group, 'hex_fastener', boltGeometry, gunmetal, [Math.cos(a) * radius * .9, radius * .175, Math.sin(a) * radius * .9]).castShadow = false;
    }
    return group;
  }

  /** Scales a profile's width and depth (not its length) to add mass to a limb. */
  const bulk = (sections: Section[], k: number): Section[] => sections.map(([y, w, d, z]) => [y, w * k, d * k, z === undefined ? undefined : z * k]);
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

  // One long torso line replaces the stacked chest, ribbed waist and ball-like hips.
  // Heroic build: a deep rib cage and broad shoulders over a narrow waist give the V-shaped silhouette.
  shell(root, 'thoracic_chassis', [[1.20,.092,.086],[1.37,.150,.118],[1.55,.198,.130],[1.665,.198,.104],[1.70,.132,.070]], graphite);
  const chest=shell(root, 'ceramic_chest', [[1.035,.054,.034,.050],[1.08,.116,.060,.050],[1.145,.134,.074,.046],[1.255,.130,.084,.046],[1.37,.152,.098,.044],[1.49,.192,.112,.040],[1.59,.214,.102,.032],[1.64,.194,.072,.022],[1.665,.142,.040,.014]], ceramic, [0,0,.012], .88);
  shell(root, 'abdominal_core', [[1.10,.098,.080],[1.19,.102,.090],[1.29,.106,.096]], graphite);
  shell(root, 'pelvic_chassis', [[1.005,.060,.056],[1.055,.102,.072],[1.12,.116,.076],[1.155,.098,.070]], graphite);
  shell(root, 'spinal_cover', [[1.29,.076,.020],[1.43,.103,.030],[1.58,.121,.027],[1.65,.085,.015]], ceramic, [0,0,-.128], .84);
  for (let i = 0; i < 4; i++) box(root, 'rear_cooling_slot', [.096,.0025,.003], [0,1.44+i*.013,-.157], elastomer, .001);
  root.updateMatrixWorld(true);
  for(const side of [-1,1]){
    const guide=new T.CatmullRomCurve3([new T.Vector3(side*.155,1.605,0),new T.Vector3(side*.129,1.54,0),new T.Vector3(side*.121,1.465,0)]);
    const points=guide.getPoints(40).map(p=>{
      const hit=new T.Raycaster(new T.Vector3(p.x,p.y,1),new T.Vector3(0,0,-1)).intersectObject(chest)[0];
      return hit?.face?hit.point.addScaledVector(hit.face.normal,.0004):p;
    });
    glow(root,'glow_seam',new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.0009,6,false),5);
  }
  // Armour plates: a pectoral plate that dips to a V at the sternum, then a single thoracic arch
  // sweeping from the flanks over the abdomen, and a belt line. Few lines, all following the form.
  const fine = .0007;
  surfaceLine(chest, [[-.121,1.463],[-.08,1.436],[-.035,1.41],[0,1.392],[.035,1.41],[.08,1.436],[.121,1.463]], 1, gap, fine);
  surfaceLine(chest, [[-.117,1.395],[-.098,1.30],[-.066,1.236],[-.03,1.205],[0,1.198],[.03,1.205],[.066,1.236],[.098,1.30],[.117,1.395]], 1, gap, fine);
  surfaceLine(chest, [[-.088,1.112],[-.04,1.102],[0,1.099],[.04,1.102],[.088,1.112]], 1, gap, fine);
  surfaceLine(chest, [[0,1.347],[0,1.28],[0,1.198]], 1, gap, fine);
  for (const side of [-1, 1]) surfaceLine(chest, [[side*.052,1.652],[side*.10,1.64],[side*.152,1.618]], 1, gap, fine);
  // AI core: a recessed, machined light module seated at the sternum where the plate lines meet.
  {
    const { points, normals } = onSurface(chest, [[0,1.371],[0,1.3711]], 1, 0, 1);
    if (points[0]) {
      const core = new T.Group(); core.name = 'ai_core';
      core.position.copy(points[0]); core.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normals[0]); root.add(core);
      mesh(core, 'core_bezel', new T.CylinderGeometry(.0215, .0225, .0045, 64), satin, [0, .0006, 0]);
      mesh(core, 'core_well', new T.CylinderGeometry(.0172, .0172, .0052, 64), gunmetal, [0, .0008, 0]);
      mesh(core, 'core_lens', new T.CylinderGeometry(.0128, .0128, .0056, 64), visor, [0, .0011, 0]);
      const halo = glow(core, 'glow_ring', new T.TorusGeometry(.0148, .0009, 8, 96), 4.2, [0, .0035, 0]); halo.rotation.x = Math.PI / 2;
      const heart = glow(core, 'glow_ring', new T.CircleGeometry(.0042, 6), 2.6, [0, .0040, 0]); heart.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, tick = mesh(core, 'core_index', new T.BoxGeometry(.0009, .0012, i % 3 ? .0022 : .0034), gap, [Math.sin(a) * .0195, .0029, Math.cos(a) * .0195]);
        tick.rotation.y = a; tick.castShadow = false;
      }
    }
  }
  // Machined collar and segmented spine.
  const collar = mesh(root, 'collar_ring', new T.TorusGeometry(.068, .0055, 16, 96), satin, [0, 1.676, -.008]);
  collar.rotation.x = Math.PI / 2; collar.scale.set(1, .74, 1);
  const collarGap = mesh(root, 'panel_gap', new T.TorusGeometry(.0745, .0012, 6, 96), gap, [0, 1.671, -.008]);
  collarGap.rotation.x = Math.PI / 2; collarGap.scale.set(1, .74, 1);
  for (let i = 0; i < 7; i++) {
    const y = 1.115 + i * .026, w = .046 - Math.abs(i - 3) * .003;
    box(root, 'spine_vertebra', [w, .015, .018], [0, y, -.088 - Math.sin(i / 6 * Math.PI) * .006], i % 2 ? satin : gunmetal, .005);
  }
  surfaceLine(root.getObjectByName('spinal_cover')!, [[-.07,1.60],[-.085,1.47],[-.06,1.33]], -1);
  surfaceLine(root.getObjectByName('spinal_cover')!, [[.07,1.60],[.085,1.47],[.06,1.33]], -1);
  // Hip armour: ceramic side plates over the pelvis with a machined belt line.
  for (const side of [-1, 1]) {
    shell(root, 'hip_plate', [[1.045,.012,.036],[1.075,.020,.058],[1.118,.019,.054],[1.145,.010,.032]], ceramic, [side*.136,0,.006], .86);
  }
  seam(root.getObjectByName('pelvic_chassis') as T.Mesh, 1.142, satin, .0026, .0008);

  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? 'leg_left' : 'leg_right';
    leg.position.set(side*.104,1.085,side<0?.012:-.006);
    leg.rotation.z = -side*.018;
    root.add(leg);
    ellipsoid(leg, 'hip_flexure', [.052,.060,.057], [0,-.010,-.008], elastomer);
    axle(leg, 'hip_bearing', .035,.088,[0,-.008,0]);
    shell(leg, 'thigh_chassis', bulk([[-.445,.016,.018],[-.25,.020,.023],[-.02,.023,.024]], 1.13), graphite);
    const thigh = shell(leg, 'sculpted_thigh', bulk([[-.432,.033,.033,.014],[-.388,.042,.044,.015],[-.23,.062,.062,.010],[-.105,.069,.067,0],[.018,.051,.050,-.003]], 1.13), ceramic, [0,0,0], .88);
    seam(thigh, -.075); seam(thigh, -.335);
    housing(leg, side, .036, [side*.067,-.016,-.004]);
    ellipsoid(leg, 'knee_flexure', [.039,.040,.041], [0,-.457,.002], elastomer);
    axle(leg, 'recessed_knee_pin', .021,.080,[0,-.457,-.008]);
    housing(leg, side, .026, [side*.036,-.457,-.006], false);
    housing(leg, -side, .022, [-side*.034,-.457,-.006], false);
    // Floating knee cap: a small lacquered plate over the joint, rimmed in satin.
    const kneeCap = ellipsoid(leg, 'knee_cap', [.030,.038,.014], [0,-.452,.036], ceramic);
    kneeCap.rotation.x = -.12;
    const kneeTrim = mesh(leg, 'trim_band', new T.TorusGeometry(1, .07, 8, 64), satin, [0,-.452,.036]);
    kneeTrim.scale.set(.0305, .0385, .02); kneeTrim.rotation.x = -.12;
    shell(leg, 'calf_chassis', [[-.946,.014,.014],[-.69,.018,.018],[-.49,.019,.019]], graphite);
    const shin = shell(leg, 'sculpted_shin', bulk([[-.947,.023,.024,.007],[-.89,.027,.032,.009],[-.72,.043,.048,.003],[-.575,.047,.050,0],[-.488,.034,.033,.008],[-.439,.025,.021,.028]], 1.1), ceramic, [0,0,0], .85);
    seam(shin, -.62); seam(shin, -.86);
    // Calf hardware is recessed at the back, keeping the front contour uninterrupted.
    for (const x of [-.014, .014]) {
      const sleeve = mesh(leg, 'actuator_sleeve', new T.CylinderGeometry(.0105,.0095,.12,24), gunmetal, [x,-.64,-.050]);
      sleeve.rotation.x = -.06;
      const rod = mesh(leg, 'calf_link', new T.CylinderGeometry(.0052,.0052,.24,16), satin, [x,-.75,-.045]);
      rod.rotation.x = -.06;
    }
    ellipsoid(leg, 'ankle_flexure', [.027,.030,.029], [0,-.962,.002], elastomer);
    housing(leg, side, .019, [side*.026,-.962,.000], false);
    ring(leg, .029, [0,-.948,.004], 1.05);
    const instep = shell(leg, 'instep', [[-1.021,.042,.090,.034],[-1.003,.047,.104,.037],[-.977,.039,.075,.022],[-.949,.024,.026,-.002]], ceramic, [0,0,0], .72);
    seam(instep, -1.011, satin, .0017, .0006);
    box(leg, 'foot_sole', [.099,.015,.218], [0,-1.032,.036], elastomer, .007);
    box(leg, 'sole_trim', [.1005,.003,.2195], [0,-1.0245,.036], gunmetal, .0015);
    box(leg, 'heel_insert', [.056,.009,.040], [0,-1.018,-.041], titanium, .004);

    const arm = new T.Group();
    arm.name = side < 0 ? 'shoulder_left' : 'shoulder_right';
    arm.position.set(side*.254,1.618,0);
    arm.rotation.z = side*.050;
    root.add(arm);
    ellipsoid(arm, 'shoulder_flexure', [.058,.066,.064], [0,.008,0], graphite);
    shell(arm, 'upper_arm_core', bulk([[-.30,.022,.024],[-.13,.025,.028],[.028,.031,.032]], 1.12), elastomer, [side*.010,0,0]);
    const upperArm = shell(arm, 'shoulder_to_upper_arm', bulk([[-.293,.026,.029],[-.24,.035,.039],[-.14,.046,.050],[-.045,.062,.063],[.028,.056,.055],[.066,.026,.025]], 1.14), ceramic, [side*.012,0,.006], .90);
    seam(upperArm, -.10); seam(upperArm, -.215);
    // Shoulder actuator: the signature machined bearing, lit from within.
    // Shoulder armour: a lacquered pauldron capping the joint, rimmed by a machined trim band.
    const pauldron = shell(arm, 'shoulder_armour', [[-.082,.071,.069,.004],[-.03,.081,.077,.004],[.025,.079,.074,.002],[.064,.058,.056,0],[.086,.020,.020,0]], ceramic, [side*.014,0,.004], .86);
    seam(pauldron, -.074, satin, .0024, .0004); seam(pauldron, .042);
    housing(arm, side, .044, [side*.090,-.006,.004]);
    const elbow = new T.Group();
    elbow.name = side < 0 ? 'elbow_left' : 'elbow_right';
    elbow.position.set(side*.012,-.324,0);
    elbow.rotation.x = -.08;
    arm.add(elbow);
    ellipsoid(elbow, 'elbow_flexure', [.032,.035,.034], [0,0,0], elastomer);
    axle(elbow, 'elbow_pin', .018,.063,[0,0,0]);
    housing(elbow, side, .024, [side*.033,0,0], false);
    housing(elbow, -side, .020, [-side*.031,0,0], false);
    shell(elbow, 'forearm_core', [[-.288,.016,.017],[-.14,.022,.025],[-.028,.024,.025]], graphite);
    const forearm = shell(elbow, 'forearm_shell', bulk([[-.275,.020,.023],[-.23,.026,.030],[-.12,.040,.045],[-.055,.037,.039],[-.028,.025,.026]], 1.1), ceramic, [0,0,.006], .88);
    seam(forearm, -.085); seam(forearm, -.215);
    // Status pips on the outer forearm, read like a watch complication.
    for (let i = 0; i < 3; i++) glow(elbow, 'glow_ring', new T.SphereGeometry(.0019, 10, 8), 4 - i, [side*.0445, -.135 - i*.011, .010]);
    mesh(elbow, 'wrist_coupling', new T.CylinderGeometry(.021,.023,.032,32), satin, [0,-.293,0]);
    ring(elbow, .0242, [0,-.284,0]);
    const hand = new T.Group();
    hand.name = side < 0 ? 'hand_left' : 'hand_right';
    hand.position.set(0,-.322,.007);
    hand.rotation.y = side*.10;
    hand.scale.setScalar(1.04);
    elbow.add(hand);
    shell(hand, 'palm_chassis', [[-.058,.031,.014],[-.02,.035,.018],[.024,.023,.014]], graphite, [0,0,0], .76);
    const backPlate = shell(hand, 'metacarpal_plate', [[-.049,.026,.005],[-.018,.030,.009],[.018,.019,.006]], ceramic, [0,0,.018], .82);
    seam(backPlate, -.030, satin, .0011, .0004);
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

  // A narrow, swept-back sensor head grows out of a continuous dark neck.
  const neck = shell(root, 'neck', [[1.65,.115,.060],[1.69,.071,.049],[1.735,.045,.040],[1.80,.049,.047]], elastomer, [0,0,-.009], .90);
  // Segmented neck: three machined bands.
  for (const y of [1.712, 1.735, 1.758]) seam(neck, y, satin, .0021, .0004);
  ring(root, .0505, [0,1.79,-.009], .95, 5);
  ring(root, .1065, [0,1.172,0], .87, 3.5);
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
  const glassVertices:number[]=[],glassIndices:number[]=[],edgeLeft:T.Vector3[]=[],edgeRight:T.Vector3[]=[];
  const rows=40,columns=40;
  for(let j=0;j<=rows;j++){
    const v=j/rows,t=.13+v*.79,p=headOutline.getPoint(t),o=headOffset.getPoint(t);
    const span=.67+.49*Math.pow(Math.sin(v*Math.PI),.65);
    for(let i=0;i<=columns;i++){
      const a=(i/columns*2-1)*span,s=Math.sin(a),c=Math.cos(a);
      const point=new T.Vector3(Math.sign(s)*Math.pow(Math.abs(s),.77)*(p.x+.0016),p.y,Math.pow(c,.77)*(p.z+.0016)+o.z);
      glassVertices.push(point.x,point.y,point.z);
      if(i===0)edgeLeft.push(point);if(i===columns)edgeRight.push(point);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;glassIndices.push(a,a+1,b,b,a+1,b+1);}
  const glassGeometry=new T.BufferGeometry();glassGeometry.setAttribute('position',new T.Float32BufferAttribute(glassVertices,3));glassGeometry.setIndex(glassIndices);glassGeometry.computeVertexNormals();
  mesh(head,'full_face_visor',glassGeometry,visor).receiveShadow=false;
  for(const edge of [edgeLeft,edgeRight])mesh(head,'visor_gasket',new T.TubeGeometry(new T.CatmullRomCurve3(edge),48,.0009,6,false),graphite).castShadow=false;
  // The face contour is traced in light: one closed loop around the visor's edge, lifted off the glass.
  const glassNormals=glassGeometry.getAttribute('normal');
  const lifted=(j:number,i:number,lift:number)=>{const k=j*(columns+1)+i;return new T.Vector3(glassVertices[k*3],glassVertices[k*3+1],glassVertices[k*3+2]).addScaledVector(new T.Vector3().fromBufferAttribute(glassNormals,k),lift);};
  const contour:T.Vector3[]=[];
  for(let i=0;i<=columns;i++)contour.push(lifted(0,i,.0016));
  for(let j=1;j<=rows;j++)contour.push(lifted(j,columns,.0016));
  for(let i=columns-1;i>=0;i--)contour.push(lifted(rows,i,.0016));
  for(let j=rows-1;j>=1;j--)contour.push(lifted(j,0,.0016));
  glow(head,'glow_face_outline',new T.TubeGeometry(new T.CatmullRomCurve3(contour,true,'centripetal'),360,.00105,6,true),3.2);
  // Eye band: a sensor line across the visor, with a brighter focus point that follows the viewer.
  const eyeRow=Math.round(rows*.47),eyePoints:T.Vector3[]=[];
  for(let i=7;i<=columns-7;i++)eyePoints.push(lifted(eyeRow,i,.0022));
  const eyeCurve=new T.CatmullRomCurve3(eyePoints,false,'centripetal');
  glow(head,'glow_eye_bar',new T.TubeGeometry(eyeCurve,96,.0021,8,false),5.5);
  const focus=glow(head,'glow_eye_focus',new T.SphereGeometry(.0042,16,12),14,eyeCurve.getPoint(.5).toArray());
  focus.scale.set(2.4,1,1);focus.userData.curve=eyeCurve;
  // Temple sensor modules: lacquered caps carrying a machined, lit aperture on each side of the head.
  for (const side of [-1,1]) {
    const pod = new T.Group(); pod.name = 'temple_sensor'; pod.position.set(side*.071,.004,-.034); pod.rotation.z = -side*Math.PI/2; head.add(pod);
    mesh(pod, 'temple_cap', new T.CylinderGeometry(.031,.034,.016,48), ceramic, [0,.004,0]);
    mesh(pod, 'temple_race', new T.CylinderGeometry(.022,.023,.008,48), satin, [0,.014,0]);
    mesh(pod, 'temple_lens', new T.CylinderGeometry(.0135,.0145,.006,48), visor, [0,.0185,0]);
    const halo = glow(pod, 'glow_ring', new T.TorusGeometry(.0175,.0011,8,72), 4, [0,.0185,0]); halo.rotation.x = Math.PI/2;
    const groove = mesh(pod, 'panel_gap', new T.TorusGeometry(.0315,.0011,6,72), gap, [0,.0122,0]); groove.rotation.x = Math.PI/2; groove.castShadow = false;
  }
  // Occipital cooling vent.
  for (let i = 0; i < 4; i++) box(head, 'occipital_vent', [.034,.0022,.004], [0,-.03+i*.011,-.093+i*.0012], gap, .001);

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
    chestPrint('official_CORE_logo',.047,.0515,-.0695,1.552,print(logo));
    // The CORE wordmark (cut from the brand logotype, white glyphs) tinted a quiet slate.
    const wordmark = await new T.TextureLoader().loadAsync('/corp/robots/core-wordmark-v1.png');
    wordmark.colorSpace = T.SRGBColorSpace; wordmark.anisotropy = 4;
    const lettering = print(wordmark); lettering.color.set('#6a7681');
    chestPrint('CORE_chest_lettering',.117,.033,.0255,1.552,lettering);
  } catch (error) { disposeHumanoid(root); throw error; }
  root.userData = { status: 'CONCEPT', version: 6, description: 'Original CORE appearance concept; not a physical robot or engineering specification.' };
  return root;
}

export function disposeHumanoid(object: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  object.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) textures.add(v); }); m.dispose(); });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose());
}
