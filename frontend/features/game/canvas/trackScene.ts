import {trackModel} from '../../../../shared/tracks.mjs';
import {roadProjection} from '../../../../shared/road.mjs';
const rainbow=['#b94865','#bd873f','#a6aa4d','#438c79','#467fb2','#8061b5'];

// The road, scenery, racers and hurdles share one camera-following projection.
export function drawTrackScene(c:CanvasRenderingContext2D,id:string,motion:number,now:number,road=roadProjection(motion)){
 const horizon=road.point(0).x,track=trackModel(id),sky=c.createLinearGradient(0,0,0,300);
 track.sky.forEach((color:string,i:number)=>sky.addColorStop([0,.8,1][i],color));
 c.fillStyle=sky;c.fillRect(0,0,800,650);
 const cloud=(x:number,y:number,k:number)=>{
  c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#f2f9f5';
  c.beginPath();c.ellipse(0,0,58,16,0,0,Math.PI*2);c.ellipse(-21,-11,23,21,0,0,Math.PI*2);c.ellipse(13,-18,28,26,0,0,Math.PI*2);c.ellipse(38,-5,24,17,0,0,Math.PI*2);c.fill();c.restore();
 };
 if(id==='heck'){
  c.fillStyle='#f59b61';c.beginPath();c.arc(610,146,44,0,Math.PI*2);c.fill();
  for(const [x,y,k] of [[145,156,1],[600,194,.76],[745,165,.6]]){
   c.fillStyle='#3b2032';c.beginPath();c.moveTo(x-130*k,282);c.lineTo(x-14*k,y);c.lineTo(x+12*k,y);c.lineTo(x+140*k,282);c.fill();
   c.fillStyle='#ff9053';c.beginPath();c.moveTo(x-14*k,y);c.lineTo(x-38*k,y+69*k);c.lineTo(x-4*k,y+46*k);c.lineTo(x+22*k,y+96*k);c.lineTo(x+12*k,y);c.fill();
   for(let i=0;i<5;i++){const rise=(now/65+i*19)%100;c.fillStyle=i%2?'#ffd78788':'#ff906d88';c.fillRect(x+Math.sin(i*3+rise/50)*26*k,y-rise*k,3*k,5*k);}
  }
 }else if(id==='heaven'){
  c.fillStyle='#fff0b3';c.beginPath();c.arc(400,148,47,0,Math.PI*2);c.fill();
  c.fillStyle='#fff8d71c';for(let i=0;i<7;i++){c.beginPath();c.moveTo(400,126);c.lineTo(i*160-140,285);c.lineTo(i*160-80,285);c.fill();}
  for(const [x,y,k] of [[60,160,1.2],[720,175,1.4],[230,230,.85],[570,232,.8]])cloud(x,y,k);
  // A pair of golden gates on either side of the open raceway.
  c.strokeStyle='#ffe6a2';c.lineWidth=6;
  for(const x of [horizon-147,horizon+77]){c.beginPath();c.moveTo(x,268);c.lineTo(x,210);c.quadraticCurveTo(x+35,168,x+70,210);c.lineTo(x+70,268);c.stroke();for(let i=1;i<4;i++){c.beginPath();c.moveTo(x+i*17.5,205);c.lineTo(x+i*17.5,268);c.stroke();}}
 }else if(id==='kart'){
  for(let i=0;i<35;i++){const x=(i*137+53)%800,y=35+(i*71)%200;c.fillStyle=i%3?'#f7edc499':'#fff2c8';c.fillRect(x,y,i%3?2:4,i%3?2:4);}
  c.fillStyle='#a98acf';c.beginPath();c.arc(660,150,37,0,Math.PI*2);c.fill();
  c.strokeStyle='#f5c9bd';c.lineWidth=9;c.beginPath();c.ellipse(660,150,63,14,-.3,0,Math.PI*2);c.stroke();
  for(let i=0;i<6;i++){c.strokeStyle=['#f56883','#f6b559','#e7e678','#6cceaf','#70b4e7','#a691e5'][i];c.lineWidth=10;c.beginPath();c.arc(horizon,269,106-i*10,Math.PI,Math.PI*2);c.stroke();}
 }else{
  c.fillStyle='#ffca8b';c.beginPath();c.arc(400,148,70,0,Math.PI*2);c.fill();for(let i=0;i<8;i++){c.fillStyle='#986276';c.fillRect(325,156+i*9,150,3+i*.5);}
  c.fillStyle='#302d58';c.beginPath();c.moveTo(0,260);for(let x=0;x<=800;x+=35)c.lineTo(x,200+Math.sin(x*.019)*35+Math.cos(x*.03)*30);c.lineTo(800,300);c.lineTo(0,300);c.fill();
 }
 c.fillStyle=track.ground;c.fillRect(0,260,800,390);
 if(id==='kart'){for(let i=0;i<45;i++){const x=(i*173+31)%800,y=280+(i*97+motion*.025)%370;c.fillStyle=i%3?'#b5a4e077':'#f7ecc8';c.fillRect(x,y,i%3?2:3,i%3?2:3);}}
 if(id==='heck'){
  c.strokeStyle='#ff9b53';c.lineWidth=13;for(const side of [-1,1]){c.beginPath();c.moveTo(400+side*86,270);c.bezierCurveTo(400+side*220,380,400+side*165,435,400+side*430,540);c.stroke();}
 }else if(id==='heaven')for(const [x,y,k] of [[60,315,1],[730,330,1.15],[25,485,1.9],[790,560,2.5]])cloud(x,y,k);
 const samples=Array.from({length:41},(_,i)=>road.point(i/40));
 const strip=(from:number,to:number)=>{
  c.beginPath();
  for(let i=0;i<=40;i++){const a=samples[i];if(i===0)c.moveTo(a.x+a.half*from,a.y);else c.lineTo(a.x+a.half*from,a.y);}
  for(let i=40;i>=0;i--){const a=samples[i];c.lineTo(a.x+a.half*to,a.y);}
  c.closePath();c.fill();
 };
 c.fillStyle=track.road;strip(-1,1);
 if(id==='kart')for(let i=0;i<6;i++){c.fillStyle=rainbow[i];strip(-1+i/3,-1+(i+1)/3);}
 const flow=(motion/1700)%1;
 for(let i=0;i<24;i++){
  const z=(i/24+flow)%1,zz=Math.min(1,z+.022),a=road.point(z),b=road.point(zz);c.fillStyle=track.edge[i%2];
  for(const side of [-1,1]){c.beginPath();c.moveTo(a.x+side*a.half,a.y);c.lineTo(a.x+side*(a.half+10+z*13),a.y);c.lineTo(b.x+side*(b.half+10+zz*13),b.y);c.lineTo(b.x+side*b.half,b.y);c.fill();}
 }
 for(let i=0;i<12;i++){
  const z=(i/12+flow)%1,a=road.point(z),b=road.point(Math.min(1,z+.026));c.fillStyle=track.lane;
  for(const lane of [-.5,0,.5]){c.beginPath();c.moveTo(a.x+a.half*lane-2,a.y);c.lineTo(a.x+a.half*lane+2,a.y);c.lineTo(b.x+b.half*lane+4,b.y);c.lineTo(b.x+b.half*lane-4,b.y);c.fill();}
 }
 for(let i=0;i<8;i++){
  const z=(i/8+flow)%1,a=road.point(z);
  for(const side of [-1,1]){
   const x=a.x+side*(a.half+45+z*60),h=12+z*90;
   if(id==='heck'){
    c.fillStyle='#342432';c.beginPath();c.moveTo(x-h*.3,a.y);c.lineTo(x-h*.1,a.y-h*.7);c.lineTo(x+h*.25,a.y-h*.85);c.lineTo(x+h*.4,a.y);c.fill();
    c.fillStyle='#ffae59';c.beginPath();c.moveTo(x-h*.14,a.y-h*.2);c.lineTo(x-h*.07,a.y-h*(.95+Math.sin(now/240+i)*.1));c.lineTo(x+h*.1,a.y-h*.6);c.lineTo(x+h*.21,a.y-h*.8);c.lineTo(x+h*.24,a.y-h*.2);c.fill();
   }else if(id==='heaven'){
    c.fillStyle='#ecf4e7';c.fillRect(x-7-z*5,a.y-h,14+z*10,h);c.fillStyle='#d4b575';c.fillRect(x-12-z*8,a.y-h,24+z*16,5+z*6);
    c.strokeStyle='#fff1ae';c.lineWidth=2+z*3;c.beginPath();c.ellipse(x,a.y-h-8-z*7,11+z*12,3+z*4,0,0,Math.PI*2);c.stroke();
   }else if(id==='kart'){
    c.fillStyle='#edf1f0';c.fillRect(x-2,a.y-h,4,h);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){c.fillStyle=(row+col)%2?'#382d58':'#fff0cf';c.fillRect(x+col*(4+z*8),a.y-h+row*(4+z*8),4+z*8,4+z*8);}
   }else{
    c.fillStyle='#263c47';c.fillRect(x-4,a.y-h,8,h);c.fillStyle='#779c83';c.beginPath();c.moveTo(x,a.y-h-20*z);c.lineTo(x-12-z*25,a.y-h*.35);c.lineTo(x+12+z*25,a.y-h*.35);c.fill();
   }
  }
 }
 // Keep white cues legible even over the brighter cloud course.
 if(id==='heaven'||id==='kart'){
  const shade=c.createLinearGradient(0,0,0,210);shade.addColorStop(0,'#10162c80');shade.addColorStop(1,'#10162c00');c.fillStyle=shade;c.fillRect(0,0,800,210);
 }
}
