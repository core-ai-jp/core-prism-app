import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Section = [y: number, halfWidth: number, halfDepth: number, centerZ?: number];

/** CORE appearance study. Illustrative geometry, not a physical robot or mechanical specification. */
export async function createHumanoid(): Promise<T.Group> {
  const root = new T.Group();
  root.name = 'CORE_HUMANOID_CONCEPT';
  const ceramic = new T.MeshPhysicalMaterial({ color: '#f4f5f4', metalness: .16, roughness: .17, clearcoat: 1, clearcoatRoughness: .075, ior: 1.48 });
  const graphite = new T.MeshPhysicalMaterial({ color: '#111215', metalness: .68, roughness: .22, clearcoat: .8, clearcoatRoughness: .12 });
  const elastomer = new T.MeshStandardMaterial({ color: '#101315', roughness: .72 });
  const titanium = new T.MeshStandardMaterial({ color: '#91979d', metalness: .95, roughness: .17 });
  const visor = new T.MeshPhysicalMaterial({ color: '#040507', metalness: .55, roughness: .065, clearcoat: 1, clearcoatRoughness: .045, ior: 1.52 });

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
    return item;
  }

  function ellipsoid(parent: T.Object3D, name: string, scale: number[], position: number[], material: T.Material) {
    const item = mesh(parent, name, new T.SphereGeometry(1, 36, 24), material, position);
    item.scale.set(scale[0], scale[1], scale[2]);
    return item;
  }
  function box(parent: T.Object3D, name: string, size: number[], position: number[], material: T.Material, radius = .008) {
    return mesh(parent, name, new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material, position);
  }
  function axle(parent: T.Object3D, name: string, radius: number, length: number, position: number[], material = titanium) {
    const item = mesh(parent, name, new T.CylinderGeometry(radius, radius, length, 32), material, position);
    item.rotation.z = Math.PI / 2;
    return item;
  }

  // Broad shoulders, a tapered rib cage and a compact dark waist establish human proportions.
  shell(root, 'thoracic_chassis', [[1.24,.115,.082],[1.37,.164,.106],[1.55,.205,.113],[1.65,.205,.094],[1.68,.125,.077]], graphite);
  shell(root, 'ceramic_chest', [[1.275,.120,.044,.054],[1.31,.141,.058,.054],[1.45,.173,.079,.052],[1.56,.211,.083,.046],[1.625,.213,.060,.040],[1.65,.170,.043,.034]], ceramic, [0,0,.009], .64);
  shell(root, 'abdominal_core', [[1.085,.108,.075],[1.13,.117,.082],[1.22,.114,.086],[1.30,.127,.084]], elastomer);
  for (let i = 0; i < 5; i++) {
    shell(root, `waist_flexure_${i}`, [[1.133+i*.024,.114,.080],[1.139+i*.024,.117,.084],[1.145+i*.024,.114,.080]], graphite);
  }
  shell(root, 'pelvic_chassis', [[.985,.095,.067],[1.025,.153,.088],[1.09,.159,.095],[1.132,.120,.083]], graphite);
  shell(root, 'spinal_cover', [[1.30,.096,.020],[1.44,.122,.034],[1.58,.132,.027],[1.62,.100,.016]], ceramic, [0,0,-.121]);
  for (let i = 0; i < 5; i++) box(root, 'rear_cooling_slot', [.12,.004,.004], [0,1.415+i*.017,-.157], elastomer, .001);

  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? 'leg_left' : 'leg_right';
    leg.position.set(side*.116,1.035,0);
    leg.rotation.z = -side*.022;
    root.add(leg);
    ellipsoid(leg, 'hip_flexure', [.078,.096,.084], [0,-.012,0], elastomer);
    axle(leg, 'hip_bearing', .048,.117,[0,-.008,0]);
    shell(leg, 'thigh_chassis', [[-.43,.018,.018],[-.25,.022,.022],[-.06,.025,.025]], graphite);
    shell(leg, 'sculpted_thigh', [[-.405,.040,.043,.011],[-.38,.051,.056,.010],[-.22,.073,.079,.008],[-.10,.080,.078,0],[-.048,.066,.058,-.003]], ceramic);
    ellipsoid(leg, 'knee_flexure', [.058,.065,.059], [0,-.443,.002], elastomer);
    axle(leg, 'recessed_knee_pin', .026,.117,[0,-.443,-.005]);
    ellipsoid(leg, 'patella_shell', [.049,.052,.024], [0,-.441,.048], ceramic);
    shell(leg, 'calf_chassis', [[-.883,.016,.016],[-.69,.020,.020],[-.49,.022,.022]], graphite);
    shell(leg, 'sculpted_shin', [[-.868,.029,.031,.009],[-.82,.034,.039,.011],[-.65,.052,.058,.012],[-.527,.056,.063,.009],[-.49,.045,.047,.010]], ceramic);
    // Calf hardware is recessed at the back, keeping the front contour uninterrupted.
    const piston = mesh(leg, 'calf_link', new T.CylinderGeometry(.008,.008,.24,16), titanium, [0,-.681,-.060]);
    piston.rotation.x = -.06;
    ellipsoid(leg, 'ankle_flexure', [.035,.045,.038], [0,-.883,.002], elastomer);
    shell(leg, 'instep', [[-.960,.052,.110,.038],[-.940,.058,.129,.044],[-.905,.050,.103,.027],[-.879,.032,.040,-.003]], graphite);
    box(leg, 'foot_sole', [.121,.024,.262], [0,-.972,.044], elastomer, .011);
    box(leg, 'heel_insert', [.071,.014,.058], [0,-.951,-.056], titanium, .005);

    const arm = new T.Group();
    arm.name = side < 0 ? 'shoulder_left' : 'shoulder_right';
    arm.position.set(side*.244,1.595,0);
    arm.rotation.z = side*.075;
    root.add(arm);
    ellipsoid(arm, 'shoulder_flexure', [.078,.089,.079], [side*.012,0,0], graphite);
    ellipsoid(arm, 'deltoid_shell', [.076,.098,.086], [side*.027,.005,.003], ceramic);
    shell(arm, 'upper_arm_core', [[-.29,.025,.026],[-.13,.030,.031],[-.02,.035,.036]], elastomer, [side*.025,0,0]);
    shell(arm, 'upper_arm_shell', [[-.278,.034,.040],[-.255,.043,.049],[-.13,.058,.061],[-.05,.059,.060],[-.02,.046,.045]], ceramic, [side*.027,0,.006]);
    const elbow = new T.Group();
    elbow.name = side < 0 ? 'elbow_left' : 'elbow_right';
    elbow.position.set(side*.027,-.32,0);
    elbow.rotation.x = -.10;
    arm.add(elbow);
    ellipsoid(elbow, 'elbow_flexure', [.044,.051,.049], [0,0,0], elastomer);
    axle(elbow, 'elbow_pin', .022,.084,[0,0,0]);
    shell(elbow, 'forearm_core', [[-.276,.020,.021],[-.14,.027,.029],[-.035,.029,.030]], graphite);
    shell(elbow, 'forearm_shell', [[-.253,.029,.030],[-.22,.034,.038],[-.11,.052,.055],[-.05,.048,.050],[-.032,.036,.037]], ceramic, [0,0,.006]);
    mesh(elbow, 'wrist_coupling', new T.CylinderGeometry(.027,.029,.041,32), titanium, [0,-.279,0]);
    const hand = new T.Group();
    hand.name = side < 0 ? 'hand_left' : 'hand_right';
    hand.position.set(0,-.318,.007);
    hand.rotation.y = side*.10;
    hand.scale.setScalar(1.15);
    elbow.add(hand);
    box(hand, 'palm_chassis', [.073,.084,.035], [0,-.016,0], graphite, .013);
    box(hand, 'metacarpal_plate', [.064,.065,.014], [0,-.014,.022], ceramic, .010);
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger-1.5)*.018, length = [.032,.039,.036,.027][finger];
      const digit = new T.Group();
      digit.position.set(x,-.060,0);
      digit.rotation.z = (finger-1.5)*.045;
      digit.rotation.x = -.12;
      hand.add(digit);
      axle(digit, 'finger_knuckle', .007,.014,[0,0,0]);
      box(digit, 'proximal_phalanx', [.013,length,.017], [0,-length/2,0], ceramic, .005);
      axle(digit, 'finger_joint', .006,.013,[0,-length,.003], graphite);
      const tip = box(digit, 'distal_phalanx', [.012,.027,.016], [0,-length-.015,.008], ceramic, .005);
      tip.rotation.x = -.3;
      box(digit, 'finger_pad', [.009,.016,.004], [0,-length-.018,.018], elastomer, .002);
    }
    const thumb = new T.Group();
    thumb.position.set(-side*.039,-.004,.009);
    thumb.rotation.z = -side*.5;
    thumb.rotation.x = -.28;
    hand.add(thumb);
    box(thumb, 'thumb_proximal', [.020,.035,.023], [0,-.016,0], ceramic, .007);
    axle(thumb, 'thumb_joint', .008,.019,[0,-.034,.004], graphite);
    box(thumb, 'thumb_distal', [.017,.028,.019], [0,-.048,.010], ceramic, .006);
  }

  // An uninterrupted dark face and a slim rear cowl replace the small face window.
  shell(root, 'neck', [[1.64,.113,.067],[1.67,.074,.052],[1.71,.047,.044],[1.755,.054,.052]], graphite);
  const head = new T.Group();
  head.name = 'sensor_head';
  head.position.set(0,1.838,.008);
  head.rotation.x = -.025;
  root.add(head);
  shell(head, 'rear_head_cowl', [[-.116,.039,.041,-.015],[-.086,.073,.069,-.015],[0,.093,.079,-.015],[.088,.074,.064,-.015],[.128,.032,.033,-.012],[.132,.003,.003,-.010]], visor, [0,0,0], .93);
  shell(head, 'full_face_visor', [[-.119,.025,.017,.047],[-.105,.053,.026,.060],[-.054,.079,.038,.070],[.035,.087,.045,.067],[.093,.068,.037,.055],[.127,.030,.018,.035],[.131,.003,.003,.030]], visor, [0,0,.006], .93);
  // No animated eyes or light strips: the face reads through its curved reflections.
  for (const side of [-1,1]) {
    ellipsoid(head, 'recessed_audio_port', [.005,.022,.019], [side*.089,-.018,-.018], graphite);
  }

  try {
    const logo = await new T.TextureLoader().loadAsync('/core-logo-mark-v3.png');
    logo.colorSpace = T.SRGBColorSpace;
    logo.anisotropy = 4;
    const badge = mesh(root, 'official_CORE_logo', new T.PlaneGeometry(.047,.051), new T.MeshBasicMaterial({ map: logo, transparent: true, depthWrite: false, toneMapped: false }), [-.044,1.535,.149]);
    badge.castShadow = false;
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Brand texture unavailable');
    ctx.fillStyle = '#26333c'; ctx.font = '500 140px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C O R E',512,137);
    const wordmark = new T.CanvasTexture(canvas); wordmark.colorSpace = T.SRGBColorSpace;
    const lettering = mesh(root, 'CORE_chest_lettering', new T.PlaneGeometry(.089,.022), new T.MeshBasicMaterial({ map: wordmark, transparent: true, depthWrite: false, toneMapped: false }), [.031,1.534,.149]);
    lettering.castShadow = false;
  } catch (error) { disposeHumanoid(root); throw error; }
  root.userData = { status: 'CONCEPT', version: 3, description: 'Original CORE appearance concept; not a physical robot or engineering specification.' };
  return root;
}

export function disposeHumanoid(object: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  object.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) textures.add(v); }); m.dispose(); });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose());
}
