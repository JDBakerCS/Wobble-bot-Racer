const rainbow=['#f56883','#f6b559','#e7e678','#6cceaf','#70b4e7','#a691e5'];
type TrackBadgeModel = {id:string;sky:string[];ground:string;road:string;edge:string[]};
export default function TrackBadge({track}:{track:TrackBadgeModel}){
 return <svg viewBox="0 0 180 76" aria-hidden="true">
  <rect width="180" height="76" fill={track.sky[1]}/>
  <rect y="42" width="180" height="34" fill={track.ground}/>
  {track.id==='sunset'&&<><circle cx="90" cy="28" r="17" fill="#ffca8b"/><path d="M0 48 30 30 57 45 75 35 110 46 140 28 180 46" fill="#302d58"/></>}
  {track.id==='heck'&&<><path d="M0 48 30 12 66 48 115 16 155 48 180 30V76H0" fill="#3b2032"/><path d="m30 12-8 24 9-8 12 13-9-25M115 16l-7 21 10-6 13 14-13-25" fill="#ff9a50"/><path d="M0 61q20-11 42 0t42 0M150 58l30 10" fill="none" stroke="#ffb553" strokeWidth="5"/></>}
  {track.id==='heaven'&&<><g fill="#eef8f8"><ellipse cx="32" cy="35" rx="33" ry="11"/><circle cx="30" cy="27" r="13"/><ellipse cx="150" cy="35" rx="34" ry="12"/><circle cx="151" cy="26" r="14"/></g><path d="M56 45V24q0-16 13-16t13 16v21M98 45V24q0-16 13-16t13 16v21" fill="none" stroke="#ffe6a2" strokeWidth="4"/></>}
  {track.id==='kart'&&<><g fill="#fff1c7"><path d="m23 12 2 5 5 1-4 3 1 6-4-3-5 3 1-6-4-3 6-1zM153 13l2 5 5 1-4 3 1 6-4-3-5 3 1-6-4-3 6-1z"/></g>{rainbow.map((color,i)=><path key={color} d={`M${54+i*5} 44a${36-i*5} ${36-i*5} 0 0 1 ${72-i*10} 0`} fill="none" stroke={color} strokeWidth="5"/>)}</>}
  <path d="M79 43h22l46 33H33z" fill={track.road}/>
  {track.id==='kart'&&rainbow.map((color,i)=><path key={color} d={`M${79+i*22/6} 43h${22/6}L${33+(i+1)*114/6} 76H${33+i*114/6}z`} fill={color} opacity=".7"/>)}
  <path d="m79 43-46 33m68 0-11-33m11 0 46 33" fill="none" stroke={track.edge[0]} strokeWidth="2"/>
 </svg>;
}
