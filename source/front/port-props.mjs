import * as T from 'three';
import { DOCK_LIGHTS, practicalLight } from './weather.mjs';
import { randomSource } from './core.mjs';

const cube=new T.BoxGeometry(1,1,1);
const cylinder=new T.CylinderGeometry(1,1,1,12);
const basic=(color,metalness=.18)=>new T.MeshStandardMaterial({color,roughness:.72,metalness});
const material={
  iron:basic(0x35424a,.37),edge:basic(0x5b6468,.4),beam:basic(0x996838,.28),rust:basic(0x743f32,.24),
  barrel:basic(0x384b56),gray:basic(0x606269),wood:basic(0x655448),pallet:basic(0x746351),
  web:basic(0x6b6b60),tire:basic(0x242829),paint:basic(0xaf9065),
  lens:new T.MeshBasicMaterial({color:0xffca8c,toneMapped:false})
};
function make(parent,geo,mat,x,y,z,dx,dy,dz) {
  const mesh=new T.Mesh(geo,mat);
  mesh.position.set(x,y,z);mesh.scale.set(dx,dy,dz);parent.add(mesh);
  return mesh;
}
function bar(parent,mat,a,b,w=.09,d=w){
  const from=new T.Vector3(...a),delta=new T.Vector3(...b).sub(from);
  const center=from.addScaledVector(delta,.5);
  const piece=make(parent,cube,mat,center.x,center.y,center.z,w,delta.length(),d);
  piece.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
}
function box(parent,m,x,y,z,w,h,d){return make(parent,cube,m,x,y,z,w,h,d);}
function drum(parent,x,z,mat,tip=false) {
  const g=new T.Group();g.position.set(x,tip?.35:.48,z);
  if(tip){g.rotation.x=1.57;g.rotation.y=.25;}
  parent.add(g);
  make(g,cylinder,mat,0,0,0,.30,.87,.30);
  for(const y of [-.41,-.22,.19,.41])make(g,cylinder,material.edge,0,y,0,.315,.042,.315);
  make(g,cylinder,material.iron,-.09,.446,.08,.047,.025,.047);
}
function shippingCrates(parent,x,z,roll) {
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=roll;parent.add(g);
  for(const dx of [-.46,.45])box(g,material.pallet,dx,.10,0,.10,.20,1.10);
  for(let a=-.44;a<.5;a+=.19)box(g,material.wood,0,.21,a,1.25,.095,.13);
  box(g,material.wood,-.07,.47,.04,1.06,.48,.84);
  for(const d of [-1,1]){
    box(g,material.web,d*.31,.47,.47,.075,.48,.035);
    box(g,material.web,d*.31,.728,.04,.075,.034,.84);
  }
  box(g,material.paint,.22,.52,.47,.28,.15,.012);
  box(g,material.iron,-.22,.64,.48,.26,.065,.020);
}
function fence(parent,x,z,l,rot=0){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;parent.add(g);
  for(const x of [-l/2,l/2])box(g,material.iron,x,1.03,0,.078,2.06,.078);
  for(const y of [.12,1.99])box(g,material.edge,0,y,0,l,.045,.05);
  const lines=[];
  for(let u=-2.1;u<l;u+=.245)for(const d of [-1,1]) {
    const left=Math.max(-l/2,-l/2+u),right=Math.min(l/2,-l/2+u+2.1);
    if(left>=right)continue;
    const y=x=>d>0?x+l/2-u+.06:2.12-(x+l/2-u);
    lines.push(left,y(left),.024*d,right,y(right),.024*d);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lines,3));
  g.add(new T.LineSegments(geo,new T.LineBasicMaterial({color:0x7b8280,transparent:true,opacity:.57})));
}
function gantry(parent,x,z,w,span,h,rotation=0) {
  const frame=new T.Group();
  frame.position.set(x,0,z);frame.rotation.y=rotation;
  parent.add(frame);
  const X=w/2,Z=span/2;
  for(const d of [-1,1])for(const a of [-1,1]) {
    const foot=[a*X,.20,d*Z],top=[a*X*.88,h,d*Z];
    box(frame,material.iron,foot[0],.20,foot[2],1.36,.4,.94);
    bar(frame,material.beam,foot,top,.29,.43);
    bar(frame,material.iron,[a*X,.35,d*Z],[a*X*.87,h*.53,-d*Z],.13,.16);
  }
  for(const d of [-1,1]) {
    const a=-X*.98,b=X*1.55,y=h;
    bar(frame,material.edge,[a,y,d*Z],[b,y,d*Z],.37,.40);
    bar(frame,material.iron,[a,y+1.24,d*Z],[b,y+1.24,d*Z],.23,.27);
    for(let i=0;i<8;i++){
      const l=a+(b-a)*i/8,r=a+(b-a)*(i+1)/8;
      bar(frame,material.beam,[l,y+(i%2)*1.24,d*Z],[r,y+((i+1)%2)*1.24,d*Z],.13,.14);
    }
    bar(frame,material.edge,[d*X*.87,h,d*-Z],[d*X*.87,h,d*Z],.21,.28);
    box(frame,material.lens,d*X*.85,h-.19,-Z+.14,.25,.12,.16);
  }
  const high=h-1.3;
  box(frame,material.iron,X*.93,high,0,1.7,1.14,1.31);
  box(frame,material.edge,X*.93,high+.09,.68,1.33,.52,.06);
  for(const d of [-1,1])bar(frame,material.edge,[X*.31,h-.08,d*Z*.53],[X*.31,h*.61,d*Z*.53],.035,.045);
  box(frame,material.beam,X*.31,h*.61,0,.74,.13,Z*1.25);
}
function lightPole(parent,x,z,i) {
  const h=i%3===0?5.4:4.2;
  box(parent,material.iron,x,h/2,z,.14,h,.14);
  box(parent,material.gray,x,.21,z,.35,.42,.39);
  bar(parent,material.edge,[x,h,z],[x+.72,h,z-.44],.13);
  box(parent,material.iron,x+.67,h-.07,z-.41,.54,.19,.29);
  box(parent,material.lens,x+.69,h-.171,z-.41,.36,.021,.18);
  practicalLight(parent,x+.69,h-.18,z-.41,i===0?1.4:.96);
}
export function dressPort(parent,map,index) {
  const rng=randomSource(1557+index);
  const freight=index!==1;
  for(const b of map.boxes) {
    if(b.kind!=='cargo'&&b.kind!=='stack'&&b.kind!=='shed')continue;
    const lane=b.z+b.d/2+.61;
    if(!map.boxes.some(other=>other!==b&&Math.abs(other.x-b.x)<other.w*.56&&Math.abs(lane-other.z)<other.d*.58)) {
      if(rng()<.78)shippingCrates(parent,b.x-b.w*.26,lane,rng()*.9);
      const barrelX=b.x+b.w*.31;
      drum(parent,barrelX,lane,rng()<.55?material.rust:material.barrel);
      if(rng()<.65)drum(parent,barrelX+.78,lane+.12,material.barrel,true);
    }
  }
  if(index===0) {
    gantry(parent,-21,-21,14,4,15,.12);
    gantry(parent,49,-29,12,4.5,18,-.05);
    gantry(parent,56,10,10,4,17,.19);
    for(let i=0;i<7;i++)fence(parent,-52,-57+i*5,5,Math.PI/2);
    for(let i=0;i<5;i++)fence(parent,41+i*4,-59,4);
  } else if(index===2) {
    gantry(parent,12,-21,16,4,16,-.05);
    gantry(parent,-47,-14,13,4,16,.14);
    for(let i=0;i<9;i++)fence(parent,-57,16-i*5,5,Math.PI/2);
    for(let i=0;i<8;i++)fence(parent,44-i*5,-60,5);
  } else {
    gantry(parent,20,-46,7,3,10,.3);
    for(let i=0;i<5;i++)fence(parent,-28+i*5,-32,5);
    for(let i=0;i<4;i++)fence(parent,42+i*5,18,5);
  }
  const locations=index===0?DOCK_LIGHTS:index===2?[[-44,43],[-34,25],[-15,19],[0,-11],[19,-27],[28,-35],[43,-27]]:[[36,43],[26,20],[9,10],[-5,-8],[-18,-25],[-33,-32]];
  locations.forEach(([x,z],i)=>lightPole(parent,x,z,i));
  if(freight){
    const start=map.spawn.x, from=map.spawn.z-1;
    const line=material.paint;
    for(const a of [-1,1])for(let n=0;n<9;n++){
      box(parent,line,start+a*2.3,.032,from-n*2.4,.075,.010,1.17);
    }
    for(let i=0;i<8;i++)box(parent,i%2?material.paint:material.iron,start-1.5+i*.42,.032,from-14,.29,.012,.28).rotation.y=-.43;
  }
}
