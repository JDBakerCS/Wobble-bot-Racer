import {trackModel} from './tracks.mjs';
import {ROBOTS,DEFAULT_ROBOT} from './robots.mjs';
import {JUMP_LEAD,jumpResult} from './jump.mjs';
export {JUMP_LEAD,PERFECT,GOOD,jumpResult} from './jump.mjs';
export const OBSTACLES=['politician','elon','zuckerberg','altman','jensen','amodei'];
export const FINISH=60,HURDLES=3,MAX_TRIPS=3;
export const paceForStep=step=>1+Math.min(30,Math.max(0,step))*0.1;
export const boostEnd=r=>Math.min(r.green+1200,r.contact);
export const scheduleFor=(r,p)=>p?.schedule||r;
export function racePace(r,now){if(!r||r.phase==='lobby')return 1;let step=r.paceStep||0;if(r.phase==='race'){if(r.hasBoost&&now>=boostEnd(r))step++;if(now>=r.contact)step++;}return paceForStep(step);}
export function reactionResult(at,green,enabled=true){
 if(!enabled||at==null)return {status:'none',ms:null,boost:0};
 const ms=at-green;
 return {status:ms<0?'early':ms<=700?'success':'slow',ms,boost:ms>=0&&ms<=700?(ms<=300?5:3):0};
}
export const COLORS=['#a2ff6f','#bb98ff','#ffab68','#69e8ed'];
const random=limit=>crypto.getRandomValues(new Uint32Array(1))[0]%limit;
export function player(name,robot=DEFAULT_ROBOT){if(!ROBOTS.some(model=>model.id===robot))throw Error('Choose one of the four robot models.');return {id:crypto.randomUUID(),token:crypto.randomUUID(),name,robot,distance:0,reaction:null,jump:null,result:null,trips:0,eliminated:false,explodedAt:null,schedule:null};}
function reset(p){p.distance=0;p.trips=0;p.eliminated=false;p.explodedAt=null;p.reaction=null;p.jump=null;p.result=null;p.schedule=null;}
export function nextHurdle(r,now){
 r.hurdle++;
 const event=(r.round-1)*HURDLES+r.hurdle;
 r.hasBoost=event%2===0;r.overlap=false;
 r.start=now+250;r.green=r.hasBoost?r.start+2500+random(1800):0;
 const pace=paceForStep((r.paceStep||0)+Number(r.hasBoost));
 const approach=Math.max(900,Math.round(2300/pace));
 // Close the entire boost window, then leave a 250–749ms gap before approach.
 r.jumpStart=(r.hasBoost?r.green+1450:r.start+300)+random(500);
 r.contact=r.jumpStart+approach;r.target=r.contact-JUMP_LEAD;
 // Shuffle separated timing slots each hurdle: no fixed early/late player advantage.
 const active=r.players.filter(p=>!p.eliminated),slots=active.map((_,i)=>i);
 for(let i=slots.length-1;i>0;i--){const j=random(i+1);[slots[i],slots[j]]=[slots[j],slots[i]];}
 for(const [i,p] of active.entries()){
  const offset=active.length===1?0:Math.round(slots[i]*540/(active.length-1))+random(51);
  p.schedule={start:r.start,green:r.hasBoost?r.green+offset:0,jumpStart:r.jumpStart+offset,contact:r.contact+offset,target:r.target+offset,hasBoost:r.hasBoost,overlap:r.overlap,obstacle:OBSTACLES[(event-1)%OBSTACLES.length]};
  p.reaction=null;p.jump=null;p.result=null;
 }
 r.until=Math.max(r.contact,...active.map(p=>p.schedule.contact))+1500;r.phase='race';
}
export function round(r,now){r.round++;r.hurdle=0;nextHurdle(r,now);}
function finish(r,now,active){r.phase='finished';r.until=0;r.finishedAt=now;const max=Math.max(0,...active.map(p=>p.distance));r.winners=active.filter(p=>p.distance===max).map(p=>p.id);}
export function advance(r,now){
 if(r.phase==='race'&&now>=r.until){
  for(const p of r.players){
   if(p.eliminated)continue;
   const s=scheduleFor(r,p),{quality}=jumpResult(p.jump,s);
   const {ms:reaction,boost}=reactionResult(p.reaction,s.green,s.hasBoost);
   const gain=(quality==='perfect'?20:quality==='good'?10:0)+(quality!=='miss'?boost:0);
   p.distance+=gain;p.result={quality,gain,boost:quality!=='miss'?boost:0,reaction,jumpDelta:p.jump===null?null:Math.sign(p.jump-s.target)*Math.ceil(Math.abs(p.jump-s.target))};
   if(quality==='miss'){p.trips=(p.trips||0)+1;if(p.trips>=MAX_TRIPS){p.eliminated=true;p.explodedAt=now;}}
  }
  r.paceStep=(r.paceStep||0)+1+Number(r.hasBoost);r.phase='results';r.until=now+700;return true;
 }
 if(r.phase==='results'&&now>=r.until){
  const active=r.players.filter(p=>!p.eliminated);
  if(!active.length||(!r.solo&&active.length===1)){finish(r,now,active);return true;}
  if(r.hurdle<HURDLES){nextHurdle(r,now);return true;}
  const max=Math.max(0,...active.map(p=>p.distance));
  if(max>=FINISH||r.round>=10)finish(r,now,active);else round(r,now);
  return true;
 }
 return false;
}
export function act(r,me,b,now){
 if(b.action==='react'||b.action==='jump'){
  if(me.eliminated)throw Error('Your robot blew up. Watch the race, then try a rematch.');
  if(r.phase!=='race'||b.round!==r.round||b.hurdle!==r.hurdle)throw Error('Wait for the next hurdle.');
  const stamp=Number(b.at),s=scheduleFor(r,me);
  if(!Number.isFinite(stamp)||stamp<now-1500||stamp>now+150)throw Error('Connection delay was too high. Please try the next hurdle.');
  if(b.action==='react'){
   if(!s.hasBoost)throw Error('This hurdle has no boost stage.');
   if(me.reaction!==null)throw Error('One reaction per boost.');
   if(stamp<s.start||stamp>boostEnd(s))throw Error('The reaction window has ended.');me.reaction=stamp;
  }else{
   if(me.jump!==null)throw Error('One jump per hurdle.');
   if(stamp<s.jumpStart)throw Error('Wait for the hurdle.');
   if(stamp>s.contact)throw Error('The hurdle has already passed.');me.jump=stamp;
  }
 }else if(b.action==='start'||b.action==='rematch'){
  if(!['lobby','finished'].includes(r.phase))throw Error('Race already running.');
  if(r.players.length<2&&!r.solo)throw Error('Invite a friend or choose solo practice.');
  r.players.forEach(reset);r.round=0;r.paceStep=0;r.winners=[];round(r,now);
 }else if(b.action==='leave'){
  r.players=r.players.filter(p=>p.id!==me.id);
  if(r.players.length<(r.solo?1:2)){r.phase='lobby';r.until=0;r.paceStep=0;r.players.forEach(reset);}
 }else throw Error('Unknown action.');
}
export function view(r,id,now){
 const own=r.players.find(p=>p.id===id),s=own?.eliminated?r:scheduleFor(r,own);
 return {code:r.code,solo:!!r.solo,track:trackModel(r.track).id,version:4,phase:r.phase,round:r.round,hurdle:r.hurdle,hasBoost:s.hasBoost,overlap:!!s.overlap,paceStep:r.paceStep||0,until:r.until,start:s.start,green:s.green,jumpStart:s.jumpStart,contact:s.contact,target:s.target,obstacle:s.obstacle,finishedAt:r.finishedAt,winners:r.winners||[],serverTime:now,serverSent:Date.now(),players:r.players.map((p,i)=>({id:p.id,name:p.name,robot:p.robot||DEFAULT_ROBOT,color:COLORS[i],distance:p.distance,reaction:p.reaction,jump:p.jump,result:p.result,trips:p.trips||0,eliminated:!!p.eliminated,explodedAt:p.explodedAt,schedule:p.schedule}))};
}
