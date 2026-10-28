'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Copy,Flag,HelpCircle,LogOut,RotateCcw,ArrowRight,Check,Volume2,VolumeX} from 'lucide-react';
import RaceCanvas from '../features/game/canvas/RaceCanvas';
import {ROBOTS,DEFAULT_ROBOT} from '../../shared/robots.mjs';
import RobotBadge from '../features/game/components/RobotBadge';
import TrackBadge from '../features/game/components/TrackBadge';
import {TRACKS,DEFAULT_TRACK,trackModel} from '../../shared/tracks.mjs';
import useGameAudio from '../features/game/hooks/useGameAudio';
import {CELEBRATION_DELAY} from '../../shared/celebration.mjs';
import {racePace,reactionResult,boostEnd,jumpResult,PERFECT,MAX_TRIPS,JUMP_LEAD} from '../../shared/game.mjs';
import {inputFailure,confirmInput} from '../../shared/input.mjs';
import {jumpInProgress} from '../../shared/jump.mjs';
import {requestGame} from '../../shared/game-request.mjs';
type Session={code:string,id:string,token:string};
const KEY='wobble-hurdles-session';
type InputAttempt={id:number,sessionId:string,key:string,at:number,uncertain:boolean};
export default function Home(){
 const [session,setSession]=useState<Session|null>(null),[room,setRoom]=useState<any>(null),[name,setName]=useState(''),[code,setCode]=useState(''),[mode,setMode]=useState('solo'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rules,setRules]=useState(false),[now,setNow]=useState(0),[jumpAt,setJumpAt]=useState<number|null>(null),[reactionAt,setReactionAt]=useState<number|null>(null),[copied,setCopied]=useState(false);
 const sessionRef=useRef<Session|null>(null),roomRef=useRef<any>(null),offset=useRef(Date.now()-performance.now()),best=useRef({rtt:Infinity,offset:0}),latest=useRef(0),roundKey=useRef(''),jumpLock=useRef(false),reactionLock=useRef(false),polling=useRef(false),input=useRef<(kind:string)=>void>(()=>{}),inputAttempts=useRef<Record<string,InputAttempt|null>>({}),attemptCounter=useRef(0);
 const [robot,setRobot]=useState(DEFAULT_ROBOT),[track,setTrack]=useState(DEFAULT_TRACK);
 const audio=useGameAudio(),playedVictory=useRef(''),playedStumble=useRef('');
 const [celebrateAt,setCelebrateAt]=useState<number|null>(null);
 const clock=()=>performance.now()+offset.current;
 function accept(data:any,start:number,end:number){
  const r=data.room,processing=Math.max(0,r.serverSent-r.serverTime),rtt=Math.max(0,end-start-processing),candidate=(r.serverTime-start+r.serverSent-end)/2;
  if(rtt<best.current.rtt)best.current={rtt,offset:candidate};
  if(r.serverTime<latest.current)return;
  latest.current=r.serverTime;
  const key=`${r.code}:${r.round}:${r.hurdle}`;
  if(key!==roundKey.current||r.phase==='lobby')offset.current=best.current.offset;
  if(key!==roundKey.current||r.phase==='lobby'){roundKey.current=key;setJumpAt(null);setReactionAt(null);jumpLock.current=false;reactionLock.current=false;inputAttempts.current={};}
  // Null snapshots (including older in-flight polls) never unlock uncertain input.
  const playerId=data.session?.id||sessionRef.current?.id,confirmed=r.players.find((p:any)=>p.id===playerId);
  for(const kind of ['react','jump']){
   const current=inputAttempts.current[kind],stamp=kind==='react'?confirmed?.reaction:confirmed?.jump;
   const settled=confirmInput(current,playerId,key,stamp);
   if(settled!==current){inputAttempts.current[kind]=settled;if(kind==='react')setReactionAt(settled.at);else setJumpAt(settled.at);}
  }
  roomRef.current=r;setRoom(r);
  if(data.session){sessionRef.current=data.session;setSession(data.session);sessionStorage.setItem(KEY,JSON.stringify(data.session));}
 }
 async function send(body:any){const sentSession=sessionRef.current;const start=performance.now();const data:any=await requestGame({...sessionRef.current,...body});if(sentSession?.id===sessionRef.current?.id){accept(data,start,performance.now());setError(current=>current==='Connection timed out. Reconnecting to the race…'?'':current);}return data;}
 const sendRef=useRef(send);sendRef.current=send;
 useEffect(()=>{try{const saved=sessionStorage.getItem(KEY);if(saved){const s=JSON.parse(saved);sessionRef.current=s;setSession(s);}const q=new URLSearchParams(location.search).get('room');if(q){setCode(q.toUpperCase());setMode('join');}}catch{}},[]);
 useEffect(()=>{if(!session)return;let cancelled=false;async function poll(){if(cancelled||polling.current)return;polling.current=true;try{await sendRef.current({action:'state'});}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Connection interrupted.');}finally{polling.current=false;}}void poll();const timer=setInterval(poll,500);return()=>{cancelled=true;clearInterval(timer);};},[session]);
 useEffect(()=>{const timer=setInterval(()=>setNow(clock()),40);return()=>clearInterval(timer);},[]);
 async function action(body:any){if(body.action==='start'||body.action==='rematch'){audio.unlock();audio.stop();setCelebrateAt(null);}try{setError('');await send(body);}catch(e){setError(e instanceof Error?e.message:'Something went wrong.');}}
 function play(kind:string){audio.unlock();const r=roomRef.current;if(!r||r.phase!=='race')return;if(r.players.find((p:any)=>p.id===sessionRef.current?.id)?.eliminated)return;const at=clock(),me=r.players.find((p:any)=>p.id===sessionRef.current?.id);
  if(kind==='react'){if(!r.hasBoost||reactionLock.current||me?.reaction!==null||at<r.start||at>boostEnd(r))return;reactionLock.current=true;setReactionAt(at);}
  else{if(jumpLock.current||me?.jump!==null||at<r.jumpStart||at>r.contact)return;jumpLock.current=true;setJumpAt(at);audio.jump();}
  const sentId=sessionRef.current!.id,key=roundKey.current,attempt={id:++attemptCounter.current,sessionId:sentId,key,at,uncertain:false};
  inputAttempts.current[kind]=attempt;
  setError('');
  void send({action:kind,round:r.round,hurdle:r.hurdle,at}).catch(async failure=>{
   if(sessionRef.current?.id!==sentId||roundKey.current!==key||inputAttempts.current[kind]?.id!==attempt.id)return;
   setError(failure instanceof Error?failure.message:'Connection interrupted. Checking your input…');
   // Known rejections release only this attempt. Unknown network outcomes stay
   // locked until a saved timestamp confirms them, or the hurdle/session changes.
   const settled=inputFailure(inputAttempts.current[kind],attempt,!!failure?.rejected);
   inputAttempts.current[kind]=settled;
   if(settled===null){
    if(kind==='react'){setReactionAt(null);reactionLock.current=false;}
    else{setJumpAt(null);jumpLock.current=false;}
   }
   try{await send({action:'state'});}catch{/* Regular polling will reconcile after reconnection. */}
  });
 }
 input.current=play;
 useEffect(()=>{function key(e:KeyboardEvent){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.ctrlKey||e.altKey||e.metaKey)return;if(e.code==='KeyF'||e.code==='Space'){if(roomRef.current?.phase!=='race')return;e.preventDefault();if(!e.repeat)input.current(e.code==='KeyF'?'react':'jump');}}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 async function enter(e:React.FormEvent){e.preventDefault();audio.unlock();setCelebrateAt(null);if(busy)return;setBusy(true);try{setError('');await send({action:mode==='join'?'join':'create',solo:mode==='solo',name,code,robot,track});if(mode==='solo')await send({action:'start'});}catch(e){setError(e instanceof Error?e.message:'Could not join.');}finally{setBusy(false);}}
 async function leave(){audio.stop();setCelebrateAt(null);const s=sessionRef.current;sessionRef.current=null;setSession(null);roomRef.current=null;setRoom(null);sessionStorage.removeItem(KEY);latest.current=0;roundKey.current='';inputAttempts.current={};best.current={rtt:Infinity,offset:0};setError('');if(s)void fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...s,action:'leave'})});}
 async function copy(){try{await navigator.clipboard.writeText(room.code);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{setError('Use the room code shown above.');}}
 const me=room?.players.find((p:any)=>p.id===session?.id),phase=room?.phase||'preview',r=room;
 const reacting=phase==='race'&&r.hasBoost&&!me?.eliminated&&now<=boostEnd(r),jumping=phase==='race'&&!me?.eliminated&&now>=r.jumpStart;
 const reaction=reactionAt??me?.reaction,jump=jumpAt??me?.jump,reactionState=reactionResult(reaction,r?.green,r?.hasBoost),early=reactionState.status==='early',slow=reactionState.status==='slow';
 const go=reacting&&now>=r.green&&now<=boostEnd(r);
 const crossed=phase==='finished'&&now-r.finishedAt>=CELEBRATION_DELAY;
 const syncing=(phase==='race'||phase==='results')&&now>r.until+2500;
 const seconds=Math.max(0,Math.ceil((((reacting?r?.green:jumping?r?.contact:r?.until)||0)-now)/1000));
 const result=me?.result;
 const missHint=result?.jumpDelta===undefined?'Jump timing missed the window.':result.jumpDelta===null?'No jump registered.':`${result.jumpDelta<0?'Too early':'Too late'} by ${Math.abs(result.jumpDelta)}ms.`;
 const pace=racePace(room,now);
 const speedUp=phase==='race'&&((r.hasBoost&&now>=boostEnd(r)&&now<boostEnd(r)+1000)||(now>=r.contact&&now<r.contact+1000));
 const jumpOpen=jumping&&jumpResult(now,r).cleared,jumpInAir=jump!=null&&(now<jump||jumpInProgress(jump,now,r));
 const jumpCue=jumping&&(jump!=null||jumpOpen||!reacting);
 const cue=me?.eliminated&&phase!=='finished'?'BOOM! YOU’RE OUT':phase==='lobby'?'GRID OPEN':phase==='race'&&!reacting&&!jumping?'HURDLE INCOMING':phase==='results'?(result?.quality==='miss'?'SHAKE IT OFF':`${result?.quality?.toUpperCase()} JUMP`):phase==='finished'?(crossed?'RACE COMPLETE':'TO THE LINE!'):jumpCue?(jump!=null?(jumpInAir?'AIR TIME':'LANDED'):jumpOpen?'JUMP!':now>r.contact?'NEXT HURDLE SOON':'WATCH THE HURDLE'):reacting?(reaction!=null?(early?'FALSE START':slow?'TOO SLOW':'BOOST READY'):go?'GO!':now<r.start?'GET READY':'WAIT'):jumping?'WATCH THE HURDLE':'SMALL BOTS. BIG ENERGY.';
 useEffect(()=>{audio.setRacing(phase==='race'||phase==='results');},[audio,phase,room?.code]);
 useEffect(()=>{
  if(phase!=='race'||me?.eliminated||now<r.contact||now-r.contact>600)return;
  const key=`${r.code}:${r.round}:${r.hurdle}:${r.contact}`;
  if(playedStumble.current===key)return;
  playedStumble.current=key;
  if(!jumpResult(jump,r).cleared)audio.stumble();
 },[audio,phase,now,r,jump,me?.eliminated]);
 useEffect(()=>{
  if(phase!=='finished'){setCelebrateAt(null);return;}
  if(!crossed)return;
  const key=`${room.code}:${room.finishedAt}`;
  if(playedVictory.current===key)return;
  playedVictory.current=key;if(room.winners.length)audio.play(Math.floor(room.finishedAt));
 },[audio,phase,crossed,room?.code,room?.finishedAt,room?.winners.length]);
 function replayVictory(){const code=room.code,finish=room.finishedAt;setCelebrateAt(clock());void audio.unlock().then(()=>{if(roomRef.current?.phase==='finished'&&roomRef.current.code===code&&roomRef.current.finishedAt===finish)audio.play(Math.floor(finish));});}
 return <main>
  <header><Link className="brand" href="/"><span className="brand-mark">W</span><span>WOBBLEBOT <b>RACER</b></span></Link><div className="header-meta"><span className="edition">ARCADE EDITION / 04</span><button className="icon-button" aria-label={audio.available?(audio.muted?'Enable music and sounds':'Mute music and sounds'):'Audio unavailable'} aria-pressed={!audio.muted&&audio.available} onClick={audio.toggle} disabled={!audio.available}>{audio.muted||!audio.available?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button className="icon-button" aria-label="How to play" onClick={()=>setRules(true)}><HelpCircle size={20}/></button></div></header>
  {!room&&mode!=='join'&&<section className="track-selection" aria-label="Choose your track"><div className="track-selection-title"><span className="label">CHOOSE YOUR TRACK</span><small>Pick a course. Preview it below.</small></div><div className="track-picker" role="group" aria-label="Race tracks">{TRACKS.map(course=><button type="button" key={course.id} aria-label={course.name} aria-pressed={track===course.id} disabled={busy||!!session} className={track===course.id?'selected':''} onClick={()=>setTrack(course.id)}><TrackBadge track={course}/><span><b>{course.name}</b><small>{course.description}</small></span>{track===course.id&&<Check size={15} className="track-check" aria-hidden="true"/>}</button>)}</div></section>}
  {!room&&mode==='join'&&<p className="track-join-note">Joining a room? Your host chooses the track for everyone.</p>}
  <div className="game-layout"><section className="arcade"><div className="scorebar"><div><span className="label">{room?.solo?'SOLO PRACTICE':'60 METRE SPRINT'}</span><strong>{me?me.name:'WELCOME, WOBBLER'}</strong></div><div className="distance"><span className={`pace ${speedUp?'speed-up':''}`} aria-label={`Race speed ${pace.toFixed(1)} times`}>{speedUp?'SPEED UP!':'PACE'}<b>{pace.toFixed(1)}×</b></span><strong>{me?.distance||0}<small> / 60</small></strong><span className="label">METRES</span></div></div>
   <div className="screen"><RaceCanvas state={{room,id:session?.id,clock,jumpAt,reactionAt,celebrateAt,robot,track}}/><div className={`screen-cue ${go?'go':''}`} style={{display:crossed?'none':undefined}}><span className="label">{phase==='race'?`ROUND ${r.round} · HURDLE ${r.hurdle}/3 · ${reacting?'BOOST':'JUMP'}`:'LOW STABILITY. HIGH SPEED.'}</span><strong>{cue}</strong>{phase==='race'&&!me?.eliminated&&r.hasBoost&&<><span className="boost-cue">F · {reaction!=null?(early?'FALSE START':slow?'TOO SLOW':'BOOST READY'):go?'GREEN!':reacting?'WAIT FOR GREEN':'BOOST CLOSED'}</span><div className={`track-lights ${go?'green':''}`} aria-hidden="true">{[0,1,2].map(i=><i key={i} className={now>=r.start+i*700?'lit':''}/>)}<i className={go?'lit go-light':''}/></div></>}</div>{phase==='race'&&!me?.eliminated&&<div className="touch-controls"><button aria-label="React on green" disabled={!reacting||reaction!=null||now<r.start||now>boostEnd(r)} onPointerDown={e=>{e.preventDefault();play('react');}} onClick={()=>play('react')}>F · {go?'GO!':'REACT'}</button><button aria-label="Jump hurdle" disabled={!jumping||jump!=null||now>r.contact} onPointerDown={e=>{e.preventDefault();play('jump');}} onClick={()=>play('jump')}>SPACE · JUMP</button></div>}</div>
   <div className="cabinet-bottom"><span><i/> {room?room.solo?'PRACTICE MODE':`${room.players.length} PLAYERS CONNECTED`:'2–4 PLAYERS + SOLO PRACTICE'}</span><span>{trackModel(room?.track||track).name}</span></div>
  </section>
  <aside className="panel">{!room?<><span className="eyebrow">READY. SET. MALFUNCTION.</span><h1>Run like your<br/><em>bolts depend on it.</em></h1><p>Catch the green. Clear the hurdles.<br/>Try to keep all your parts.</p><div className="tabs" aria-label="Game mode">{[['solo','Practice'],['create','Host'],['join','Join']].map(([v,label])=><button key={v} className={mode===v?'selected':''} onClick={()=>setMode(v)}>{label}</button>)}</div><span className="label">CHOOSE YOUR ROBOT</span><div className="robot-picker" role="group" aria-label="Choose your robot">{ROBOTS.map(model=><button type="button" key={model.id} aria-pressed={robot===model.id} disabled={busy||!!session} className={robot===model.id?'selected':''} onClick={()=>setRobot(model.id)}><RobotBadge model={model}/><b>{model.name}</b><small>{model.description}</small></button>)}</div><p className="hint">Same stats. Four very different ways to fall over.</p><form onSubmit={enter}><label htmlFor="name">RACER NAME</label><input id="name" value={name} onChange={e=>setName(e.target.value)} maxLength={18} required placeholder="e.g. Big Jimster" autoComplete="nickname"/>{mode==='join'&&<><label htmlFor="code">ROOM CODE</label><input id="code" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} maxLength={6} minLength={6} required placeholder="ABC234"/></>}<button className="primary" disabled={busy||!!session}>{busy?'Starting your circuits…':session?'Reconnecting…':mode==='solo'?'Start solo practice':mode==='create'?'Create multiplayer room':'Join the race'}<ArrowRight size={18}/></button></form><p className="hint">{mode==='solo'?'One robot. No second tab needed. Same race, room to learn.':mode==='create'?'Invite up to three friends using your room code.':'Use the code from your friend’s starting grid.'}</p>{session&&<button className="text-button" onClick={()=>void leave()}>Clear saved session</button>}<div className="controls-guide"><div><kbd>F</kbd><span><b>React on green</b><small>Red means wait. Green means go.</small></span></div><div><kbd>SPACE</kbd><span><b>Jump the hurdle</b><small>Jump when the ring at your hurdle’s feet turns green.</small></span></div></div></>:<>
   <div className="room-heading"><div><span className="label">{room.solo?'JUST YOU AND THE ROAD':'ROOM CODE'}</span><h2>{room.solo?'Solo practice':room.code}</h2></div>{!room.solo&&<button className="icon-button" aria-label={copied?'Room code copied':'Copy room code'} title={copied?'Room code copied':'Copy room code'} onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>}</button>}</div>
   <p className="track-status">TRACK · <strong>{trackModel(room.track).name}</strong></p>
   {me?.eliminated&&phase!=='finished'?<><span className="eyebrow">3 TRIPS. TOTAL MALFUNCTION.</span><h3>Your robot blew up!</h3><p>{missHint} You’re spectating. The remaining robots are still racing. A rematch gives you a fresh robot.</p></>:phase==='lobby'?<><h3>Meet at the starting line.</h3><p>Share this code with your friends. Start when everyone has joined.</p><button className="primary" disabled={room.players.length<2&&!room.solo} onClick={()=>action({action:'start'})}>{room.players.length<2&&!room.solo?'Waiting for player two…':'Start the race'}<Flag size={18}/></button></>:phase==='race'?<>
    <div className="step-title"><span className="label">{reacting?'BOOST / REACT':`HURDLE ${r.hurdle} OF 3`}</span><span className="countdown">{reacting?now<r.start?'READY':go?'GO':reaction!=null?'SET':'WAIT':`${seconds}s`}</span></div>
    <h3>{reacting?(reaction!=null?(early?'A little too eager.':slow?'A little too late.':'Nice reflexes.'):'Wait for green.'):(jump!=null?'Jump committed.':'Eyes on the hurdle.')}</h3>
    <p>{reacting?(early?'No boost this time. You can still nail the jump.':slow?`${Math.round(reactionState.ms!)}ms reaction. No boost this time; you can still nail the jump.`:reaction!=null?`${Math.max(0,Math.round(reaction-r.green))}ms reaction. Land the jump to earn your boost.`:'Press F on green. After the boost window closes, get ready for the hurdle.'):'Hurdles arrive faster now. Watch your hurdle and press Space when its ring turns green.'}</p>
    <div className={`traffic-lights ${go?'green':''}`} aria-label={go?'Green, go':'Red, wait'}>{[0,1,2].map(i=><span key={i} className={reacting&&now>=r.start+i*700?'lit':''}/>)}<span className={go?'lit go-light':''}/></div>
    <button className={`primary action-button ${go?'go-button':''}`} disabled={!reacting||reaction!=null||now<r.start||now>boostEnd(r)} onPointerDown={e=>{e.preventDefault();play('react');}} onClick={()=>play('react')}><kbd>F</kbd>{reaction!=null?early?'FALSE START':slow?'TOO SLOW':'REACTION LOCKED':go?'GO! BOOST':'WAIT FOR GREEN'}</button>
    <button className="secondary action-button" disabled={!jumping||jump!=null||now>r.contact} onPointerDown={e=>{e.preventDefault();play('jump');}} onClick={()=>play('jump')}><kbd>SPACE</kbd>{jump!=null?'JUMP LOCKED':'JUMP'}</button>
   </>:phase==='results'?<div className="round-result"><span className="label">HURDLE {room.hurdle} / 3 RESULT</span><h3>{result?.quality==='perfect'?'Beautifully unsteady.':result?.quality==='good'?'Hurdle handled.':'Gravity: 1. Robot: 0.'}</h3><div className="gain">+{result?.gain||0}<small>m</small></div><p>{result?.quality==='miss'?`${missHint} Jump when the ring at your hurdle’s feet turns green.`:`${result?.quality==='perfect'?'Perfect':'Good'} jump${result?.boost?` + ${result.boost}m reaction boost`:''}.`}</p><span className="label">{room.hurdle<3?'NEXT HURDLE INCOMING':Math.max(...room.players.map((p:any)=>p.distance))>=60?'FINISH LINE AHEAD':'NEXT ROUND INCOMING'}</span></div>:<><span className="label">{crossed?'FINAL STANDINGS':'FINISHING THE RACE'}</span><h3>{crossed?(!room.winners.length?'Nobody survived!':room.winners.includes(session?.id)?'You won the wobble!':'That’s a wrap.'):me?.eliminated?'Your circuits are toast.':'Run it through the line.'}</h3>{crossed&&<><p>{room.winners.length?`${room.players.filter((p:any)=>room.winners.includes(p.id)).map((p:any)=>p.name).join(' & ')} ${room.winners.length>1?'share the win.':'takes the win.'}`:'Everyone blew up. Try to keep your bolts together next time.'}</p>{room.winners.length>0&&<><button className="secondary" onClick={replayVictory}>Replay victory routine<RotateCcw size={16}/></button><p className="hint">Backflip. Roundhouse. Zero dignity. {audio.muted?'Sounds muted.':'Original 8-bit victory sounds.'}</p></>}</>}<button className="primary" onClick={()=>action({action:'rematch'})}>Race again<RotateCcw size={18}/></button></>}
   {syncing&&<div role="status"><p className="hint">Results are taking longer than usual. Refresh to check the room.</p><button className="secondary" onClick={()=>action({action:'state'})}>Refresh race<RotateCcw size={16}/></button></div>}
   <div className="trip-counter" aria-label={`${me?.trips||0} of 3 trips`}><span>TRIPS</span>{[0,1,2].map(i=><i key={i} className={i<(me?.trips||0)?'used':''}>{i<(me?.trips||0)?'×':'○'}</i>)}<small>Third trip = BOOM</small></div><div className="standings"><span className="label">{room.solo?'YOUR PROGRESS':'THE STARTING GRID'}</span>{[...room.players].sort((a:any,b:any)=>Number(a.eliminated)-Number(b.eliminated)||b.distance-a.distance).map((p:any,i:number)=><div key={p.id}><span className="place">0{i+1}</span><i style={{background:p.color}}/><strong>{p.name}{p.id===session?.id&&<small> YOU</small>}</strong><span>{p.eliminated?'💥 OUT':`${p.distance}m · ${p.trips||0}/3 trips`}</span></div>)}</div>
   <button className="text-button" onClick={()=>void leave()}><LogOut size={13}/> Leave {room.solo?'practice':'room'}</button></>}
   {error&&<div className="error" role="alert">{error}</div>}
  </aside></div>
  <footer><span>BUILT FOR FRIENDS. NOT FOR BALANCE.</span><button onClick={()=>setRules(true)}>Rules & scoring <ArrowRight size={14}/></button></footer>
  {rules&&<div className="modal-backdrop" onClick={()=>setRules(false)}><section className="rules-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={e=>e.stopPropagation()}><span className="eyebrow">THE WOBBLE CODE</span><h2>Two buttons. All skill.</h2><ol><li>Practice solo, or host a room for 2–4 players on separate devices. Share the six-character code. For practice or hosting, choose Sunset Circuit, Heck Highway, Heaven Express or Rainbow Road. The host’s course is shared by every racer and stays selected for rematches. Roads bend automatically; watch the ring at your hurdle’s feet. Choose one of four robot models before joining; all have identical gameplay stats. Any player can start.</li><li>Each round has three hurdles. Every player gets different hurdle positions and boost timings, with the same pace and number of chances. The hurdles follow this repeating order across rounds: Trump → Elon → Zuckerberg → Altman → Jensen Huang → Dario. All use the same timing rules. Every second hurdle has a boost opportunity. Boost windows close before the hurdle begins approaching, followed by a short randomized gap. A distant preview gives you time to spot it. Boost first, then jump. Hurdles approach in 0.9–2.3 seconds as the pace rises. Wait through the red lights. Press <b>F</b> on green: within 300ms earns a 5m boost; within 700ms earns 3m. Early or slower reactions earn no boost.</li><li>Watch the approaching hurdle. Press <b>Space</b> once when the ground ring at your hurdle’s feet turns green. The ring starts grey and follows the approaching obstacle. Green means a jump now will clear it. The ideal takeoff is {JUMP_LEAD}ms before the hurdle reaches your feet.</li><li>A perfect jump (within {PERFECT}ms of ideal) earns 20m; any other jump that clears the hurdle earns 10m. A miss earns zero and counts as one trip. At {MAX_TRIPS} trips total your robot explodes and you spectate. Successful jumps do not erase trips. The last surviving robot wins multiplayer; if everyone explodes, there is no winner. Reaction boosts count only if you land the jump.</li><li>The pace increases after every boost stage and every hurdle, even if you miss or press nothing. Road movement, running and hurdle approach get faster for everyone. A new race resets the speed. A successful green reaction triggers the arms-back sprint; early or missed reactions do not.</li><li>When someone reaches 60m, the round finishes and the highest distance wins. Ties share victory and the backflip-roundhouse celebration. Original 8-bit arcade music plays during the race, with jump and stumble effects. Use the sound button to mute all music and sounds. After 10 rounds, highest distance wins even if no one reaches 60m.</li></ol><p>Use the on-screen buttons on a phone. One reaction per boost opportunity and one jump per hurdle. Rooms expire after six hours. Leaving fewer than two players resets multiplayer to the lobby.</p><button className="primary" onClick={()=>setRules(false)}>Got it. Let’s run.<Check size={18}/></button></section></div>}
 </main>;
}
