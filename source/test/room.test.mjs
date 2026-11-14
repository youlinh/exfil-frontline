import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {on,once} from 'node:events';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

const bundle=process.env.EXFIL_TEST_SERVER ?? fileURLToPath(new URL('../release/room-server.cjs',import.meta.url));

async function startServer(t) {
  const child=spawn(process.execPath,[bundle,'0','127.0.0.1']);
  t.after(()=>child.kill());
  const port=await new Promise((resolve,reject)=>{
    let output='';
    child.stdout.on('data',chunk=>{
      output+=chunk;
      const match=/127\.0\.0\.1:(\d+)/.exec(output);
      if(match)resolve(Number(match[1]));
    });
    child.once('error',reject);
    child.once('exit',code=>reject(new Error(`Room server exited with ${code}`)));
  });
  return port;
}

async function player(t,port) {
  const ws=new WebSocket(`ws://127.0.0.1:${port}/room`);
  t.after(()=>ws.terminate());
  await once(ws,'open');
  return ws;
}

function send(ws,msg) {ws.send(JSON.stringify(msg));}

async function receive(ws,type,match=()=>true) {
  for await(const [data] of on(ws,'message',{signal:AbortSignal.timeout(3500)})) {
    const msg=JSON.parse(data);
    if(msg.type===type&&match(msg))return msg;
  }
}

test('invalid map and role inputs cannot break room creation', {timeout:8000}, async t=>{
  const port=await startServer(t);
  const host=await player(t,port);
  send(host,{type:'create',name:'Host',index:{toString:0},role:{toString:0}});
  const {room}=await receive(host,'room');
  assert.equal(room.index,0);
  assert.equal(room.members[0].role,'assault');
  const friend=await player(t,port);
  send(friend,{type:'join',code:room.code,name:'Friend',role:'recon'});
  const joined=await receive(friend,'room');
  assert.deepEqual(joined.room.members.map(member=>member.role),['assault','recon']);
});

test('a stale movement command stops while the connection stays open', {timeout:8000}, async t=>{
  const port=await startServer(t);
  const host=await player(t,port);
  send(host,{type:'create'});
  await receive(host,'room');
  send(host,{type:'start'});
  const start=await receive(host,'start');
  assert.equal(start.snapshot.team.length,6);
  send(host,{type:'input',input:{f:1,yaw:0}});
  const walking=await receive(host,'tick',({snapshot})=>snapshot.player.z<start.snapshot.player.z-.3);
  const stopped=await receive(host,'tick',({snapshot})=>snapshot.time>walking.snapshot.time+.85);
  const later=await receive(host,'tick',({snapshot})=>snapshot.time>stopped.snapshot.time+.2);
  assert.equal(stopped.snapshot.player.walk,0);
  assert.equal(later.snapshot.player.z,stopped.snapshot.player.z);
  assert.equal(host.readyState,WebSocket.OPEN);
});
