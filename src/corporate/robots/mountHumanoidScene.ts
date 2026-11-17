import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createHumanoid, disposeHumanoid } from './createHumanoid';

export interface HumanoidController { play:(on:boolean)=>boolean;reset:()=>void;rotate:(direction:number)=>void;view:(close:boolean)=>void;dispose:()=>void }
interface Events {onReady:()=>void;onFailure:()=>void;onStop:()=>void;onView:(close:boolean)=>void}

export function mountHumanoidScene(container:HTMLDivElement,events:Events):HumanoidController {
  const cleanup:Array<()=>void>=[];
  let disposed=false;
  const release=()=>{for(const fn of cleanup.splice(0).reverse()){try{fn();}catch{/* Complete remaining cleanup. */}}};
  try {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});
  cleanup.push(()=>renderer.dispose(),()=>renderer.domElement.remove());
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:1.75));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#edf0f1');
  cleanup.push(()=>disposeHumanoid(scene));
  const camera=new T.PerspectiveCamera(34,1,.02,30);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=false;
  cleanup.push(()=>controls.dispose());
  controls.minPolarAngle=.65;controls.maxPolarAngle=1.65;controls.touches.ONE=T.TOUCH.PAN;controls.touches.TWO=T.TOUCH.DOLLY_ROTATE;renderer.domElement.style.touchAction='pan-y';
  const pmrem=new T.PMREMGenerator(renderer);cleanup.push(()=>pmrem.dispose());
  const room=new RoomEnvironment();let env:T.WebGLRenderTarget;
  try{env=pmrem.fromScene(room,.04);}finally{room.dispose();}
  cleanup.push(()=>env.dispose());scene.environment=env.texture;scene.environmentIntensity=.75;
  const key=new T.DirectionalLight('#fffaf2',3.2);key.position.set(-2,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  cleanup.push(()=>key.shadow.dispose());
  Object.assign(key.shadow.camera,{left:-1.2,right:1.2,top:2.3,bottom:-.5,near:.1,far:10});key.shadow.normalBias=.012;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
  const fill=new T.DirectionalLight('#d9e9f3',1.2);fill.position.set(3,2,-2);scene.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#edf0f1',roughness:.84}));floor.rotation.x=-Math.PI/2;floor.position.y=.040;floor.receiveShadow=true;scene.add(floor);
  let ready=false,visible=true,running=false,frame=0,elapsed=0,last=0,close=false,root:T.Group|undefined;
  cleanup.push(()=>{running=false;cancelAnimationFrame(frame);});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function render(){if(!disposed)renderer.render(scene,camera);}
  function pose(t:number){if(!root)return;const wave=Math.sin(Math.min(t/7,1)*Math.PI);const arm=root.getObjectByName('shoulder_right');const elbow=root.getObjectByName('elbow_right');if(arm)arm.rotation.x=-wave*.82;if(elbow)elbow.rotation.x=-.16-wave*.45;}
  function setView(){const mobile=container.clientWidth<500;controls.target.set(0,close?1.44:.98,0);camera.position.set(close?.86:1.9,close?1.64:1.45,close?1.40:mobile?3.8:3.5);camera.fov=close?33:34;camera.updateProjectionMatrix();controls.update();render();}
  function resize(){if(disposed)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;setView();}
  function stop(){running=false;cancelAnimationFrame(frame);events.onStop();}
  function tick(time:number){if(!running||disposed||!visible)return;if(!last)last=time;elapsed+=Math.min((time-last)/1000,.06);last=time;pose(elapsed);render();if(elapsed>=7){stop();return;}frame=requestAnimationFrame(tick);}
  function onVisibility(){if(document.hidden)stop();}
  function onReduced(){if(reduced.matches)stop();}
  function onLost(e:Event){e.preventDefault();stop();events.onFailure();}
  const observer=new ResizeObserver(resize);cleanup.push(()=>observer.disconnect());observer.observe(container);
  const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible)stop();},{threshold:.03});cleanup.push(()=>intersection.disconnect());intersection.observe(container);
  controls.addEventListener('change',render);document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onReduced);renderer.domElement.addEventListener('webglcontextlost',onLost);
  cleanup.push(()=>{document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);renderer.domElement.removeEventListener('webglcontextlost',onLost);});
  void createHumanoid().then(model=>{if(disposed){disposeHumanoid(model);return;}root=model;scene.add(model);ready=true;container.dataset.model='core-humanoid';resize();events.onReady();}).catch(()=>{if(!disposed)events.onFailure();});
  return {
    play(on){if(!on||!ready||!visible||document.hidden||reduced.matches){stop();return false;}if(elapsed>=7)elapsed=0;running=true;last=0;frame=requestAnimationFrame(tick);return true;},
    reset(){stop();elapsed=0;pose(0);close=false;setView();events.onView(false);},
    rotate(direction){camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),direction*.27).add(controls.target);controls.update();render();},
    view(next){stop();close=next;setView();},
    dispose(){if(disposed)return;disposed=true;release();},
  };
  } catch(error) {disposed=true;release();throw error;}
}
