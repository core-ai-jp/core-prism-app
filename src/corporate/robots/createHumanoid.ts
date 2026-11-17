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

  // One long torso line replaces the stacked chest, ribbed waist and ball-like hips.
  shell(root, 'thoracic_chassis', [[1.20,.085,.066],[1.37,.136,.086],[1.55,.175,.094],[1.665,.177,.077],[1.70,.122,.058]], graphite);
  const chest=shell(root, 'ceramic_chest', [[1.035,.050,.025,.043],[1.08,.110,.044,.043],[1.145,.132,.053,.040],[1.255,.125,.058,.041],[1.37,.140,.065,.040],[1.49,.171,.074,.038],[1.59,.190,.067,.032],[1.64,.172,.046,.023],[1.665,.128,.027,.016]], ceramic, [0,0,.012], .88);
  shell(root, 'abdominal_core', [[1.10,.091,.063],[1.19,.094,.070],[1.29,.096,.074]], graphite);
  shell(root, 'pelvic_chassis', [[1.005,.056,.047],[1.055,.093,.060],[1.12,.105,.062],[1.155,.088,.057]], graphite);
  shell(root, 'spinal_cover', [[1.29,.068,.018],[1.43,.092,.027],[1.58,.108,.024],[1.65,.076,.013]], ceramic, [0,0,-.104], .84);
  for (let i = 0; i < 4; i++) box(root, 'rear_cooling_slot', [.086,.0025,.003], [0,1.44+i*.013,-.132], elastomer, .001);
  root.updateMatrixWorld(true);
  for(const side of [-1,1]){
    const guide=new T.CatmullRomCurve3([new T.Vector3(side*.155,1.605,0),new T.Vector3(side*.129,1.54,0),new T.Vector3(side*.121,1.465,0)]);
    const points=guide.getPoints(40).map(p=>{
      const hit=new T.Raycaster(new T.Vector3(p.x,p.y,1),new T.Vector3(0,0,-1)).intersectObject(chest)[0];
      return hit?.face?hit.point.addScaledVector(hit.face.normal,.0004):p;
    });
    glow(root,'glow_seam',new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.0009,6,false),5);
  }

  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? 'leg_left' : 'leg_right';
    leg.position.set(side*.097,1.085,side<0?.012:-.006);
    leg.rotation.z = -side*.018;
    root.add(leg);
    ellipsoid(leg, 'hip_flexure', [.046,.055,.051], [0,-.010,-.008], elastomer);
    axle(leg, 'hip_bearing', .035,.088,[0,-.008,0]);
    shell(leg, 'thigh_chassis', [[-.445,.016,.018],[-.25,.020,.023],[-.02,.023,.024]], graphite);
    shell(leg, 'sculpted_thigh', [[-.432,.033,.033,.014],[-.388,.042,.044,.015],[-.23,.062,.062,.010],[-.105,.069,.067,0],[.018,.051,.050,-.003]], ceramic, [0,0,0], .88);
    ellipsoid(leg, 'knee_flexure', [.039,.040,.041], [0,-.457,.002], elastomer);
    axle(leg, 'recessed_knee_pin', .021,.080,[0,-.457,-.008]);
    shell(leg, 'calf_chassis', [[-.946,.014,.014],[-.69,.018,.018],[-.49,.019,.019]], graphite);
    shell(leg, 'sculpted_shin', [[-.947,.023,.024,.007],[-.89,.027,.032,.009],[-.72,.043,.048,.003],[-.575,.047,.050,0],[-.488,.034,.033,.008],[-.439,.025,.021,.028]], ceramic, [0,0,0], .85);
    // Calf hardware is recessed at the back, keeping the front contour uninterrupted.
    const piston = mesh(leg, 'calf_link', new T.CylinderGeometry(.006,.006,.26,16), titanium, [0,-.72,-.048]);
    piston.rotation.x = -.06;
    ellipsoid(leg, 'ankle_flexure', [.027,.030,.029], [0,-.962,.002], elastomer);
    ring(leg, .029, [0,-.948,.004], 1.05);
    shell(leg, 'instep', [[-1.021,.042,.090,.034],[-1.003,.047,.104,.037],[-.977,.039,.075,.022],[-.949,.024,.026,-.002]], ceramic, [0,0,0], .72);
    box(leg, 'foot_sole', [.099,.015,.218], [0,-1.032,.036], elastomer, .007);
    box(leg, 'heel_insert', [.056,.009,.040], [0,-1.018,-.041], titanium, .004);

    const arm = new T.Group();
    arm.name = side < 0 ? 'shoulder_left' : 'shoulder_right';
    arm.position.set(side*.223,1.625,0);
    arm.rotation.z = side*.050;
    root.add(arm);
    ellipsoid(arm, 'shoulder_flexure', [.050,.059,.056], [0,.008,0], graphite);
    shell(arm, 'upper_arm_core', [[-.30,.022,.024],[-.13,.025,.028],[.028,.031,.032]], elastomer, [side*.010,0,0]);
    shell(arm, 'shoulder_to_upper_arm', [[-.293,.026,.029],[-.24,.035,.039],[-.14,.046,.050],[-.045,.062,.063],[.028,.052,.051],[.060,.024,.023]], ceramic, [side*.012,0,.006], .90);
    const elbow = new T.Group();
    elbow.name = side < 0 ? 'elbow_left' : 'elbow_right';
    elbow.position.set(side*.012,-.324,0);
    elbow.rotation.x = -.08;
    arm.add(elbow);
    ellipsoid(elbow, 'elbow_flexure', [.032,.035,.034], [0,0,0], elastomer);
    axle(elbow, 'elbow_pin', .018,.063,[0,0,0]);
    shell(elbow, 'forearm_core', [[-.288,.016,.017],[-.14,.022,.025],[-.028,.024,.025]], graphite);
    shell(elbow, 'forearm_shell', [[-.275,.020,.023],[-.23,.026,.030],[-.12,.040,.045],[-.055,.037,.039],[-.028,.025,.026]], ceramic, [0,0,.006], .88);
    mesh(elbow, 'wrist_coupling', new T.CylinderGeometry(.021,.023,.032,32), titanium, [0,-.293,0]);
    ring(elbow, .0242, [0,-.284,0]);
    const hand = new T.Group();
    hand.name = side < 0 ? 'hand_left' : 'hand_right';
    hand.position.set(0,-.322,.007);
    hand.rotation.y = side*.10;
    hand.scale.setScalar(1.04);
    elbow.add(hand);
    shell(hand, 'palm_chassis', [[-.058,.031,.014],[-.02,.035,.018],[.024,.023,.014]], graphite, [0,0,0], .76);
    shell(hand, 'metacarpal_plate', [[-.049,.026,.005],[-.018,.030,.009],[.018,.019,.006]], ceramic, [0,0,.018], .82);
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

  // A narrow, swept-back sensor head grows out of a continuous dark neck.
  shell(root, 'neck', [[1.65,.115,.060],[1.69,.071,.049],[1.735,.045,.040],[1.80,.049,.047]], elastomer, [0,0,-.009], .90);
  ring(root, .0505, [0,1.79,-.009], .95, 5);
  ring(root, .0985, [0,1.172,0], .76, 3.5);
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
  glow(head,'glow_face_outline',new T.TubeGeometry(new T.CatmullRomCurve3(contour,true,'centripetal'),360,.00125,6,true),7);
  // Eye band: a sensor line across the visor, with a brighter focus point that follows the viewer.
  const eyeRow=Math.round(rows*.47),eyePoints:T.Vector3[]=[];
  for(let i=7;i<=columns-7;i++)eyePoints.push(lifted(eyeRow,i,.0022));
  const eyeCurve=new T.CatmullRomCurve3(eyePoints,false,'centripetal');
  glow(head,'glow_eye_bar',new T.TubeGeometry(eyeCurve,96,.0021,8,false),5.5);
  const focus=glow(head,'glow_eye_focus',new T.SphereGeometry(.0042,16,12),14,eyeCurve.getPoint(.5).toArray());
  focus.scale.set(2.4,1,1);focus.userData.curve=eyeCurve;
  for (const side of [-1,1]) {
    ellipsoid(head, 'recessed_audio_port', [.003,.015,.013], [side*.078,-.010,-.020], graphite);
  }

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
    chestPrint('official_CORE_logo',.058,.064,-.097,1.545,print(logo));
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Brand texture unavailable');
    ctx.fillStyle = '#0b1620'; ctx.font = '800 240px Inter, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
    ctx.fillText('CORE',512,158);
    const wordmark = new T.CanvasTexture(canvas); wordmark.colorSpace = T.SRGBColorSpace; wordmark.anisotropy = 4;
    // Lettering cap height is about two thirds of the logo mark, so the mark still leads.
    chestPrint('CORE_chest_lettering',.25,.0733,.040,1.545,print(wordmark));
  } catch (error) { disposeHumanoid(root); throw error; }
  root.userData = { status: 'CONCEPT', version: 5, description: 'Original CORE appearance concept; not a physical robot or engineering specification.' };
  return root;
}

export function disposeHumanoid(object: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
  object.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) textures.add(v); }); m.dispose(); });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose());
}
