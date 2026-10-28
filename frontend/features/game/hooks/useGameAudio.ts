'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArcadeAudio} from '../../../../shared/arcade-audio.mjs';

export default function useGameAudio(){
 const context=useRef<AudioContext|null>(null),engine=useRef<ArcadeAudio|null>(null),enabled=useRef(true),racing=useRef(false);
 const [muted,setMuted]=useState(false),[available,setAvailable]=useState(true);
 const unlock=useCallback(()=>{
  try{
   const Ctor=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Ctor){setAvailable(false);return Promise.resolve();}
   if(!context.current||context.current.state==='closed'){
    context.current=new Ctor();engine.current=new ArcadeAudio(context.current);
    engine.current!.setEnabled(enabled.current);engine.current!.setRacing(racing.current);
   }
   const ctx=context.current!;
   return (ctx.state==='suspended'?ctx.resume():Promise.resolve()).then(()=>engine.current?.sync()).catch(()=>{});
  }catch{setAvailable(false);return Promise.resolve();}
 },[]);
 const stop=useCallback(()=>{racing.current=false;engine.current?.stop();},[]);
 const setRacing=useCallback((value:boolean)=>{racing.current=value;engine.current?.setRacing(value);},[]);
 const jump=useCallback(()=>{void unlock().then(()=>engine.current?.jump());},[unlock]);
 const stumble=useCallback(()=>{engine.current?.stumble();},[]);
 const play=useCallback((seed=0)=>{engine.current?.victory(seed);},[]);
 const toggle=useCallback(()=>{enabled.current=!enabled.current;setMuted(!enabled.current);engine.current?.setEnabled(enabled.current);if(enabled.current)void unlock();},[unlock]);
 useEffect(()=>()=>{stop();void context.current?.close().catch(()=>{});},[stop]);
 return useMemo(()=>({unlock,play,stop,setRacing,jump,stumble,toggle,muted,available}),[unlock,play,stop,setRacing,jump,stumble,toggle,muted,available]);
}
