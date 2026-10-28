const clamp=value=>Math.max(0,Math.min(1,value));
const feetDepth=(540-260)/390;
const smooth=value=>value*value*(3-2*value);
export const ROAD_CYCLE=26000;

// The camera follows the local racer at y=540. Higher scores belong nearer the
// horizon; lower scores belong behind that anchor, including in the leader's view.
export function racerPosition(distance,viewerDistance,laneX,road){
 const gap=distance-viewerDistance;
 const limit=gap>=0?180:70;
 const depth=limit*Math.abs(gap)/(Math.abs(gap)+limit/3);
 const y=540+(gap>=0?-depth:depth);
 laneX=400+(laneX-400)*(48+(y-260)/390*355)/(48+(540-260)/390*355);
 return {laneX,x:laneX+road.offset(y),y,scale:.18+.82*(y-260)/280};
}

// A camera-following road: the runner stays centered while distant bends sweep
// left/right. Brief straight sections separate turns; a second shape adds S bends.
export function roadProjection(travel=0){
 const phase=travel/ROAD_CYCLE*Math.PI*2+.65,wave=Math.sin(phase);
 const turn=Math.sign(wave)*smooth(clamp((Math.abs(wave)-.18)/.72))*230;
 const weave=Math.sin(phase*2)*65*Math.abs(turn)/230;
 const shape=depth=>turn*(1-depth)**2+weave*Math.sin(depth*Math.PI)*(1-depth);
 const anchor=shape(feetDepth);
 const offset=y=>shape(clamp((y-260)/390))-anchor;
 const point=z=>{const depth=clamp(z)**2,y=260+depth*390;return {x:400+offset(y),y,half:48+depth*355};};
 return {offset,point};
}
