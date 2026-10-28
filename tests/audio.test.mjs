import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio} from '../shared/arcade-audio.mjs';

function harness(){
 const sources=[],intervals=new Map();let id=0;
 const param=()=>({events:[],setValueAtTime(value,at){this.events.push({value,at});},linearRampToValueAtTime(value,at){this.events.push({value,at});},exponentialRampToValueAtTime(value,at){assert(value>0);this.events.push({value,at});}});
 const source=()=>{const node={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(at){assert(at>=ctx.currentTime);this.startAt=at;},stop(at){if(at===undefined){this.cancelled=true;this.onended?.();}else this.stopAt=at;}};sources.push(node);return node;};
 const ctx={currentTime:0,state:'running',sampleRate:44100,destination:{},createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)}),createOscillator:source,createBufferSource:source,createGain:()=>({gain:param(),connect(){},disconnect(){}})};
 const timers={setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(id){intervals.delete(id);}};
 return {engine:new ArcadeAudio(ctx,timers),ctx,sources,intervals,advance(time){ctx.currentTime=time;for(const node of [...sources])if(!node.cancelled&&!node.ended&&node.stopAt<=time){node.ended=true;node.onended?.();}for(const tick of intervals.values())tick();}};
}

test('race and inter-hurdle updates use one steady music scheduler; finish cancels it',()=>{
 const h=harness();h.engine.setRacing(true);assert.equal(h.intervals.size,1);assert(h.sources.length>0);
 h.engine.setRacing(true);assert.equal(h.intervals.size,1);
 for(let time=.04;time<12;time+=.04)h.advance(time);
 assert(h.sources.length>250);assert(h.engine.nodes.music.size<20);
 assert(h.sources.some(node=>node.type==='triangle'));assert(h.sources.some(node=>node.buffer));
 h.engine.setRacing(false);assert.equal(h.intervals.size,0);assert.equal(h.engine.nodes.music.size,0);
 assert(h.sources.every(node=>node.cancelled||node.ended));
});

test('mute stops every channel and unmute resumes only an active race',()=>{
 const h=harness();h.engine.setRacing(true);h.engine.jump();h.engine.victory();h.engine.setEnabled(false);
 assert.equal(h.intervals.size,0);for(const group of Object.values(h.engine.nodes))assert.equal(group.size,0);
 const count=h.sources.length;h.engine.jump();h.engine.stumble();h.engine.victory();h.advance(1);assert.equal(h.sources.length,count);
 h.engine.setEnabled(true);assert.equal(h.intervals.size,1);assert(h.sources.length>count);
 h.engine.stop();h.engine.setEnabled(false);h.engine.setEnabled(true);assert.equal(h.intervals.size,0);
});

test('jump rises, stumble falls and effects stay separate from music and victory',()=>{
 const h=harness();h.engine.setRacing(true);const music=h.engine.nodes.music.size;
 h.engine.jump();const jump=h.sources.at(-1);assert.equal(jump.frequency.events[0].value,240);assert.equal(jump.frequency.events.at(-1).value,1040);
 h.engine.stumble();assert.equal(h.engine.nodes.effect.size,3);assert.equal(h.sources.at(-1).frequency.events.at(-1).value,35);
 assert.equal(h.engine.nodes.music.size,music);
 h.engine.setRacing(false);assert.equal(h.engine.nodes.effect.size,3);
 h.engine.victory(2);assert(h.engine.nodes.victory.size>0);h.engine.stop();
 assert.equal(h.intervals.size,0);for(const group of Object.values(h.engine.nodes))assert.equal(group.size,0);
});

test('suspended audio waits for a user unlock and long pauses do not schedule a backlog',()=>{
 const h=harness();h.ctx.state='suspended';h.engine.setRacing(true);h.engine.jump();h.engine.stumble();assert.equal(h.sources.length,0);
 h.ctx.state='running';h.engine.sync();assert.equal(h.intervals.size,1);
 const before=h.sources.length;h.advance(3600);assert(h.sources.length-before<20);assert(h.sources.slice(before).every(node=>node.startAt>=3600));
 h.engine.stop();
});
