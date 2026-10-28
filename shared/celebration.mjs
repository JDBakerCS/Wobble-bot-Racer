export const CELEBRATION_DELAY=2400;
export const CELEBRATION_DURATION=2600;
const clamp=x=>Math.max(0,Math.min(1,x));
export function celebrationPose(age){
 if(age<0)return {stage:'none',lift:0,flip:0,crouch:0,kick:0,salute:0};
 if(age<220)return {stage:'crouch',lift:0,flip:0,crouch:Math.sin(age/220*Math.PI)*.2,kick:0,salute:0};
 if(age<1180){const u=(age-220)/960;return {stage:'backflip',lift:Math.sin(u*Math.PI)*155,flip:-Math.PI*2*u,crouch:0,kick:0,salute:0};}
 if(age<1400)return {stage:'landing',lift:0,flip:0,crouch:Math.sin((age-1180)/220*Math.PI)*.22,kick:0,salute:0};
 if(age<2200)return {stage:'roundhouse',lift:0,flip:0,crouch:0,kick:Math.sin(clamp((age-1400)/800)*Math.PI),salute:0};
 return {stage:'victory',lift:0,flip:0,crouch:0,kick:0,salute:1};
}
