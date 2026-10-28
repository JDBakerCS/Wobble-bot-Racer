import test from 'node:test';
import assert from 'node:assert/strict';
import {act,advance,player,round,MAX_TRIPS} from '../shared/game.mjs';
import {ROBOTS} from '../shared/robots.mjs';
import {jumpResult,jumpHeight,jumpInProgress,JUMP_CLEARANCE,JUMP_LEAD} from '../shared/jump.mjs';
import {hurdleCue} from '../shared/jump-visuals.mjs';
import {roadProjection} from '../shared/road.mjs';

function race(robot='optimus',paceStep=0){
 const p=player('Clearance check',robot),r={code:'ABC234',version:4,solo:true,phase:'lobby',round:0,paceStep,until:0,players:[p],winners:[]};
 round(r,0);return {r,p,s:p.schedule};
}

test('visibly clear jumps beyond the old timing window score without a trip or explosion',()=>{
 for(const robot of ROBOTS)for(const step of [0,30])for(const delta of [-300,-250,-200,200,250,300]){
  const {r,p,s}=race(robot.id,step);p.trips=MAX_TRIPS-1;
  const at=s.target+delta,clearance=jumpResult(at,s);
  assert(clearance.height>JUMP_CLEARANCE);assert(clearance.cleared);
  // Even Pocket Rocket's tucked feet clear the tallest 62px character prop.
  const feetLift=clearance.height+robot.height*(Math.min(1,clearance.height/70)*19-2);
  assert(feetLift>62);
  assert(hurdleCue(s,at,400,540,1,roadProjection(9000)).open);
  act(r,p,{action:'jump',round:r.round,hurdle:r.hurdle,at},at+1200);
  advance(r,r.until);
  assert.equal(p.result.quality,'good');assert.equal(p.result.gain,10);
  assert.equal(p.trips,MAX_TRIPS-1);assert(!p.eliminated);assert.equal(p.explodedAt,null);
 }
});

test('low or missing jumps still trip and match the client collision prediction',()=>{
 for(const delta of [-350,350,null]){
  const {r,p,s}=race(),at=delta===null?null:s.target+delta;
  const predicted=jumpResult(at,s);assert(!predicted.cleared);assert(predicted.height<JUMP_CLEARANCE);
  if(at!==null)act(r,p,{action:'jump',round:r.round,hurdle:r.hurdle,at},at+50);
  advance(r,r.until);assert.equal(p.result.quality,predicted.quality);assert.equal(p.trips,1);
 }
});

test('a jump cannot start after contact, while a delayed pre-contact input still counts',()=>{
 const {r,p,s}=race();
 assert.throws(()=>act(r,p,{action:'jump',round:r.round,hurdle:r.hurdle,at:s.contact+1},s.contact+1),/already passed/);
 assert.equal(p.jump,null);
 const at=s.target+250;
 act(r,p,{action:'jump',round:r.round,hurdle:r.hurdle,at},at+1500);
 advance(r,r.until);assert.equal(p.result.quality,'good');assert.equal(p.trips,0);
});

test('airborne state and clearance honor the actual schedule, including older in-flight jumps',()=>{
 for(const lead of [420,JUMP_LEAD]){
  const s={target:1000,contact:1000+lead};
  assert(!jumpInProgress(null,1000,s));assert(!jumpInProgress(1000,999,s));
  assert(jumpInProgress(1000,1000,s));assert(jumpInProgress(1000,1000+lead*2-1,s));
  assert(!jumpInProgress(1000,1000+lead*2,s));assert.equal(jumpHeight(1000,1000+lead*2,s),0);
  assert.equal(jumpResult(s.target,s).quality,'perfect');assert(jumpResult(s.target+200,s).cleared);
 }
});
