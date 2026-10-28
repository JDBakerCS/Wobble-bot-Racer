export const JUMP_LEAD=520,JUMP_PEAK=105,JUMP_CLEARANCE=56,PERFECT=90;
// Clearance includes the tucked feet of the shortest robot and the 62px props.
// The cue window is derived from the arc, rather than a separate timing rule.
export const GOOD=2*JUMP_LEAD/Math.PI*Math.acos(JUMP_CLEARANCE/JUMP_PEAK);
const leadFor=schedule=>(schedule?.contact-schedule?.target)||JUMP_LEAD;

export function jumpInProgress(at,now,schedule=null){
 return at!=null&&now>=at&&now<at+leadFor(schedule)*2;
}
export function jumpHeight(at,now,schedule=null){
 if(!jumpInProgress(at,now,schedule))return 0;
 return Math.sin((now-at)/(leadFor(schedule)*2)*Math.PI)*JUMP_PEAK;
}
export function jumpResult(at,schedule){
 const height=jumpHeight(at,schedule.contact,schedule);
 const cleared=at!=null&&height+1e-8>=JUMP_CLEARANCE;
 return {height,cleared,quality:!cleared?'miss':Math.abs(at-schedule.target)<=PERFECT?'perfect':'good'};
}
