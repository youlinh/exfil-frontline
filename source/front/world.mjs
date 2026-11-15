import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { skyDome,wetGround,makeWeather,practicalLight } from './weather.mjs';
import { dressPort } from './port-props.mjs';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LABELS } from './labels.mjs';
import { MAPS, ITEMS, PLATFORM, RAMP, altitude, randomSource } from './core.mjs';
import { prepareSoldier, Soldier } from './soldier.mjs';
import modelData from './assets/field-operator.glb';
import clipData from './assets/field-motions.glb';

let soldierAsset;
function sharedSoldier(){
  soldierAsset??=prepareSoldier(modelData,clipData).catch(error=>{soldierAsset=null;throw error;});
  return soldierAsset;
}

const meshBox=new T.BoxGeometry(1,1,1);
const meshSphere=new T.SphereGeometry(1,17,12);
const meshCylinder=new T.CylinderGeometry(1,1,1,12);
const meshCone=new T.ConeGeometry(1,1,7);
const bevelBox=new RoundedBoxGeometry(1,1,1,1,.095);
const unlit=(color)=>new T.MeshBasicMaterial({color});
const matte=(color)=>new T.MeshStandardMaterial({color,roughness:.84});
const palette={
  steel:matte(0x4c554b), frame:matte(0x232d29), concrete:matte(0x8d8c78), curb:matte(0x797a69),
  roof:matte(0x4a524b), glass:matte(0x405b60), trim:matte(0xa8ac91), stripe:matte(0xaea366),
  rail:matte(0xb2a68f), lamp:unlit(0xfbe6a2), mark:unlit(0xffbd69),
  groundMark:new T.MeshBasicMaterial({color:0xe8a853,transparent:true,opacity:.79,side:T.DoubleSide}),
  glove:matte(0x8a7758),
  gun:matte(0x282d31), gunGrip:matte(0x15191b), gunSlide:matte(0x61696e), scopeGlass:matte(0x38635f), brass:matte(0xa29e66),
  pine:matte(0x304436), bark:matte(0x514c3a)
};
function shape(parent,geometry,material,x,y,z,w,h,d) {
  const mesh=new T.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.scale.set(w,h,d);
  parent.add(mesh);
  return mesh;
}
const box=(parent,m,x,y,z,w,h,d)=>shape(parent,meshBox,m,x,y,z,w,h,d);
const ell=(parent,m,x,y,z,w,h,d)=>shape(parent,meshSphere,m,x,y,z,w,h,d);
const bevel=(parent,m,x,y,z,w,h,d)=>shape(parent,bevelBox,m,x,y,z,w,h,d);
const tube=(parent,m,x,y,z,r,h,rz=r)=>shape(parent,meshCylinder,m,x,y,z,r,h,rz);
function post(parent,material,from,to,r=.05) {
  const a=new T.Vector3(...from), b=new T.Vector3(...to), offset=b.sub(a);
  const mid=a.addScaledVector(offset,.5);
  const piece=tube(parent,material,mid.x,mid.y,mid.z,r,offset.length());
  piece.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),offset.normalize());
  return piece;
}
function gritty(color,scale,variant) {
  const size=256,rng=randomSource(730+variant),pixels=new Uint8Array(size*size*4);
  const knots=[4,12,28,64].map(n=>({n,values:Float32Array.from({length:n*n},()=>rng())}));
  const col=[(color>>16)&255,(color>>8)&255,color&255];
  const field=(x,y,{n,values})=>{
    const u=x*n/size,v=y*n/size,x0=Math.floor(u),y0=Math.floor(v);
    const f=u-x0,g=v-y0,a=f*f*(3-2*f),b=g*g*(3-2*g);
    const sam=(i,j)=>values[(j%n)*n+i%n];
    const t=sam(x0,y0), q=sam(x0,y0+1);
    return t+(sam(x0+1,y0)-t)*a+((q+(sam(x0+1,y0+1)-q)*a)-(t+(sam(x0+1,y0)-t)*a))*b;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const q=(y*size+x)*4;
    const patch=field(x,y,knots[0]),aggregate=field(x,y,knots[1]),chip=field(x,y,knots[2]),grain=field(x,y,knots[3]);
    const fleck=rng(),wear=(patch-.5)*21+(aggregate-.5)*23+(chip-.5)*20+(grain-.5)*18+(fleck-.5)*29;
    const pock=grain<.14?-11:fleck>.94?15:0;
    for(let c=0;c<3;c++)pixels[q+c]=Math.max(0,Math.min(255,col[c]+wear+pock+(c===0?(patch-.5)*7:0)));
    pixels[q+3]=255;
  }
  const tex=new T.DataTexture(pixels,size,size);
  tex.colorSpace=T.SRGBColorSpace;
  tex.wrapS=tex.wrapT=T.RepeatWrapping;
  tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
  tex.repeat.set(scale,scale);tex.anisotropy=8;tex.needsUpdate=true;
  return new T.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.033,roughness:.78,metalness:.079});
}
function groundPlane(parent,material,x,z,w,d,y) {
  const plane=new T.Mesh(new T.PlaneGeometry(w,d),material);
  plane.rotation.x=-Math.PI/2;
  plane.position.set(x,y,z);
  parent.add(plane);
}
const surfaces=new Map();
function industrial(color,rough=.55) {
  if(surfaces.has(color))return surfaces.get(color);
  const m=new T.MeshStandardMaterial({color,roughness:rough,metalness:.23});
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 wetPosition;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwetPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying vec3 wetPosition;
        float dirt(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.0-2.0*f);
          return mix(mix(fract(sin(dot(i,vec2(43.91,89.3)))*47831.91),fract(sin(dot(i+vec2(1,0),vec2(43.91,89.3)))*47831.91),f.x),
            mix(fract(sin(dot(i+vec2(0,1),vec2(43.91,89.3)))*47831.91),fract(sin(dot(i+vec2(1),vec2(43.91,89.3)))*47831.91),f.x),f.y);}
      `)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 w=vec2(wetPosition.x+wetPosition.z*1.27,wetPosition.y);
        float run=dirt(w*vec2(14.2,1.8)), mottled=dirt(w*vec2(2.5,9.1));
        float grain=dirt(w*vec2(85.0,67.0));
        float mud=smoothstep(.48,.79,.58*dirt(w*vec2(.92,1.1))+.42*run);
        diffuseColor.rgb*=mix(.63,1.38,.51*run+.27*mottled+.22*grain);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.54+vec3(.095,.044,.025),mud*.56);
      `)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+run*.35-.18,.28,.91);');
  };
  surfaces.set(color,m);
  return m;
}
function building(parent,b,index) {
  const group=new T.Group();
  group.position.set(b.x,0,b.z);
  parent.add(group);
  if(b.kind==='rock') {
    const g=new T.DodecahedronGeometry(1,0);
    const st=matte(0x797d70);
    shape(group,g,st,0,b.h*.3,0,b.w*.56,b.h*.59,b.d*.56).rotation.y=.5+index;
    shape(group,g,matte(0x636e5d),b.w*.36,b.h*.17,.4,b.w*.35,b.h*.43,b.d*.42).rotation.y=index;
    return;
  }
  if(b.kind==='stack') {
    for(let j=0;j<2;j++) {
      const layer=new T.Group();
      layer.position.set(j*.045,b.h*j/2,j*.07);
      group.add(layer);
      building(layer,{x:0,z:0,w:b.w,d:b.d,h:b.h/2,kind:'cargo'},index+j*2);
    }
    return;
  }
  if(b.kind==='cargo'||b.kind==='barrier') {
    const colors=[0x76634d,0x3d595e,0x8a5142,0x4b606e,0x686b56,0x655447];
    const tone=b.kind==='cargo'?colors[index%colors.length]:0x838079;
    const skin=industrial(tone);
    const shadeTone=new T.Color(tone).multiplyScalar(.72).getHex();
    const shade=industrial(shadeTone);
    const edgeTone=industrial(new T.Color(tone).multiplyScalar(1.23).getHex());
    box(group,skin,0,b.h*.5,0,b.w,b.h,b.d);
    box(group,palette.frame,0,.10,0,b.w+.05,.18,b.d+.05);
    box(group,palette.frame,0,b.h-.05,0,b.w+.03,.14,b.d+.03);
    const along=b.w>b.d, wide=along?b.w:b.d, depth=along?b.d:b.w;
    for(const dir of [-1,1]) {
      for(let x=-wide/2+.22;x<wide/2-.2;x+=.28) {
        box(group,shade,along?x:dir*(depth/2+.026),b.h*.52,along?dir*(depth/2+.026):x,along?.138:.072,b.h*.84,along?.072:.138);
        box(group,edgeTone,along?x+.046:dir*(depth/2+.064),b.h*.52,along?dir*(depth/2+.064):x+.046,along?.028:.023,b.h*.84,along?.023:.028);
      }
      for(const edge of [-1,1])box(group,palette.frame,along?edge*(wide/2-.08):dir*(depth/2-.07),b.h*.5,along?dir*(depth/2-.07):edge*(wide/2-.08),.16,b.h,.16);
    }
    const cap=wide/2+.037;
    for(const face of [-1,1]) {
      box(group,skin,along?face*cap:0,b.h*.51,along?0:face*cap,along?.070:depth*.91,b.h*.84,along?depth*.91:.070);
      box(group,palette.frame,along?face*(cap+.04):0,b.h*.51,along?0:face*(cap+.04),.035,b.h*.88,.036);
      for(const q of [-.34,-.14,.14,.34]) {
        tube(group,palette.trim,along?face*(cap+.067):q*depth,b.h*.52,along?q*depth:face*(cap+.067),.019,b.h*.78);
        for(const yy of [.31,.71])box(group,palette.steel,along?face*(cap+.08):q*depth,yy*b.h,along?q*depth:face*(cap+.08),along?.06:.125,.083,along?.125:.06);
      }
      for(const edge of [-1,1])for(const yy of [.12,b.h-.12])bevel(group,palette.trim,along?face*cap:edge*depth*.46,yy,along?edge*depth*.46:face*cap,.14,.13,.14);
    }
    if(b.kind==='cargo')for(const label of [-1,1]) {
      const bright=index%4===0?palette.stripe:palette.trim;
      const x=-wide*.23,z=label*(depth/2+.075);
      for(let i=0;i<5;i++)box(group,bright,along?x+i*.085:z,b.h*.72,along?z:x+i*.085,along?.037:.012,i%2?.105:.067,along?.012:.037);
    }
    return;
  }
  const wall=industrial([0x656b6b,0x77746e,0x586669,0x5c5f60][index%4],.79);
  box(group,wall,0,b.h*.5,0,b.w,b.h,b.d);
  box(group,palette.frame,0,.21,0,b.w+.06,.42,b.d+.06);
  box(group,palette.roof,0,b.h+.13,0,b.w+.52,.32,b.d+.49);
  box(group,palette.trim,0,b.h-.27,0,b.w+.07,.13,b.d+.05);
  const facade=b.d/2+.035;
  const door=-b.w*.27;
  box(group,palette.frame,door,1.27,facade,2.0,2.65,.10);
  box(group,palette.steel,door,1.29,facade+.06,1.66,2.38,.09);
  box(group,palette.lamp,door,2.79,facade+.08,.35,.14,.12);
  for(let x=-b.w*.11;x<b.w*.45;x+=1.35) {
    box(group,palette.frame,x,b.h-.98,facade,.97,.91,.105);
    box(group,palette.glass,x,b.h-1.0,facade+.059,.78,.72,.025);
    box(group,palette.trim,x,b.h-1.0,facade+.075,.032,.72,.025);
    box(group,palette.frame,x,b.h-1.18,-facade,1.02,.66,.09);
    box(group,palette.glass,x,b.h-1.18,-facade-.052,.81,.50,.03);
  }
  for(const dir of [-1,1])for(let z=-b.d/2+.1;z<b.d/2;z+=2.3)box(group,palette.steel,dir*(b.w/2+.03),b.h*.51,z,.12,b.h*.91,.09);
  const ramp=box(group,palette.roof,door,.17,facade+.58,2.61,.34,1.40);ramp.rotation.x=-.14;
  for(let i=0;i<3;i++)box(group,palette.concrete,door,.05+i*.09,facade+.92-i*.24,2.42,.11,.33);
  for(const side of [-1,1])for(let j=0;j<6;j++)box(group,palette.steel,side*(b.w/2+.03),b.h*.38+j*.11,0,.42,.028,b.d*.86);
  box(group,palette.steel,b.w*.23,b.h+.58,-b.d*.13,1.35,.65,1.2);
  box(group,palette.trim,b.w*.23,b.h+.91,-b.d*.13,1.46,.09,1.33);
  post(group,palette.steel,[-b.w*.31,b.h,0],[-b.w*.31,b.h+2.4,0],.044);
  post(group,palette.steel,[-b.w*.31-.45,b.h+2.12,0],[-b.w*.31+.45,b.h+2.12,0],.03);
}
const labelTextures=new Map();
const loader=new T.TextureLoader();
function signTexture(label) {
  if(!labelTextures.has(label)) {
    const texture=loader.load(LABELS[label]);
    texture.colorSpace=T.SRGBColorSpace;
    labelTextures.set(label,texture);
  }
  return labelTextures.get(label);
}
function labelSprite(parent,label,x,y,z,width) {
  const m=new T.SpriteMaterial({map:signTexture(label),transparent:true,depthWrite:false});
  const sprite=new T.Sprite(m);sprite.position.set(x,y,z);sprite.scale.set(width,width*.203,1);parent.add(sprite);
  return sprite;
}
function tower(parent,map) {
  const t=new T.Group();
  t.position.set(map.tower.x,0,map.tower.z);
  parent.add(t);
  const fat=gritty(0x948f79,2,8);
  shape(t,new T.CylinderGeometry(1.43,1.87,16.5,16),fat,0,8.25,-2.3,1,1,1);
  const rings=[.24,3.87,5.0,12.08,15.31];
  for(const y of rings) tube(t,y===3.87||y===12.08?palette.steel:palette.curb,0,y,-2.3,1.88-y*.026,.24);
  for(const y of [6.5,9.1,12.8]) {
    box(t,palette.frame,0,y,-.75,.59,.95,.07);
    box(t,palette.glass,0,y,-.7,.44,.70,.06);
    box(t,palette.trim,0,y-.5,-.63,.63,.11,.31);
  }
  tube(t,palette.frame,0,16.58,-2.3,2.20,.40);
  tube(t,palette.glass,0,17.68,-2.3,1.70,1.80);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    tube(t,palette.trim,Math.cos(a)*1.72,17.67,-2.3+Math.sin(a)*1.72,.046,1.86);
  }
  tube(t,palette.lamp,0,17.7,-2.30,.52,.74);
  shape(t,meshCone,palette.frame,0,19.10,-2.3,2.05,1.22,2.05);
  post(t,palette.steel,[0,19.38,-2.3],[0,21.08,-2.3],.045);
  const material=new T.MeshBasicMaterial({color:0xf5d9ab,transparent:true,opacity:.039,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  const light=new T.Mesh(new T.ConeGeometry(6.4,63,20,1,true),material);
  t.add(light);
  for(const x of [-4,-2,2,4])for(const z of [-3,3]) {
    post(t,palette.steel,[x,0,z],[x,PLATFORM,z],.12);
    post(t,palette.frame,[x,.45,z],[x>0?x-.95:x+.95,PLATFORM,z],.07);
  }
  box(t,palette.steel,0,PLATFORM-.14,0,9.24,.28,7.62);
  for(const x of [-4.5,4.5]) {
    for(let z=-3.6;z<=3.7;z+=1.2)post(t,palette.rail,[x,PLATFORM,z],[x,PLATFORM+1.05,z],.042);
    for(const y of [PLATFORM+.48,PLATFORM+1.05])post(t,palette.rail,[x,y,-3.63],[x,y,3.7],.045);
  }
  for(const range of [[-4.48,-2.12],[2.12,4.48]]) {
    for(const x of [range[0],(range[0]+range[1])/2,range[1]])post(t,palette.rail,[x,PLATFORM,3.72],[x,PLATFORM+1.05,3.72],.047);
    post(t,palette.rail,[range[0],PLATFORM+1.05,3.72],[range[1],PLATFORM+1.05,3.72],.047);
  }
  post(t,palette.rail,[-4.55,PLATFORM+1,-3.67],[4.55,PLATFORM+1,-3.67],.044);
  const steps=24;
  for(let i=0;i<steps;i++) {
    const z=3.8+(i+.5)*RAMP/steps,y=PLATFORM*(1-(i+.5)/steps);
    box(t,i%6===0?palette.curb:palette.steel,0,y-.08,z,4.08,.18,RAMP/steps+.02);
    if(i%5===0)for(const x of [-2.04,2.04])post(t,palette.rail,[x,y-.1,z],[x,y+1,z],.042);
  }
  for(const x of [-2.05,2.05])for(const h of [.52,1])post(t,palette.rail,[x,PLATFORM+h,3.75],[x,h,3.8+RAMP],.042);
  const ring=new T.Mesh(new T.RingGeometry(1.1,1.20,32),palette.groundMark);
  ring.rotation.x=-Math.PI/2;
  ring.position.set(0,PLATFORM+.014,1.35);
  t.add(ring);
  box(t,palette.frame,.82,PLATFORM+.38,1.87,.38,.76,.38);
  box(t,palette.mark,.82,PLATFORM+.79,1.87,.34,.105,.34);
  tube(t,palette.frame,2.55,PLATFORM+.09,-.3,.32,.18);
  post(t,palette.frame,[2.55,PLATFORM,-.3],[2.55,PLATFORM+1.39,-.3],.12);
  post(t,palette.trim,[2.55,PLATFORM+1.39,-.05],[2.55,PLATFORM+1.51,-.86],.155);
  ell(t,palette.glass,2.55,PLATFORM+1.51,-.85,.14,.14,.08);
  labelSprite(t,'望明灯塔',0,10.15,.05,6.3);
  labelSprite(t,'撤离信标',0,PLATFORM+1.90,1.35,2.8);
  labelSprite(t,'64× 望远镜',2.55,PLATFORM+1.95,-.3,2.4);
  labelSprite(t,'中层平台入口',0,1.97,3.8+RAMP,3.7);
  return light;
}
function lampPost(parent,x,z) {
  post(parent,palette.frame,[x,0,z],[x,6.4,z],.095);
  post(parent,palette.steel,[x,6.4,z],[x,6.4,z-1.5],.075);
  box(parent,palette.frame,x,6.36,z-1.48,.41,.21,.64);
  box(parent,palette.lamp,x,6.24,z-1.48,.30,.035,.48);
}
function combineStatic(root, scene) {
  const groups=new Map();
  root.updateMatrixWorld(true);
  root.traverse(n=>{
    if(!n.isMesh||n.isInstancedMesh||n.userData.noShadow||n.material.transparent)return;
    let buckets=groups.get(n.material);
    if(!buckets){buckets=[[],[]];groups.set(n.material,buckets);}
    buckets[n.geometry.index?1:0].push(n);
  });
  for(const [material,buckets] of groups)for(const nodes of buckets){
    if(nodes.length<3)continue;
    const geometries=nodes.map(n=>n.geometry.clone().applyMatrix4(n.matrixWorld));
    const merged=mergeGeometries(geometries);
    for(const g of geometries)g.dispose();
    if(!merged)continue;
    for(const n of nodes)n.removeFromParent();
    scene.add(new T.Mesh(merged,material));
  }
}
function scenery(parent,map,index) {
  const landWidth=map.sea?map.sea>0?map.sea+96:96-map.sea:192;
  const landCenter=map.sea?map.sea>0?(map.sea-96)/2:(map.sea+96)/2:0;
  groundPlane(parent,gritty(map.ground,29,index),landCenter,0,landWidth,192,0);
  if(map.sea) {
    groundPlane(parent,gritty(map.water,9,9),map.sea>0?map.sea+58:map.sea-58,0,116,211,-.39);
    box(parent,palette.curb,map.sea-.12,-.01,0,.26,.36,150);
    for(let z=-72;z<74;z+=9) {
      box(parent,palette.frame,map.sea,.32,z,.54,.75,.44);
      box(parent,palette.stripe,map.sea,.72,z,.55,.13,.44);
    }
  }
  const roadX=index===1?25:index===0?-36:-46;
  groundPlane(parent,gritty(index===2?0x4c4441:0x454a4e,32,idx(index)),roadX,0,8.3,145,.012);
  const roadZ=index===1?38:40;
  groundPlane(parent,gritty(0x474c50,25,18),0,roadZ,129,5.4,.017);
  for(let z=-69;z<70;z+=7)if(Math.abs(z-roadZ)>4)box(parent,palette.stripe,roadX,.024,z,.11,.021,2.6);
  for(let x=-58;x<57;x+=6)box(parent,palette.curb,x,.027,roadZ,.95,.021,.10);
  map.boxes.forEach((b,i)=>building(parent,b,i));
  lampPost(parent,map.tower.x+5,map.tower.z+14);
  const rng=randomSource(744+index), dummy=new T.Object3D();
  const trunks=new T.InstancedMesh(meshCylinder,palette.bark,90);
  const tops=new T.InstancedMesh(meshCone,palette.pine,180);
  let c=0;
  for(let i=0;i<250&&c<90;i++) {
    const x=(rng()-.5)*186,z=(rng()-.5)*186;
    if(map.sea&&(map.sea>0?x>map.sea-1:x<map.sea+1))continue;
    const edge=Math.abs(x)>65||Math.abs(z)>67;
    if(!edge&&(index!==1||rng()<.65))continue;
    if(Math.hypot(x-map.tower.x,z-map.tower.z)<23||Math.hypot(x-map.spawn.x,z-map.spawn.z)<12||Math.abs(x-roadX)<5||Math.abs(z-roadZ)<4)continue;
    if(map.boxes.some(b=>Math.abs(x-b.x)<b.w*.5+2&&Math.abs(z-b.z)<b.d*.5+2))continue;
    const h=4+rng()*7,r=.75+rng()*1.1;
    dummy.rotation.y=rng()*6;
    dummy.position.set(x,h*.30,z);dummy.scale.set(.15,h*.59,.15);dummy.updateMatrix();trunks.setMatrixAt(c,dummy.matrix);
    dummy.position.y=h*.64;dummy.scale.set(r,h*.65,r);dummy.updateMatrix();tops.setMatrixAt(c*2,dummy.matrix);
    dummy.position.y=h*.86;dummy.scale.set(r*.71,h*.58,r*.71);dummy.updateMatrix();tops.setMatrixAt(c*2+1,dummy.matrix);
    const tone=new T.Color().setHSL(.265+rng()*.04,.15+rng()*.16,.32+rng()*.22);
    tops.setColorAt(c*2,tone);tops.setColorAt(c*2+1,tone.clone().multiplyScalar(1.11));
    c++;
  }
  trunks.count=c;tops.count=c*2;
  parent.add(trunks,tops);
  const stones=new T.InstancedMesh(new T.DodecahedronGeometry(1),palette.concrete,130);
  for(let i=0;i<130;i++) {
    const x=landCenter+(rng()-.5)*landWidth*.85,z=(rng()-.5)*165;
    dummy.position.set(x,-.055,z);dummy.rotation.set(rng(),rng()*6,rng());
    dummy.scale.set(.14+rng()*.31,.06+rng()*.18,.14+rng()*.24);
    dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);
  }
  parent.add(stones);
  if(index!==1) {
    const x=index===0?47:-53,z=-57;
    for(const a of [-3,3])for(const b of [-3,3])post(parent,palette.roof,[x+a,0,z+b],[x+a*.66,14,z+b*.66],.17);
    post(parent,palette.steel,[x-7,14,z],[x+8,14,z],.18);
    post(parent,palette.steel,[x-7,14,z],[x+8,15.8,z],.12);
    post(parent,palette.steel,[x+6,14.7,z],[x+6,8.7,z],.049);
  }
  dressPort(parent,map,index);
}
const idx=n=>n+31;

