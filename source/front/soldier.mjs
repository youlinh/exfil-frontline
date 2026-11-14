import {
  AnimationClip, AnimationMixer, Box3, Color, DataTexture, DoubleSide, FrontSide, Group,
  LinearFilter, LoopOnce, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion,
  RGBAFormat, Vector3
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { ITEMS } from './core.mjs';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const jointKey=name=>name.replace(/^mixamorig:?/,'').replace(/_\d+$/,'');
const fromRig=root=>{
  const joints=new Map();
  root.traverse(n=>{
    if(!n.name.startsWith('mixamorig'))return;
    const key=jointKey(n.name);
    if(!joints.has(key))joints.set(key,n);
  });
  return joints;
};
const clockBlend=(from,to,response,dt)=>from+(to-from)*(1-Math.exp(-response*dt));
const MINIMUM=['idle','ready_idle','ready_run','death'];
const fadeTime=.17;
const tint={
  assault:[1.10,1.01,.90],recon:[.76,1.06,1.23],support:[.87,1.18,.96],engineer:[1.28,1.04,.74],hostile:[1.18,.73,.58]
};
const insignia={assault:0x9fb8a6,recon:0x8cb8c8,support:0xa5bc78,engineer:0xe1b682,hostile:0xbc7259};

export function selectSoldierClip(a){
  if(a.hp<=0)return 'death';
  if(a.jumpOffset>.08)return 'jump_loop';
  const armed=!!a.weapon&&a.weapon!=='blade';
  if(a.crouch)return (armed?'ready_':'')+(a.walk?'crouch_walk':'crouch_idle');
  if(!a.walk)return armed?(a.aim?'aim_idle':'ready_idle'):'idle';
  if(a.sprinting)return armed?'ready_sprint':'sprint';
  if(armed)return 'ready_run';
  return a.human?'run':'walk';
}

function retargetClips(source,destination){
  source.scene.updateMatrixWorld(true);
  destination.updateMatrixWorld(true);
  const src=fromRig(source.scene), dst=fromRig(destination);
  const srcHips=src.get('Hips'), dstHips=dst.get('Hips'), pts=new Vector3();
  const leg=(joints,h)=>h.getWorldPosition(pts).y-joints.get('LeftFoot').getWorldPosition(pts).y;
  const scale=leg(dst,dstHips)/leg(src,srcHips);
  const srcParent=srcHips.parent.matrixWorld.clone(), dstParentInverse=dstHips.parent.matrixWorld.clone().invert();
  const orient=dstHips.parent.getWorldQuaternion(new Quaternion()).invert()
    .multiply(srcHips.parent.getWorldQuaternion(new Quaternion()));
  const rotation=new Quaternion();
  return new Map(source.animations.map(clip=>{
    const tracks=[];
    for(const track of clip.tracks){
      const separator=track.name.lastIndexOf('.');
      const key=jointKey(track.name.slice(0,separator));
      const property=track.name.slice(separator+1), joint=dst.get(key);
      if(!joint)continue;
      const out=track.clone();
      out.name=joint.name+'.'+property;
      if(key==='Hips'){
        if(property==='quaternion'){
          for(let i=0;i<out.values.length;i+=4){
            rotation.fromArray(out.values,i).premultiply(orient).normalize().toArray(out.values,i);
          }
        } else if(property==='position'){
          for(let i=0;i<out.values.length;i+=3){
            pts.fromArray(out.values,i).applyMatrix4(srcParent).multiplyScalar(scale);
            pts.x*=.27;pts.z*=.27;
            pts.applyMatrix4(dstParentInverse).toArray(out.values,i);
          }
        }
      }
      tracks.push(out);
    }
    return [clip.name,new AnimationClip(clip.name,clip.duration,tracks).optimize()];
  }));
}

function combineSkinParts(root){
  const buckets=new Map();
  root.traverse(m=>{
    if(!m.isSkinnedMesh||Array.isArray(m.material))return;
    const key=[m.parent.uuid,m.material.uuid,m.geometry.index?'i':'v',Object.keys(m.geometry.attributes).join()].join('|');
    const list=buckets.get(key)??[];
    list.push(m);buckets.set(key,list);
  });
  for(const same of buckets.values()){
    const [base,...others]=same;
    if(!others.length||!others.every(obj=>obj.bindMatrix.equals(base.bindMatrix)&&obj.matrix.equals(base.matrix)&&
      obj.skeleton.bones.every((bone,i)=>bone===base.skeleton.bones[i])))continue;
    const merged=mergeGeometries(same.map(m=>m.geometry));
    if(!merged)continue;
    for(const item of same)item.geometry.dispose();
    base.geometry=merged;
    for(const item of others)item.removeFromParent();
  }
}

function measureBounds(scene,clip){
  const mixer=new AnimationMixer(scene);
  const action=mixer.clipAction(clip).play();
  mixer.update(.08);
  scene.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(scene,true);
  action.stop();
  mixer.uncacheRoot(scene);
  return bounds;
}
export async function prepareSoldier(modelData,clipData){
  const loader=new GLTFLoader();
  const array=data=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const [model,motion]=await Promise.all([loader.parseAsync(array(modelData),''),loader.parseAsync(array(clipData),'')]);
  const scene=model.scene;
  const clips=retargetClips(motion,scene);
  for(const name of MINIMUM)if(!clips.has(name))throw Error('Soldier animation is missing: '+name);
  combineSkinParts(scene);
  const bounds=measureBounds(scene,clips.get('idle'));
  const height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<.5)throw Error('Invalid soldier height');
  const scale=1.81/height;
  scene.updateMatrixWorld(true);
  scene.traverse(n=>{
    if(!n.isMesh)return;
    n.userData.characterAsset=true;
    if(n.isSkinnedMesh){
      n.computeBoundingSphere();
      n.boundingSphere.radius*=1.65;
    }
    const m=n.material;
    if(m?.map){
      m.map.anisotropy=4;
      m.map.userData.shared=true;
    }
    m.side=m.transparent?DoubleSide:FrontSide;
    if(m.normalScale)m.normalScale.multiplyScalar(1.08);
    m.roughness=Math.min(.92,Math.max(.66,m.roughness??.76));
    m.metalness*=.31;
    m.userData.characterAsset=true;
  });
  return {scene,clips,scale,ground:-bounds.min.y*scale,materials:new Map()};
}
function tintedMaterials(template,role){
  if(template.materials.has(role))return template.materials.get(role);
  const set=new Map();
  template.scene.traverse(n=>{
    if(!n.isMesh||set.has(n.material))return;
    const material=n.material.clone(), name=material.name;
    if(!/Head/i.test(name))material.color.multiply(new Color().setRGB(...tint[role]));
    if(material.map){
      material.emissiveMap=material.map;
      material.emissive.setRGB(.64,.75,.88);
      material.emissiveIntensity=/Head/i.test(name)?.25:.23;
      material.aoMapIntensity=.83;
    }
    set.set(n.material,material);
  });
  template.materials.set(role,set);
  return set;
}
const shadowTexture=(()=>{
  const size=40, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const d=Math.hypot((x+.5-20)/20,(y+.5-20)/20);
    pixels[(y*size+x)*4+3]=Math.round(220*Math.max(0,1-d*d)**3);
  }
  const texture=new DataTexture(pixels,size,size,RGBAFormat);
  texture.magFilter=LinearFilter;texture.minFilter=LinearFilter;
  texture.needsUpdate=true;texture.userData.shared=true;
  return texture;
})();
const shadowShape=new PlaneGeometry(.95,.67);
shadowShape.rotateX(-Math.PI*.5);
const shadowMaterial=new MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.68,polygonOffset:true,polygonOffsetFactor:-2});
const idColor=new Map();
const badgeShape=new PlaneGeometry(.077,.041);
function divisionPatch(joints,role){
  const sleeve=joints.get('RightArm'), forearm=joints.get('RightForeArm');
  if(!sleeve||!forearm)return;
  let material=idColor.get(role);
  if(!material){
    material=new MeshBasicMaterial({color:insignia[role]});
    material.userData.characterAsset=true;
    idColor.set(role,material);
  }
  const patch=new Mesh(badgeShape,material);
  patch.position.copy(forearm.position).multiplyScalar(.37);
  patch.position.z+=.092;
  material.side=DoubleSide;
  sleeve.add(patch);
}

