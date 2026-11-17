import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ObjectGlyph } from './Objects';
import type { ObjectTarget } from '../core/hiddenObject/HiddenObjectEngine';
import type { Location } from '../data/story/chapter';

export const sceneWidth = 360;
export const sceneHeight = 480;
const sequence = (n: number) => Array.from({length:n}, (_, i) => i);

function Crate({ x, y, w = 82, h = 60 }: { x:number; y:number; w?:number; h?:number }) {
  return <G transform={`translate(${x} ${y}) scale(${w/82} ${h/60})`}>
    <Ellipse cx="40" cy="61" rx="45" ry="7" fill="#1b211d" opacity=".45"/>
    <Path d="M0 7l12-7h70l-12 7v53H0z" fill="#7e5c44" stroke="#4a392f" strokeWidth="2"/>
    <Path d="M70 7l12-7v49l-12 11z" fill="#604838"/>
    <Path d="M4 14h61m-61 13h61m-61 13h61m-61 13h61" stroke="#a67a55" strokeWidth="2" opacity=".7"/>
    <Path d="M7 55L63 11M7 9v46m56-46v46" stroke="#98704e" strokeWidth="5"/>
    <Path d="M12 51l48-38" stroke="#bd8a62" opacity=".6"/>
  </G>;
}

function Window({ x, y, w = 96, h = 122, night = false }: { x:number; y:number; w?:number; h?:number; night?:boolean }) {
  return <G transform={`translate(${x} ${y}) scale(${w/96} ${h/122})`}>
    <Rect x="-7" y="-6" width="110" height="136" rx="2" fill="#352b24" opacity=".55"/>
    <Rect width="96" height="122" fill={night ? '#304849' : 'url(#sky)'} stroke="#ac9b74" strokeWidth="6"/>
    <Path d="M3 60q23-18 44-10t46 0v32H3z" fill={night ? '#354e4c' : '#78918a'}/>
    <Path d="M3 84q22-8 43-3t47-7v44H3z" fill={night ? '#436361' : '#a9b6a2'}/>
    <Path d="M4 90q21-7 44-2t44-4M9 99l21-1m34-1 17-2m-62 15h34" fill="none" stroke="#d4cbb1" opacity=".65"/>
    <Path d="M48 1v120M2 60h92" stroke="#766950" strokeWidth="5"/>
    <Path d="M-9 126h115" stroke="#c3a77b" strokeWidth="7" strokeLinecap="round"/>
  </G>;
}

function Table({ x, y, w, h }: { x:number; y:number; w:number; h:number }) {
  return <G transform={`translate(${x} ${y}) scale(${w / 240} ${h / 100})`}>
    <Ellipse cx="120" cy="95" rx="112" ry="14" fill="#202220" opacity=".35"/>
    <Path d="M22 37h10l-4 58H16zm185 0h10l7 58h-12z" fill="#6a4d39" stroke="#4a382e" strokeWidth="2"/>
    <Path d="M22 1h196l22 34-12 13H10L0 35z" fill="url(#wood)" stroke="#73543e" strokeWidth="2"/>
    <Path d="M0 35h240M11 29h218M17 18h205M22 8h195" stroke="#bc9062" strokeWidth="2" opacity=".7"/>
    <Path d="M10 42h219" stroke="#503c32" strokeWidth="4" opacity=".55"/>
  </G>;
}

function Prop({ id, x, y, size, angle = 0 }: { id:ObjectTarget['id']; x:number; y:number; size:number; angle?:number }) {
  return <G transform={`translate(${x} ${y}) rotate(${angle}) scale(${size/50}) translate(-25 -25)`}>
    <Ellipse cx="26" cy="41" rx="19" ry="4" fill="#1d211e" opacity=".35"/>
    <ObjectGlyph id={id}/>
  </G>;
}

