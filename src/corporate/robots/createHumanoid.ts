import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Original CORE appearance concept. Dimensions and joints are illustrative, not a mechanical design. */
export async function createHumanoid(): Promise<T.Group> {
  const root = new T.Group(); root.name = 'CORE_HUMANOID_CONCEPT';
  const white = new T.MeshPhysicalMaterial({ color: '#f4f5f4', metalness: .12, roughness: .29, clearcoat: .45, clearcoatRoughness: .3 });
  const pearl = new T.MeshStandardMaterial({ color: '#dbe1e4', metalness: .35, roughness: .38 });
  const dark = new T.MeshStandardMaterial({ color: '#17232d', metalness: .6, roughness: .36 });
  const rubber = new T.MeshStandardMaterial({ color: '#192126', roughness: .8 });
  const metal = new T.MeshStandardMaterial({ color: '#8d9ca5', metalness: .88, roughness: .27 });
  const blue = new T.MeshStandardMaterial({ color: '#09658a', metalness: .5, roughness: .3 });
  const glass = new T.MeshPhysicalMaterial({ color: '#07131b', metalness: .45, roughness: .17, clearcoat: 1 });
  function box(parent: T.Object3D, name: string, size: number[], pos: number[], material:T.Material = white, radius = .018) {
    const mesh = new T.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material);
    mesh.name = name; mesh.position.set(pos[0], pos[1], pos[2]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent: T.Object3D, name: string, radius: number, length: number, pos: number[], material: T.Material, axis = 'y') {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, length, 32), material);
    mesh.name = name;mesh.position.set(pos[0],pos[1],pos[2]); if (axis==='x') mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;
    mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function shell(parent: T.Object3D, name: string, top: number, bottom: number, height: number, depth: number, pos: number[], mat:T.Material = white) {
    const shape = new T.Shape();shape.moveTo(-bottom/2,-height/2);shape.lineTo(bottom/2,-height/2);shape.lineTo(top/2,height/2);shape.lineTo(-top/2,height/2);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:depth-.036,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:4,steps:1});
    g.translate(0,0,-(depth-.036)/2);
    const mesh=new T.Mesh(g,mat);mesh.name=name;mesh.position.set(pos[0],pos[1],pos[2]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Torso: separate load-bearing structure, abdominal bellows and ceramic-like shells.
  box(root,'torso_frame',[.33,.44,.20],[0,1.39,0],dark,.045);
  shell(root,'chest_shell',.425,.31,.345,.235,[0,1.435,.012]);
  box(root,'backpack',[.30,.30,.072],[0,1.43,-.14],pearl,.025);
  for(let i=0;i<7;i++)box(root,'back_vent',[.18,.008,.008],[0,1.365+i*.018,-.18],dark,.002);
  cylinder(root,'waist_bearing',.103,.10,[0,1.18,0],metal);
  for(let i=0;i<4;i++)box(root,'abdominal_bellows',[.25-i*.006,.018,.16],[0,1.22+i*.021,.015],rubber,.006);
  shell(root,'pelvis_shell',.285,.30,.165,.20,[0,1.075,0],white);
  box(root,'pelvis_center',[.09,.125,.018],[0,1.068,.118],pearl,.009);
  for(const s of [-1,1]) {
    box(root,'collar_rail',[.10,.025,.12],[s*.13,1.625,-.006],metal,.008);
    cylinder(root,'hip_actuator',.064,.10,[s*.13,1.02,0],dark,'x');
    // Legs retain visible knee and ankle travel instead of a single continuous tube.
    const leg=new T.Group();leg.name=s<0?'leg_left':'leg_right';leg.position.set(s*.145,1.01,0);leg.rotation.z=s*-.025;root.add(leg);
    box(leg,'thigh_structure',[.085,.34,.085],[0,-.205,0],metal,.014);
    shell(leg,'thigh_front',.115,.095,.30,.12,[0,-.205,.025]);
    box(leg,'thigh_back',[.085,.22,.045],[0,-.20,-.064],pearl,.017);
    for(let i=0;i<3;i++)box(leg,'thigh_vent',[.045,.005,.006],[0,-.13-i*.016,.096],dark,.001);
    cylinder(leg,'knee_axle',.062,.145,[0,-.395,0],metal,'x');
    cylinder(leg,'knee_outer_cap',.065,.018,[s*.08,-.395,0],white,'x');
    cylinder(leg,'knee_inner_ring',.040,.02,[-s*.08,-.395,0],rubber,'x');
    box(leg,'kneecap',[.095,.10,.066],[0,-.395,.057],white,.026);
    box(leg,'shin_frame',[.074,.33,.075],[0,-.62,0],dark,.014);
    shell(leg,'shin_armor',.102,.077,.285,.105,[0,-.60,.033]);
    cylinder(leg,'calf_piston',.014,.27,[-s*.053,-.60,-.035],metal);
    cylinder(leg,'ankle_bearing',.039,.09,[0,-.817,0],metal,'x');
    box(leg,'ankle_yoke',[.08,.085,.075],[0,-.839,0],rubber,.012);
    box(leg,'sole',[.15,.036,.26],[0,-.947,.05],rubber,.025);
    box(leg,'foot_shell',[.145,.078,.25],[0,-.902,.052],white,.031);
    box(leg,'toe_cap',[.12,.025,.08],[0,-.888,.142],pearl,.009);
    box(leg,'toe_seam',[.115,.003,.004],[0,-.872,.112],dark,.001);
    // Shoulder, elbow, forearm and an articulated five-finger hand.
    const arm=new T.Group();arm.name=s<0?'shoulder_left':'shoulder_right';arm.position.set(s*.302,1.535,0);arm.rotation.z=s*.10;root.add(arm);
    cylinder(arm,'shoulder_motor',.079,.106,[s*.025,0,0],dark,'x');
    cylinder(arm,'shoulder_ring',.082,.018,[s*.082,0,0],metal,'x');
    box(arm,'shoulder_shell',[.135,.145,.155],[s*.045,.008,0],white,.047);
    box(arm,'upper_arm_inner',[.065,.235,.07],[s*.04,-.16,0],dark,.018);
    shell(arm,'upper_arm_shell',.092,.078,.20,.11,[s*.045,-.16,.013]);
    const elbow=new T.Group();elbow.name=s<0?'elbow_left':'elbow_right';elbow.position.set(s*.045,-.30,0);elbow.rotation.x=-.16;arm.add(elbow);
    cylinder(elbow,'elbow_actuator',.050,.12,[0,0,0],metal,'x');
    cylinder(elbow,'elbow_cap',.052,.018,[s*.065,0,0],dark,'x');
    box(elbow,'elbow_cover',[.084,.08,.075],[0,0,.035],pearl,.025);
    shell(elbow,'forearm_shell',.095,.065,.215,.105,[0,-.145,.008]);
    box(elbow,'forearm_service_inset',[.035,.08,.008],[s*.02,-.13,.067],dark,.006);
    cylinder(elbow,'wrist_sleeve',.030,.055,[0,-.286,0],metal);
    const hand=new T.Group();hand.name=s<0?'hand_left':'hand_right';hand.position.set(0,-.328,.006);elbow.add(hand);
    box(hand,'palm_core',[.080,.085,.036],[0,-.027,0],rubber,.015);
    box(hand,'palm_plate',[.073,.067,.013],[0,-.025,.023],white,.013);
    for(let f=0;f<4;f++) {
      const x=(f-1.5)*.019;const length=f===0||f===3?.027:.034;
      cylinder(hand,'knuckle',.009,.014,[x,-.071,0],metal,'x');
      box(hand,'finger_proximal',[.014,length,.019],[x,-.077-length/2,.002],white,.005);
      cylinder(hand,'finger_hinge',.007,.015,[x,-.081-length,.006],dark,'x');
      const tip=box(hand,'finger_distal',[.013,.025,.018],[x,-.094-length,.009],pearl,.005);tip.rotation.x=-.18;
    }
    const thumb=new T.Group();thumb.position.set(-s*.046,-.025,.006);thumb.rotation.z=-s*.65;hand.add(thumb);
    box(thumb,'thumb_proximal',[.02,.034,.022],[0,-.012,0],white,.006);
    box(thumb,'thumb_tip',[.018,.027,.020],[0,-.04,.008],pearl,.006);
    // Small fasteners convey assemblies without arbitrary decoration.
    for(const y of [1.36,1.52])cylinder(root,'torso_fastener',.0035,.004,[s*.153,y,.139],metal,'z');
  }
  cylinder(root,'neck_pivot',.052,.09,[0,1.665,0],dark);
  cylinder(root,'neck_collar',.063,.025,[0,1.642,0],metal);
  const head=new T.Group();head.name='sensor_head';head.position.set(0,1.808,.006);root.add(head);
  box(head,'head_shell',[.205,.235,.217],[0,0,0],white,.065);
  box(head,'visor',[.185,.087,.033],[0,.027,.108],glass,.027);
  for(const s of [-1,1]) {
    cylinder(head,'camera_housing',.014,.005,[s*.053,.03,.128],dark,'z');
    cylinder(head,'camera_lens',.008,.006,[s*.053,.03,.132],blue,'z');
    box(head,'ear_plate',[.014,.082,.078],[s*.104,-.006,-.01],pearl,.006);
    for(let i=0;i<3;i++)box(head,'head_vent',[.022,.003,.003],[s*.05,-.061+i*.012,.102],dark,.001);
  }
  box(head,'chin_line',[.052,.005,.004],[0,-.076,.109],pearl,.001);
  let logo:T.Texture;
  try { logo=await new T.TextureLoader().loadAsync('/core-logo-mark-v3.png'); }
  catch(error) { disposeHumanoid(root);throw error; }
  logo.colorSpace=T.SRGBColorSpace;logo.anisotropy=4;
  const badge=new T.Mesh(new T.PlaneGeometry(.090,.097),new T.MeshBasicMaterial({map:logo,transparent:true,depthWrite:false,toneMapped:false}));
  badge.name='official_CORE_logo';badge.position.set(-.100,1.495,.150);root.add(badge);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Brand texture unavailable');
  ctx.fillStyle='#15232e';ctx.font='600 170px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CORE',512,141);
  const wordmark=new T.CanvasTexture(canvas);wordmark.colorSpace=T.SRGBColorSpace;
  const lettering=new T.Mesh(new T.PlaneGeometry(.185,.046),new T.MeshBasicMaterial({map:wordmark,transparent:true,depthWrite:false,toneMapped:false}));
  lettering.name='CORE_chest_lettering';lettering.position.set(.052,1.490,.151);root.add(lettering);
  box(root,'chest_accent',[.110,.004,.003],[.054,1.444,.152],blue,.001);
  root.userData={status:'CONCEPT',description:'Original appearance concept; not a physical robot or engineering specification.'};
  return root;
}

export function disposeHumanoid(object:T.Object3D) {
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  object.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
  materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v);});m.dispose();});
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
}
