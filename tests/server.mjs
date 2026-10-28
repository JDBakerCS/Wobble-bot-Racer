import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://localhost:4173';
const deadline=Date.now()+120000;
let offset=0;
async function api(body,status=200){const res=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));if(data.room)offset=data.room.serverSent-Date.now();return data;}
async function wait(at){while(Date.now()+offset<at){assert(Date.now()<deadline,'Integration timed out');await new Promise(resolve=>setTimeout(resolve,Math.min(200,Math.max(1,at-Date.now()-offset))));}}
function schedule(room,id){return room.players.find(p=>p.id===id).schedule;}
async function input(session,room,action,at){await wait(at);return api({...session,action,round:room.round,hurdle:room.hurdle,at});}
await api({action:'create',name:'Invalid track',track:'unknown'},400);
const created=await api({action:'create',name:'Server A',track:'heck'});
assert.equal(created.room.track,'heck');const A=created.session;
const joined=await api({action:'join',code:A.code,name:'Server B',track:'heaven'});
assert.equal(joined.room.track,'heck');const B=joined.session;
try{
 await api({...A,token:'wrong',action:'state'},401);
 let r=(await api({...A,action:'start'})).room;
 for(let event=0;event<3;event++){
  const a=schedule(r,A.id),b=schedule(r,B.id),other=(await api({...B,action:'state'})).room;
  assert.notEqual(a.target,b.target);assert.equal(r.target,a.target);assert.equal(other.target,b.target);
  assert.equal(a.contact-a.jumpStart,b.contact-b.jumpStart);
  if(r.hasBoost)await Promise.all([input(A,r,'react',a.green+180),input(B,r,'react',b.green+180)]);
  await Promise.all([input(A,r,'jump',a.target),input(B,r,'jump',b.target+150)]);
  await wait(r.until+10);const result=(await api({...A,action:'state'})).room;
  assert.equal(result.players.find(p=>p.id===A.id).result.quality,'perfect');assert.equal(result.players.find(p=>p.id===B.id).result.quality,'good');
  await wait(result.until+10);r=(await api({...A,action:'state'})).room;
 }
 assert.equal(r.phase,'finished');assert.deepEqual(r.winners,[A.id]);
 r=(await api({...B,action:'rematch'})).room;assert.equal(r.track,'heck');assert(r.players.every(p=>p.trips===0&&!p.eliminated&&p.distance===0));
 for(let event=0;event<3;event++){
  await input(A,r,'jump',schedule(r,A.id).target+150);
  await wait(r.until+10);const result=(await api({...B,action:'state'})).room;
  assert.equal(result.players.find(p=>p.id===B.id).trips,event+1);
  await wait(result.until+10);r=(await api({...A,action:'state'})).room;
 }
 assert.equal(r.phase,'finished');assert.deepEqual(r.winners,[A.id]);assert(r.players.find(p=>p.id===B.id).eliminated);
 await api({...B,action:'jump',round:r.round,hurdle:r.hurdle,at:Date.now()+offset},400);
 console.log('PASS: distinct schedules, own-clock scoring, concurrent inputs, winner, rematch, third-trip elimination and rejected eliminated input');
}finally{await Promise.allSettled([api({...A,action:'leave'}),api({...B,action:'leave'})]);}
