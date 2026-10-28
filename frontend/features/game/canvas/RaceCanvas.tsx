'use client';
import {useEffect,useRef} from 'react';
import {trackModel} from '../../../../shared/tracks.mjs';
import {drawTrackScene} from './trackScene';
import {roadProjection,racerPosition} from '../../../../shared/road.mjs';
import {hurdleCue,jumpHeight,boostPoseActive} from '../../../../shared/jump-visuals.mjs';
import {robotModel} from '../../../../shared/robots.mjs';
import {celebrationPose,CELEBRATION_DELAY} from '../../../../shared/celebration.mjs';
import {jumpResult,racePace,scheduleFor} from '../../../../shared/game.mjs';
const CEO_LOOKS:Record<string,{name:string,skin:string,hair:string,shirt:string,glasses?:boolean}>={
 jensen:{name:'Jensen Huang',skin:'#dcae88',hair:'#d7d4c9',shirt:'#17222b',glasses:true},
 elon:{name:'Elon',skin:'#efc4a7',hair:'#473d36',shirt:'#1d2531'},
 zuckerberg:{name:'Zuckerberg',skin:'#e9b799',hair:'#92734c',shirt:'#737c8b'},
 altman:{name:'Altman',skin:'#efc4aa',hair:'#3e302c',shirt:'#304965'},
 amodei:{name:'Dario',skin:'#e5b295',hair:'#3a2b25',shirt:'#8db1cb',glasses:true}
};
const correctionAt=(time:number)=>Math.max(0,1-Math.abs(((time%3000)+3000)%3000-1500)/200);
export default function RaceCanvas({state}:{state:any}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(state);latest.current=state;
 useEffect(()=>{const el=canvas.current!;const c=el.getContext('2d')!;let frame:number;let previous=performance.now(),motion=0;
 function draw(){const s=latest.current,r=s.room,p=r?.players.find((x:any)=>x.id===s.id);const t=performance.now(),now=s.clock(),W=800,H=650;motion+=Math.min(100,t-previous)*racePace(r,now);previous=t;const scale=Math.min(devicePixelRatio||1,2);if(el.width!==W*scale){el.width=W*scale;el.height=H*scale;}c.setTransform(scale,0,0,scale,0,0);c.imageSmoothingEnabled=false;
 const track=trackModel(r?.track||s.track),road=roadProjection(motion);drawTrackScene(c,track.id,motion,now,road);
 const celebrateAt=s.celebrateAt??((r?.finishedAt||0)+CELEBRATION_DELAY);
 const victoryAge=(id:string)=>r?.phase==='finished'&&r.winners.includes(id)?now-celebrateAt:-1;
 const active=r?.phase==='race',jumpAt=s.jumpAt??p?.jump;const height=jumpHeight(jumpAt,now,r);
 // Each lane uses its own authoritative schedule; rivals do not copy your cue.
 function hurdle(schedule:any,gx:number,gy:number,k:number,primary=false){
  if(!active)return;
  const point=hurdleCue(schedule,now,gx,gy,k,road),q=point.q;if(point.alpha<=0)return;
  const y=point.y,sz=point.scale,width=145*sz,x=point.x-width/2;
  c.save();c.globalAlpha=point.alpha;
  c.fillStyle='#0b172955';c.beginPath();c.ellipse(x+width/2,y+7,width*.65,8*sz,0,0,Math.PI*2);c.fill();
  // A circle on the ground reads as a flattened ring around the hurdle's feet.
  c.fillStyle='#14202b55';c.beginPath();c.ellipse(point.x,point.ringY,point.radius,point.ringHeight,0,0,Math.PI*2);c.fill();
  c.strokeStyle=point.open?'#c3ff7a':'#aeb9c7';c.lineWidth=primary?(point.open?4:3):2;
  c.shadowColor=point.open?'#b9ff73':'transparent';c.shadowBlur=primary&&point.open?14:0;
  c.beginPath();c.ellipse(point.x,point.ringY,point.radius,point.ringHeight,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;
  c.save();c.translate(x+width/2,y);c.scale(sz,sz);c.lineWidth=3;c.strokeStyle='#171e2d';
  if(schedule.obstacle==='cybertruck'){
   c.fillStyle='#111827';c.fillRect(-56,-14,25,17);c.fillRect(35,-14,25,17);
   c.fillStyle='#a7b5bd';c.beginPath();c.moveTo(-72,-12);c.lineTo(-63,-31);c.lineTo(-28,-51);c.lineTo(16,-47);c.lineTo(65,-30);c.lineTo(73,-10);c.closePath();c.fill();c.stroke();
   c.fillStyle='#34465b';c.beginPath();c.moveTo(-51,-31);c.lineTo(-25,-46);c.lineTo(13,-42);c.lineTo(35,-31);c.closePath();c.fill();c.stroke();
   c.strokeStyle='#e5eff4';c.beginPath();c.moveTo(-69,-21);c.lineTo(67,-21);c.stroke();c.fillStyle='#d8ff8d';c.fillRect(47,-20,19,4);c.fillStyle='#ff777f';c.fillRect(-68,-20,8,5);
  }else if(schedule.obstacle==='flaming-head'){
   for(let i=0;i<5;i++){const fx=-32+i*16,flame=10+Math.sin(now/80+i*2)*7;c.fillStyle=i%2?'#ff663e':'#ffd46b';c.beginPath();c.moveTo(fx-14,-29);c.lineTo(fx-5,-52-flame);c.lineTo(fx+3,-40);c.lineTo(fx+10,-65+flame/2);c.lineTo(fx+17,-29);c.fill();}
   c.fillStyle='#171e2d';c.fillRect(-36,-43,72,43);c.fillStyle='#a7b5bd';c.fillRect(-31,-39,62,34);c.fillStyle='#34465b';c.fillRect(-25,-29,50,15);c.fillStyle='#ff805c';c.fillRect(-18,-25,10,7);c.fillRect(9,-25,10,7);c.fillStyle='#111827';c.fillRect(-9,-9,18,5);
  }else if(CEO_LOOKS[schedule.obstacle]){
   const look=CEO_LOOKS[schedule.obstacle];
   c.fillStyle=look.shirt;c.beginPath();c.moveTo(-39,0);c.lineTo(-28,-21);c.lineTo(27,-21);c.lineTo(39,0);c.fill();
   c.fillStyle=look.skin;c.beginPath();c.ellipse(0,-34,29,22,0,0,Math.PI*2);c.fill();
   c.fillRect(-34,-37,7,11);c.fillRect(28,-37,7,11);
   c.fillStyle=look.hair;
   if(schedule.obstacle==='amodei'||schedule.obstacle==='zuckerberg'){
    for(let i=0;i<7;i++){c.beginPath();c.arc(-25+i*8,-51+Math.sin(i*2)*3,8,0,Math.PI*2);c.fill();}
   }else{
    c.beginPath();c.moveTo(-29,-40);c.lineTo(-28,-56);c.lineTo(-12,-62);c.lineTo(14,-59);c.lineTo(29,-51);c.lineTo(28,-40);c.lineTo(15,-49);c.lineTo(-13,-48);c.closePath();c.fill();
   }
   c.fillStyle='#fff8ed';for(const side of [-1,1]){c.beginPath();c.ellipse(side*11,-35,9,8,0,0,Math.PI*2);c.fill();c.fillStyle='#171e2d';c.fillRect(side*11-2,-37,4,5);c.fillStyle='#fff8ed';}
   if(look.glasses){c.strokeStyle='#252a32';c.lineWidth=2;c.strokeRect(-23,-44,21,17);c.strokeRect(2,-44,21,17);c.beginPath();c.moveTo(-2,-36);c.lineTo(2,-36);c.stroke();}
   c.fillStyle='#171e2d';c.fillRect(-7,-21,16,3);c.fillStyle=look.skin;c.fillRect(-39,-7,10,7);c.fillRect(30,-7,10,7);
   if(schedule.obstacle==='jensen'){c.strokeStyle='#647078';c.beginPath();c.moveTo(0,-20);c.lineTo(0,0);c.moveTo(-14,-18);c.lineTo(-3,-8);c.moveTo(14,-18);c.lineTo(3,-8);c.stroke();}
   if(schedule.obstacle==='elon'){c.fillStyle='#fff';c.font='bold 13px monospace';c.textAlign='center';c.fillText('X',0,-2);}
   if(schedule.obstacle==='zuckerberg'){c.strokeStyle='#f2d184';c.beginPath();c.arc(0,-15,12,0,Math.PI);c.stroke();}
  }else if(schedule.obstacle==='politician'){
   // An original flat cutout political caricature, with outsized hair and tiny hands.
   c.fillStyle='#263958';c.beginPath();c.moveTo(-41,0);c.lineTo(-29,-20);c.lineTo(26,-20);c.lineTo(42,0);c.fill();
   c.fillStyle='#fff5df';c.beginPath();c.moveTo(-12,-21);c.lineTo(13,-21);c.lineTo(0,1);c.fill();c.fillStyle='#e55361';c.fillRect(-4,-21,8,22);
   c.fillStyle='#f4a36d';c.fillRect(-29,-49,58,34);c.fillRect(-35,-38,7,12);c.fillRect(29,-38,7,12);
   c.fillStyle='#efd26e';c.beginPath();c.moveTo(-33,-45);c.lineTo(-27,-59);c.lineTo(12,-62);c.lineTo(36,-49);c.lineTo(15,-46);c.lineTo(6,-52);c.lineTo(-13,-46);c.closePath();c.fill();
   c.fillStyle='#171e2d';c.fillRect(-18,-38,10,3);c.fillRect(8,-38,10,3);c.fillStyle='#fff5df';c.fillRect(-10,-24,20,5);c.fillStyle='#f4a36d';c.fillRect(-40,-8,13,7);c.fillRect(29,-8,13,7);
  }else{
   c.fillStyle='#99e7e7';c.fillRect(-72,-52,8,52);c.fillRect(64,-52,8,52);c.fillStyle='#f5db91';c.fillRect(-76,-52,152,12);
  }
  c.restore();
  if(primary||q>.4){
   c.fillStyle='#f3f5ed';c.font=`bold ${primary?12:9}px monospace`;c.textAlign='center';c.shadowColor='#14202b';c.shadowBlur=4;
   c.fillText(schedule.obstacle==='cybertruck'?'RECALL RUN':schedule.obstacle==='flaming-head'?'HOT HEADED':schedule.obstacle==='politician'?'Trump':CEO_LOOKS[schedule.obstacle]?.name||'HURDLE',point.x,y-72*sz-10);
   if(primary&&point.open&&jumpAt==null){c.fillStyle='#cbff91';c.fillText('SPACE!',point.x,point.ringY+point.ringHeight+15);}
   c.shadowBlur=0;
  }
  c.restore();
 }
 const rivals=(r?.players||[]).filter((other:any)=>other.id!==s.id).map((other:any,index:number,list:any[])=>({other,index,...racerPosition(other.distance,p?.distance||0,(list.length===1?[640]:list.length===2?[160,640]:[130,670,265])[index],road)})).sort((a:any,b:any)=>a.y-b.y);
 function drawRival({other,index,laneX,x,y,scale:k}:any){
  const schedule=scheduleFor(r,other);
  if(other.eliminated)explosion(x,y,k,now-other.explodedAt);
  else{
   hurdle(schedule,laneX,y,k);
   bot(x,y,k,other.color,motion+index*220,jumpHeight(other.jump,now,schedule),(r.phase==='race'||r.phase==='results')&&now>=schedule.contact&&jumpResult(other.jump,schedule).quality==='miss'?now-schedule.contact:-1,r.phase==='race'&&boostPoseActive(schedule,other.reaction,other.jump,now),victoryAge(other.id),other.robot);
  }
  c.fillStyle='#dcebe0';c.font='11px monospace';c.textAlign='center';c.fillText(other.name+(other.eliminated?' · OUT':''),x,y+20);
 }
 for(const rival of rivals)if(rival.y<=540)drawRival(rival);
 if(!p?.eliminated)hurdle(r||{},400,540,1,true);
 if(r?.phase==='finished'&&!p?.eliminated&&(p?.distance||0)>=60){
  const q=Math.min(1.3,Math.max(0,(now-r.finishedAt)/2000)),y=270+q*330;
  for(let row=0;row<2;row++){
   const top=road.point(Math.sqrt(Math.max(0,(y+row*15-260)/390))),bottom=road.point(Math.sqrt(Math.max(0,(y+(row+1)*15-260)/390)));
   for(let col=0;col<16;col++){const left=-1+col/8,right=left+1/8;c.fillStyle=(row+col)%2?'#f6f0dd':'#171b28';c.beginPath();c.moveTo(top.x+top.half*left,top.y);c.lineTo(top.x+top.half*right,top.y);c.lineTo(bottom.x+bottom.half*right,bottom.y);c.lineTo(bottom.x+bottom.half*left,bottom.y);c.fill();}
  }
 }

 const reaction=s.reactionAt??p?.reaction,boosting=r?.phase==='race'&&boostPoseActive(r,reaction,jumpAt,now);
 const stumble=(r?.phase==='race'||r?.phase==='results')&&now>=r.contact&&jumpResult(jumpAt,r).quality==='miss'?now-r.contact:-1;if(p?.eliminated)explosion(400,540,1,now-p.explodedAt);else bot(400,540,1,p?.color||'#a2ff6f',motion,height,stumble,boosting,victoryAge(s.id),p?.robot||s.robot);
 for(const rival of rivals)if(rival.y>540)drawRival(rival);
 c.textAlign='left';c.font='bold 14px monospace';c.fillStyle='#d0e5de';c.fillText(track.name.toUpperCase(),24,30);c.textAlign='right';c.fillText(r?`ROUND ${r.round} · HURDLE ${r.hurdle||0}/3`:'INSERT FRIENDS',776,30);
 if(r?.phase==='finished'&&now-r.finishedAt>=CELEBRATION_DELAY){c.fillStyle='#101627dd';c.fillRect(120,45,560,92);c.textAlign='center';c.fillStyle='#cbff91';c.font='bold 29px monospace';c.fillText(!r.winners.length?'TOTAL MALFUNCTION!':r.winners.includes(s.id)?'YOU WIN THE WOBBLE!':'WINNER’S VICTORY ROUTINE',400,82);c.font='14px monospace';c.fillStyle='#fff';c.fillText(r.winners.length?'BACKFLIP → ROUNDHOUSE → QUESTIONABLE DIGNITY':'EVERYONE BLEW UP. NO WINNER.',400,113);}
 frame=requestAnimationFrame(draw);
 }
 function explosion(x:number,y:number,k:number,age:number){
  c.save();c.translate(x,y);c.scale(k,k);
  if(age<1100){const progress=Math.max(0,age)/1100;c.globalAlpha=1-progress;for(let i=0;i<22;i++){const angle=i*2.399,travel=(35+i%5*12)*progress;c.fillStyle=['#fff2b5','#ffab68','#ff665b','#dcebe0'][i%4];c.fillRect(Math.cos(angle)*travel-5,-70+Math.sin(angle)*travel+progress*25,8+i%3*3,8+i%3*3);}c.globalAlpha=1;c.fillStyle='#fff2b5';c.font='bold 26px monospace';c.textAlign='center';c.fillText('BOOM!',0,-95-progress*30);}
  c.fillStyle='#171e2d';c.fillRect(-24,-9,45,12);c.fillStyle='#5c6570';c.fillRect(-20,-12,17,10);c.fillRect(5,-18,12,18);
  c.fillStyle='#aab3c466';for(let i=0;i<3;i++){const drift=(age/800+i*.33)%1;c.fillRect(Math.sin(age/300+i)*12,-20-drift*50,10+drift*10,10+drift*10);}
  c.restore();
 }
 function bot(x:number,y:number,k:number,color:string,t:number,jump:number,fallAge=-1,boost=false,celebrateAge=-1,robot='optimus'){
  const model=robotModel(robot),accent=color; color=model.shell;t*=model.cadence;
  c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#12172466';c.beginPath();c.ellipse(0,7,46,11,0,0,Math.PI*2);c.fill();
  const pose=celebrationPose(celebrateAge),celebrating=pose.stage!=='none';
  c.translate(0,-(celebrating?pose.lift:jump));
  if(celebrating){c.translate(0,-80*model.height);c.rotate(pose.flip);const turn=pose.stage==='roundhouse'?(celebrateAge-1400)/800:0;c.scale(pose.stage==='roundhouse'?Math.cos(turn*Math.PI*2):1,1-pose.crouch);c.translate(0,80*model.height);}
  c.scale(model.width,model.height);
  const falling=!celebrating&&fallAge>=0&&fallAge<1900,collapse=falling?Math.min(1,fallAge/600)*Math.max(0,1-(fallAge-900)/1000):0;
  const runPhase=t/(falling?57:105),stride=celebrating?0:jump>0?.45:Math.sin(runPhase),bob=celebrating||jump>0?0:Math.abs(Math.sin(runPhase))*5;
  // A short deterministic sidestep catches the hips; the upper body follows a beat later.
  const correcting=!celebrating&&!boost&&jump===0&&!falling,direction=Math.floor(t/3000)%2?1:-1;
  const correction=correcting?correctionAt(t)*direction:0,torsoCorrection=correcting?correctionAt(t-110)*direction:0;
  const sway=celebrating?Math.sin(t/180)*pose.salute*3:boost?0:Math.sin(t/223)*3+Math.sin(t/417)*1.5+correction*11;
  c.translate(sway,-bob+collapse*12);c.lineCap='square';
  function limb(points:number[],width:number,col:string){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.stroke();}
  // Uneven knee lift and quick corrective footfalls, with a comparatively stiff torso.
  for(const side of [-1,1]){const a=stride*side,hipX=side*16;
   const lift=celebrating?(pose.stage==='backflip'?20:0):jump>0?Math.min(1,jump/70)*19:Math.max(0,Math.sin(runPhase+(side===1?0:Math.PI)))*(side===1?19:25);
   const kneeX=side*(21+collapse*18)+a*15+correction*8+(side===1?pose.kick*45:0),kneeY=-27-lift*.7+collapse*17-(side===1?pose.kick*35:0);
   let footX=side*20-a*(side===1?14:19)+collapse*side*19+correction*(side===direction?18:5),footY=-4-lift;
   if(celebrating&&side===1){footX+=pose.kick*100;footY-=pose.kick*72;}
   limb([hipX,-50,kneeX,kneeY,footX,footY],13,'#171e2d');limb([hipX,-51,kneeX,kneeY],9,color);c.fillStyle=model.shoes;c.fillRect(footX-9,footY-4,22,10);
  }
  c.save();c.translate(0,-50);c.rotate(collapse*.95+Math.sin(t/223)*.025-torsoCorrection*.09);c.translate(0,50+collapse*9);
  if(boost&&jump===0&&!celebrating){c.transform(1,0,-.17,.87,0,0);c.strokeStyle='#b8f9fa99';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-42-i*10,-65+i*20);c.lineTo(-62-i*10,-48+i*20);c.stroke();}}
  for(const side of [-1,1]){const a=Math.sin(t/117+.3)*side;const arm=celebrating?[side*29,-91,side*(45+pose.kick*10),-70-pose.salute*35,side*(50+pose.kick*10),-55-pose.salute*(65+Math.sin(t/90)*10)]:boost&&jump===0?[side*29,-91,side*43,-60,side*49,-28]:falling?[side*29,-91,side*55,-95+Math.sin(t/60+side)*24,side*73,-95+Math.cos(t/60+side)*32]:[side*29,-91,side*(44+Math.abs(a)*6),-69+a*18,side*(47+a*10),-48+a*19];
   limb(arm,11,'#171e2d');limb(arm,8,color);c.fillStyle=color;c.fillRect(arm[4]-6,arm[5]-6,12,12);
  }
  if(pose.kick>.2){c.strokeStyle='#f5db91';c.lineWidth=4;c.beginPath();c.arc(45,-55,70,-1.2,.55);c.stroke();}
  c.fillStyle='#171e2d';c.fillRect(-30,-104,60,57);c.fillStyle=color;c.fillRect(-25,-100,50,48);c.fillStyle='#384253';c.fillRect(-15,-89,30,25);c.fillStyle=accent;c.fillRect(-10,-84,20,4);if(robot==='optimus'){c.fillStyle='#f4f5ed';c.fillRect(-18,-96,36,7);}if(robot==='strider'){c.fillStyle='#ef9678';c.fillRect(-25,-99,50,6);}
  // Head lags behind the hips during a stumble instead of rotating the bot as one piece.
  c.save();c.translate(0,-109);c.rotate(-collapse*.28+torsoCorrection*.07);c.translate(0,109);
  c.fillStyle='#171e2d';c.beginPath();c.roundRect(-34,-148,68,45,model.round);c.fill();c.fillStyle=color;c.beginPath();c.roundRect(-29,-144,58,36,Math.max(0,model.round-3));c.fill();c.fillStyle=model.dark;c.beginPath();c.roundRect(-24,-136,48,22,Math.min(10,model.round));c.fill();
  if(robot==='optimus'){c.fillStyle=accent;c.fillRect(-15,-127,30,3);}else{c.fillStyle=accent;c.fillRect(-17,-130,8,5);c.fillRect(9,-130,8,5);}
  if(model.antenna){c.fillStyle=color;c.fillRect(-3,-163,6,17);c.fillStyle='#fff2b5';c.fillRect(-6,-169,12,8);}c.restore();c.restore();c.restore();
 }
 draw();return()=>cancelAnimationFrame(frame);
 },[]);
 return <canvas ref={canvas} className="race-canvas" aria-label="Arcade track with running robots and approaching hurdles"/>;
}
