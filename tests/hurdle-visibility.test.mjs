import test from 'node:test';
import assert from 'node:assert/strict';
import {obstaclePosition,hurdleCue,OBSTACLE_FADE,OBSTACLE_PREVIEW} from '../shared/jump-visuals.mjs';
import {jumpResult,JUMP_LEAD} from '../shared/jump.mjs';
import {roadProjection} from '../shared/road.mjs';

const schedule={start:1000,jumpStart:3000,contact:4500,target:4500-JUMP_LEAD};

test('hurdles fade in at the horizon before approach, without reverse motion or a size jump',()=>{
 const appearAt=schedule.jumpStart-OBSTACLE_PREVIEW;
 assert.equal(obstaclePosition(schedule,appearAt).alpha,0);
 const middle=obstaclePosition(schedule,appearAt+OBSTACLE_FADE/2),visible=obstaclePosition(schedule,appearAt+OBSTACLE_FADE);
 assert(middle.alpha>0&&middle.alpha<1);assert.equal(visible.alpha,1);
 for(const at of [appearAt,appearAt+OBSTACLE_FADE,schedule.jumpStart-1,schedule.jumpStart]){
  const p=obstaclePosition(schedule,at);assert.equal(p.y,260);assert.equal(p.scale,.18);
 }
 const before=obstaclePosition(schedule,schedule.jumpStart-1),after=obstaclePosition(schedule,schedule.jumpStart+1);
 assert(Math.abs(after.y-before.y)<.01);assert(Math.abs(after.scale-before.scale)<.001);
});

test('the ground ring follows each hurdle at its feet and uses the exact scoring window',()=>{
 for(const travel of [0,8000,18000])for(const [gx,gy,k] of [[400,540,1],[250,390,.45]]){
  const road=roadProjection(travel);
  let lastY=259,lastScale=0;
  for(let at=schedule.jumpStart;at<=schedule.contact;at+=25){
   const p=obstaclePosition(schedule,at,gx,gy,k,road),cue=hurdleCue(schedule,at,gx,gy,k,road);
   assert.equal(cue.x,p.x);assert.equal(cue.y,p.y);assert.equal(cue.alpha,p.alpha);
   assert.equal(cue.ringY,p.y+4*p.scale);assert(cue.radius>=54*p.scale);
   assert(cue.ringHeight<cue.radius/3);assert(cue.ringY-cue.ringHeight<p.y);
   assert.equal(cue.open,jumpResult(at,schedule).cleared);
   assert(p.y>=lastY);assert(p.scale>=lastScale);lastY=p.y;lastScale=p.scale;
  }
  assert(!hurdleCue(schedule,schedule.jumpStart,gx,gy,k,road).open);
  assert(hurdleCue(schedule,schedule.target,gx,gy,k,road).open);
 }
});

test('a passing obstacle fades out rather than being cut off abruptly',()=>{
 const duration=schedule.contact-schedule.jumpStart;
 assert.equal(obstaclePosition(schedule,schedule.contact).alpha,1);
 const passing=obstaclePosition(schedule,schedule.jumpStart+duration*1.19);
 assert(passing.alpha>0&&passing.alpha<1);
 assert.equal(obstaclePosition(schedule,schedule.jumpStart+duration*1.31).alpha,0);
});
