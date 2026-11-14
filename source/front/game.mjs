import { Simulation, MAPS, ROLES, ITEMS, makeProfile, clamp, distance } from './core.mjs';
import { WorldView, icon } from './world.mjs';
const $=id=>document.getElementById(id);
const node=(tag,content,cls)=>{
  const v=document.createElement(tag);
  if(content!==undefined)v.textContent=content;
  if(cls)v.className=cls;
  return v;
};
const nFmt=n=>new Intl.NumberFormat('zh-CN').format(n);
const screen={lobby:$('lobby'),match:$('match'),settlement:$('settlement')};
const dialog=$('dialog'), content=$('dialogContent');
const collection=['p9','m700','m571','m200','m500','blade'];
const specialties=Object.keys(ROLES);
const symbols=['⌗','⌖','✚','◇'];
const aiNames=['斥候','回声','铁砧','前锋','长眼','医护'];
const coarse=matchMedia('(pointer: coarse)').matches;
const keys=new Set();
const sticks={id:null,x:0,y:0,f:0,s:0};
const storage=(()=>{
  let initial;
  try { initial=JSON.parse(localStorage.getItem('exfil-frontline-v1')); } catch {}
  return initial&&typeof initial==='object'?initial:{};
})();
let sensitivity=clamp(Number(storage.sensitivity)||1,.45,2.2),volume=clamp(Number(storage.volume??.74),0,1);
let crouching=false,jumpUntil=0,paused=false,menuLast=0,deployUntil=0;
let mapIndex=0, role=Object.hasOwn(ROLES,storage.role)?storage.role:'assault';
let profile=makeProfile(storage.profile??{}), codename=typeof storage.codename==='string'?storage.codename:'你';
let playing='lobby', local=null, world=null, socket=null, room=null, requestId=null;
let lanReady=false, snapshot=null, currentId=null, currentKey='', last=0, saveKey='', netInputTime=0;
let yaw=0,pitch=0,aim=false,mouseAim=false,fireMouse=false,fireButton=false,drag=null, grabbed=false;
let audio=null,ambient=null, lastHit=0, damageAt=0, noteUntil=0, lastInteract='', lastMatchSquad='', lastShop='';
const save=()=>{
  const data=JSON.stringify({profile,role,codename,sensitivity,volume});
  if(data===saveKey)return;
  try { localStorage.setItem('exfil-frontline-v1',data);saveKey=data; }catch {}
};
function show(name) {
  for(const [key,section] of Object.entries(screen))section.hidden=key!==name;
  playing=name;window.scrollTo(0,0);
  if(name!=='match')paused=false;
  if(ambient)ambient.gain.setTargetAtTime(name==='match'?volume*.13:0,audio.currentTime,.22);
  if(name==='lobby')attachWorld($('menuWorld'));
  if(name!=='match') {
    if(document.pointerLockElement)document.exitPointerLock();
    keys.clear();fireButton=fireMouse=aim=mouseAim=false;resetStick();
  }
}
function openDialog(title) {
  content.replaceChildren(node('h2',title));
  if(!dialog.open)dialog.showModal();
  return content;
}
$('closeDialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{
  if(paused&&playing==='match')paused=false;
});
function attachWorld(container){
  if(!world||world.container===container)return;
  world.container=container;
  container.append(world.renderer.domElement);
  world.resize();
}
function resetStick(){
  sticks.id=null;sticks.f=sticks.s=0;
  $('stickRing').style.removeProperty('left');$('stickRing').style.removeProperty('top');
  $('stickKnob').style.transform='';
}
function settings(fromPause=false){
  openDialog('设置');
  const specs=[
    ['视角灵敏度',.45,2.2,.05,sensitivity,value=>{sensitivity=value;save();}],
    ['音量',0,1,.05,volume,value=>{volume=value;if(ambient)ambient.gain.setTargetAtTime(playing==='match'?volume*.13:0,audio.currentTime,.18);save();}]
  ];
  for(const [label,min,max,step,value,update] of specs){
    const row=node('label',undefined,'settings-row'), input=node('input'), out=node('output',Math.round(value*100)+'%');
    input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;
    input.oninput=()=>{const n=Number(input.value);out.textContent=Math.round(n*100)+'%';update(n);};
    row.append(node('span',label),input,out);content.append(row);
  }
  const full=node('button',document.fullscreenElement?'离开全屏':'全屏游戏','plain line');
  full.onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      full.textContent=document.fullscreenElement?'离开全屏':'全屏游戏';
    }catch{full.textContent='当前浏览器无法全屏';}
  };
  content.append(full);
  const credit=node('details',undefined,'character-credits');
  credit.append(node('summary','人物素材'));
  const refs=[
    ['DanlyVostok · 军事人物模型','https://sketchfab.com/3d-models/military-tactical-suit-lowpolygameready-ef698ce36b1545a78ce592dd3db4c7ed','CC BY 4.0'],
    ['BAMEN · 动画源骨骼','https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198','CC BY 4.0'],
    ['Quaternius · Universal Animation Library 1 & 2','https://quaternius.com','CC0 1.0'],
    ['cktang88/3d-fps · 素材预处理与动画移植','https://github.com/cktang88/3d-fps','']
  ];
  for(const [name,href,license] of refs){
    const row=node('p'), link=node('a',name);
    link.href=href;link.target='_blank';link.rel='noopener noreferrer';
    row.append(link);
    if(license){
      const terms=node('a',license);
      terms.href=license==='CC0 1.0'?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/licenses/by/4.0/';
      terms.target='_blank';terms.rel='noopener noreferrer';
      row.append(document.createTextNode(' · '),terms);
    }
    credit.append(row);
  }
  credit.append(node('p','人物材质、配色与骨骼动画已针对撤离前线调整。'));
  content.append(credit);
  if(fromPause){const back=node('button','返回暂停菜单','plain');back.onclick=pauseMenu;content.append(back);}
}
$('settingsOpen').onclick=()=>settings();
function pauseMenu(){
  if(playing!=='match')return;
  paused=true;
  if(document.pointerLockElement)document.exitPointerLock();
  keys.clear();fireMouse=fireButton=mouseAim=false;resetStick();
  if(room)send({type:'input',input:inputState()});
  openDialog('行动暂停');
  if(room)content.append(node('p','队友仍可在联机战场行动。'));
  const actions=node('div',undefined,'pause-actions');
  for(const [label,action] of [
    ['继续行动',()=>{paused=false;dialog.close();$('view').focus({preventScroll:true});}],['设置',()=>settings(true)],['返回大厅',()=>{
      dialog.close();
      if(room)closeRoom();else resetRound();
    }]
  ]){
    const b=node('button',label,actions.childElementCount?'plain line':'primary');b.onclick=action;actions.append(b);
  }
  content.append(actions);
}
$('pause').onclick=pauseMenu;

