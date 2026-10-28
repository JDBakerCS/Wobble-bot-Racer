import test from 'node:test';
import {obstaclePosition,hurdleCue,jumpHeight,boostPoseActive} from '../shared/jump-visuals.mjs';
import {ROBOTS,DEFAULT_ROBOT,robotModel} from '../shared/robots.mjs';
import {TRACKS,DEFAULT_TRACK,trackModel,validateTrack} from '../shared/tracks.mjs';
import assert from 'node:assert/strict';
import {act,advance,player,round,view,JUMP_LEAD,PERFECT,GOOD,racePace,paceForStep,reactionResult,boostEnd,MAX_TRIPS,OBSTACLES} from '../shared/game.mjs';
import {celebrationPose,CELEBRATION_DELAY} from '../shared/celebration.mjs';
import {inputFailure,confirmInput} from '../shared/input.mjs';
function room(count=2){return {code:'ABC234',version:4,solo:count===1,phase:'lobby',round:0,paceStep:0,until:0,players:Array.from({length:count},(_,i)=>player('Racer '+i)),winners:[]};}
function input(r,p,action,at,delay=50){act(r,p,{action,round:r.round,hurdle:r.hurdle,at},at+delay);}
function next(r){advance(r,r.until);advance(r,r.until);}
function boostRoom(count=2){const r=room(count);round(r,0);for(const p of r.players)input(r,p,'jump',p.schedule.target);next(r);assert(r.hasBoost);return r;}

test('four validated tracks share the host course through joins, scoring and rematches',()=>{
 assert.equal(TRACKS.length,4);assert.equal(new Set(TRACKS.map(track=>track.id)).size,4);
 assert.equal(validateTrack(),DEFAULT_TRACK);assert.equal(trackModel(undefined).id,DEFAULT_TRACK);
 for(const invalid of ['unknown','',null,{},['heck']])assert.throws(()=>validateTrack(invalid),/four tracks/);
 for(const track of TRACKS){
  const r=room(1);r.track=validateTrack(track.id);r.solo=false;r.players.push(player('Joined racer'));
  for(const p of r.players)assert.equal(view(r,p.id,0).track,track.id);
  round(r,0);
  for(let event=0;event<3;event++){for(const p of r.players)input(r,p,'jump',p.schedule.target);next(r);}
  assert.equal(r.phase,'finished');assert(r.players.every(p=>p.distance===60));
  act(r,r.players[1],{action:'rematch',track:'ignored'},100000);
  assert.equal(r.track,track.id);assert(r.players.every(p=>view(r,p.id,100000).track===track.id));
  act(r,r.players[0],{action:'leave'},100000);assert.equal(r.phase,'lobby');assert.equal(view(r,r.players[0].id,100000).track,track.id);
 }
 const legacy=room();assert.equal(view(legacy,legacy.players[0].id,0).track,'sunset');
});