const axis=new Vector3(1,0,0);
export class Soldier {
  constructor(asset,isEnemy,role,phase=0){
    this.group=new Group();
    this.group.name='character:'+role;
    this.shell=new Group();
    this.held=new Group();
    this.held.name='held weapon';
    this.shadow=new Mesh(shadowShape,shadowMaterial);
    this.shadow.renderOrder=3;
    this.shadow.userData.omitReflection=true;
    const body=clone(asset.scene);
    body.rotation.y=Math.PI;
    body.scale.setScalar(asset.scale);
    body.position.y=asset.ground;
    this.group.add(this.shadow,this.shell);
    this.shell.add(body,this.held);
    this.body=body;
    this.joints=fromRig(body);
    this.supportArm=['LeftArm','LeftForeArm','LeftHand'].map(name=>this.joints.get(name));
    this.supportPose=this.supportArm.map(()=>new Quaternion());
    const colors=tintedMaterials(asset,isEnemy?'hostile':role);
    body.traverse(n=>{
      if(!n.isMesh)return;
      n.material=colors.get(n.material)??n.material;
      n.receiveShadow=true;
    });
    divisionPatch(this.joints,isEnemy?'hostile':role);
    this.clips=asset.clips;
    this.mixer=new AnimationMixer(body);
    this.phase=phase;
    this.mode=null;
    this.item=undefined;
    this.aimPitch=-.13;
    this.recoil=0;
    this.busy=0;
    this.shotYaw=0;
    this.shotPitch=0;
    this.speed=0;
    this.previousPosition=null;
    this.sincePose=0;
    this.right=new Vector3();
    this.left=new Vector3();
    this.inv=new Matrix4();
    this.twist=new Quaternion();
    this.armIK=makeArmSolver();
  }
  setWeapon(key,buildGun){
    if(this.item===key)return;
    this.item=key;
    this.held.clear();
    this.held.visible=!!key;
    if(!key)return;
    this.held.scale.setScalar(key==='blade'?.81:key==='m200'?.82:.88);
    this.gun=buildGun(this.held,key);
  }
  fired(evt){
    const distance=Math.hypot(evt.tx-evt.x,evt.tz-evt.z);
    if(distance<=.01)return;
    this.recoil=.085;
    this.busy=.40;
    this.shotYaw=Math.atan2(evt.tx-evt.x,evt.z-evt.tz);
    this.shotPitch=Math.atan2(evt.ty-evt.y,distance);
  }
  stop(){
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.body);
    this.body.traverse(node=>{if(node.isSkinnedMesh)node.skeleton.dispose();});
  }
  update(a,dt,distance,terrain){
    if(!this.previousPosition)this.previousPosition=new Vector3(a.x,a.y,a.z);
    const travelled=Math.hypot(a.x-this.previousPosition.x,a.z-this.previousPosition.z);
    if(travelled>.001&&dt>0&&travelled<2)this.speed=clockBlend(this.speed,travelled/dt,9,dt);
    if(!a.walk)this.speed=0;
    this.previousPosition.set(a.x,a.y,a.z);
    this.group.position.set(a.x,a.y,a.z);
    const direction=this.shotYaw-a.yaw;
    const turn=Math.atan2(Math.sin(direction),Math.cos(direction));
    this.group.rotation.y=-a.yaw-turn*Math.min(1,this.busy*5);
    this.shadow.visible=a.hp>0&&a.y-terrain<1.1;
    this.shadow.position.y=terrain-a.y+.034;
    this.shadow.scale.setScalar(a.crouch?1.08:1);

    const mode=selectSoldierClip(a);
    const changed=mode!==this.mode;
    if(changed){
      const clip=this.clips.get(mode)??this.clips.get('idle');
      const next=this.mixer.clipAction(clip);
      next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
      if(mode==='death'){
        next.setLoop(LoopOnce,1);
        next.clampWhenFinished=true;
        this.held.visible=false;
      }else{
        this.held.visible=!!this.item;
        if(a.walk)next.time=this.phase*clip.duration;
      }
      next.play();
      if(this.active)this.active.fadeOut(fadeTime);
      next.fadeIn(this.active?fadeTime:.01);
      this.active=next;
      this.mode=mode;
    }
    const stride=a.sprinting?6:a.crouch?2:mode.includes('run')?4:2.3;
    const speed=a.walk&&this.speed>.12?Math.max(.75,Math.min(1.6,this.speed/stride)):1;
    if(a.hp>0)this.active.setEffectiveTimeScale(speed);
    this.busy=Math.max(0,this.busy-dt);
    this.recoil*=Math.exp(-14*dt);
    const pitch=this.busy?this.shotPitch:a.aim?a.pitch:a.walk?-.24:-.14;
    this.aimPitch=clockBlend(this.aimPitch,Math.max(-.62,Math.min(.61,pitch??0)),15,dt);
    this.sincePose+=dt;
    if(!changed&&distance>28&&this.sincePose<(distance>48?.081:.047))return;
    if(this.poseReady)this.supportArm.forEach((bone,i)=>bone?.quaternion.copy(this.supportPose[i]));
    this.mixer.update(this.sincePose);
    this.supportArm.forEach((bone,i)=>{if(bone)this.supportPose[i].copy(bone.quaternion);});
    this.poseReady=true;
    this.sincePose=0;
    this.shell.updateWorldMatrix(true,true);
    if(a.hp>0&&this.item)this.positionWeapon(a);
  }
  positionWeapon(a){
    const primary=this.joints.get('RightHand'), support=this.joints.get('LeftHand');
    if(!primary||!support)return;
    primary.getWorldPosition(this.right);
    this.inv.copy(this.shell.matrixWorld).invert();
    this.right.applyMatrix4(this.inv);
    const pistol=this.item==='p9',blade=this.item==='blade';
    this.held.position.copy(this.right);
    this.held.position.x+=.004;
    this.held.position.y+=blade?-.014:.063;
    this.held.position.z+=blade?-.065:-.006+this.recoil*.55;
    this.held.rotation.set(blade?-.46:this.aimPitch,blade?.15:.011,blade?-.19:0);
    this.held.updateWorldMatrix(false,true);
    if(this.gun?.action)this.gun.action.position.z=this.recoil*.42;
    if(this.gun?.trigger)this.gun.trigger.rotation.x=.24-this.recoil*5.5;
    const span=a.reload>0?Math.sin(Math.PI*Math.min(1,a.reload/ITEMS[this.item].reload)):0;
    if(this.gun?.magazine){
      this.gun.magazine.position.y=-.081-span*.16;
      this.gun.magazine.rotation.x=span*.29;
    }
    if(blade)return;

    const long=this.item==='m200', supportX=pistol?-.016:-.012;
    const steady=pistol?-.073:long?-.337:-.242;
    this.held.localToWorld(this.left.set(supportX,pistol?-.083:-.028-span*.13,steady+span*.09));
    this.armIK(...this.supportArm,this.left);
    this.twist.setFromAxisAngle(axis,pistol?.14:-.14);
    support.quaternion.multiply(this.twist);
  }
}

