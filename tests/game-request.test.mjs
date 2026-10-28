import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGame,REQUEST_TIMEOUT} from '../shared/game-request.mjs';

test('a stalled poll times out without marking the outcome rejected, then polling can recover',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fetch=t.mock.method(globalThis,'fetch',(_url,{signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
 }));
 const stalled=requestGame({action:'state'});
 const rejection=assert.rejects(stalled,error=>{
  assert.match(error.message,/Connection timed out/);
  assert.notEqual(error.rejected,true);
  return true;
 });
 t.mock.timers.tick(REQUEST_TIMEOUT);
 await rejection;
 fetch.mock.mockImplementation(async()=>Response.json({room:{phase:'finished'}}));
 assert.equal((await requestGame({action:'state'})).room.phase,'finished');
});

test('a timeout while reading the response body also recovers without unlocking an input',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(globalThis,'fetch',async(_url,{signal})=>({
  ok:true,json:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))
 }));
 const pending=requestGame({action:'jump'});
 const rejected=assert.rejects(pending,error=>!error.rejected&&/timed out/.test(error.message));
 await Promise.resolve();
 t.mock.timers.tick(REQUEST_TIMEOUT);
 await rejected;
});

test('only explicit server rejections unlock a rejected input',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'One jump per hurdle.'},{status:400}));
 await assert.rejects(requestGame({action:'jump'}),error=>error.rejected===true&&error.message==='One jump per hurdle.');
});