test('every player gets a distinct schedule, unchanged approach pace and a private token',()=>{
 for(const count of [2,3,4]){
  const r=room(count);round(r,1000);
  for(let event=1;event<=4;event++){
   assert.equal(new Set(r.players.map(p=>p.schedule.target)).size,count);
   const durations=r.players.map(p=>p.schedule.contact-p.schedule.jumpStart);assert.equal(new Set(durations).size,1);
   assert(durations[0]>=900&&durations[0]<=2300);
   assert(Math.max(...r.players.map(p=>p.schedule.target))-Math.min(...r.players.map(p=>p.schedule.target))<=590);
   assert.equal(r.until,Math.max(...r.players.map(p=>p.schedule.contact))+1500);
   for(const p of r.players){const v=view(r,p.id,r.start);assert.equal(v.target,p.schedule.target);assert.equal(v.green,p.schedule.green);assert.equal(v.contact-v.target,JUMP_LEAD);assert(!JSON.stringify(v).includes(p.token));input(r,p,'jump',p.schedule.target+150);}
   if(event<4)next(r);
  }
 }
});
test('a copied jump follows the owner schedule, not the rival schedule',()=>{
 const r=room();round(r,0);const [early,late]=[...r.players].sort((a,b)=>a.schedule.target-b.schedule.target);
 assert(late.schedule.target-early.schedule.target>GOOD);
 input(r,early,'jump',early.schedule.target);input(r,late,'jump',early.schedule.target);
 advance(r,r.until);assert.equal(early.result.quality,'perfect');assert.equal(late.result.quality,'miss');assert.equal(late.trips,1);
});
test('full multiplayer race uses individual inputs, server scoring, ties and rematch reset',()=>{
 const r=room();act(r,r.players[0],{action:'start'},1000);
 for(let event=1;event<=3;event++){
  for(const [i,p] of r.players.entries()){
   const s=p.schedule;if(s.hasBoost)input(r,p,'react',s.green+(i===0?180:-100));
   input(r,p,'jump',s.target+(i===0?0:150));
   assert.throws(()=>input(r,p,'jump',s.target),/One jump/);
  }
  next(r);
 }
 assert.equal(r.phase,'finished');assert.equal(r.players[0].distance,65);assert.equal(r.players[1].distance,30);assert.deepEqual(r.winners,[r.players[0].id]);
 act(r,r.players[1],{action:'rematch'},90000);assert.equal(r.phase,'race');assert.equal(r.hurdle,1);assert.equal(r.paceStep,0);
 assert(r.players.every(p=>p.distance===0&&p.trips===0&&!p.eliminated&&p.jump===null));
});
test('jump boundaries match visuals and keep the earlier 520ms takeoff at every pace',()=>{
 assert.equal(PERFECT,90);assert(GOOD>330&&GOOD<340);assert.equal(JUMP_LEAD,520);
 for(const step of [0,10,30])for(const [delta,quality,gain] of [[-PERFECT,'perfect',20],[PERFECT,'perfect',20],[PERFECT+1,'good',10],[-GOOD,'good',10],[GOOD,'good',10],[GOOD+1,'miss',0]]){
  const r=room(1);r.paceStep=step;round(r,0);const p=r.players[0],s=p.schedule;
  assert.equal(s.contact-s.target,JUMP_LEAD);assert(s.target-GOOD>s.jumpStart);
  input(r,p,'jump',s.target+delta);advance(r,r.until);assert.equal(p.result.quality,quality);assert.equal(p.result.gain,gain);
 }
});
test('separate boost and jump inputs keep their timestamps, feedback and score',()=>{
 for(const [reaction,boost,status] of [[-1,0,'early'],[0,5,'success'],[300,5,'success'],[301,3,'success'],[700,3,'success'],[701,0,'slow']]){
  const r=boostRoom(),p=r.players[0],s=p.schedule;
  input(r,p,'react',s.green+reaction);input(r,p,'jump',s.target);advance(r,r.until);
  assert.equal(p.result.boost,boost);assert.equal(reactionResult(s.green+reaction,s.green).status,status);
 }
 const both=boostRoom(),racer=both.players[0],timing=racer.schedule;
 input(both,racer,'react',timing.green+400);input(both,racer,'jump',timing.target);
 assert.equal(racer.reaction,timing.green+400);assert.equal(racer.jump,timing.target);
 advance(both,both.until);assert.equal(racer.result.gain,23);
 const r=boostRoom(),p=r.players[0];assert.throws(()=>input(r,p,'react',boostEnd(p.schedule)+1),/window has ended/);
});
test('three cumulative trips explode; success does not restore a life',()=>{
 const r=room(3);round(r,0);const p=r.players[0];
 for(let event=0;event<4;event++){
  for(const other of r.players.slice(1))input(r,other,'jump',other.schedule.target+150);
  if(event===1)input(r,p,'jump',p.schedule.target);
  next(r);
  if(event===0)assert.equal(p.trips,1);
  if(event===1)assert.equal(p.trips,1);
 }
 assert.equal(MAX_TRIPS,3);assert.equal(p.trips,3);assert(p.eliminated);assert(Number.isFinite(p.explodedAt));assert.equal(r.phase,'race');
 const distance=p.distance;
 assert.throws(()=>input(r,p,'jump',p.schedule.target),/blew up/);
 for(const other of r.players.slice(1))input(r,other,'jump',other.schedule.target+150);
 advance(r,r.until);assert.equal(p.distance,distance);assert.equal(p.trips,3);
});
test('last surviving multiplayer robot wins; everyone out has no winner',()=>{
 const r=room();round(r,0);
 for(let event=0;event<3;event++){input(r,r.players[0],'jump',r.players[0].schedule.target+150);next(r);}
 assert.equal(r.phase,'finished');assert.deepEqual(r.winners,[r.players[0].id]);assert(r.players[1].eliminated);
 const all=room(4);round(all,0);for(let i=0;i<3;i++)next(all);assert.equal(all.phase,'finished');assert.deepEqual(all.winners,[]);assert(all.players.every(p=>p.eliminated));
 const solo=room(1);round(solo,0);for(let i=0;i<3;i++)next(solo);assert.deepEqual(solo.winners,[]);assert(solo.players[0].eliminated);
 act(all,all.players[0],{action:'rematch'},90000);assert(all.players.every(p=>!p.eliminated&&p.trips===0&&p.explodedAt===null));
});
test('surviving ties share victory and eliminated leaders cannot win',()=>{
 const r=room();round(r,0);for(let i=0;i<3;i++){for(const p of r.players)input(r,p,'jump',p.schedule.target);next(r);}assert.equal(r.winners.length,2);
 const a=room();round(a,0);a.players[0].eliminated=true;a.players[0].trips=3;a.players[0].distance=200;next(a);assert.deepEqual(a.winners,[a.players[1].id]);
});
test('transport bounds, stale inputs, solo, leave and pace increments are preserved',()=>{
 const r=room(1);act(r,r.players[0],{action:'start'},0);const p=r.players[0];input(r,p,'jump',p.schedule.target,1200);advance(r,r.until);assert.equal(p.result.quality,'perfect');advance(r,r.until);
 assert.throws(()=>act(r,p,{action:'jump',round:1,hurdle:1,at:p.schedule.target},p.schedule.target),/next hurdle/);
 assert.throws(()=>input(r,p,'jump',p.schedule.target,1501),/Connection delay/);
 assert.equal(racePace(view(r,p.id,r.start),p.schedule.contact),paceForStep(r.paceStep+2));
 const a=room();round(a,0);act(a,a.players[0],{action:'leave'},0);assert.equal(a.phase,'lobby');assert.equal(a.players.length,1);assert.equal(a.players[0].trips,0);
 assert.equal(paceForStep(100),4);
});
test('an old null poll cannot unlock an interrupted input; only a saved timestamp settles it',()=>{
 const attempt={id:1,sessionId:'Jim',key:'ABC234:1:2',at:12345,uncertain:false};
 const pending=inputFailure(attempt,attempt,false);
 assert.equal(pending.uncertain,true);
 assert.equal(confirmInput(pending,'Jim',attempt.key,null),pending);
 assert.equal(confirmInput(pending,'Jim',attempt.key,undefined),pending);
 const confirmed=confirmInput(pending,'Jim',attempt.key,12345);
 assert.equal(confirmed.at,12345);assert.equal(confirmed.uncertain,false);
 assert.equal(confirmInput(pending,'Other',attempt.key,12345),pending);
 assert.equal(confirmInput(pending,'Jim','ABC234:1:3',12345),pending);
});