function Landscape({ shore, lit, cleared, opened, figure }: {shore:boolean; lit:boolean; cleared:boolean; opened:boolean; figure:boolean}) {
  return <>
    <Rect width="360" height="480" fill="url(#sky)"/>
    <Circle cx="245" cy="109" r="58" fill="#f1d6a2" opacity=".35"/>
    <Path d="M0 163Q42 114 92 143t101 3 72-3 95 11v110H0z" fill="#728984"/>
    <Path d="M0 183q76-39 139-19t94-8 127 9v117H0z" fill="#8f9e90"/>
    {sequence(27).map(i => <Path key={i} d={`M${i*14} ${175+i%4*6}l${(i%4+1)*4} ${-18-i%5*5}l12 26z`} fill={i%3 ? '#6f8278' : '#687a70'} opacity=".61"/>)}
    <Path d="M0 213q73-25 168-16t192-19v170H0z" fill="url(#water)"/>
    {sequence(26).map(i => <Path key={i} d={`M${(i*47)%360} ${202+i*5}h${15+i*2}`} stroke="#e3d3ad" strokeWidth={i%3+1} opacity=".36" strokeLinecap="round"/>)}
    <Path d={shore ? 'M0 315q56-23 108-7t126 10 126 17v145H0z' : 'M0 248q76-27 145 19t215 45v168H0z'} fill="url(#earth)"/>
    <Path d="M127 480q45-101 106-145l36-21-17 30q-60 72-57 136z" fill="#a38d67" opacity=".8"/>
    {!shore && <G>
      <Path d="M21 249V127l61-56 148 46v135z" fill="#624d3f" stroke="#42382e" strokeWidth="3"/>
      <Path d="M230 117l91 28v107h-91z" fill="#524a3e"/>
      <Path d="M6 132L80 64l159 42 86 30-6 12-92-20L81 87l-67 56z" fill="#414c4a" stroke="#65716a" strokeWidth="3"/>
      {sequence(9).map(i => <Path key={i} d={`M23 ${145+i*12}h300`} stroke="#8d7152" opacity=".45" strokeWidth="2"/>)}
      <Rect x="44" y="151" width="63" height="63" rx="2" fill={lit ? '#e2a34e' : '#3f5d5a'} stroke="#849084" strokeWidth="8"/>
      {lit && <Ellipse cx="74" cy="183" rx="59" ry="64" fill="url(#glow)"/>}
      <Path d="M75 151v62m-32-32h65" stroke="#9b9a7e" strokeWidth="4"/>
      <Rect x="143" y="148" width="53" height="106" fill={opened ? '#292a23' : '#876748'} stroke="#4d3d31" strokeWidth="5"/>
      {opened ? <Path d="M145 148l25 18v90l-25-5z" fill="#8d6949"/> : <Path d="M154 150v100m13-100v100m13-100v100" stroke="#695039" strokeWidth="2"/>}
      <Circle cx={opened ? 163 : 185} cy="208" r="3.5" fill="#c8af78"/>
      <Path d="M135 251h72v8h-72zm-6 9h86v8h-86zm-8 9h106v8H121z" fill="#785d45" stroke="#b28d61" strokeWidth="2"/>
    </G>}
    {shore && <G>
      <Path d="M56 342l178-17-43-58-80 4z" fill="#74614b" stroke="#4e493b" strokeWidth="3"/>
      {sequence(7).map(i => <Path key={i} d={`M${110-i*8} ${277+i*9}l${84+i*10} ${-5-i*2}`} stroke="#ad9771" strokeWidth="2"/>)}
      <Path d="M105 299v-48m95 43v-49m34 85v-54m-170 67v-54" stroke="#554839" strokeWidth="8"/>
      {!opened && <Path d="M65 304l45-29m92-1 31 20M66 306l164-12" stroke="#8b7653" strokeWidth="5"/>}
      {figure && <G fill="#303d3d" opacity=".85"><Circle cx="181" cy="237" r="9"/><Path d="M169 245h22l10 49h-39zM170 284h8v25h-8zm14 0h8v25h-8z"/></G>}
    </G>}
    {sequence(58).map(i => <Ellipse key={i} cx={(i*67)%360} cy={345+(i*31)%135} rx={3+i%6} ry={1+i%3} fill={['#c9934c','#aa6c43','#d5a863','#57654b'][i%4]} opacity=".7" rotation={i*29} originX={(i*67)%360} originY={345+(i*31)%135}/>)}
    {!cleared && !shore && <G><Crate x={28} y={310} w={92} h={53}/><Path d="M71 381l109-30m-55 38 85-27" stroke="#7b6048" strokeWidth="11"/><Path d="M73 377l109-30m-57 38 85-27" stroke="#a2835d" strokeWidth="3"/></G>}
    <Path d="M0 0h19l14 98-8 85 7 119-23 91 8-145-5-115z" fill="#5e5645"/>
    <Path d="M12 150l52-83 58-26M19 116L67 23 99 0M20 163l43-32 61-14" fill="none" stroke="#675941" strokeWidth="7"/>
    {sequence(52).map(i => <Ellipse key={i} cx={(i*41)%146} cy={(i*29)%106} rx={8+i%9} ry={3+i%5} fill={['#c78741','#a27646','#d7a257','#8f704b'][i%4]} opacity=".72" rotation={i*12} originX={(i*41)%146} originY={(i*29)%106}/>)}
  </>;
}

