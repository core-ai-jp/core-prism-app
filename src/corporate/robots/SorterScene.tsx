import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import data from '../robotsContent.json';

type SceneApi = { play: (on: boolean) => void; reset: () => void; rotate: (direction: number) => void };

/** An explanatory geometric model. No measured robot, physics or collision solver. */
export default function SorterScene() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch {
      const failureFrame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(failureFrame);
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f0f3f6');
    const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 60);
    const initial = new THREE.Vector3(7.4, 5.2, 7.2);
    camera.position.copy(initial);
    const target = new THREE.Vector3(0, .85, 0);
    camera.lookAt(target);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minPolarAngle = .45;
    controls.maxPolarAngle = Math.PI / 2.25;
    // Let touch scrolling work; the labelled buttons offer mobile + keyboard views.
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    renderer.domElement.style.touchAction = 'pan-y';
    controls.update();
    const soft = new THREE.HemisphereLight(0xf6fbff, 0x8b99ac, 3.1); scene.add(soft);
    const light = new THREE.DirectionalLight(0xffffff, 4.0);
    light.position.set(-3, 8, 5); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .1, far: 20 });
    light.shadow.bias = -.0005; light.shadow.normalBias = .035; scene.add(light);
    const rim = new THREE.DirectionalLight(0xc8e3ff, 2.5); rim.position.set(4, 5, -5); scene.add(rim);
    const white = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: .27, metalness: .35 });
    const graphite = new THREE.MeshStandardMaterial({ color: '#233246', roughness: .38, metalness: .6 });
    const aluminium = new THREE.MeshStandardMaterial({ color: '#bbc8d5', roughness: .33, metalness: .72 });
    const blue = new THREE.MeshStandardMaterial({ color: '#0064d8', roughness: .3, metalness: .4 });
    const work = new THREE.MeshStandardMaterial({ color: '#e1e7ec', roughness: .6, metalness: .18 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#172438', roughness: .75 });
    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, position: number[] = [0,0,0]) {
      const object = new THREE.Mesh(geometry, material); object.position.set(position[0],position[1],position[2]);
      object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
    }
    function box(w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D, position?: number[]) {
      return mesh(new THREE.BoxGeometry(w,h,d), material, parent, position);
    }
    function cylinder(r: number, h: number, material: THREE.Material, parent: THREE.Object3D, position?: number[]) {
      return mesh(new THREE.CylinderGeometry(r,r,h,48), material, parent, position);
    }
    function label(text: string, w: number, h: number, parent: THREE.Object3D, position: number[], flat = false) {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#1c3047'; ctx.font = '500 54px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,384,64);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const plane = mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ map:texture,transparent:true,depthWrite:false }),parent,position);
      if(flat) plane.rotation.x = -Math.PI/2;
    }
    // A tabletop, locating holes and four visible supports give the concept scale.
    box(6.5,.22,3.9,white,scene,[0,-.11,0]); box(6.22,.09,3.62,graphite,scene,[0,-.25,0]);
    for (const x of [-2.8,2.8]) for (const z of [-1.45,1.45]) {
      box(.13,.95,.13,aluminium,scene,[x,-.74,z]); box(.34,.06,.34,rubber,scene,[x,-1.22,z]);
    }
    for(let x=-2.7;x<2.8;x+=.45) for(let z=-1.35;z<1.5;z+=.45) cylinder(.017,.005,aluminium,scene,[x,.006,z]);
    const floor = mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({ color:0x4b6179,opacity:.13 }),scene,[0,-1.26,0]); floor.rotation.x=-Math.PI/2; floor.castShadow=false;
    function tray(x:number,z:number,name:string) {
      const group = new THREE.Group(); group.position.set(x,.015,z); scene.add(group);
      box(1.1,.045,1.05,work,group,[0,.02,0]);
      box(1.1,.18,.045,white,group,[0,.105,-.52]); box(1.1,.18,.045,white,group,[0,.105,.52]);
      box(.045,.18,1.05,white,group,[-.53,.105,0]); box(.045,.18,1.05,white,group,[.53,.105,0]);
      label(name,.85,.14,group,[0,.02,.78],true); return group;
    }
    const input=tray(-2,.55,'INPUT'); const output=tray(2.05,.55,'A / SORT'); tray(2.05,-.85,'B / REVIEW');
    for(const [x,z] of [[-.26,-.2],[.24,.15],[-.18,.24],[.22,-.22]]) box(.25,.19,.24, x<0 ? blue:aluminium,input,[x,.16,z]);
    box(.25,.19,.24,blue,output,[.1,.16,-.12]);
    // Overhead camera + aluminium gantry, directed at the input tray.
    for(const x of [-2.65,-1.2]) { box(.09,2.6,.09,aluminium,scene,[x,1.3,-.7]); box(.29,.08,.3,graphite,scene,[x,.04,-.7]); }
    box(1.6,.11,.12,aluminium,scene,[-1.92,2.56,-.7]); box(.12,.1,1.4,aluminium,scene,[-1.92,2.56,-.02]);
    box(.38,.16,.3,graphite,scene,[-1.92,2.41,.48]); const lens=cylinder(.09,.10,blue,scene,[-1.92,2.28,.48]); lens.rotation.x=0;
    // Kinematic-looking arm: base yaw → shoulder → elbow → wrist → gripper.
    const robot = new THREE.Group(); robot.position.set(-.2,0,-.43); scene.add(robot);
    cylinder(.53,.1,graphite,robot,[0,.05,0]); cylinder(.4,.25,white,robot,[0,.22,0]); cylinder(.405,.035,blue,robot,[0,.35,0]);
    const yaw = new THREE.Group(); yaw.position.y=.36; robot.add(yaw); yaw.rotation.y=-.1;
    cylinder(.33,.31,white,yaw,[0,.15,0]);
    const shoulder=new THREE.Group(); shoulder.position.set(0,.36,0); shoulder.rotation.z=-.40; yaw.add(shoulder);
    const shoulderMotor=cylinder(.28,.5,graphite,shoulder); shoulderMotor.rotation.x=Math.PI/2;
    const shoulderCap=cylinder(.24,.52,white,shoulder); shoulderCap.rotation.x=Math.PI/2;
    for(const z of [-.27,.27]) { const bolt=cylinder(.085,.025,aluminium,shoulder,[0,0,z]); bolt.rotation.x=Math.PI/2; }
    mesh(new THREE.CapsuleGeometry(.19,1.0,8,32),white,shoulder,[0,.66,0]);
    box(.12,.83,.016,graphite,shoulder,[0,.65,.188]);
    const elbow=new THREE.Group(); elbow.position.y=1.3; elbow.rotation.z=-1.18; shoulder.add(elbow);
    const elbowMotor=cylinder(.235,.45,graphite,elbow); elbowMotor.rotation.x=Math.PI/2;
    const elbowCap=cylinder(.205,.48,white,elbow); elbowCap.rotation.x=Math.PI/2;
    for(const z of [-.25,.25]) { const bolt=cylinder(.073,.025,blue,elbow,[0,0,z]); bolt.rotation.x=Math.PI/2; }
    mesh(new THREE.CapsuleGeometry(.145,.95,8,32),white,elbow,[0,.63,0]);
    box(.08,.70,.016,aluminium,elbow,[0,.62,.145]);
    const wrist=new THREE.Group(); wrist.position.y=1.22; wrist.rotation.z=-1.38; elbow.add(wrist);
    cylinder(.18,.3,graphite,wrist,[0,.07,0]); cylinder(.16,.22,white,wrist,[0,.25,0]); cylinder(.16,.025,blue,wrist,[0,.37,0]);
    box(.4,.13,.24,aluminium,wrist,[0,.44,0]);
    for(const x of [-.14,.14]) { box(.06,.32,.1,graphite,wrist,[x,.63,0]); box(.1,.05,.12,rubber,wrist,[x,.81,0]); }
    label('CORE / SORTER 01',1.45,.2,scene,[0,-.1,1.956]);
    // The blue line denotes a proposed work area, not a measured safety envelope.
    const linePoints=[new THREE.Vector3(-2.9,.012,-1.55),new THREE.Vector3(2.8,.012,-1.55),new THREE.Vector3(2.8,.012,1.55),new THREE.Vector3(-2.9,.012,1.55),new THREE.Vector3(-2.9,.012,-1.55)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineDashedMaterial({color:0x7fa6cc,dashSize:.09,gapSize:.07})); line.computeLineDistances(); scene.add(line);
    let raf=0; let moving=false; let visible=true; let start=0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function render() { renderer.render(scene,camera); }
    function frame(time:number) {
      if(!moving||!visible) return;
      if(!start) start=time;
      const t=(time-start)/2800;
      yaw.rotation.y=-.1+Math.sin(t)*.6;
      shoulder.rotation.z=-.4+Math.sin(t*2)*.13;
      elbow.rotation.z=-1.18+Math.sin(t*2+.3)*.16;
      render(); raf=requestAnimationFrame(frame);
    }
    function stop() { moving=false; playingRef.current=false; cancelAnimationFrame(raf); setPlaying(false); }
    const observer = new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; if(!visible) stop(); },{threshold:.05}); observer.observe(container);
    const onVisibility=()=>{if(document.hidden) stop();}; document.addEventListener('visibilitychange',onVisibility);
    const onReduced=()=>{if(reduce.matches) stop();}; reduce.addEventListener('change',onReduced);
    const resize=new ResizeObserver(()=> {
      const w=container.clientWidth,h=container.clientHeight; if(!w||!h)return;
      renderer.setSize(w,h,false); const a=w/h, half=Math.max(3.25,4.6/a);
      camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();render();
    }); resize.observe(container);
    controls.addEventListener('change',render);
    api.current={play(on){if(!on){stop();return;} moving=true;start=0;playingRef.current=true;setPlaying(true);raf=requestAnimationFrame(frame);},reset(){stop();camera.position.copy(initial);controls.target.copy(target);yaw.rotation.y=-.1;shoulder.rotation.z=-.4;elbow.rotation.z=-1.18;controls.update();render();},rotate(direction){stop();const v=camera.position.clone().sub(target);v.applyAxisAngle(new THREE.Vector3(0,1,0),direction*.35);camera.position.copy(v.add(target));controls.update();render();}};
    const onLost=(e:Event)=>{e.preventDefault();stop();setFailed(true);setReady(false);};renderer.domElement.addEventListener('webglcontextlost',onLost);
    render();const readyFrame = requestAnimationFrame(() => setReady(true));
    return()=>{
      stop();api.current=null;observer.disconnect();resize.disconnect();controls.dispose();cancelAnimationFrame(raf);cancelAnimationFrame(readyFrame);
      document.removeEventListener('visibilitychange',onVisibility);reduce.removeEventListener('change',onReduced);renderer.domElement.removeEventListener('webglcontextlost',onLost);
      scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){object.geometry.dispose();for(const m of Array.isArray(object.material)?object.material:[object.material]){if('map'in m && m.map instanceof THREE.Texture)m.map.dispose();m.dispose();}}});
      renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  if(failed) return <p className="robots-scene-hint" role="status">{data.scene.fallback}</p>;
  return <><div ref={host} className="robots-canvas" style={{visibility:ready?'visible':'hidden'}} />{ready&&<><span className="robots-scene-hint">{data.scene.drag}</span><div className="robots-controls" role="group" aria-label="3D構想モデルの操作"><button type="button" onClick={()=>api.current?.rotate(-1)} aria-label={data.scene.left}><RotateCcw size={17} aria-hidden="true" /></button><button type="button" onClick={()=>api.current?.rotate(1)} aria-label={data.scene.right}><RotateCw size={17} aria-hidden="true" /></button><button type="button" onClick={()=>api.current?.reset()}>{data.scene.reset}</button><button type="button" aria-pressed={playing} onClick={()=>api.current?.play(!playingRef.current)}>{playing?<Pause size={16} aria-hidden="true" />:<Play size={16} aria-hidden="true" />}{playing?data.scene.pause:data.scene.play}</button></div></>}</>;
}