test('a rejected attempt releases its lock without letting stale failure or reconciliation erase a retry',()=>{
 const rejected={id:1,sessionId:'Jim',key:'ABC234:1:2',at:12345,uncertain:false};
 assert.equal(inputFailure(rejected,rejected,true),null);
 const retry={...rejected,id:2,at:12370};
 assert.equal(inputFailure(retry,rejected,true),retry);
 assert.equal(inputFailure(retry,rejected,false),retry);
 assert.equal(confirmInput(retry,'Jim',retry.key,null),retry);
 assert.equal(confirmInput(retry,'Jim',retry.key,12345),retry);
 // A callback from a departed room never affects its replacement session.
 assert.equal(inputFailure({...retry,sessionId:'New'},retry,true).sessionId,'New');
});


test('victory routine has one complete backflip, roundhouse and stable final pose',()=>{
 assert.equal(CELEBRATION_DELAY,2400);assert.equal(celebrationPose(-1).stage,'none');
 assert.equal(celebrationPose(110).stage,'crouch');assert.equal(celebrationPose(700).lift,155);
 assert.equal(celebrationPose(700).flip,-Math.PI);assert.equal(celebrationPose(1180).stage,'landing');
 assert.equal(celebrationPose(1800).stage,'roundhouse');assert.equal(celebrationPose(1800).kick,1);
 assert.equal(celebrationPose(2600).stage,'victory');assert.equal(celebrationPose(100000).lift,0);
});

