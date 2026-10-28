export const ROBOTS=[
 {id:'optimus',name:'Opti-Mist',description:'Tall. Polished. Questionable balance.',shell:'#e9ece8',dark:'#1b2531',shoes:'#e9ece8',width:.86,height:1.12,cadence:.92,round:16,antenna:false},
 {id:'pocket',name:'Pocket Rocket',description:'Short legs. Maximum panic.',shell:'#8e9da6',dark:'#202a35',shoes:'#f4d273',width:1.03,height:.78,cadence:1.2,round:12,antenna:false},
 {id:'strider',name:'Track Star',description:'Long strides. Loose bolts.',shell:'#e0e7e6',dark:'#31404b',shoes:'#fff0d7',width:.78,height:1.02,cadence:1.05,round:10,antenna:false},
 {id:'scrapper',name:'Crash Test',description:'Built tough. Lands creatively.',shell:'#e47b74',dark:'#303b49',shoes:'#b5c4cc',width:1.15,height:.95,cadence:.96,round:3,antenna:true}
];
export const DEFAULT_ROBOT='optimus';
export const robotModel=id=>ROBOTS.find(model=>model.id===id)||ROBOTS[0];