function makeArmSolver(){
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),axis=new Vector3(),pole=new Vector3(),
    elbow=new Vector3(),goal=new Vector3(),current=new Vector3(),wanted=new Vector3(),s=new Vector3();
  const delta=new Quaternion(),q=new Quaternion(),parent=new Quaternion();
  const rotate=(bone,from,to)=>{
    delta.setFromUnitVectors(from.normalize(),to.normalize());
    bone.getWorldQuaternion(q).premultiply(delta);
    bone.parent.getWorldQuaternion(parent).invert();
    bone.quaternion.copy(parent.multiply(q));
    bone.updateWorldMatrix(false,true);
  };
  return (upper,lower,hand,target)=>{
    if(!upper||!lower)return;
    upper.getWorldPosition(a);lower.getWorldPosition(b);hand.getWorldPosition(c);
    const base=a.distanceTo(b),tip=b.distanceTo(c);
    axis.subVectors(target,a);
    const length=axis.length();
    if(length<.001||base<.01||tip<.01)return;
    axis.divideScalar(length);
    const reach=Math.min(base+tip-.004,Math.max(Math.abs(base-tip)+.009,length));
    const lead=(base*base+reach*reach-tip*tip)/(2*reach);
    const bend=Math.sqrt(Math.max(0,base*base-lead*lead));
    pole.subVectors(b,a);pole.addScaledVector(axis,-pole.dot(axis));
    if(pole.lengthSq()<.002)pole.set(-.1,-1,.15).addScaledVector(axis,-pole.dot(axis));
    elbow.copy(a).addScaledVector(axis,lead).addScaledVector(pole.normalize(),bend);
    goal.copy(a).addScaledVector(axis,reach);
    rotate(upper,current.subVectors(b,a),wanted.subVectors(elbow,a));
    lower.getWorldPosition(b);hand.getWorldPosition(c);
    rotate(lower,current.subVectors(c,b),s.subVectors(goal,b));
  };
}