test('all players follow the six-character order across rounds and restart on rematch',()=>{
 const order=['politician','elon','zuckerberg','altman','jensen','amodei'];
 assert.deepEqual(OBSTACLES,order);
 const r=room(4);round(r,0);
 for(let i=0;i<6;i++){
  for(const p of r.players){const s=p.schedule;assert.equal(s.obstacle,order[i]);assert.equal(view(r,p.id,r.start).obstacle,order[i]);assert.equal(s.contact-s.target,JUMP_LEAD);input(r,p,'jump',s.target+150);}
  next(r);
 }
 assert.equal(r.phase,'finished');assert(r.players.every(p=>p.distance===60));
 act(r,r.players[0],{action:'rematch'},100000);assert(r.players.every(p=>p.schedule.obstacle===order[0]));
 // A slower race cycles the lineup after hurdle six.
 const slow=room(1);round(slow,0);for(let i=0;i<6;i++){if(i!==0&&i!==3)input(slow,slow.players[0],'jump',slow.players[0].schedule.target+150);next(slow);}
 assert.equal(slow.phase,'race');assert.equal(slow.players[0].schedule.obstacle,order[0]);
});

test('four robot choices persist through views and rematches without changing stats',()=>{
 assert.equal(ROBOTS.length,4);assert.equal(new Set(ROBOTS.map(model=>model.id)).size,4);
 assert.equal(new Set(ROBOTS.map(model=>model.height)).size,4);
 assert.equal(player('Default').robot,DEFAULT_ROBOT);assert.throws(()=>player('Invalid','unknown'),/four robot models/);
 const r=room(4);r.players=ROBOTS.map(model=>player(model.name,model.id));round(r,0);
 for(const p of r.players){assert.equal(view(r,p.id,0).players.find(other=>other.id===p.id).robot,p.robot);assert.equal(robotModel(p.robot).id,p.robot);}
 for(let n=0;n<3;n++){for(const p of r.players)input(r,p,'jump',p.schedule.target);next(r);}
 assert(r.players.every(p=>p.distance===60));assert.equal(r.winners.length,4);
 const robots=r.players.map(p=>p.robot);act(r,r.players[0],{action:'rematch'},100000);assert.deepEqual(r.players.map(p=>p.robot),robots);assert(r.players.every(p=>p.trips===0&&p.distance===0));
});

