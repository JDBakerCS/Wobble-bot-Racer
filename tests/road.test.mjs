import test from 'node:test';
import assert from 'node:assert/strict';
import {roadProjection,ROAD_CYCLE,racerPosition} from '../shared/road.mjs';
import {obstaclePosition,hurdleCue,jumpHeight} from '../shared/jump-visuals.mjs';
import {GOOD,JUMP_LEAD} from '../shared/game.mjs';

test('the road turns both directions, has straight stretches and keeps the runner centered',()=>{
 const horizons=[];
 for(let travel=0;travel<=ROAD_CYCLE;travel+=50){
  const road=roadProjection(travel);horizons.push(road.point(0).x);
  assert.equal(road.offset(540),0);
  let lastY=259,lastWidth=0;
  for(let i=0;i<=40;i++){
   const p=road.point(i/40);assert(Number.isFinite(p.x));assert(p.x>=150&&p.x<=650);
   assert(p.y>lastY);assert(p.half>lastWidth);lastY=p.y;lastWidth=p.half;
  }
 }
 assert(Math.min(...horizons)<240);assert(Math.max(...horizons)>560);
 assert(horizons.some(x=>x===400));
});

test('curves change smoothly at racing speeds without moving the camera anchor',()=>{
 for(const speed of [1,2,4])for(let travel=0;travel<ROAD_CYCLE;travel+=100){
  const before=roadProjection(travel),after=roadProjection(travel+16.7*speed);
  for(const z of [0,.25,.5,.75,1])assert(Math.abs(after.point(z).x-before.point(z).x)<8);
  assert.equal(after.offset(540),0);
 }
});

test('every curved lane delivers its obstacle exactly to its racer without changing timing or scale',()=>{
 for(const approach of [900,1500,2300])for(const travel of [0,4000,9000,18000,24000]){
  const schedule={jumpStart:1000,contact:1000+approach,target:1000+approach-JUMP_LEAD},road=roadProjection(travel);
  for(const [x,y,k] of [[400,540,1],[250,390,.45],[580,310,.45]]){
   const contact=obstaclePosition(schedule,schedule.contact,x,y,k,road);
   assert.equal(contact.x,x+road.offset(y));assert.equal(contact.y,y);assert.equal(contact.scale,k);
   const straight=obstaclePosition(schedule,schedule.target,x,y,k),curved=obstaclePosition(schedule,schedule.target,x,y,k,road);
   assert.equal(curved.y,straight.y);assert.equal(curved.q,straight.q);assert.equal(curved.scale,straight.scale);
  }
  const guide=hurdleCue(schedule,schedule.target,400,540,1,road),obstacle=obstaclePosition(schedule,schedule.target,400,540,1,road);
  assert.equal(guide.x,obstacle.x);assert.equal(guide.y,obstacle.y);
  assert(hurdleCue(schedule,schedule.target-GOOD,400,540,1,road).open);
  assert(!hurdleCue(schedule,schedule.target+GOOD+1,400,540,1,road).open);
  assert.equal(jumpHeight(schedule.target,schedule.contact,schedule),105);
 }
});

test('score order appears in front-to-back order from every racer view, including the leader',()=>{
 const road=roadProjection(9000);
 for(const scores of [[30,10],[60,40,10],[65,60,20,0]])for(const own of scores){
  const positions=scores.map(score=>racerPosition(score,own,640,road));
  for(let i=0;i<scores.length;i++){
   assert.equal(Math.sign(540-positions[i].y),Math.sign(scores[i]-own));
   if(i)assert(positions[i-1].y<positions[i].y);
  }
 }
 const tied=racerPosition(20,20,640,road);
 assert.equal(tied.y,540);assert.equal(tied.scale,1);
});

test('rivals and their hurdles stay aligned ahead, alongside and behind the camera',()=>{
 const schedule={jumpStart:1000,contact:2500,target:1980};
 for(const travel of [0,9000,18000])for(const gap of [-1000,-65,-20,0,20,65,1000]){
  const road=roadProjection(travel),racer=racerPosition(1000+gap,1000,640,road);
  assert(racer.y>360&&racer.y<610);assert(racer.scale>0&&racer.scale<1.21);
  const hurdle=obstaclePosition(schedule,schedule.contact,racer.laneX,racer.y,racer.scale,road);
  assert.equal(hurdle.x,racer.x);assert.equal(hurdle.y,racer.y);assert.equal(hurdle.scale,racer.scale);
 }
});

test('every rival lane stays inside the curved road as racers pass the camera',()=>{
 for(const travel of [0,9000,18000])for(const gap of [-1000,-60,0,60,1000])for(const lane of [130,265,670]){
  const road=roadProjection(travel),racer=racerPosition(1000+gap,1000,lane,road);
  const half=48+(racer.y-260)/390*355;
  assert(Math.abs(racer.x-400-road.offset(racer.y))<half);
  assert(racer.x>0&&racer.x<800);
 }
});
