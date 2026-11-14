import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {randomBytes, randomInt} from 'node:crypto';
import {join} from 'node:path';
import {WebSocketServer, WebSocket} from 'ws';
import {Simulation, MAPS, ROLES, makeProfile} from './core.mjs';
const game=readFileSync(join(__dirname,'index.html'));
const WS=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
const rooms=new Map();
const label='ACDEFGHJKLMNPRTUVWXY23456789';
const inputTimeout=750;
const options=process.argv.slice(2);
const port=Number(options[0]??process.env.PORT??8080);
const host=options[1]??'0.0.0.0';
if(!Number.isInteger(port)||port<0||port>65535) {
  console.error('端口号需要是 0–65535 的整数。');
  process.exit(1);
}
const server=createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405,{Allow:'GET, HEAD'}).end();
  const path=req.url?.split('?')[0];
  if(path==='/api/exfil')return res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:'{"game":"exfil-frontline"}');
  if(path==='/'||path==='/index.html') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':game.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    return res.end(req.method==='HEAD'?undefined:game);
  }
  res.writeHead(404).end();
});
server.on('upgrade',(req,net,head)=>{
  const origin=req.headers.origin;
  let sameOrigin=!origin;
  if(origin)try { sameOrigin=new URL(origin).host===req.headers.host; }catch {}
  if(req.url!=='/room'||!sameOrigin||WS.clients.size>=120) {
    net.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  WS.handleUpgrade(req,net,head,ws=>WS.emit('connection',ws));
});
const send=(socket,body)=>{
  if(socket.readyState===WebSocket.OPEN&&socket.bufferedAmount<524288)socket.send(JSON.stringify(body));
};
const fault=(client,text)=>send(client.ws,{type:'error',text});
function broadcast(room) {
  const members=[...room.clients.values()].map(({id,name,role})=>({id,name,role}));
  const r={code:room.code,index:room.index,host:room.host,phase:room.sim?'match':'lobby',members};
  for(const client of room.clients.values())send(client.ws,{type:'room',room:r});
}
function code() {
  let result='';
  do { result=Array.from({length:6},()=>label[randomInt(label.length)]).join(''); }
  while(rooms.has(result));
  return result;
}
const roleOf=role=>typeof role==='string'&&Object.hasOwn(ROLES,role)?role:'assault';
const validMap=index=>Number.isInteger(index)&&Object.hasOwn(MAPS,index);
const nameOf=name=>typeof name==='string'&&name.trim()?name.trim().slice(0,16):'干员';
function collect(client,player) {
  if(player)client.profile=makeProfile(player.profile);
}
function maybeReset(room) {
  if(!room.sim||[...room.clients.values()].some(c=>!c.finished))return;
  room.sim=null;
  for(const c of room.clients.values())c.finished=false;
  broadcast(room);
  for(const c of room.clients.values())send(c.ws,{type:'lobby',text:'小队已返回大厅。'});
}
function leave(client) {
  const room=client.room;
  if(!room)return;
  room.clients.delete(client.id);
  room.sim?.removePlayer(client.id);
  client.room=null;
  if(!room.clients.size) {
    rooms.delete(room.code);
    return;
  }
  if(room.host===client.id)room.host=room.clients.keys().next().value;
  broadcast(room);
  maybeReset(room);
}
function enter(client,msg) {
  if(client.room)return;
  let room;
  if(msg.type==='create') {
    if(rooms.size>=48)return fault(client,'房间暂时已满，请稍后再试。');
    room={code:code(),index:validMap(msg.index)?msg.index:0,host:client.id,clients:new Map(),sim:null};
    rooms.set(room.code,room);
  } else {
    const roomCode=typeof msg.code==='string'?msg.code.toUpperCase().slice(0,6):'';
    room=rooms.get(roomCode);
    if(!room)return fault(client,'房间不存在，请检查房间码。');
    if(room.sim)return fault(client,'小队正在行动，请等房主返回大厅。');
    if(room.clients.size>=6)return fault(client,'这支小队已经有六名真人玩家。');
  }
  client.name=nameOf(msg.name);
  client.role=roleOf(msg.role);
  client.profile=makeProfile(msg.profile&&typeof msg.profile==='object'?msg.profile:{});
  room.clients.set(client.id,client);
  client.room=room;
  send(client.ws,{type:'identity',id:client.id});
  broadcast(room);
}
const actions=new Set(['interact','reload','fire','heal','sell','buy']);
WS.on('connection',ws=>{
  const client={id:'u'+randomBytes(9).toString('hex'),ws,room:null,finished:false,keep:true,rateAt:Date.now(),count:0,lastInput:null};
  ws.on('pong',()=>{client.keep=true;});
  ws.on('error',()=>leave(client));
  ws.on('close',()=>leave(client));
  ws.on('message',(bytes,binary)=>{
    if(binary)return;
    const now=Date.now();
    if(now-client.rateAt>1000){client.rateAt=now;client.count=0;}
    if(++client.count>115)return;
    let msg;try{msg=JSON.parse(bytes.toString());}catch{return;}
    if(!msg||typeof msg!=='object')return;
    if(msg.type==='create'||msg.type==='join'){enter(client,msg);return;}
    const room=client.room;
    if(!room)return;
    if(msg.type==='map'&&room.host===client.id&&!room.sim&&validMap(msg.index)) {
      room.index=msg.index;
      broadcast(room);
    }
    if(msg.type==='identity'&&!room.sim) {
      client.name=nameOf(msg.name);
      client.role=roleOf(msg.role);
      broadcast(room);
    }
    if(msg.type==='start'&&room.host===client.id&&!room.sim) {
      room.sim=new Simulation(room.index);
      for(const member of room.clients.values()) {
        member.lastInput=null;
        room.sim.addPlayer(member.id,member.name,member.role,member.profile);
      }
      room.sim.start();
      broadcast(room);
      for(const member of room.clients.values())send(member.ws,{type:'start',snapshot:room.sim.snapshot(member.id)});
    }
    if(room.sim&&!client.finished) {
      const action=msg.type==='action'&&actions.has(msg.action);
      if(msg.type==='input'||action) {
        if(room.sim.input(client.id,msg.input))client.lastInput=performance.now();
      }
      if(action) {
        const actor=room.sim.player(client.id);
        if(actor?.status==='active'){actor.yaw=actor.input.yaw;actor.pitch=actor.input.pitch;}
        room.sim.act(client.id,msg.action,msg.value);
      }
      if(msg.type==='return') {
        const p=room.sim.player(client.id);
        if(p&&p.status!=='active') {
          collect(client,p);
          client.finished=true;
          maybeReset(room);
        }
      }
    }
  });
  ws.client=client;
});
setInterval(()=>{
  for(const ws of WS.clients) {
    if(!ws.client.keep){ws.terminate();continue;}
    ws.client.keep=false;
    ws.ping();
  }
},25000).unref();
let last=performance.now(),sequence=0;
setInterval(()=>{
  const now=performance.now(),dt=Math.min(.08,(now-last)/1000);
  last=now;sequence++;
  for(const room of rooms.values()) {
    if(!room.sim)continue;
    for(const client of room.clients.values()) {
      if(client.lastInput===null||now-client.lastInput<inputTimeout)continue;
      const {yaw,pitch,crouch}=room.sim.player(client.id).input;
      room.sim.input(client.id,{yaw,pitch,crouch});
      client.lastInput=null;
    }
    room.sim.tick(dt);
    for(const client of room.clients.values()) {
      if(client.finished)continue;
      collect(client,room.sim.player(client.id));
    }
    if(sequence%2)continue;
    const events=room.sim.takeEvents();
    for(const client of room.clients.values()) {
      if(client.finished)continue;
      send(client.ws,{type:'tick',snapshot:room.sim.snapshot(client.id),events:events.filter(e=>e.kind==='shot'||e.kind==='hostile'||e.to===client.id)});
    }
  }
},1000/60).unref();
server.on('error',e=>{
  console.error('无法启动房间服务器。',e.message);
  process.exitCode=1;
});
server.listen(port,host,()=>{
  const addr=server.address().port;
  console.log('\n撤离前线 · 联机服务器');
  console.log('本机打开  http://127.0.0.1:'+addr+'/');
  if(host==='0.0.0.0') {
    try {
      for(const [name,addresses] of Object.entries(networkInterfaces())) {
        for(const a of addresses) {
          if(a.family==='IPv4'&&!a.internal)console.log('局域网地址  http://'+a.address+':'+addr+'/  ('+name+')');
        }
      }
    } catch {}
  }
  if(host!=='0.0.0.0'&&host!=='127.0.0.1')console.log('房间地址  http://'+host+':'+addr+'/');
  console.log('请保持此窗口开启。Ctrl+C 停止服务器。\n');
});