test('jump ring sits on its obstacle at ideal takeoff at every speed',()=>{
 for(const step of [0,5,15,30]){
  const r=room(4);r.paceStep=step;round(r,0);
  for(const p of r.players){
   const s=p.schedule,guide=hurdleCue(s,s.target),obstacle=obstaclePosition(s,s.target);
   assert.equal(guide.y,obstacle.y);assert.equal(guide.x,obstacle.x);assert(guide.y<540);
   assert.equal(obstaclePosition(s,s.contact).y,540);assert.equal(jumpHeight(s.target,s.contact),105);
   assert(hurdleCue(s,s.target-GOOD).open);assert(hurdleCue(s,s.target+GOOD).open);
   assert(!hurdleCue(s,s.target+GOOD+1).open);assert(hurdleCue(s,s.target).perfect);
   assert.equal(jumpHeight(null,s.contact),0);
  }
 }
});
test('earlier takeoff stays aligned after staggered boosts and on existing in-flight jumps',()=>{
 for(const step of [0,10,30]){
  const r=room(1);r.paceStep=step;round(r,0);
  const p=r.players[0];input(r,p,'jump',p.schedule.target);next(r);
  const s=p.schedule;
  assert(!s.overlap);assert(s.jumpStart-boostEnd(s)>=250&&s.jumpStart-boostEnd(s)<=749);
  assert.equal(s.contact-s.jumpStart,Math.max(900,Math.round(2300/paceForStep(step+2))));
  assert.equal(s.target,s.contact-420-100);
  const earlier=hurdleCue(s,s.target),previous=obstaclePosition(s,s.target+100);
  assert(earlier.y<previous.y);assert.equal(jumpHeight(s.target,s.contact,s),105);
  input(r,p,'jump',s.target);advance(r,r.until);assert.equal(p.result.quality,'perfect');
 }
 const inFlight={contact:2000,target:1580};
 assert.equal(jumpHeight(inFlight.target,inFlight.contact,inFlight),105);
 assert.equal(jumpHeight(inFlight.target,inFlight.target+840,inFlight),0);
});
test('miss feedback distinguishes early, late and absent input',()=>{
 for(const delta of [-GOOD-1,GOOD+1,GOOD+.1,null]){
  const r=room(1);round(r,0);const p=r.players[0];
  if(delta!==null)input(r,p,'jump',p.schedule.target+delta);
  advance(r,r.until);assert.equal(p.result.quality,'miss');
  assert.equal(p.result.jumpDelta,delta===null?null:Math.sign(delta)*Math.ceil(Math.abs(delta)));
 }
});

test('boosts always close before approach and takeoff for every player at every pace',()=>{
 for(const count of [1,4])for(const step of [0,10,30]){
  const r=room(count);r.paceStep=step;round(r,0);
  for(let event=1;event<=6;event++){
   for(const p of r.players){
    const s=p.schedule;assert.equal(s.hasBoost,event%2===0);assert(!s.overlap);
    if(s.hasBoost){
     const gap=s.jumpStart-boostEnd(s);assert(gap>=250&&gap<=749);
     assert(s.target-GOOD>s.jumpStart);assert(s.target-GOOD>boostEnd(s));
     input(r,p,'react',s.green+700);
    }
    input(r,p,'jump',s.target+150);
   }
   next(r);
  }
  assert.equal(r.phase,'finished');
 }
});
test('boost pose stays on the ground and a late boost cannot change a committed jump',()=>{
 const r=boostRoom(1),p=r.players[0],s=p.schedule;
 assert(boostPoseActive(s,s.green+200,null,s.green+200));
 assert(!boostPoseActive(s,s.green-1,null,s.green+200));
 assert(!boostPoseActive(s,s.green+701,null,s.green+701));
 assert(!boostPoseActive(s,s.green+200,null,boostEnd(s)));
 assert(!boostPoseActive(s,s.green+200,null,s.jumpStart));
 input(r,p,'jump',s.target);
 const at=p.jump,apex=jumpHeight(at,s.contact,s);
 assert.throws(()=>input(r,p,'react',s.target),/window has ended/);
 assert.equal(p.jump,at);assert.equal(jumpHeight(p.jump,s.contact,s),apex);assert.equal(apex,105);
 for(const time of [at,at+1,s.contact,at+JUMP_LEAD*2-1])assert(!boostPoseActive(s,s.green+200,at,time));
 // An older room can still contain an overlapping hurdle until its next event.
 const legacy={...s,jumpStart:s.green-100,contact:s.green+800,target:s.green+280};
 assert(!boostPoseActive(legacy,s.green+200,legacy.target,legacy.target+100));
 advance(r,r.until);assert.equal(p.result.quality,'perfect');assert.equal(p.result.gain,20);
});