function lobbyRender() {
  $('mapReadout').textContent=MAPS[mapIndex].name;
  $('mapSub').textContent=MAPS[mapIndex].en;
  $('mapIndex').textContent=String(mapIndex+1).padStart(2,'0')+' / 03';
  $('roleReadout').textContent=ROLES[role].name;
  $('roleDesc').textContent=ROLES[role].desc;
  $('collectionCount').textContent=profile.owned.length+' / '+collection.length;
  $('maps').replaceChildren(...MAPS.map((map,index)=>{
    const v=node('button',map.name,'choice'+(mapIndex===index?' selected':''));
    v.setAttribute('aria-pressed',String(mapIndex===index));
    v.append(node('small',map.en));
    v.title=map.type;
    v.disabled=!!room&&(room.host!==currentId||room.phase==='match');
    v.onclick=()=>{
      mapIndex=index;
      if(room)send({type:'map',index});
      lobbyRender();
    };
    return v;
  }));
  $('roles').replaceChildren(...specialties.map((key,index)=>{
    const v=node('button',undefined,'choice'+(role===key?' selected':''));
    v.setAttribute('aria-pressed',String(role===key));
    v.disabled=room?.phase==='match';
    v.append(node('span',symbols[index],'role-icon'),document.createTextNode(ROLES[key].name));
    v.onclick=()=>{
      role=key;save();
      if(room)send({type:'identity',name:codename,role});
      lobbyRender();
    };
    return v;
  }));
  const units=room?room.members:[{id:'local',name:'你',role}];
  const slots=Array.from({length:6},(_,i)=>units[i]??{name:aiNames[i-units.length],role:null});
  $('lobbySquad').replaceChildren(...slots.map(a=>{
    const cell=node('span',undefined,'squad-cell'+(a.id?' real':''));
    cell.append(node('b',a.name),node('small',a.id?'真人':'AI'));
    return cell;
  }));
  $('teamTotal').textContent=units.length+' 真人 / '+(6-units.length)+' AI';
  $('lobbyRoom').textContent=room?'房间 '+room.code:'空缺位置由 AI 队友加入';
  $('play').disabled=!!room&&(room.host!==currentId||room.phase==='match');
  $('play').firstChild.textContent=room?.phase==='match'?'小队行动中 ':room&&room.host!==currentId?'等待房主开始 ':'开始游戏 ';
}
function guide() {
  openDialog('操作指南');
  const table=node('div',undefined,'guide');
  const lines=[['W A S D / 左侧摇杆','移动'],['鼠标 / 右侧拖动','转动视角'],['Shift','冲刺'],['Space / C','跳跃 / 蹲伏'],['左键 / Enter','开火。冲锋枪可按住连发，空手时近身攻击'],['右键 / Q','瞄准或切换倍镜'],['E','拾取物资、使用望远镜或启动撤离'],['R','换弹'],['H','使用急救包'],['Esc','暂停']];
  for(const [key,label] of lines) table.append(node('kbd',key),node('span',label));
  content.append(table,node('p','根据小地图前往望明灯塔，从南侧坡道上中层平台。站在信标旁按 E，留在圈内直到倒计时结束。'));
}
$('controlsOpen').onclick=guide;
function itemCard(id,action) {
  const def=ITEMS[id], card=node('article',undefined,'shop-item');
  const c=node('canvas');c.width=162;c.height=55;c.setAttribute('aria-hidden','true');
  icon(c,id);
  const detail=def.mag?def.type+' · '+def.mag+' 发 · '+def.reload+' 秒换弹':def.type;
  card.append(c,node('strong',def.name),node('small',detail),action);
  return card;
}
$('collectionOpen').onclick=()=>{
  openDialog('武器收藏');
  const list=node('div',undefined,'shop-list');
  for(const id of collection){
    const flag=node('button',profile.owned.includes(id)?'已解锁':'未解锁');flag.disabled=true;
    list.append(itemCard(id,flag));
  }
  content.append(node('p','拾到或购买的武器会永久解锁。每次出发仍然空手进图。'),list);
};
function notify(message) {
  $('toast').textContent=message;
  noteUntil=performance.now()+2650;
}
const soundBank=new Map();
function sampleFor(weapon){
  if(soundBank.has(weapon))return soundBank.get(weapon);
  const strong=weapon==='m200'||weapon==='m500', melee=weapon==='unarmed'||weapon==='blade';
  const sample=audio.createBuffer(1,Math.floor(audio.sampleRate*(strong?.74:.43)),audio.sampleRate);
  const wave=sample.getChannelData(0);
  let low=0,mid=0;
  for(let i=0;i<wave.length;i++){
    const t=i/audio.sampleRate,n=Math.random()*2-1;
    low+=.055*(n-low);mid+=.28*(n-mid);
    const crack=(n*.43+mid*.28)*Math.exp(-t/(strong?.036:.022));
    const thump=(low*.77+.29*Math.sin(t*(strong?510:690)))*Math.exp(-t/(strong?.076:.045));
    const echo=t>.072?(mid*.27+low*.39)*Math.exp(-(t-.072)/(strong?.22:.11)):0;
    wave[i]=Math.tanh((melee?low*Math.exp(-t/.064):crack+thump+echo)*1.82);
  }
  soundBank.set(weapon,sample);
  return sample;
}
function sound(type,other=false,side=0){
  if(!audio||audio.state!=='running'||volume===0)return;
  const t=audio.currentTime,g=audio.createGain();
  const pan=typeof audio.createStereoPanner==='function'?audio.createStereoPanner():null;
  g.gain.value=volume*(other?.17:.54);
  if(pan){pan.pan.value=side;g.connect(pan);pan.connect(audio.destination);}else g.connect(audio.destination);
  if(type==='pickup'||type==='extract'||type==='reload'||type==='step') {
    const notes=type==='extract'?[414,523,628]:type==='reload'?[183,121,91]:type==='step'?[69]:[390,558];
    notes.forEach((f,i)=>{
      const when=t+i*.078,v=audio.createGain(),o=audio.createBufferSource();
      if(type==='step'||type==='reload'){
        o.buffer=sampleFor('unarmed');o.playbackRate.value=type==='step'?.8+Math.random()*.46:1.4+i*.68;
        v.gain.value=type==='step'?.24:.50;o.connect(v);v.connect(g);o.start(when);
      }else{
        const wave=audio.createOscillator();
        wave.type='sine';wave.frequency.setValueAtTime(f,when);v.gain.setValueAtTime(.20,when);
        v.gain.exponentialRampToValueAtTime(.002,when+.13);
        wave.connect(v);v.connect(g);wave.start(when);wave.stop(when+.14);
      }
    });
    return;
  }
  const b=audio.createBufferSource();
  b.buffer=sampleFor(type);b.playbackRate.value=.94+Math.random()*.12;
  b.connect(g);b.start();
}
function userAudio(){
  if(!audio){
    const Context=window.AudioContext??window.webkitAudioContext;
    if(!Context)return;
    audio=new Context();
    ambient=audio.createGain();ambient.gain.value=0;ambient.connect(audio.destination);
    const rain=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),samples=rain.getChannelData(0);
    let avg=0;
    for(let i=0;i<samples.length;i++){
      const white=Math.random()*2-1;
      avg+=.06*(white-avg);samples[i]=avg*.64+white*.13;
    }
    const source=audio.createBufferSource();source.buffer=rain;source.loop=true;source.connect(ambient);source.start();
  }
  audio.resume().catch(()=>{});
}
let stepAt=0;
function buildWorld(container=$('view'),quiet=false){
  if(world){attachWorld(container);return true;}
  try { world=new WorldView(container);return true; }
  catch {
    if(quiet)return false;
    show('lobby');
    openDialog('无法打开战场').append(node('p','设备未能启用 WebGL 2。请使用支持硬件加速的 Chrome、Edge、Firefox 或 Safari 再打开游戏。'));
    return false;
  }
}
function beginFight(first) {
  dialog.close();
  show('match');
  if(!buildWorld()) {
    if(room)closeRoom();
    local=null;
    return;
  }
  currentKey='';
  snapshot=null;
  lastMatchSquad='';
  yaw=[0,-.23,.27][first.index];pitch=0;aim=mouseAim=fireButton=fireMouse=false;
  crouching=false;jumpUntil=0;resetStick();
  $('view').focus({preventScroll:true});
  keys.clear();
  $('touchMove').hidden=!coarse;
  $('toast').textContent='';
  if(world.index!==first.index||!world.scene)world.load(first.index);
  world.begin();
  world.resize();
  $('hudMap').textContent=MAPS[first.index].name;
  const card=$('deployCard');card.querySelector('strong').textContent=MAPS[first.index].name;
  card.hidden=true;requestAnimationFrame(()=>{if(playing==='match')card.hidden=false;});
  deployUntil=performance.now()+2800;stepAt=0;
  $('grabTip').hidden=coarse;
  applyState(first);
  last=performance.now();
  notify('空手出发 · 先找武器和物资');
}
function resetRound(){
  local=null;snapshot=null;
  show('lobby');
  lobbyRender();
}
$('play').onclick=()=>{
  userAudio();
  if(room) {
    if(room.host===currentId)send({type:'start'});
    return;
  }
  currentId='local';
  local=new Simulation(mapIndex);
  local.addPlayer(currentId,codename,role,profile);
  local.start();
  beginFight(local.snapshot(currentId));
};
function roomDialog(message='') {
  if(playing!=='lobby')return;
  openDialog('邀请好友');
  if(PAGES_BUILD) {
    const download=node('a','下载好友联机包');
    download.href='https://github.com/youlinh/exfil-frontline/releases/latest';
    const link=node('p');link.append(download);
    content.append(node('p','这个网页可直接单人游玩。好友组队时，由房主下载联机包并启动房间服务，再从局域网地址创建房间。'),link);
    return;
  }
  if(!lanReady && !room) {
    content.append(node('p','双击打开的是单机版。把联机包解压后运行 room-server.cjs，再用它显示的网址打开游戏，即可创建房间。'),
      node('p','好友需要能访问房主的网址。同一 Wi‑Fi 下可直接使用终端显示的局域网地址。'));
    return;
  }
  if(room) {
    content.append(node('p','房间 '+room.code+' · '+room.members.length+' 位真人，'+(6-room.members.length)+' 位 AI','room-status'));
    const row=node('div',undefined,'room-input'), addr=node('input'), copy=node('button','复制邀请链接','primary');
    addr.readOnly=true;
    const url=new URL(location.href);
    url.search='';url.hash='';url.searchParams.set('room',room.code);
    addr.value=url.href;addr.setAttribute('aria-label','好友邀请链接');
    const feedback=node('p');feedback.id='copyStatus';
    copy.onclick=async()=>{
      addr.select();
      try {
        if(navigator.clipboard&&isSecureContext)await navigator.clipboard.writeText(addr.value);
        else if(!document.execCommand('copy'))throw Error();
        feedback.textContent='已复制邀请链接';
      } catch { feedback.textContent='链接已选中，可手动复制。'; }
    };
    row.append(addr,copy);content.append(row,feedback);
    if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
      content.append(node('p','请从终端显示的局域网网址打开大厅，再复制好友可以访问的邀请链接。'));
    }
    const back=node('button','退出房间','plain line');
    back.onclick=()=>{ closeRoom();roomDialog(); };
    content.append(back);
    return;
  }
  const name=node('input');name.placeholder='输入昵称';name.value=codename==='你'?'':codename;name.maxLength=16;name.setAttribute('aria-label','昵称');
  const create=node('button','创建房间','primary');
  const first=node('div',undefined,'room-input');first.append(name,create);
  const code=node('input');code.placeholder='输入 6 位房间码';code.maxLength=6;code.autocomplete='off';code.setAttribute('aria-label','房间码');code.value=requestId??'';
  const join=node('button','加入房间','plain line');
  const second=node('div',undefined,'room-input');second.append(code,join);
  const submit=(op)=>{
    userAudio();
    codename=name.value.trim().slice(0,16)||'干员';
    save();
    const token=code.value.trim().toUpperCase();
    if(op==='join'&&!/^[A-Z0-9]{6}$/.test(token)) {
      messageNode.textContent='请检查 6 位房间码。';return;
    }
    create.disabled=join.disabled=true;
    messageNode.textContent='正在接入房间…';
    connect({type:op,name:codename,role,index:mapIndex,code:token,profile});
  };
  create.onclick=()=>submit('create');
  join.onclick=()=>submit('join');
  code.onkeydown=e=>{if(e.key==='Enter')submit('join');};
  const messageNode=node('p',message,'room-status');
  content.append(node('p','分享邀请链接或 6 位房间码。真人加入后，AI 数量会相应减少。'),first,second,messageNode);
}
$('roomOpen').onclick=()=>roomDialog();
function connect(intent) {
  if(socket)closeRoom();
  const protocol=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(protocol+'//'+location.host+'/room');
  socket=ws;
  ws.addEventListener('open',()=>{if(ws===socket)send(intent);});
  ws.addEventListener('message',event=>{
    if(ws!==socket)return;
    let msg;try{msg=JSON.parse(event.data);}catch{return;}
    if(msg.type==='identity')currentId=msg.id;
    if(msg.type==='room') {
      room=msg.room;mapIndex=room.index;requestId=null;
      lobbyRender();
      if(dialog.open)roomDialog();
    }
    if(msg.type==='start')beginFight(msg.snapshot);
    if(msg.type==='tick') {
      for(const e of msg.events)handleEvent(e);
      applyState(msg.snapshot);
    }
    if(msg.type==='lobby') {
      resetRound();
      roomDialog(msg.text);
    }
    if(msg.type==='error') {
      if(room)notify(msg.text);
      else{closeRoom();roomDialog(msg.text);}
    }
  });
  ws.addEventListener('close',()=>{
    if(ws!==socket)return;
    socket=null;room=null;currentId=null;
    resetRound();
    roomDialog('已与房间断开。请检查房主服务后重新加入。');
  });
}
function send(msg) {
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg));
}
function closeRoom(){
  if(socket) {
    const old=socket;socket=null;
    old.close();
  }
  room=null;currentId=null;
  resetRound();
}
function act(action,value) {
  if(local) {
    local.input(currentId,inputState());
    const p=local.player(currentId);
    p.yaw=p.input.yaw;p.pitch=p.input.pitch;
    local.act(currentId,action,value);
    for(const e of local.takeEvents())handleEvent(e);
    applyState(local.snapshot(currentId));
  } else if(room)send({type:'action',action,value,input:inputState()});
}
function audioSide(player,evt){return clamp(((evt.x-player.x)*Math.cos(yaw)+(evt.z-player.z)*Math.sin(yaw))/17,-.85,.85);}
function handleEvent(e) {
  const current=e.to===currentId;
  if(e.kind==='note'&&current)notify(e.text);
  if(e.kind==='hostile'&&current&&e.hit) {
    damageAt=performance.now()+280;
    $('damage').style.opacity='1';
  }
  if((e.kind==='shot'||e.kind==='hostile')&&world)world.action(e,currentId);
  if(e.kind==='shot'&&current&&e.hit) {
    lastHit=performance.now()+180;
    $('hit').hidden=false;
    if(e.kill)notify('已击倒敌方巡逻兵');
  }
  if(e.kind==='shot') {
    const player=snapshot?.player;
    if(current||player&&distance(player,e)<33)sound(e.weapon??'unarmed',!current,current?0:audioSide(player,e));
  }
  if(e.kind==='hostile'&&snapshot?.player&&distance(snapshot.player,e)<34)sound('p9',true,audioSide(snapshot.player,e));
  if(current&&['pickup','extract','reload'].includes(e.kind))sound(e.kind);
}
function applyState(next) {
  if(!next?.player)return;
  snapshot=next;
  profile=makeProfile(next.player.profile);
  save();
  const p=next.player;
  if(playing==='match'&&p.status!=='active') {
    dialog.close();
    show('settlement');
    lastShop='';
  }
  if(playing==='settlement')shopRender(next);
}
function shopRender(next) {
  const p=next.player, victory=p.status==='shop';
  const signature=JSON.stringify([p.bag,p.profile,p.sold,p.status,p.kills]);
  if(signature===lastShop)return;
  lastShop=signature;
  $('outcome').textContent=victory?'成功撤离':'行动失败';
  $('outcomeDesc').textContent=victory?'已抵达望明灯塔的中层平台 · 击倒 '+p.kills+' 名敌人':'本局物资未带出 · 已解锁武器仍在收藏中';
  $('shopSection').hidden=!victory;
  $('retry').hidden=victory;
  if(!victory)return;
  const amount=p.bag.reduce((sum,l)=>sum+l.value,0);
  $('balance').textContent=nFmt(profile.credits)+' 信用点';
  $('bagCount').textContent=p.bag.length+' 件';
  $('sell').disabled=!p.bag.length;
  $('sellValue').textContent=amount?nFmt(amount)+' 信用点':'';
  const rows=p.bag.map(l=>{
    const div=node('div',undefined,'manifest-row');
    div.append(node('span',ITEMS[l.item].name),node('b',nFmt(l.value)));
    return div;
  });
  if(!rows.length)rows.push(node('p',p.sold?'本局已出售 '+nFmt(p.sold)+' 信用点':'本局没有带出可出售物资。','muted'));
  $('manifestList').replaceChildren(...rows);
  const cards=next.shop.map(offer=>{
    const owned=profile.owned.includes(offer.item);
    const buy=node('button');
    buy.append(node('span',owned?'已解锁':'购买'),node('span',nFmt(offer.price)));
    buy.disabled=owned||profile.credits<offer.price;
    buy.setAttribute('aria-label','购买 '+ITEMS[offer.item].name+'，价格 '+offer.price+' 信用点');
    buy.onclick=()=>act('buy',offer.item);
    return itemCard(offer.item,buy);
  });
  $('shopList').replaceChildren(...cards);
}
$('sell').onclick=()=>act('sell');
$('settledBack').onclick=$('retry').onclick=()=>{
  if(room){send({type:'return'});show('lobby');lobbyRender();}
  else resetRound();
};
$('leave').onclick=()=>{
  if(room)closeRoom();
  else resetRound();
};
$('interact').onclick=()=>act('interact');
$('crouch').onclick=()=>{crouching=!crouching;};
$('jump').onclick=()=>{jumpUntil=performance.now()+112;};
$('reload').onclick=()=>act('reload');
$('heal').onclick=()=>act('heal');
$('scope').onclick=()=>{
  if(snapshot?.player.telescope)act('interact');
  else aim=!aim;
};
const beginFire=()=>{fireMouse=true;act('fire');};
const fire=$('fire');
fire.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  fire.setPointerCapture(e.pointerId);fireButton=true;act('fire');
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(type,()=>{fireButton=false;});
fire.addEventListener('click',e=>{if(e.detail===0)act('fire');});
window.addEventListener('keydown',e=>{
  if(playing!=='match')return;
  if(e.code==='Escape'&&!e.repeat&&!dialog.open){e.preventDefault();pauseMenu();return;}
  if(paused||dialog.open)return;
  const gameKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyR','KeyH','KeyQ','KeyC','Space','Enter'];
  if(!gameKeys.includes(e.code))return;
  if((e.code==='Space'||e.code==='Enter')&&e.target instanceof HTMLButtonElement&&e.target.id!=='play')e.target.blur();
  e.preventDefault();
  if(!e.repeat) {
    if(e.code==='KeyQ')$('scope').click();
    if(e.code==='KeyE')act('interact');
    if(e.code==='KeyR')act('reload');
    if(e.code==='KeyH')act('heal');
    if(e.code==='KeyC')crouching=!crouching;
    if(e.code==='Enter')act('fire');
  }
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function releaseInput(){
  keys.clear();
  fireMouse=fireButton=mouseAim=false;
  jumpUntil=0;drag=null;resetStick();
  if(room&&playing==='match')send({type:'input',input:inputState()});
}
window.addEventListener('blur',releaseInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseInput();});
document.addEventListener('pointerlockchange',()=>{
  grabbed=document.pointerLockElement===$('view');
  $('grabTip').hidden=grabbed||coarse;
  if(!grabbed)fireMouse=mouseAim=false;
});
function turn(dx,dy) {
  const state=snapshot?.player, zoom=state?.telescope?8:state?.aim&&ITEMS[state.weapon]?.zoom>=8?Math.sqrt(ITEMS[state.weapon].zoom):1;
  yaw+=dx*.00225/zoom*sensitivity;
  pitch=clamp(pitch-dy*.00210/zoom*sensitivity,-1.26,1.26);
}
$('view').addEventListener('pointerdown',e=>{
  if(playing!=='match')return;
  userAudio();
  if(e.button===2) {mouseAim=true;return;}
  if(e.button!==0)return;
  if(grabbed){beginFire();return;}
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType!=='mouse'};
  $('view').setPointerCapture(e.pointerId);
  if(e.pointerType==='mouse'&&$('view').requestPointerLock){
    try { const result=$('view').requestPointerLock();result?.catch(()=>{}); }catch{}
  }
});
$('view').addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',e=>{
  if(e.button===2)mouseAim=false;
  if(e.button===0)fireMouse=false;
  if(drag?.id===e.pointerId)drag=null;
});
window.addEventListener('pointercancel',()=>{drag=null;fireMouse=mouseAim=false;});
window.addEventListener('pointermove',e=>{
  if(playing!=='match'||paused)return;
  if(grabbed)turn(e.movementX,e.movementY);
  else if(drag?.id===e.pointerId) {
    turn(e.clientX-drag.x,e.clientY-drag.y);
    drag.x=e.clientX;drag.y=e.clientY;
  }
});
const joystick=$('touchMove');
joystick.addEventListener('pointerdown',e=>{
  if(sticks.id!==null||paused)return;
  e.preventDefault();joystick.setPointerCapture(e.pointerId);
  const rect=joystick.getBoundingClientRect();
  sticks.id=e.pointerId;sticks.x=e.clientX;sticks.y=e.clientY;
  $('stickRing').style.left=(e.clientX-rect.left)+'px';
  $('stickRing').style.top=(e.clientY-rect.top)+'px';
});
joystick.addEventListener('pointermove',e=>{
  if(sticks.id!==e.pointerId)return;
  const x=e.clientX-sticks.x,y=e.clientY-sticks.y,d=Math.max(49,Math.hypot(x,y));
  sticks.s=x/d;sticks.f=-y/d;
  $('stickKnob').style.transform='translate('+(sticks.s*43)+'px,'+(-sticks.f*43)+'px)';
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId===sticks.id)resetStick();});
function inputState(){
  if(paused)return {f:0,s:0,yaw,pitch,sprint:false,fire:false,aim:false,crouch:false,jump:false};
  const has=(...codes)=>codes.some(code=>keys.has(code));
  const f=clamp(sticks.f+Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown')),-1,1);
  const s=clamp(sticks.s+Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),-1,1);
  return {f,s,yaw,pitch,sprint:has('ShiftLeft','ShiftRight')||sticks.f>.96,fire:fireMouse||fireButton||has('Enter'),
    aim:aim||mouseAim,crouch:crouching,jump:has('Space')||performance.now()<jumpUntil};
}
const radar=$('radar').getContext('2d');
function mini(next) {
  const map=MAPS[next.index],p=next.player, w=154,h=145, scale=.89;
  const X=x=>w/2+x*scale,Z=z=>h/2+z*scale;
  radar.fillStyle='#243037';radar.fillRect(0,0,w,h);
  if(map.sea) {
    radar.fillStyle='#3e525b';
    if(map.sea>0)radar.fillRect(X(map.sea),0,w-X(map.sea),h);
    else radar.fillRect(0,0,X(map.sea),h);
  }
  radar.strokeStyle='#75958031';radar.lineWidth=1;
  for(let k=14;k<155;k+=20) {
    radar.beginPath();radar.moveTo(k+.5,0);radar.lineTo(k+.5,h);radar.stroke();
    radar.beginPath();radar.moveTo(0,k+.5);radar.lineTo(w,k+.5);radar.stroke();
  }
  radar.fillStyle='#7b897186';
  for(const b of map.boxes)radar.fillRect(X(b.x-b.w/2),Z(b.z-b.d/2),b.w*scale,b.d*scale);
  const entrance=map.tower.z+17.8;
  radar.setLineDash([3,3]);radar.strokeStyle='#ffc77d88';
  radar.beginPath();radar.moveTo(X(p.x),Z(p.z));radar.lineTo(X(map.tower.x),Z(p.y<1?entrance:map.tower.z));radar.stroke();
  radar.setLineDash([]);
  radar.fillStyle='#ffc278';radar.save();radar.translate(X(map.tower.x),Z(map.tower.z));radar.rotate(Math.PI/4);radar.fillRect(-3.5,-3.5,7,7);radar.restore();
  radar.strokeStyle='#e2fac070';radar.strokeRect(X(map.tower.x)-2,Z(entrance)-2,4,4);
  for(const a of next.team) {
    if(a.id===p.id||a.status!=='active')continue;
    radar.fillStyle='#9ed2ad';radar.fillRect(X(a.x)-1.5,Z(a.z)-1.5,3,3);
  }
  for(const e of next.enemies)if(e.hp>0&&distance(p,e)<(p.role==='recon'?32:17)) {
    radar.fillStyle='#e5946d';radar.fillRect(X(e.x)-1.5,Z(e.z)-1.5,3,3);
  }
  radar.save();radar.translate(X(p.x),Z(p.z));radar.rotate(yaw);radar.fillStyle='#f8f8e6';radar.beginPath();
  radar.moveTo(0,-5);radar.lineTo(3.5,4);radar.lineTo(0,2);radar.lineTo(-3.5,4);radar.closePath();radar.fill();radar.restore();
  radar.strokeStyle='#cad7bd';radar.beginPath();radar.moveTo(6,12);radar.lineTo(6,5);radar.lineTo(11,12);radar.lineTo(11,5);radar.stroke();
}
const compass=$('compass'), tape=$('compassTape'), directions=['北','东北','东','东南','南','西南','西','西北'];
const ticks=Array.from({length:33},()=>{const tick=node('span'), label=node('em');tick.append(label);tape.append(tick);return {tick,label};});
let displayedDegree=NaN,lastPips='';
function drawCompass(raw){
  const deg=Math.round(raw);
  if(deg===displayedDegree)return;
  displayedDegree=deg;
  const base=Math.floor(deg/5)*5;
  for(let j=0;j<ticks.length;j++){
    const v=base+(j-16)*5, norm=((v%360)+360)%360, item=ticks[j];
    item.tick.style.left=((v-deg)*.86+50)+'%';
    item.tick.classList.toggle('major',norm%15===0);
    item.label.textContent=norm%45===0?directions[norm/45]:norm%15===0?String(norm).padStart(3,'0'):'';
    item.label.style.visibility=Math.abs(v-deg)<12?'hidden':'visible';
  }
  const n=((deg%360)+360)%360;
  compass.querySelector('strong').textContent=directions[Math.round(n/45)%8]+' '+String(n).padStart(3,'0')+'°';
}
function hud(next,now) {
  const p=next.player, map=MAPS[next.index];
  const live=next.team.filter(a=>a.status==='active').length;
  $('teamLive').textContent=live+' / '+next.team.length;
  const info=next.team.map(a=>[a.name,a.id,a.role,a.status,a.human]);
  const sig=JSON.stringify(info);
  if(sig!==lastMatchSquad) {
    lastMatchSquad=sig;
    $('matchSquad').replaceChildren(...next.team.map(a=>{
      const line=node('div',undefined,'agent'+(a.status==='failed'?' down':''));
      line.append(node('i'),node('b',a.id===p.id?'你 · '+ROLES[a.role].name:a.name),
        node('small',a.status==='shop'?'已撤离':a.human?'真人':'AI'));
      return line;
    }));
  }
  drawCompass(yaw*180/Math.PI);
  const metres=Math.round(distance(map.tower,p)),range=metres+' m';
  $('distance').textContent=range;
  const marker=$('worldMarker'), projected=world.marker(map.tower.x,metres<10||p.y>4?6.8:8.8,map.tower.z+1.35);
  marker.hidden=!projected||p.telescope||p.aim||metres<5;
  if(!marker.hidden){
    marker.style.left=(projected.x*50+50)+'%';marker.style.top=(50-projected.y*50)+'%';
    marker.querySelector('span').textContent=range;
  }
  $('hp').textContent=p.hp;$('hpBar').style.width=(p.hp/p.maxHp*100)+'%';
  $('inventory').textContent='物资 '+p.bag.length+' · 急救包 '+p.meds;
  const def=ITEMS[p.weapon], zoom=p.telescope?64:p.aim&&def?.zoom>=8?def.zoom:0;
  $('weapon').textContent=def?.name??'空手';$('ammo').textContent=def?.mag?p.ammo:'—';
  $('maxAmmo').textContent=def?.mag?'/ '+def.mag:'';
  const pipSignature=p.weapon+':'+p.ammo;
  if(pipSignature!==lastPips){
    lastPips=pipSignature;
    $('ammoPips').replaceChildren(...Array.from({length:def?.mag??0},(_,i)=>node('i',undefined,i<p.ammo?'':'spent')));
  }
  $('weaponState').textContent=p.reload?'换弹 '+p.reload.toFixed(1)+' 秒':def?def.type:'寻找随机出现的武器';
  $('reload').disabled=!def?.mag||p.ammo===def.mag||!!p.reload||p.telescope;
  $('scope').disabled=(!def?.mag||!!p.reload)&&!p.telescope;
  $('fire').disabled=p.telescope||!!p.reload||!!p.extraction;
  $('heal').disabled=!p.meds||p.hp===p.maxHp||p.telescope;
  $('interact').disabled=!p.ctx;
  $('scopeShade').hidden=!zoom;$('opticX').textContent=zoom+'×';$('reticle').hidden=!!zoom;
  $('reticle').style.setProperty('--gap',(p.aim?3:5+world.recoil*9+(p.sprinting?5:0))+'px');
  $('crouch').setAttribute('aria-pressed',String(crouching));
  if(now>deployUntil)$('deployCard').hidden=true;
  const label=p.ctx?.label??'';
  if(label!==lastInteract) {
    lastInteract=label;$('prompt').querySelector('span').textContent=label;
  }
  $('prompt').hidden=!label||!!p.extraction;
  const progress=$('barProgress');
  progress.hidden=!p.extraction;
  if(p.extraction){
    progress.querySelector('strong').textContent='撤离中 '+p.extraction.toFixed(1)+' 秒  ·  留在平台信标圈内';
    progress.querySelector('i').style.width=(100*(1-p.extraction/(p.role==='engineer'?2.5:3.4)))+'%';
  }
  if(now>lastHit)$('hit').hidden=true;
  if(now>damageAt)$('damage').style.opacity='0';
  if(now>noteUntil)$('toast').textContent='';
  mini(next);
}
window.addEventListener('resize',()=>{if(playing==='match'||playing==='lobby')world?.resize();});
function frame(now) {
  requestAnimationFrame(frame);
  if(playing==='lobby'&&world&&!dialog.open&&!document.hidden&&now-menuLast>190){
    menuLast=now;
    if(world.index!==mapIndex)world.load(mapIndex);
    world.cinematic(now*.001);
    $('lobby').classList.add('live');
  }
  if(playing!=='match'||!world||!snapshot){last=now;return;}
  const dt=clamp((now-last)/1000,0,.09);
  last=now;
  if(paused&&local)return;
  const state=inputState();
  if(local) {
    local.input(currentId,state);
    for(let remaining=dt;remaining>.0001;remaining-=.02)local.tick(Math.min(.02,remaining));
    for(const evt of local.takeEvents())handleEvent(evt);
    applyState(local.snapshot(currentId));
  } else if(now-netInputTime>32) {
    netInputTime=now;
    send({type:'input',input:state});
  }
  if(playing!=='match')return;
  const key=snapshot.player.weapon??'';
  if(key!==currentKey){aim=false;mouseAim=false;currentKey=key;}
  if(snapshot.player.walk&&now>stepAt){stepAt=now+(snapshot.player.sprinting?260:snapshot.player.crouch?530:390);if(!snapshot.player.crouch)sound('step');}
  world.draw(snapshot,yaw,pitch,dt);
  hud(snapshot,now);
}
lobbyRender();
requestAnimationFrame(frame);
setTimeout(()=>{if(playing==='lobby'&&!world&&buildWorld($('menuWorld'),true))world.load(mapIndex);},230);
if(!PAGES_BUILD&&(location.protocol==='http:'||location.protocol==='https:')) {
  const query=new URLSearchParams(location.search);
  const code=query.get('room')?.toUpperCase();
  requestId=code&&/^[A-Z0-9]{6}$/.test(code)?code:null;
  fetch('/api/exfil',{cache:'no-store',signal:AbortSignal.timeout(5500)})
    .then(res=>res.ok?res.json():null)
    .then(data=>{
      lanReady=data?.game==='exfil-frontline';
      if(requestId&&lanReady)roomDialog();
      else if(lanReady&&dialog.open&&content.querySelector('h2')?.textContent==='邀请好友')roomDialog();
    })
    .catch(()=>{});
}
