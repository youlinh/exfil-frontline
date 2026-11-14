export const ROLES = {
  assault: { name:'突击', call:'锋刃', hp:112, speed:5.9, desc:'生命较高，适合带队推进。', color:0xa1ac80 },
  recon: { name:'侦察', call:'斥候', hp:100, speed:6.55, desc:'移动速度最快，适合搜寻装备。', color:0x8da5a1 },
  support: { name:'支援', call:'回声', hp:102, speed:5.85, desc:'治疗道具恢复量更高。', color:0xa3a076 },
  engineer: { name:'工程', call:'铁砧', hp:106, speed:5.65, desc:'撤离信标启动速度更快。', color:0xad8f77 }
};
export const ITEMS = {
  p9: {name:'P9', type:'半自动手枪', mag:12, reload:2.2, delay:.27, damage:33, range:40, zoom:1.4, base:1010, form:'pistol'},
  m700: {name:'M700', type:'高速冲锋枪', mag:15, reload:3, delay:.076, damage:20, range:55, zoom:1.5, base:1380, form:'smg', auto:true},
  m571: {name:'M571', type:'远程冲锋枪 · 8×', mag:30, reload:6, delay:.095, damage:25, range:165, zoom:8, base:2250, form:'carbine', auto:true},
  m200: {name:'M200', type:'狙击步枪 · 32×', mag:5, reload:4.8, delay:1.12, damage:110, range:165, zoom:32, base:2700, form:'sniper'},
  m500: {name:'M500', type:'重型步枪', mag:8, reload:10, delay:.42, damage:62, range:68, zoom:2.2, base:1670, form:'carbine'},
  blade: {name:'折锋战术刀', type:'近战装备', delay:.53, damage:46, range:2.3, base:720, form:'blade'},
  relay: {name:'军用通讯模块', value:670, color:0x95cb71},
  chip: {name:'加密芯片', value:460, color:0x7cd8bc},
  lens: {name:'古董光学镜片', value:820, color:0xf4c372},
  coin: {name:'纪念银币', value:280, color:0xe2d1a4},
  med: {name:'急救包', color:0xe4d8ae}
};
const box = (x,z,w,d,h,kind='shed',rot=0)=>({x,z,w,d,h,kind,rot});
export const MAPS = [
  { name:'潮汐码头', en:'TIDAL DOCKS', type:'码头集装箱与海岸仓库', sky:0x687780, ground:0x43474a, water:0x344450, accent:0xffb347,
    spawn:{x:-36,z:55}, tower:{x:29,z:-46}, limit:77, sea:58,
    boxes:[box(-43,16,11,13,5),box(-16,9,3,10,2.8,'cargo'),box(-11,10,3,10,2.8,'cargo'),box(-18,-11,10,3,2.8,'cargo'),box(-6,-23,12,10,5),box(13,17,18,12,6),box(33,34,13,4,3,'cargo'),box(48,0,11,13,6),box(5,-7,6,3,2,'barrier'),box(-38,-29,18,18,6.3),box(-53,34,7,3,2.8,'cargo'),box(18,-12,3,9,2.8,'cargo'),box(40,-25,6,3,2.8,'cargo'),box(-41,46,3.5,13,5.6,'stack'),box(-31,44,3.3,12,5.6,'stack'),box(-45,23,9,3.2,2.8,'cargo'),box(-24,20,3.1,8,2.8,'cargo'),box(-29,1,3.2,8.2,5.6,'stack'),box(-13,-36,10,3.2,2.8,'cargo'),box(29,28,3.3,9,5.6,'stack'),box(52,32,4,14,5.6,'stack')],
    loot:[[-36,48],[-38,50],[-34,51],[-23,35],[-54,30],[-11,16],[-23,1],[-7,-15],[6,0],[12,30],[43,14],[42,-17],[11,-32],[-37,-14],[-43,-46],[29,-49],[2,-50],[45,-60],[-4,42]],
    patrol:[[-15,13],[6,14],[24,5],[18,-25],[42,-34],[-25,-21],[33,-52],[-3,-39]] },
  { name:'松岭哨站', en:'PINE RIDGE', type:'林线、岩石和通信哨站', sky:0x667a79, ground:0x3a463d, accent:0xe1b17e,
    spawn:{x:34,z:58}, tower:{x:-30,z:-46}, limit:77,
    boxes:[box(32,33,18,13,5),box(14,29,3,8,2.8,'cargo'),box(10,15,14,8,5),box(-6,5,7,6,3,'rock'),box(-14,19,6,9,3.5,'rock'),box(-35,34,15,11,5),box(41,-8,14,11,5),box(15,-20,7,5,3,'rock'),box(-13,-24,6,3,2,'barrier'),box(-45,-18,11,8,4),box(33,-40,9,6,4),box(-51,-39,5,9,3.5,'rock')],
    loot:[[35,48],[42,51],[25,47],[14,39],[24,22],[4,19],[-5,0],[-28,17],[-36,43],[41,8],[51,-16],[38,-32],[4,-30],[-14,-41],[-49,-22],[-39,-52],[-32,-48],[13,-49],[-11,-12]],
    patrol:[[15,20],[31,10],[8,-12],[-17,-16],[-35,-21],[-24,29],[-11,-47],[24,-48]] },
  { name:'锈港货场', en:'RUST YARD', type:'工业货场、管道和管制区', sky:0x807775, ground:0x514849, water:0x433e44, accent:0xffba79,
    spawn:{x:-43,z:47}, tower:{x:34,z:-44}, limit:77, sea:-60,
    boxes:[box(-28,28,22,12,7),box(-42,12,6,4,3,'cargo'),box(-16,14,3,11,2.8,'cargo'),box(-1,26,10,3,2.8,'cargo'),box(11,8,15,12,7),box(40,29,20,13,7),box(-28,-11,16,14,6),box(-4,-18,12,9,5),box(22,-9,9,3,2.8,'cargo'),box(47,-15,9,4,2,'barrier'),box(4,-42,15,9,6),box(-39,-40,9,7,4),box(-50,31,3,9,5.6,'stack'),box(-35,44,3,8,5.6,'stack'),box(-20,43,7,3,2.8,'cargo'),box(24,34,9,3,5.6,'stack'),box(22,-34,3.2,10,5.6,'stack')],
    loot:[[-40,39],[-49,35],[-37,37],[-51,17],[-13,24],[-10,8],[-34,3],[-41,-26],[0,-4],[20,15],[35,18],[45,12],[16,-24],[12,-33],[34,-50],[36,-48],[49,-38],[-19,-38],[-5,-56]],
    patrol:[[-16,8],[-5,6],[19,17],[37,1],[-10,-31],[13,-29],[45,-50],[18,-51]] }
];
const GUNS=['p9','m700','m571','m200','m500'];
const VALUABLES=['relay','chip','lens','coin'];
export const PLATFORM=4.8;
export const RAMP=14;
export const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function randomSource(seed) {
  let state=seed|0;
  return ()=> {
    state=(state+0x6d2b79f5)|0;
    let n=Math.imul(state^state>>>15,1|state);
    n=(n+Math.imul(n^n>>>7,61|n))^n;
    return ((n^n>>>14)>>>0)/4294967296;
  };
}
function shuffled(values,rng) {
  const copy=values.slice();
  for(let i=copy.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
export function altitude(map,x,z) {
  const tx=Math.abs(x-map.tower.x), tz=z-map.tower.z;
  if(tx<=2.05 && tz>3.8 && tz<=3.8+RAMP) return PLATFORM*(1-(tz-3.8)/RAMP);
  if(tx<=4.6 && tz>=-3.8 && tz<=3.8) return PLATFORM;
  return 0;
}
export function clearPath(map,a,b,padding=.13) {
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const source of map.boxes) {
    if((a.y??0)+.85>source.h && (b.y??0)+.85>source.h) continue;
    let lo=.015, hi=.985;
    for(const [start,delta,center,half] of [[a.x,dx,source.x,source.w/2+padding],[a.z,dz,source.z,source.d/2+padding]]) {
      if(Math.abs(delta)<.000001) {
        if(Math.abs(start-center)>half) {lo=1;hi=0;}
      } else {
        const first=(center-half-start)/delta, end=(center+half-start)/delta;
        lo=Math.max(lo,Math.min(first,end));
        hi=Math.min(hi,Math.max(first,end));
      }
    }
    if(lo<=hi) return false;
  }
  const tx=map.tower.x,tz=map.tower.z-2.30;
  const denom=dx*dx+dz*dz;
  const closest=denom ? clamp(((tx-a.x)*dx+(tz-a.z)*dz)/denom,.025,.975) : 0;
  return Math.hypot(a.x+dx*closest-tx,a.z+dz*closest-tz)>.95+padding;
}
export function makeProfile(profile={}) {
  return {
    credits:Number.isSafeInteger(profile.credits)?clamp(profile.credits,0,99999999):0,
    owned:Array.isArray(profile.owned)?[...new Set(profile.owned.filter(key=>GUNS.includes(key)||key==='blade'))]:[],
    exfils:Number.isSafeInteger(profile.exfils)?clamp(profile.exfils,0,99999999):0
  };
}
function teamActor(id,name,role,human) {
  const stats=ROLES[role];
  return { id,name,role,human,x:0,z:0,y:0,yaw:0,pitch:0,hp:stats.hp,
    maxHp:stats.hp,status:'active',weapon:null,ammo:0,reload:0,aim:false,telescope:false,
    extraction:0,bag:[],meds:0,kills:0,sold:0,shotDelay:0,quiet:0,walk:0,crouch:false,sprinting:false,jumpOffset:0,jumpSpeed:0,jumpHeld:false,
    goal:null,wander:0, input:{f:0,s:0,yaw:0,pitch:0,fire:false,sprint:false,aim:false} };
}
export class Simulation {
  constructor(index=0,seed=Date.now()^Math.floor(Math.random()*2147483647)) {
    this.index=MAPS[index]?index:0;
    this.map=MAPS[this.index];
    this.seed=seed;
    this.random=randomSource(seed);
    this.team=[];
    this.events=[];
    this.nextLootId=10000;
    this.started=false;
    this.time=0;
    const spawnPlots=shuffled(this.map.loot.slice(0,3),this.random);
    const fieldPlots=shuffled(this.map.loot.slice(3),this.random);
    const items=[shuffled(['p9','m700','m500'],this.random)[0],shuffled(VALUABLES,this.random)[0],'med',...shuffled([...GUNS,...VALUABLES,...VALUABLES,'med','med','blade'],this.random)];
    this.loot=[...spawnPlots,...fieldPlots].slice(0,items.length).map(([x,z],i)=>{
      const item=items[i], def=ITEMS[item];
      return { id:i,x,z,y:altitude(this.map,x,z),item,kind:item==='med'?'med':def.value?'loot':'gun',value:def.value?def.value+Math.floor(this.random()*16)*10:0 };
    });
    this.shop=[...GUNS,'blade'].map(item=>({item,price:ITEMS[item].base+Math.floor(this.random()*26)*10}));
    this.enemies=this.map.patrol.map(([x,z],i)=>Object.assign(teamActor('e'+i,'敌方巡逻兵','assault',false),{x,z,y:altitude(this.map,x,z),home:{x,z},weapon:i%4===0?'m700':'p9',hp:74,maxHp:74,ammo:99,yaw:this.random()*6.28,quiet:.5+this.random()*3}));
  }
  addPlayer(id,name,role='assault',profile={}) {
    if(this.started||this.team.length>=6||this.player(id)) return false;
    this.team.push(Object.assign(teamActor(id,String(name||'干员').trim().slice(0,16)||'干员',Object.hasOwn(ROLES,role)?role:'assault',true),{profile:makeProfile(profile)}));
    return true;
  }
  removePlayer(id) {
    if(!this.started) this.team=this.team.filter(actor=>actor.id!==id);
    else {
      const actor=this.player(id);
      if(actor?.human && actor.status==='active') {
        actor.human=false;
        actor.telescope=false;
        actor.extraction=0;
        actor.input.fire=false;
      }
    }
  }
  start() {
    if(this.started||!this.team.length)return;
    const specialists=['recon','support','engineer','assault','recon','support'];
    const names=['斥候','回声','铁砧','前锋','长眼','医护'];
    for(let i=0;this.team.length<6;i++) this.team.push(teamActor('ai'+i,names[i],specialists[i],false));
    for(let i=0;i<this.team.length;i++) {
      const actor=this.team[i];
      actor.x=this.map.spawn.x+(i%3===0?0:i%3===1?-1.9:1.9);
      actor.z=this.map.spawn.z+Math.floor(i/3)*2;
    }
    this.started=true;
  }
  player(id) { return this.team.find(p=>p.id===id); }
  input(id,input) {
    const p=this.player(id);
    if(!p?.human||p.status!=='active'||!input||typeof input!=='object') return;
    const safe=k=>typeof input[k]==='number'&&Number.isFinite(input[k])?input[k]:0;
    p.input={f:clamp(safe('f'),-1,1),s:clamp(safe('s'),-1,1),yaw:safe('yaw')%(2*Math.PI),
      pitch:clamp(safe('pitch'),-1.26,1.26),fire:!!input.fire,sprint:!!input.sprint,aim:!!input.aim,crouch:!!input.crouch,jump:!!input.jump};
    return true;
  }
  context(p) {
    if(p.telescope) return {kind:'scopeOn',label:'退出望远镜'};
    if(p.extraction>0) return {kind:'extractOn',label:'取消撤离'};
    const t=this.map.tower;
    if(!p.jumpOffset && p.y>4.5 && Math.hypot(p.x-(t.x+2.55),p.z-(t.z-.3))<1.28) return {kind:'scope',label:'使用 64× 望远镜'};
    if(!p.jumpOffset && p.y>4.5 && Math.hypot(p.x-t.x,p.z-(t.z+1.35))<1.48) return {kind:'extract',label:'启动撤离信标'};
    const loot=this.loot.filter(v=>Math.abs(p.y-v.y)<1.45 && distance(p,v)<2.65).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(loot) return {kind:'loot',label:'拾取 '+ITEMS[loot.item].name,lootId:loot.id};
    return null;
  }
  note(p,text) { this.events.push({kind:'note',to:p.id,text}); }
  pick(p,id) {
    const index=this.loot.findIndex(l=>l.id===id);
    if(index<0)return;
    const loot=this.loot[index];
    if(!p.human && loot.kind!=='gun')return;
    if(loot.kind==='gun') {
      if(p.weapon && p.weapon!==loot.item) this.loot.push({id:this.nextLootId++,x:p.x+.4,z:p.z+.25,y:p.y,item:p.weapon,kind:'gun',value:0});
      p.weapon=loot.item;
      p.ammo=ITEMS[loot.item].mag??0;
      p.reload=0;
      if(p.human&&!p.profile.owned.includes(loot.item)) {
        p.profile.owned.push(loot.item);
        this.note(p,'已永久解锁 '+ITEMS[loot.item].name);
      }
    } else if(loot.kind==='med') {
      p.meds++;
    } else {
      p.bag.push({item:loot.item,value:loot.value});
    }
    this.loot.splice(index,1);
    this.events.push({kind:'pickup',to:p.id});
  }
  reload(p) {
    const gun=ITEMS[p.weapon];
    if(gun?.mag&&p.ammo<gun.mag&&!p.reload&&!p.telescope) {
      p.reload=gun.reload;
      p.aim=false;
      this.events.push({kind:'reload',to:p.id});
    }
  }
  act(id,action,value) {
    const p=this.player(id);
    if(!p?.human)return;
    if(p.status==='shop') {
      if(action==='sell'&&p.bag.length) {
        const value=p.bag.reduce((sum,loot)=>sum+loot.value,0);
        p.sold+=value;
        p.profile.credits+=value;
        p.bag=[];
      }
      if(action==='buy') {
        const offer=this.shop.find(v=>v.item===value);
        if(offer && !p.profile.owned.includes(value) && p.profile.credits>=offer.price) {
          p.profile.credits-=offer.price;
          p.profile.owned.push(value);
        }
      }
      return;
    }
    if(p.status!=='active')return;
    if(action==='interact') {
      const ctx=this.context(p);
      if(ctx?.kind==='scopeOn')p.telescope=false;
      if(ctx?.kind==='extractOn')p.extraction=0;
      if(ctx?.kind==='scope') {
        p.telescope=true;
        p.aim=false;
      }
      if(ctx?.kind==='extract')p.extraction=p.role==='engineer'?2.5:3.4;
      if(ctx?.kind==='loot')this.pick(p,ctx.lootId);
    }
    if(action==='reload')this.reload(p);
    if(action==='fire')this.fire(p);
    if(action==='heal'&&p.meds>0&&p.hp<p.maxHp&&!p.telescope) {
      p.meds--;
      p.hp=Math.min(p.maxHp,p.hp+(p.role==='support'?64:44));
      this.note(p,'已使用急救包');
    }
  }
  blocked(actor,x,z) {
    if(Math.abs(x)>this.map.limit-2||Math.abs(z)>this.map.limit-2)return true;
    if(this.map.sea && (this.map.sea>0?x>this.map.sea-1:x<this.map.sea+1))return true;
    const t=this.map.tower;
    if(Math.hypot(x-t.x,z-(t.z-2.3))<1.19)return true;
    return this.map.boxes.some(b=>Math.abs(x-b.x)<b.w/2+.36&&Math.abs(z-b.z)<b.d/2+.36&&actor.y<b.h);
  }
  move(actor,dx,dz) {
    const ground=altitude(this.map,actor.x,actor.z);
    if(!this.blocked(actor,actor.x+dx,actor.z)&&Math.abs(altitude(this.map,actor.x+dx,actor.z)-ground)<1.25)actor.x+=dx;
    if(!this.blocked(actor,actor.x,actor.z+dz)&&Math.abs(altitude(this.map,actor.x,actor.z+dz)-ground)<1.25)actor.z+=dz;
    actor.y=altitude(this.map,actor.x,actor.z)+actor.jumpOffset;
    actor.walk=Math.hypot(dx,dz)>.002?1:0;
  }
  stepActor(p,dt) {
    p.shotDelay=Math.max(0,p.shotDelay-dt);
    if(p.reload>0) {
      p.reload=Math.max(0,p.reload-dt);
      if(!p.reload)p.ammo=ITEMS[p.weapon].mag;
    }
  }
  fire(p) {
    if(p.telescope||p.reload||p.shotDelay||p.extraction) return;
    const gun=ITEMS[p.weapon]??{delay:.72,range:1.7,damage:22,form:'unarmed'};
    if(gun.mag&&!p.ammo) {
      this.reload(p);
      return;
    }
    p.shotDelay=gun.delay;
    if(gun.mag)p.ammo--;
    const eye=p.y+(p.crouch?1.17:1.62);
    const dx=Math.sin(p.yaw)*Math.cos(p.pitch),dy=Math.sin(p.pitch),dz=-Math.cos(p.yaw)*Math.cos(p.pitch);
    let hit, hitDistance=gun.range, damage=gun.damage;
    for(const e of this.enemies) {
      if(e.hp<=0)continue;
      const x=e.x-p.x,z=e.z-p.z,y=e.y+1.15-eye;
      const t=x*dx+y*dy+z*dz;
      if(t<.1||t>hitDistance)continue;
      const side=Math.hypot(x-dx*t,z-dz*t);
      const height=eye+dy*t-e.y;
      const room=gun.mag?(p.aim?.34:Math.min(.83,.40+t*.004)):.83;
      if(side>room||height<.15||height>2.03||!clearPath(this.map,p,e))continue;
      hit=e;
      hitDistance=t;
      damage=(height>1.56?1.5:height<.7?.72:1)*gun.damage;
    }
    if(hit) {
      hit.hp=Math.max(0,hit.hp-Math.round(damage));
      if(!hit.hp)p.kills++;
    }
    this.events.push({kind:'shot',to:p.id,id:p.id,weapon:p.weapon,x:p.x,y:eye-.12,z:p.z,tx:p.x+dx*hitDistance,ty:eye+dy*hitDistance,tz:p.z+dz*hitDistance,hit:!!hit,kill:!!hit&&!hit.hp});
    if(gun.mag&&p.ammo===0)this.reload(p);
  }
  walkTo(p,goal,dt,speed) {
    let dx=goal.x-p.x,dz=goal.z-p.z;
    const len=Math.hypot(dx,dz);
    if(len<.15){p.walk=0;return;}
    const bx=p.x,bz=p.z,k=Math.min(speed*dt,len)/len;
    p.yaw=Math.atan2(dx,-dz);
    this.move(p,dx*k,dz*k);
    if(Math.hypot(p.x-bx,p.z-bz)<.015) {
      const turn=p.id.charCodeAt(p.id.length-1)%2?1:-1;
      this.move(p,dz*k*turn,-dx*k*turn);
    }
  }
  botStep(p,dt) {
    const active=this.team.filter(v=>v.human&&v.status==='active');
    if(!active.length){p.walk=0;return;}
    const lead=active[(Number(p.id.replace('ai',''))||0)%active.length];
    const enemy=this.enemies.filter(e=>e.hp>0&&distance(e,p)<24&&clearPath(this.map,e,p)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    if(p.weapon&&enemy&&p.shotDelay===0&&!p.reload) {
      p.yaw=Math.atan2(enemy.x-p.x,p.z-enemy.z);
      p.pitch=Math.atan2(enemy.y+1.27-p.y-1.62,distance(enemy,p));
      p.aim=true;
      if(this.random()<.1)this.fire(p);
    }
    let target;
    if(!p.weapon&&distance(p,lead)<22) target=this.loot.filter(l=>l.kind==='gun'&&distance(p,l)<10&&distance(lead,l)>4&&clearPath(this.map,p,l)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    if(target&&distance(p,target)<1.3) {this.pick(p,target.id);target=undefined;}
    const n=this.team.indexOf(p);
    const t=this.map.tower;
    const approaching=lead.y>0||distance(lead,{x:t.x,z:t.z+9})<10;
    if(approaching){
      target=lead.y>4.6?{x:t.x+((n%3)-1)*.75,z:t.z+1.7+n*.28}:{x:t.x+((n%3)-1)*.49,z:Math.max(t.z+4.4,lead.z+1+n*.4)};
    }
    target=target??{x:lead.x+Math.cos(n*2.1)*2.7,z:lead.z+Math.sin(n*2.1)*2.7};
    if(distance(p,target)>.85)this.walkTo(p,target,dt,distance(p,lead)>12?7.4:5.4);
    else p.walk=0;
  }
  enemyStep(e,dt) {
    e.quiet-=dt;
    const opponents=this.team.filter(p=>p.hp>0&&p.status==='active'&&distance(e,p)<(p.human?25:19)&&clearPath(this.map,e,p));
    opponents.sort((a,b)=>distance(a,e)-distance(b,e));
    const p=opponents[0];
    if(p) {
      const d=distance(e,p);
      e.yaw=Math.atan2(p.x-e.x,e.z-p.z);
      if(e.quiet<=0) {
        e.quiet=1.48+this.random()*.82;
        const hit=this.random()<(d<10?.54:.32)*(p.crouch?.77:1);
        if(hit) {
          p.hp=Math.max(0,p.hp-(d<9?10:7));
          if(!p.hp){p.status='failed';p.telescope=false;p.bag=[];}
        }
        this.events.push({kind:'hostile',id:e.id,to:p.id,hit,x:e.x,y:e.y+1.37,z:e.z,tx:p.x,ty:p.y+1.31,tz:p.z});
      }
      if(d>13&&e.y<.4)this.walkTo(e,p,dt,2.65);
      else e.walk=0;
      return;
    }
    e.wander-=dt;
    if(!e.goal||e.wander<=0||distance(e,e.goal)<.6) {
      e.wander=4+this.random()*7;
      e.goal={x:e.home.x+(this.random()-.5)*11,z:e.home.z+(this.random()-.5)*11};
    }
    this.walkTo(e,e.goal,dt,1.45);
  }
  tick(dt) {
    if(!this.started)return;
    this.time+=dt;
    for(const p of this.team) {
      if(p.status!=='active')continue;
      this.stepActor(p,dt);
      if(!p.human) { this.botStep(p,dt);continue; }
      const input=p.input;
      p.yaw=input.yaw;
      p.pitch=input.pitch;
      p.crouch=!!input.crouch&&!p.telescope&&!p.jumpOffset;
      p.sprinting=false;
      p.aim=!!p.weapon&&!p.telescope&&!p.reload&&!p.extraction&&input.aim&&ITEMS[p.weapon].form!=='blade';
      if(p.extraction>0) {
        const t=this.map.tower;
        if(Math.hypot(p.x-t.x,p.z-(t.z+1.35))>=1.6||p.y<4.6) p.extraction=0;
        else {
          p.extraction=Math.max(0,p.extraction-dt);
          if(p.extraction===0) {
            p.status='shop';
            p.profile.exfils++;
            if(this.team.filter(v=>v.human).every(v=>v.status!=='active')) {
              for(const bot of this.team.filter(v=>!v.human&&v.hp>0&&distance(v,p)<14))bot.status='shop';
            }
            this.events.push({kind:'extract',to:p.id});
          }
        }
      }
      if(!p.telescope&&p.status==='active') {
        let vx=input.f*Math.sin(p.yaw)+input.s*Math.cos(p.yaw);
        let vz=-input.f*Math.cos(p.yaw)+input.s*Math.sin(p.yaw);
        const norm=Math.max(1,Math.hypot(vx,vz));
        p.sprinting=input.sprint&&!p.aim&&!p.crouch&&Math.hypot(vx,vz)>.1;
        if(input.jump&&!p.jumpHeld&&!p.jumpOffset&&!p.extraction&&!p.crouch)p.jumpSpeed=4.3;
        if(p.jumpSpeed||p.jumpOffset) {
          p.jumpOffset=Math.max(0,p.jumpOffset+p.jumpSpeed*dt);
          p.jumpSpeed=p.jumpOffset>0?p.jumpSpeed-12.4*dt:0;
        }
        const speed=ROLES[p.role].speed*(p.crouch?.55:p.aim?.53:p.sprinting?1.48:1);
        this.move(p,vx/norm*speed*dt,vz/norm*speed*dt);
        if(input.fire&&ITEMS[p.weapon]?.auto)this.fire(p);
      } else p.walk=0;
      p.jumpHeld=!!input.jump;
    }
    for(const enemy of this.enemies)if(enemy.hp>0)this.enemyStep(enemy,dt);
  }
  takeEvents() { const events=this.events;this.events=[];return events; }
  snapshot(id) {
    const publicActor=({id,name,role,human,x,z,y,yaw,pitch,hp,maxHp,status,weapon,walk,crouch,sprinting,jumpOffset,reload,aim})=>({id,name,role,human,x,z,y,yaw,pitch,hp,maxHp,status,weapon,walk,crouch,sprinting,jumpOffset,reload,aim});
    const agent=this.player(id);
    const player=agent?{...publicActor(agent),ammo:agent.ammo,reload:agent.reload,aim:agent.aim,telescope:agent.telescope,extraction:agent.extraction,
      bag:agent.bag,meds:agent.meds,kills:agent.kills,sold:agent.sold,profile:agent.profile,ctx:agent.status==='active'?this.context(agent):null}:null;
    return { index:this.index,time:this.time,team:this.team.map(publicActor),enemies:this.enemies.map(publicActor),loot:this.loot,shop:this.shop,player };
  }
}