const metalDark=industrial(0x292b2f,.49);
const metalEdge=industrial(0x555a60,.42);
const polymer=new T.MeshStandardMaterial({color:0x22262a,roughness:.82,metalness:.06});
const opticCoat=new T.MeshStandardMaterial({color:0x304950,roughness:.27,metalness:.68});
const magGripY=id=>id==='p9'?-.26:-.29;
function gunParts(parent,id) {
  const def=ITEMS[id], form=def?.form;
  if(!form)return {};
  if(form==='blade') {
    bevel(parent,palette.gunGrip,.015,-.01,.02,.059,.073,.21);
    const profile=new T.Shape();
    profile.moveTo(-.074,-.035);profile.lineTo(-.074,.037);profile.lineTo(-.293,.039);
    profile.lineTo(-.368,.013);profile.lineTo(-.283,-.035);profile.closePath();
    const g=new T.ExtrudeGeometry(profile,{depth:.011,bevelEnabled:true,bevelSize:.007,bevelThickness:.003,bevelSegments:1});
    const edge=new T.Mesh(g,metalEdge);
    edge.rotation.y=-Math.PI/2;edge.position.x=.015;parent.add(edge);
    bevel(parent,palette.frame,.015,.01,-.07,.092,.124,.042);
    return {muzzle:.33};
  }
  const pistol=form==='pistol',short=form==='smg',sniper=form==='sniper';
  const length=pistol?.28:short?.52:sniper?1.05:id==='m500'?.74:.77;
  const width=pistol?.067:sniper?.096:.109;
  const receiver=new T.Group(),action=new T.Group();parent.add(receiver,action);
  bevel(receiver,metalDark,0,.003,-length*.30,width,.127,length*.65);
  bevel(action,metalEdge,0,.056,-length*.29,width*.96,.053,length*.66);
  bevel(action,metalDark,0,.085,-length*.29,width*.78,.025,length*.59);
  bevel(receiver,polymer,0,-.101,.016,.071,.192,.091).rotation.x=-.25;
  for(let i=0;i<7;i++){
    const y=-.046-i*.019;
    box(receiver,palette.gunSlide,.033,y,.026-y*.17,.008,.009,.058).rotation.x=-.23;
  }
  const magazine=new T.Group();
  const magHome=-length*(pistol?.08:sniper?.28:.29);
  magazine.position.set(0,-.081,magHome);parent.add(magazine);
  bevel(magazine,polymer,0,-.078,.004,pistol?.054:.078,pistol?.122:sniper?.133:.206,.096).rotation.x=pistol?-.08:-.15;
  bevel(magazine,metalEdge,0,pistol?-.134:-.17,.013,.084,.021,.105);
  if(!pistol)for(let i=0;i<5;i++)for(const side of [-1,1]){
    box(magazine,metalDark,side*.04,-.028-i*.024,.025,.007,.013,.064);
  }
  const trigger=bevel(parent,palette.gunSlide,0,-.06,-.061,.018,.062,.018);
  trigger.rotation.x=.24;
  for(const side of [-1,1]){
    const sx=side*width*.49;
    bevel(receiver,metalEdge,sx,.012,-length*.17,.009,.068,.12);
    box(receiver,palette.gunGrip,sx*1.048,.038,-length*.25,.007,.029,.103);
    bevel(receiver,metalEdge,sx*1.08,.04,-length*.26,.012,.012,.074);
    for(const z of [-.015,-length*.38,-length*.51]){
      const pin=tube(receiver,palette.gunSlide,sx*1.06,.015,z,.010,.012);
      pin.rotation.z=Math.PI/2;
    }
    post(receiver,polymer,[side*.033,-.048,-.012],[side*.033,-.115,-.106],.011);
    post(receiver,polymer,[side*.033,-.115,-.106],[side*.033,-.041,-.155],.011);
  }
  post(parent,metalEdge,[0,.035,-length*.44],[0,.035,-length-.055],pistol?.015:sniper?.021:.024);
  post(parent,metalDark,[0,.035,-length+.005],[0,.035,-length-.084],pistol?.022:sniper?.038:.033);
  post(parent,palette.gunGrip,[0,.035,-length-.082],[0,.035,-length-.088],pistol?.014:.021);
  if(!pistol){
    bevel(receiver,metalDark,0,.006,-length*.65,width*.87,.103,length*.36);
    for(const side of [-1,1])for(let z=-length*.55;z>-length*.815;z-=.035) {
      bevel(receiver,palette.gunGrip,side*width*.44,.008,z,.009,.018,.027);
      bevel(receiver,metalEdge,side*width*.47,.029,z,.006,.012,.019);
    }
    bevel(receiver,polymer,0,.007,.148,.076,.068,.224);
    bevel(receiver,polymer,0,-.006,.255,.095,.148,.039);
    bevel(receiver,metalEdge,0,.04,.141,.086,.041,.165);
    for(let z=-.064;z>-length*.82;z-=.027)box(parent,metalEdge,0,.105,z,.102,.025,.015);
    for(let z=-length-.021;z>-length-.083;z-=.021)post(parent,metalEdge,[0,.035,z],[0,.035,z-.007],sniper?.040:.035);
    if(sniper)for(const x of [-.031,.031])post(receiver,metalEdge,[x,-.036,-length*.67],[x*2,-.19,-length*.49],.017);
  }
  if(def.zoom>=5) {
    bevel(parent,metalEdge,0,.129,-.20,.098,.041,.19);
    const r=def.zoom===32?.051:.040;
    post(parent,palette.gunGrip,[0,.187,-.045],[0,.187,-.386],r);
    post(parent,metalEdge,[0,.187,-.314],[0,.187,-.414],r*1.43);
    post(parent,metalEdge,[0,.187,-.042],[0,.187,-.093],r*1.25);
    ell(parent,opticCoat,0,.187,-.039,r*.94,r*.94,.012);
    ell(parent,opticCoat,0,.187,-.420,r*1.16,r*1.16,.011);
    tube(parent,metalEdge,0,.246,-.19,.027,.041);
    const windage=tube(parent,metalDark,.050,.192,-.19,.021,.023);windage.rotation.z=1.57;
  } else if(pistol) {
    bevel(parent,metalDark,0,.109,-length*.77,.025,.029,.016);
    bevel(parent,metalDark,0,.106,.002,.057,.021,.025);
    box(parent,palette.brass,0,.117,-length*.78,.013,.011,.014);
  } else {
    bevel(parent,metalDark,0,.133,-.188,.083,.065,.100);
    for(const side of [-1,1])bevel(parent,metalEdge,side*.034,.189,-.194,.026,.107,.093);
    bevel(parent,metalEdge,0,.237,-.194,.081,.022,.092);
    box(parent,opticCoat,0,.189,-.221,.047,.058,.008);
    box(parent,palette.brass,0,.188,-.217,.006,.006,.009);
  }
  return {magazine,magHome,trigger,action,muzzle:length+.096};
}
function lootMesh(l) {
  const root=new T.Group();
  root.position.set(l.x,l.y,l.z);
  const def=ITEMS[l.item];
  const beam=new T.Mesh(new T.CylinderGeometry(.027,.07,.82,6),new T.MeshBasicMaterial({
    color:l.kind==='gun'?0xe6c470:l.kind==='med'?0xe2ddad:def.color,transparent:true,opacity:.66,depthWrite:false
  }));
  beam.position.y=.58;root.add(beam);
  const active=new T.Group();active.position.set(0,.31,0);root.add(active);
  let itemMaterial;
  if(l.kind==='gun') {
    gunParts(active,l.item);
    active.rotation.x=-.25;
    active.rotation.y=.5;
  } else {
    itemMaterial=matte(def.color);
    box(active,palette.frame,0,0,0,.37,.18,.27);
    box(active,itemMaterial,0,.076,0,.35,.089,.25);
    box(active,palette.gunGrip,0,.08,.136,.11,.068,.036);
  }
  beam.material.opacity=.40;
  const lab=labelSprite(root,def.name,0,.84,0,1.19);
  return {root,active,lab,dispose(){
    root.removeFromParent();
    beam.geometry.dispose();
    beam.material.dispose();
    lab.material.dispose();
    itemMaterial?.dispose();
    if(l.item==='blade')active.traverse(n=>{
      if(n.geometry?.type==='ExtrudeGeometry')n.geometry.dispose();
    });
  }};
}
export class WorldView {
  constructor(container) {
    this.container=container;
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.pixelRatio=Math.min(devicePixelRatio,1.5);
    this.qualityScale=1;this.slowFrames=0;this.qualityTime=0;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.12;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=T.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate=false;
    this.smallViewport=matchMedia('(pointer: coarse)').matches;
    this.renderer.domElement.setAttribute('aria-label','第一人称战场');
    container.append(this.renderer.domElement);
    this.camera=new T.PerspectiveCamera(66,1,.055,235);
    this.camera.rotation.order='YXZ';
    this.actorNodes=new Map();this.lootNodes=new Map();this.fx=[];
    this.modelKey=undefined;this.recoil=0;this.flash=0;this.equip=0;this.gait=0;this.sway=0;this.shells=[];this.eye=1.62;
    this.handsScene=new T.Scene();
    this.handsScene.add(new T.HemisphereLight(0xc1cfdd,0x25242b,1.33));
    const lamp=new T.DirectionalLight(0xffdcba,3.45);
    lamp.position.set(3,5,-2);
    this.handsScene.add(lamp);
    const fill=new T.DirectionalLight(0xc3d2e6,1.5);
    fill.position.set(-2,1.5,3);
    this.handsScene.add(fill);
    this.handsCamera=new T.PerspectiveCamera(64,1,.024,4);
    this.model=new T.Group();this.handsScene.add(this.model);
    this.markerVec=new T.Vector3();this.look=new T.Vector3();this.markerForward=new T.Vector3();
    this.soldiersReady=sharedSoldier().then(asset=>{this.soldiers=asset;return asset;});
    this.soldiersReady.catch(()=>{});
    this.resize();
  }
  resize() {
    const {clientWidth:w,clientHeight:h}=this.container;
    if(!w||!h)return;
    this.camera.aspect=w/h;this.handsCamera.aspect=w/h;
    this.camera.updateProjectionMatrix();this.handsCamera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);
  }
  load(index) {
    if(this.scene) {
      this.clearActors();
      this.clearLoot();
      this.wet?.dispose();this.weather?.dispose();this.keyLight?.shadow.dispose();
      const materials=new Set([...Object.values(palette),...surfaces.values()]);
      const staticGeometries=new Set([meshBox,meshSphere,meshCylinder,meshCone,bevelBox]);
      const processed=new Set();
      this.scene.traverse(n=>{
        if(n.geometry&&!staticGeometries.has(n.geometry)&&!processed.has(n.geometry)) {
          n.geometry.dispose();processed.add(n.geometry);
        }
        if(n.material&&!materials.has(n.material)&&!processed.has(n.material)) {
          if(n.material.map&&!n.material.map.userData.shared&&![...labelTextures.values()].includes(n.material.map))n.material.map.dispose();
          n.material.dispose();processed.add(n.material);
        }
      });
    }
    this.index=index;this.map=MAPS[index];
    this.actorNodes.clear();this.lootNodes.clear();this.fx=[];
    for(const brass of this.shells)this.handsScene.remove(brass.mesh);
    this.shells=[];
    this.scene=new T.Scene();
    this.scene.background=new T.Color(this.map.sky);
    this.scene.fog=new T.FogExp2(this.map.sky,.014);
    this.sky=skyDome(this.scene,index);
    this.scene.add(new T.HemisphereLight(0xa6c2d7,0x37313c,1.98));
    const sun=new T.DirectionalLight(index===1?0xffd1aa:0xffcf98,index===1?2.4:4.05);
    this.keyLight=sun;
    const tx=index===0?-30:this.map.spawn.x, tz=index===0?25:this.map.spawn.z-22;
    const lampX=tx+(index===1?-31:32),lampZ=tz-59;
    sun.position.set(lampX,35,lampZ);sun.target.position.set(tx,0,tz);
    sun.castShadow=true;
    sun.shadow.camera.left=-73;sun.shadow.camera.right=73;
    sun.shadow.camera.top=62;sun.shadow.camera.bottom=-62;
    sun.shadow.camera.far=176;
    sun.shadow.mapSize.set(this.smallViewport?768:1536,this.smallViewport?768:1536);
    sun.shadow.bias=-.00013;sun.shadow.normalBias=.055;
    sun.shadow.intensity=.77;
    this.scene.add(sun,sun.target);
    practicalLight(this.scene,lampX*.76,7,lampZ-30,.95,0xffc379);
    const surroundings=new T.Group();this.scene.add(surroundings);
    scenery(surroundings,this.map,index);
    combineStatic(surroundings,this.scene);
    const landmark=new T.Group();this.scene.add(landmark);
    this.light=tower(landmark,this.map);
    this.light.userData.noShadow=true;
    combineStatic(landmark,this.scene);
    this.scene.traverse(n=>{
      if(!n.isMesh||n===this.sky||n===this.light||n.material.transparent)return;
      n.castShadow=n.geometry?.type!=='PlaneGeometry';
      n.receiveShadow=true;
    });
    this.wet=wetGround(this.scene,this.map,index,this.smallViewport);
    this.weather=makeWeather(this.scene,index,this.smallViewport);
    this.renderer.shadowMap.needsUpdate=true;
    this.camera.fov=66;
    this.setHands(null);
  }
  clearActors(){
    for(const character of this.actorNodes.values()){
      character.stop();
      character.group.removeFromParent();
    }
    this.actorNodes.clear();
  }
  clearLoot(){
    for(const loot of this.lootNodes.values())loot.dispose();
    this.lootNodes.clear();
  }
  begin(){
    this.clearActors();
    this.clearLoot();
    for(const {line} of this.fx){
      line.removeFromParent();
      line.geometry.dispose();
      line.material.dispose();
    }
    this.fx=[];
    this.recoil=this.flash=this.gait=this.sway=0;
    this.eye=1.62;
    for(const brass of this.shells)this.handsScene.remove(brass.mesh);
    this.shells=[];
    this.setHands(null);
    this.camera.fov=65;this.camera.updateProjectionMatrix();
  }
  marker(x,y,z){
    const vector=this.markerVec.set(x,y,z);
    if(this.look.subVectors(vector,this.camera.position).dot(this.camera.getWorldDirection(this.markerForward))<=0)return null;
    vector.project(this.camera);
    if(Math.abs(vector.x)>.95||Math.abs(vector.y)>.90||vector.z>1)return null;
    return vector;
  }
  ambience(t,density=1){
    this.sky.position.copy(this.camera.position);
    this.sky.material.uniforms.uTime.value=t;
    this.wet.material.uniforms.uTime.value=t;
    this.weather.update(t,this.camera,density);
    const tx=this.map.tower.x,tz=this.map.tower.z-2.3;
    this.light.position.set(tx+Math.cos(t*.44)*31,17.65,tz+Math.sin(t*.44)*31);
    this.light.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),this.look.set(tx-this.light.position.x,0,tz-this.light.position.z).normalize());
  }
  cinematic(t){
    for(const actor of this.actorNodes.values())actor.group.visible=false;
    for(const item of this.lootNodes.values())item.root.visible=false;
    const tower=this.map.tower;
    const angle=t*.088;
    this.camera.position.set(tower.x-16+Math.sin(angle)*5,9.0+Math.cos(angle)*1.5,tower.z+32+Math.sin(angle*.52)*3);
    this.look.set(tower.x-4+Math.cos(angle)*2.8,8.8,tower.z-2);
    this.camera.fov=57;this.camera.updateProjectionMatrix();this.camera.lookAt(this.look);
    this.ambience(t,.82);
    this.renderer.autoClear=true;
    this.renderer.render(this.scene,this.camera);
  }
  setHands(key) {
    this.modelKey=key;
    const flashMaterials=new Set();
    this.muzzle?.traverse(n=>{if(n.material?.userData.dynamic)flashMaterials.add(n.material);});
    flashMaterials.forEach(m=>m.dispose());
    this.model.clear();
    this.equip=1;
    this.handRight=new T.Group();this.handLeft=new T.Group();
    const sleeve=industrial(0x51545a,.85);
    this.model.add(this.handRight,this.handLeft);
    for(const [i,hand] of [this.handRight,this.handLeft].entries()) {
      const mirror=i===0?1:-1;
      const support=i===1&&key&&key!=='blade'&&key!=='p9';
      const arm=support?ell(hand,sleeve,-.03,-.19,.40,.084,.088,.74):ell(hand,sleeve,mirror*.026,-.097,.178,.082,.086,.27);
      arm.rotation.x=support?.42:.34;arm.rotation.y=mirror*.12;
      const cuff=bevel(hand,polymer,0,-.033,.094,.146,.106,.124);cuff.rotation.x=.20;
      if(i===0&&key&&key!=='blade') {
        ell(hand,palette.glove,.004,-.03,.03,.05,.12,.085);
        ell(hand,palette.glove,-.042,.026,.054,.09,.035,.04);
        ell(hand,palette.glove,-.087,.021,.016,.026,.028,.075).rotation.x=-.2;
        for(let f=0;f<3;f++){
          const y=-.012-f*.03,z=-.042+f*.0075;
          ell(hand,palette.glove,-.047,y,z,.085,.026,.034);
          ell(hand,palette.glove,-.082,y,z+.016,.022,.024,.04);
          ell(hand,palette.gunSlide,-.047,y+.002,z-.014,.05,.012,.01);
        }
        this.finger=new T.Group();this.finger.position.set(.001,.026,-.014);hand.add(this.finger);
        ell(this.finger,palette.glove,0,-.003,-.042,.026,.026,.09);
        ell(this.finger,palette.glove,-.046,-.008,-.088,.1,.023,.026);
        continue;
      }
      ell(hand,palette.glove,0,-.013,.018,.056,.047,.079);
      bevel(hand,palette.gunGrip,0,.021,.009,.092,.026,.08);
      for(let f=0;f<4;f++){
        const x=mirror*(.039-f*.024),z=-.055+Math.abs(1-f)*.012;
        const finger=ell(hand,palette.glove,x,-.014,z,.014,.027,.047);
        finger.rotation.x=.3+f*.16;finger.rotation.z=mirror*(f-1.5)*.066;
        ell(hand,palette.gunSlide,x,.007,z+.027,.013,.009,.012);
      }
      ell(hand,palette.glove,mirror*.062,.002,.019,.033,.028,.056).rotation.z=-mirror*.37;
    }
    this.handRight.position.set(.042,-.096,.014);
    this.supportZ=key==='m200'?-.45:key==='p9'?.02:ITEMS[key]?.form==='smg'?-.34:key&&key!=='blade'?-.42:key?-.28:-.06;
    this.supportY=key==='p9'?-.215:-.071;
    this.handLeft.position.set(-.014,this.supportY,this.supportZ);
    if(key&&key!=='blade'&&key!=='p9')this.handLeft.rotation.y=-1.05;
    if(!key) {
      this.handRight.position.set(.016,-.109,.17);
      this.handLeft.position.set(-.52,-.12,.16);
      this.handRight.rotation.z=-.42;
      this.handLeft.rotation.z=.46;
    }
    this.parts=gunParts(this.model,key);
    this.muzzle=new T.Group();this.muzzle.position.set(0,.035,-(this.parts.muzzle??.3));this.model.add(this.muzzle);
    const hot=new T.MeshBasicMaterial({color:0xffe6ac,transparent:true,opacity:.88,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
    hot.userData.dynamic=true;
    const warm=hot.clone();warm.color.set(0xf49038);warm.opacity=.51;
    for(let i=0;i<4;i++) {
      const spike=shape(this.muzzle,meshCone,i%2?hot:warm,0,0,-.11,.065,.29,.053);
      spike.rotation.set(-Math.PI/2,(i-1.5)*.32,i*.68);
    }
    ell(this.muzzle,hot,0,0,.010,.060,.058,.072);
    this.flashLight=new T.PointLight(0xffb365,0,.95,2);
    this.muzzle.add(this.flashLight);
    this.muzzle.visible=false;
  }
  tracer(evt) {
    if(!this.scene)return;
    const line=new T.Line(new T.BufferGeometry().setFromPoints([
      new T.Vector3(evt.x,evt.y,evt.z),new T.Vector3(evt.tx,evt.ty,evt.tz)
    ]),new T.LineBasicMaterial({color:evt.kind==='hostile'?0xffaa6f:0xf5e8a5,transparent:true,opacity:.8}));
    this.scene.add(line);this.fx.push({line,life:.10});
  }
  action(evt,currentId) {
    if(evt.kind==='shot'||evt.kind==='hostile')this.actorNodes.get(evt.id)?.fired(evt);
    if(evt.kind==='shot'&&evt.id===currentId) {
      this.recoil=Math.min(1.6,this.recoil*.28+(evt.weapon==='m200'?1.45:evt.weapon==='m500'?1.2:.85));
      this.flash=evt.weapon&&evt.weapon!=='blade'?.086:0;
      if(this.flash){
        const brass=tube(this.handsScene,palette.brass,.39,-.09,-.81,.012,.054,.012);
        this.shells.push({mesh:brass,life:.68,vx:.65+Math.random()*.43,vy:.63+Math.random()*.43});
      }
    }
    if(evt.kind==='hostile'||(evt.kind==='shot'&&evt.weapon&&evt.weapon!=='blade'))this.tracer(evt);
  }
  draw(snapshot,yaw,pitch,dt) {
    if(!snapshot.player||!this.scene)return;
    if(dt>0){
      this.qualityTime+=dt;
      this.slowFrames+=dt>.042?dt:-dt*.27;
      this.slowFrames=Math.max(0,this.slowFrames);
      if(this.qualityTime>2&&this.slowFrames>1.5&&this.qualityScale>.59){
        this.qualityScale=Math.max(.56,this.qualityScale*.78);
        this.renderer.setPixelRatio(this.pixelRatio*this.qualityScale);
        this.slowFrames=0;this.qualityTime=0;
      }
    }
    const player=snapshot.player,t=performance.now()*.001;
    const weapon=ITEMS[player.weapon];
    const magnification=player.telescope?64:player.aim?(weapon?.zoom??1):1;
    this.gait+=(Number(player.walk)-this.gait)*Math.min(1,dt*8);
    this.sway+=(Number(player.sprinting)-this.sway)*Math.min(1,dt*7);
    this.eye+=((player.crouch?1.17:1.62)-this.eye)*Math.min(1,dt*10);
    const base=player.sprinting?71:65;
    const targetFov=2*Math.atan(Math.tan(base*Math.PI/360)/magnification)*180/Math.PI;
    this.camera.fov+=(targetFov-this.camera.fov)*Math.min(1,dt*(magnification>=8?22:13));
    this.camera.updateProjectionMatrix();
    const walkCycle=t*(this.sway>.45?14:10);
    const step=player.telescope?0:this.gait;
    this.camera.position.set(player.x,player.y+this.eye+Math.sin(walkCycle*2)*.019*step,player.z);
    this.camera.rotation.set(pitch+(player.telescope?0:this.recoil*.012),-yaw,Math.sin(walkCycle)*.009*step);
    this.camera.updateMatrixWorld();
    this.ambience(t,player.telescope?.4:1);
    const visibleActors=[...snapshot.team,...snapshot.enemies], live=new Set(visibleActors.map(a=>a.id));
    for(const [id,character] of this.actorNodes){
      if(live.has(id))continue;
      character.stop();
      character.group.removeFromParent();
      this.actorNodes.delete(id);
    }
    if(this.soldiers)for(const a of visibleActors) {
      if(a.id===player.id)continue;
      let character=this.actorNodes.get(a.id);
      if(!character){
        const phase=(a.id.charCodeAt(a.id.length-1)*.377)%1;
        character=new Soldier(this.soldiers,a.id.startsWith('e'),a.role,phase);
        this.actorNodes.set(a.id,character);
        this.scene.add(character.group);
      }
      const range=Math.hypot(player.x-a.x,player.z-a.z);
      character.group.visible=a.status!=='shop'&&range>.82&&range<135;
      if(!character.group.visible)continue;
      character.setWeapon(a.weapon,gunParts);
      character.update(a,dt,range,altitude(this.map,a.x,a.z));
    }
    const ids=new Set(snapshot.loot.map(l=>l.id));
    for(const [id,n] of this.lootNodes)if(!ids.has(id)) {
      n.dispose();this.lootNodes.delete(id);
    }
    for(const l of snapshot.loot) {
      if(!this.lootNodes.has(l.id)){
        const n=lootMesh(l);this.lootNodes.set(l.id,n);this.scene.add(n.root);
      }
      const n=this.lootNodes.get(l.id);
      n.root.visible=true;
      n.active.rotation.y=l.id*.38;
      n.active.position.y=.17;
      n.active.rotation.x=l.kind==='gun'?-.73:0;
      n.lab.visible=Math.hypot(l.x-player.x,l.z-player.z)<5.7 && Math.abs(l.y-player.y)<2.7;
    }
    this.fx=this.fx.filter(f=>{
      f.life-=dt;f.line.material.opacity=Math.max(0,f.life*8);
      if(f.life>0)return true;
      this.scene.remove(f.line);f.line.material.dispose();f.line.geometry.dispose();return false;
    });
    if(this.modelKey!==player.weapon)this.setHands(player.weapon);
    this.recoil*=Math.pow(.0016,dt);
    this.flash=Math.max(0,this.flash-dt);this.equip=Math.max(0,this.equip-dt*2.4);
    this.muzzle.visible=this.flash>0;
    this.flashLight.intensity=this.flash*48;
    this.muzzle.rotation.z=t*89;
    const walking=Math.sin(walkCycle)*.037*this.gait;
    const breath=Math.sin(t*1.72)*.006;
    const reload=player.reload>0?1-player.reload/(weapon?.reload??1):0;
    const reloadLift=player.reload>0?Math.sin(Math.PI*reload):0;
    const drawAt=player.aim?.003:.30;
    const sightHeight=player.weapon==='p9'?-.103:-.170;
    this.model.position.set(drawAt+walking*.72+this.sway*.07,player.aim?sightHeight+breath*.32:-.135+walking*.56+breath+reloadLift*.04-this.equip*.31-this.sway*.07,(player.aim?-.49:-.72)+this.recoil*.115);
    this.model.rotation.set(reloadLift*.12+this.recoil*.17,player.aim?0:.16+reloadLift*.2,player.aim?0:-.2-reloadLift*.45+this.sway*.23);
    if(this.parts.magazine) {
      const pull=Math.max(0,Math.sin(Math.PI*(reload-.13)/.66));
      const down=player.reload>0&&reload>.13&&reload<.79?pull:0;
      this.parts.magazine.position.set(-down*.036,-.081-down*.24,this.parts.magHome+down*.068);
      this.parts.magazine.rotation.x=down*.33;
      const reach=player.reload>0?Math.min(1,reload/.13,(1-reload)/.12):0;
      const grab=reach*reach*(3-2*reach);
      this.handLeft.position.y=this.supportY+grab*(magGripY(player.weapon)-this.supportY)-down*.24;
      this.handLeft.position.z=this.supportZ+grab*(this.parts.magHome+.02-this.supportZ)+down*.068;
      this.handLeft.position.x=-.014-down*.036;
      const squeeze=Math.min(1,this.recoil);
      this.parts.trigger.rotation.x=.24-squeeze*.75;
      this.finger.position.z=-.014+squeeze*.012;this.finger.rotation.y=squeeze*.25;
      const rack=player.reload>0?Math.max(0,1-Math.abs(reload-.88)*11):0;
      this.parts.action.position.z=Math.max(this.recoil*.052,rack*.075);
    }
    this.shells=this.shells.filter(shell=>{
      shell.life-=dt;
      if(shell.life<=0){this.handsScene.remove(shell.mesh);return false;}
      shell.vy-=4.7*dt;
      shell.mesh.position.x+=shell.vx*dt;shell.mesh.position.y+=shell.vy*dt;
      shell.mesh.rotation.x+=dt*15;shell.mesh.rotation.z+=dt*12;
      return true;
    });
    this.renderer.autoClear=true;
    this.renderer.render(this.scene,this.camera);
    if(!player.telescope&&magnification<6) {
      this.renderer.autoClear=false;
      this.renderer.clearDepth();
      this.renderer.render(this.handsScene,this.handsCamera);
    }
  }
}
export function icon(canvas,id) {
  const ctx=canvas.getContext('2d');
  const def=ITEMS[id];
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.scale(canvas.width/162,canvas.height/55);
  ctx.fillStyle='#899a83';ctx.strokeStyle='#c0cba7';ctx.lineWidth=1;
  const poly=points=>{
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();
  };
  if(def.form==='blade') {
    poly([[30,35],[64,30],[66,24],[111,12],[141,9],[120,25],[70,36],[64,33],[32,42]]);
  } else if(def.form==='pistol') {
    poly([[50,15],[111,15],[111,26],[80,27],[75,41],[64,42],[60,28],[46,26]]);
    ctx.strokeRect(72,26,17,9);
  } else {
    const long=def.form==='sniper', length=long?129:def.form==='smg'?98:111;
    poly([[13,22],[41,22],[50,18],[length,19],[length,21],[length+16,21],[length+16,25],[length,25],[length,28],[69,30],[74,43],[63,44],[57,30],[47,28],[40,38],[34,37],[39,27],[13,34]]);
    if(def.zoom>=8) {
      ctx.fillRect(61,12,20,5);ctx.fillRect(54,8,35,5);ctx.strokeRect(51,7,40,6);
    }
    ctx.fillStyle='#303d35';for(let x=75;x<length-4;x+=5)ctx.fillRect(x,22,3,2);
  }
  ctx.restore();
}
