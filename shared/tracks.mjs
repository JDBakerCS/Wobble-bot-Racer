export const DEFAULT_TRACK='sunset';
export const TRACKS=[
 {id:'sunset',name:'Sunset Circuit',description:'The original sunset sprint.',sky:['#201c49','#735276','#edaa86'],ground:'#384653',road:'#303444',edge:['#e9e4cc','#bb7287'],lane:'#8b9295'},
 {id:'heck',name:'Heck Highway',description:'Lava. Loose bolts. No refunds.',sky:['#210f30','#6f2039','#ff8d49'],ground:'#622734',road:'#2e222d',edge:['#ffb553','#a53f43'],lane:'#d27e63'},
 {id:'heaven',name:'Heaven Express',description:'Cloud nine. Questionable landings.',sky:['#415e9d','#94cbe4','#f5e9d1'],ground:'#a5c8df',road:'#526d91',edge:['#fff4c7','#d6b561'],lane:'#c5e7ed'},
 {id:'kart',name:'Rainbow Road',description:'A rainbow ribbon through outer space.',sky:['#20154c','#3f398e','#97b9e6'],ground:'#191332',road:'#36305e',edge:['#ffffff','#3c2866'],lane:'#d7d2ff'}
];
export const trackModel=id=>TRACKS.find(track=>track.id===id)||TRACKS[0];
export function validateTrack(id=DEFAULT_TRACK){
 if(!TRACKS.some(track=>track.id===id))throw Error('Choose one of the four tracks.');
 return id;
}
