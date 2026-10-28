// Original 136 BPM minor-key chip soundtrack, synthesized without audio files.
// A short lookahead keeps the beat steady without queuing a whole race of nodes.
const STEP=60/136/4;
const LEAD=[
 76,0,79,76,0,83,81,79,76,0,74,76,79,0,74,0,
 72,0,76,79,0,81,79,76,74,0,72,74,76,0,71,0,
 74,0,77,74,0,81,79,77,74,0,72,74,77,79,81,0,
 71,0,74,78,0,81,83,81,78,0,74,71,74,0,75,0
];
const ROOTS=[40,36,38,35];
const MOTIFS=[
 [523,659,784,1047,0,1568,1319,1047,0,220,110,880,1047],
 [392,523,659,784,0,1047,784,1319,0,165,82,1047,1568],
 [659,784,988,1319,0,1760,1319,1568,0,247,123,988,1319]
];
const hz=note=>440*2**((note-69)/12);

export class ArcadeAudio {
 constructor(ctx,timers=globalThis){
  this.ctx=ctx;this.timers=timers;this.enabled=true;this.racing=false;
  this.timer=null;this.step=0;this.nextAt=0;
  this.nodes={music:new Set(),effect:new Set(),victory:new Set()};
  this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.18),ctx.sampleRate);
  const data=this.noise.getChannelData(0);let seed=173;
  for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647)*2-1;}
 }
 track(node,gain,group,at,duration){
  node.connect(gain);gain.connect(this.ctx.destination);this.nodes[group].add(node);
  node.onended=()=>{node.disconnect();gain.disconnect();this.nodes[group].delete(node);};
  node.start(at);node.stop(at+duration+.02);
 }
 tone(group,frequency,at,duration,volume=.025,type='square',end=frequency){
  const node=this.ctx.createOscillator(),gain=this.ctx.createGain();
  node.type=type;node.frequency.setValueAtTime(frequency,at);
  if(end!==frequency)node.frequency.exponentialRampToValueAtTime(end,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  this.track(node,gain,group,at,duration);
 }
 percussion(at,duration,volume){
  const node=this.ctx.createBufferSource(),gain=this.ctx.createGain();node.buffer=this.noise;
  gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  this.track(node,gain,'music',at,duration);
 }
 tick(){
  if(!this.enabled||!this.racing||this.ctx.state!=='running')return;
  const now=this.ctx.currentTime;if(this.nextAt<now-.2)this.nextAt=now+.025;
  while(this.nextAt<now+.18){
   const n=this.step%64,beat=n%16,at=this.nextAt,root=ROOTS[Math.floor(n/16)];
   if(LEAD[n])this.tone('music',hz(LEAD[n]),at,STEP*.85,.021);
   if(n%2===0)this.tone('music',hz(root+(beat===6||beat===14?7:beat===10?12:0)),at,STEP*1.5,.055,'triangle');
   if(n%4===2)this.tone('music',hz(root+24+[0,7,12,7][Math.floor(n/4)%4]),at,STEP*.65,.013);
   if(beat===0||beat===6||beat===8)this.tone('music',130,at,.12,.075,'sine',38);
   if(beat===4||beat===12){this.percussion(at,.11,.04);this.tone('music',185,at,.07,.023,'triangle',65);}
   if(n%2===0)this.percussion(at,.025,.013);
   this.step++;this.nextAt+=STEP;
  }
 }
 clear(group){
  for(const node of this.nodes[group]){try{node.stop();}catch{}node.disconnect();}
  this.nodes[group].clear();
 }
 stopMusic(){if(this.timer!==null)this.timers.clearInterval(this.timer);this.timer=null;this.clear('music');}
 sync(){
  if(!this.enabled||!this.racing||this.ctx.state!=='running'){this.stopMusic();return;}
  if(this.timer!==null)return;
  this.step=0;this.nextAt=this.ctx.currentTime+.025;this.tick();
  this.timer=this.timers.setInterval(()=>this.tick(),40);
 }
 setRacing(value){this.racing=value;this.sync();}
 setEnabled(value){this.enabled=value;if(!value){this.stopMusic();this.clear('effect');this.clear('victory');}else this.sync();}
 jump(){if(!this.enabled||this.ctx.state!=='running')return;this.tone('effect',240,this.ctx.currentTime,.16,.07,'square',1040);}
 stumble(){
  if(!this.enabled||this.ctx.state!=='running')return;
  const at=this.ctx.currentTime;
  this.tone('effect',260,at,.18,.085,'sawtooth',48);
  this.tone('effect',120,at+.1,.2,.065,'triangle',35);
 }
 victory(seed=0){
  if(!this.enabled||this.ctx.state!=='running')return;
  this.clear('victory');const start=this.ctx.currentTime+.03;
  MOTIFS[Math.abs(seed)%MOTIFS.length].forEach((frequency,i)=>{
   if(!frequency)return;
   const end=i===9||i===10?Math.max(45,frequency/4):i===11?frequency*1.6:frequency;
   this.tone('victory',frequency,start+i*.14,.18,.045,i>8?'triangle':'square',end);
  });
 }
 stop(){this.racing=false;this.stopMusic();this.clear('effect');this.clear('victory');}
}