function Interior({ location, lit, radio }: {location:Location; lit:boolean; radio:boolean}) {
  const attic = location === 'attic';
  const dock = location === 'dock';
  const hall = location === 'hall';
  return <>
    <Rect width="360" height="480" fill="url(#wall)"/>
    <Rect y="302" width="360" height="178" fill="url(#wood)"/>
    {sequence(14).map(i => <Path key={i} d={`M${i*35-64} 480L${96+i*13} 302`} stroke="#684f3b" strokeWidth="1.7" opacity=".62"/>)}
    {sequence(15).map(i => <G key={i}><Path d={`M0 ${i*22+9}h360`} stroke="#655244" strokeWidth="2" opacity=".54"/><Path d={`M0 ${i*22+12}h360`} stroke="#bb9b73" opacity=".43"/></G>)}
    <Path d="M0 302h360" stroke="#6c5646" strokeWidth="8"/>
    {attic ? <G>
      <Path d="M0 0h360v210L180 50 0 207z" fill="#534a3e"/>
      <Path d="M-10 202L181 46l191 156M180 40v259M14 146h331" fill="none" stroke="#8c7256" strokeWidth="15"/>
      <Path d="M27 140L180 13l158 121M175 52v242" fill="none" stroke="#bb9770" strokeWidth="2" opacity=".6"/>
      <Window x={128} y={101} w={52} h={69}/>
      <Path d="M131 168l-48 169h212l-116-169z" fill="#e1c99b" opacity=".13"/>
      <Crate x={18} y={269} w={105} h={81}/><Crate x={236} y={295} w={100} h={91}/>
      <Table x={43} y={220} w={280} h={105}/>
      <Crate x={52} y={367} w={122} h={72}/>
      <Path d="M166 333q50-13 82 2l-13 32h-81z" fill="#695b4a" stroke="#a98b62" strokeWidth="3"/>
      <Path d="M301 30v120l59 34m-25-70v54m-19-93v82m-15-35l59 36" fill="none" stroke="#d2c3a2" opacity=".42"/>
      {sequence(8).map(i => <Circle key={i} cx={104+i*25} cy={169+(i*19)%201} r={1+i%3} fill="#e0c89c" opacity=".55"/>)}
    </G> : hall ? <G>
      <Window x={247} y={56} w={77} h={125} night={!lit}/>
      <Path d="M35 310V50h115v260z" fill="#68503e" stroke="#ad8d64" strokeWidth="7"/>
      <Path d="M53 70h79v79H53zm0 96h79v121H53z" fill="#755740" stroke="#8d6b4d" strokeWidth="5"/>
      <Circle cx="126" cy="164" r="5" fill="#cca369"/>
      <Path d="M189 77v191m-15-177h61m-21 0q-7 26-13 42l23 57h31l-18-55-4-44z" fill="#6c7460" stroke="#514d3e" strokeWidth="3"/>
      <Path d="M163 355l152-1 28 85H134z" fill="#76534c" stroke="#c1936a" strokeWidth="4"/>
      <Path d="M155 416h169m-160-17h153m-147-18h140" stroke="#ac785f" strokeWidth="2" opacity=".68"/>
      <Crate x={246} y={268} w={91} h={61}/>
    </G> : dock ? <G>
      <Window x={118} y={61} w={133} h={126}/>
      <Path d="M13 136h87m-77 2v83m27-82v59m23-61v91m204-145v142m23-149v131m23-114v144" stroke="#584e3d" strokeWidth="4"/>
      <Path d="M266 83h70m-61 2l56 120m-44-118 37 94m-51-41 57-10m-48 36 52-12m-39 44 39-9" stroke="#ae9674" fill="none" strokeWidth="1.2" opacity=".83"/>
      <Path d="M28 309q-18 73 22 108t50-11q-10 61-64 40-37-13-32-100z" fill="#50493a" stroke="#a98560" strokeWidth="3"/>
      <Table x={40} y={226} w={273} h={122}/>
      <Crate x={93} y={348} w={100} h={68}/><Crate x={233} y={343} w={105} h={72}/>
      <Path d="M14 264h74M276 241h74" stroke="#ac8860" strokeWidth="6"/>
      <Prop id="compass" x={202} y={278} size={34}/><Prop id="lamp" x={28} y={248} size={45}/><Prop id="notebook" x={218} y={317} size={37} angle={-18}/>
    </G> : <G>
      <Window x={118} y={42} w={117} h={140} night={!lit}/>
      <Path d="M103 35h152l-14 31-5 46-12-5 4-48H130l3 51-17 6-6-49z" fill="#d4b28a" opacity=".72"/>
      <Path d="M17 199h327v13H17zM22 212h316v81H22z" fill="#715742" stroke="#a98259" strokeWidth="3"/>
      {sequence(5).map(i => <G key={i}><Rect x={30+i*61} y="223" width="51" height="59" rx="3" fill="#86684c" stroke="#a48762" strokeWidth="2"/><Circle cx={67+i*61} cy="251" r="3" fill="#c29a61"/></G>)}
      <Path d="M280 148h68v8h-68m-6-25h71v7h-71" stroke="#8c694c" strokeWidth="5"/>
      <Path d="M253 194v-35c2-19 29-15 29-1v10h-16v27" fill="none" stroke="#a79778" strokeWidth="5"/>
      <Path d="M29 200v-22h27v22m7 0v-30h23v30m20 0v-24h46v24" fill="#c1a27a" stroke="#8b7055" strokeWidth="2"/>
      <Path d="M8 314q47-21 82-8l24 140H14z" fill="#7e6750" stroke="#ad8d66" strokeWidth="4"/>
      <Table x={76} y={335} w={234} h={132}/>
      <Path d="M163 343h62l10 43-18 20h-52l-11-19z" fill="#b5856d" opacity=".83"/>
      <Path d="M166 352h56m-58 10h61m-64 10h66m-70 10h70" stroke="#d1aa84" strokeWidth="2" opacity=".62"/>
      <Ellipse cx="147" cy="355" rx="29" ry="13" fill="#b3b5a0" stroke="#888d7f" strokeWidth="3"/>
      <Ellipse cx="149" cy="354" rx="19" ry="8" fill="#c5c6af"/>
      <Crate x={269} y={402} w={73} h={52}/>
      <G transform="translate(284 169)"><Rect width="53" height="28" rx="3" fill="#5b4636" stroke="#997b56" strokeWidth="2"/><Rect x="5" y="6" width="23" height="15" fill="#82725a"/><Path d="M6 9h21m-21 4h21m-21 4h21" stroke="#393631"/><Rect x="32" y="7" width="15" height="5" fill={radio ? '#ffc579' : '#8f9c74'}/><Circle cx="40" cy="20" r="4" fill="#baa17b"/></G>
    </G>}
    <Rect width="360" height="480" fill="url(#roomLight)" opacity={lit ? ".64" : ".25"}/>
  </>;
}

