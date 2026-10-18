// Product sculpture reused from the original CORE Intelligence renderer.
import * as T from 'three';
export type Quality='high'|'medium'|'low';
export type NodeState='idle'|'hover'|'active'|'processing'|'connected'|'warning'|'inactive';
/** Shared physical vocabulary. Geometry is illustrative; it is not live telemetry. */
export function studio(renderer:T.WebGLRenderer){
 const env=new T.Scene();env.background=new T.Color('#26323c');
 const panel=(x:number,y:number,z:number,w:number,h:number,color:string,intensity:number)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m)};
 panel(-5,6,7,5,9,'#edf6ff',5);panel(6,2,2,2,9,'#b4d3e4',3);panel(0,-5,-3,8,2,'#668391',1.5);panel(-4,2,-6,2,8,'#d8e6ec',4);
 const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(env,.025, .1,40);pmrem.dispose();env.traverse((o:any)=>{o.geometry?.dispose();o.material?.dispose()});return target;
}
function grain(){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,v=210+Math.round(20*Math.sin(x*17.13+y*.13)*Math.cos(y*7.71));data[k]=data[k+1]=data[k+2]=v;data[k+3]=255}const tex=new T.DataTexture(data,size,size);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(8,2);tex.needsUpdate=true;return tex}
function arc(radius:number,width:number,start:number,length:number,depth:number,material:T.Material){
 const s=new T.Shape();s.absarc(0,0,radius+width/2,start,start+length,false);s.absarc(0,0,radius-width/2,start+length,start,true);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:28});g.translate(0,0,-depth/2);return new T.Mesh(g,material);
}
export class IntelligenceRig extends T.Group {
 private materialPairs:{mesh:T.Mesh;original:T.Material;simple:T.Material}[]=[];private originalMatrices:T.Matrix4[]=[];private texture=grain();private glass:T.MeshPhysicalMaterial;private energy:T.MeshStandardMaterial;private lamellae:T.InstancedMesh;private iris=new T.Group();private shell=new T.Group();private field:T.ShaderMaterial;
 constructor(){super();
 const metal=new T.MeshPhysicalMaterial({color:'#849ba7',metalness:.95,roughness:.27,roughnessMap:this.texture,envMapIntensity:1.25,clearcoat:.3,clearcoatRoughness:.25});
 const ceramic=new T.MeshPhysicalMaterial({color:'#192830',metalness:.65,roughness:.29,roughnessMap:this.texture,clearcoat:.45,envMapIntensity:1.1});
 this.glass=new T.MeshPhysicalMaterial({color:'#d7e7ed',metalness:0,roughness:.035,transmission:.95,thickness:.08,ior:1.24,envMapIntensity:1.4,clearcoat:1,attenuationColor:new T.Color('#9abac9'),attenuationDistance:3,side:T.DoubleSide});
 this.energy=new T.MeshStandardMaterial({color:'#c7e2ea',metalness:.6,roughness:.2,emissive:'#8bbbd0',emissiveIntensity:.36,envMapIntensity:1.1});
 // Interrupted machined enclosure: broad surfaces, narrow chamfers and visible air gaps.
 for(let i=0;i<3;i++){const a=arc(2.25,.22,i*Math.PI*2/3+.12,1.72,.19,i===1?metal:ceramic);this.shell.add(a);const edge=arc(2.39,.016,i*Math.PI*2/3+.13,1.68,.025,metal);this.shell.add(edge)}
 this.shell.rotation.set(.22,-.35,-.32);this.add(this.shell);
 const orbital=arc(1.99,.065,.2,5.3,.055,metal);orbital.rotation.set(-.48,.6,.38);this.add(orbital);
 const lens=new T.Mesh(new T.SphereGeometry(1.85,40,24,.15,1.45,.38,2.32),this.glass);lens.scale.set(1,1,.3);lens.rotation.set(.08,-.18,.3);this.add(lens);
 const chamber=arc(1.62,.1,.4,5.45,.2,ceramic);chamber.rotation.set(.15,.3,-.3);this.iris.add(chamber);
 // One instanced folded computation stack, rather than independent particle clouds.
 this.lamellae=new T.InstancedMesh(new T.BoxGeometry(1,.038,.065),metal,52);const d=new T.Object3D();
 for(let i=0;i<52;i++){const t=i/51,y=(t-.5)*2.65;d.position.set(Math.sin(t*Math.PI*2)*.16,y,Math.cos(t*Math.PI*2)*.39);d.scale.set(Math.sqrt(Math.max(.025,1-Math.pow(y/1.4,2)))*2.5,1,1);d.rotation.set(0,(t-.5)*1.4,Math.sin(t*Math.PI*2)*.16);d.updateMatrix();this.lamellae.setMatrixAt(i,d.matrix);this.originalMatrices.push(d.matrix.clone())}this.iris.add(this.lamellae);
 const heart=new T.Mesh(new T.BoxGeometry(.13,1.05,.17),this.energy);heart.rotation.z=-.22;this.iris.add(heart);
 const points:T.Vector3[]=[];for(let i=0;i<28;i++){const a=i/28*Math.PI*2,b=(i+9)/28*Math.PI*2;points.push(new T.Vector3(Math.cos(a)*1.35,Math.sin(a)*1.35,-.17),new T.Vector3(Math.cos(b)*.68,Math.sin(b)*.68,.22))}this.iris.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#9ec8d8',transparent:true,opacity:.16,depthWrite:false})));
 this.iris.rotation.set(-.1,.25,.18);this.add(this.iris);
 this.field=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0}},vertexShader:`varying vec3 n;varying vec3 v;varying vec3 p;void main(){p=position;vec4 q=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-q.xyz;gl_Position=projectionMatrix*q;}`,fragmentShader:`uniform float time;varying vec3 n;varying vec3 v;varying vec3 p;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);float band=.65+.35*sin(p.y*15.+p.x*4.+time*.16);gl_FragColor=vec4(.48,.66,.74,f*band*.08);}`});
 const field=new T.Mesh(new T.TorusGeometry(2.04,.21,12,100,5.65),this.field);field.rotation.set(.18,-.37,-.22);this.add(field);
 const local=new T.PointLight('#b1d9e8',2.2,7,2);local.position.set(0,0,1.1);this.add(local);
 this.traverse((o:any)=>{if(o.isMesh&&o.material?.isMeshPhysicalMaterial&&o.material!==this.glass){const m=o.material;this.materialPairs.push({mesh:o,original:m,simple:new T.MeshStandardMaterial({color:m.color,metalness:m.metalness,roughness:m.roughness,envMapIntensity:m.envMapIntensity})})}});
 }
 update(t:number,response=0){this.iris.rotation.y=.25+Math.sin(t*.09)*.06;this.shell.rotation.y=-.35+Math.sin(t*.065)*.023;this.lamellae.scale.setScalar(1+Math.sin(t*.48)*.005);this.energy.emissiveIntensity=.34+Math.sin(t*.48)*.015+response*.14;this.field.uniforms.time.value=t}
 quality(q:Quality){for(const p of this.materialPairs)p.mesh.material=q==='low'?p.simple:p.original;this.traverse((o:any)=>{if(o.isPointLight||o.material===this.field||o.material===this.glass)o.visible=q!=='low'});this.glass.transmission=q==='low'?0:.91;this.glass.transparent=q==='low';this.glass.opacity=q==='low'?.12:1;this.lamellae.count=q==='low'?26:52;for(let i=0;i<this.lamellae.count;i++)this.lamellae.setMatrixAt(i,this.originalMatrices[q==='low'?i*2:i]);this.lamellae.instanceMatrix.needsUpdate=true;}
 dispose(){this.texture.dispose();this.materialPairs.forEach(p=>{p.original.dispose();p.simple.dispose()})}
}
