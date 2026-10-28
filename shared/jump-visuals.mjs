import {boostEnd,reactionResult} from './game.mjs';
import {jumpResult,jumpInProgress} from './jump.mjs';
export {jumpHeight} from './jump.mjs';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*(3-2*value);
export const OBSTACLE_PREVIEW=900,OBSTACLE_FADE=350;

// A small distant silhouette fades in before approach; it never travels backward
// while waiting at the horizon. Contact and scoring timestamps are unchanged.
/** @param {{offset:(y:number)=>number}|null} road */
export function obstaclePosition(schedule,now,gx=400,gy=540,k=1,road=null){
 const q=(now-schedule.jumpStart)/(schedule.contact-schedule.jumpStart);
 const progress=Math.max(0,q)**2;
 const y=260+(gy-260)*progress;
 const appearAt=Math.max(schedule.start??-Infinity,schedule.jumpStart-OBSTACLE_PREVIEW);
 const alpha=smooth(clamp((now-appearAt)/OBSTACLE_FADE))*(1-smooth(clamp((q-1.08)/.22)));
 return {q,x:400+(gx-400)*progress+(road?.offset(y)||0),y,scale:.18*k+(k-.18*k)*progress,alpha};
}
/** @param {{offset:(y:number)=>number}|null} road */
export function hurdleCue(schedule,now,gx=400,gy=540,k=1,road=null){
 const point=obstaclePosition(schedule,now,gx,gy,k,road);
 const delta=now-schedule.target;
 const result=jumpResult(now,schedule);
 const radius=Math.max(k===1?20:8,58*point.scale);
 return {...point,delta,open:result.cleared,perfect:result.quality==='perfect',ringY:point.y+4*point.scale,radius,ringHeight:radius*.24};
}
export function boostPoseActive(schedule,reaction,jumpAt,now){
 const airborne=jumpInProgress(jumpAt,now,schedule);
 return !airborne&&now<schedule.jumpStart&&now<boostEnd(schedule)&&now>=reaction&&reactionResult(reaction,schedule.green,schedule.hasBoost).boost>0;
}