export function Scene({ location, lit = true, cleared = false, opened = false, figure = false, radio = false,
  targets = [], found = [], hint, width = '100%', height = '100%' }: {
  location:Location; lit?:boolean; cleared?:boolean; opened?:boolean; figure?:boolean; radio?:boolean;
  targets?:ObjectTarget[]; found?:string[]; hint?:string; width?:number | string; height?:number | string;
}) {
  return <Svg width={width} height={height} viewBox="0 0 360 480" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#849a98"/><Stop offset=".66" stopColor="#e5c99c"/><Stop offset="1" stopColor="#f2d8af"/></LinearGradient>
      <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#a9b5a5"/><Stop offset="1" stopColor="#587d7c"/></LinearGradient>
      <LinearGradient id="earth" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#77755b"/><Stop offset="1" stopColor="#655c43"/></LinearGradient>
      <LinearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#7b7461"/><Stop offset=".6" stopColor="#a38a6b"/><Stop offset="1" stopColor="#635d4e"/></LinearGradient>
      <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#a6805d"/><Stop offset=".53" stopColor="#8c6b51"/><Stop offset="1" stopColor="#6e5645"/></LinearGradient>
      <RadialGradient id="glow"><Stop stopColor="#ffd889" stopOpacity=".7"/><Stop offset="1" stopColor="#ffc46b" stopOpacity="0"/></RadialGradient>
      <RadialGradient id="roomLight" cx=".49" cy=".3" r=".8"><Stop stopColor="#ffde9e" stopOpacity=".32"/><Stop offset=".6" stopColor="#ffd89b" stopOpacity="0"/><Stop offset="1" stopColor="#242e2b" stopOpacity=".35"/></RadialGradient>
    </Defs>
    {location === 'yard' || location === 'shore' ?
      <Landscape shore={location === 'shore'} lit={lit} cleared={cleared} opened={opened} figure={figure}/> :
      <Interior location={location} lit={lit} radio={radio}/>}
    {targets.map(item => <G key={item.id} opacity={found.includes(item.id) ? .48 : 1}>
      <Prop id={item.id} x={item.x} y={item.y} size={item.size} angle={item.angle}/>
      {(hint === item.id || found.includes(item.id)) && <Circle cx={item.x} cy={item.y} r={item.radius} fill={hint === item.id ? '#ffe2a1' : '#acdac9'} fillOpacity=".16" stroke={hint === item.id ? '#ffe8aa' : '#a9eed2'} strokeWidth={hint === item.id ? 3 : 1.8} strokeDasharray={hint === item.id ? '4 3' : undefined}/>}
    </G>)}
  </Svg>;
}
