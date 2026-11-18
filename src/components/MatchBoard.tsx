import React, { memo, useLayoutEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { gems, specialArt } from '../assets/gameArt';
import type { Block, Board, Burst, Config, Frame, Tile } from '../core/match3/Match3Engine';

export const blockLabels: Record<Block,string> = {
  crate:'Ящик', web:'Паутина', glass:'Лёд', lock:'Замок', stone:'Камень', dirt:'Грязь',
  fog:'Туман', chain:'Цепь', cover:'Закрытая клетка', generator:'Генератор', switch:'Механизм',bramble:'Колючки',dry:'Сухая земля'
};
const gemNames = ['Ключ','Фонарь','Капля','Лист','Радиодеталь','Кристалл'];
export const flightTimes = { swap:155, fall:265, clear:190, shuffle:200 };
const ids = new WeakMap<Tile,number>();
let identity = 0;
function tileKey(tile: Tile) {
  const id = ids.get(tile);
  if (id !== undefined) return id;
  ids.set(tile,++identity);
  return identity;
}

export type Drag = { index:SharedValue<number>; x:SharedValue<number>; y:SharedValue<number> };
export function MatchBoard({board, config, size, frame, epoch, selected, hint, drag, still, low, gesture, onCell}: {
  board:Board; config:Config; size:number; frame?:Frame; epoch:number; selected?:number; hint?:[number,number];
  drag:Drag; still:boolean; low:boolean; gesture:React.ComponentProps<typeof GestureDetector>['gesture']; onCell:(i:number)=>void;
}) {
  const {width,height} = config;
  const shake = useSharedValue(0);
  useLayoutEffect(() => {
    if (still || !frame?.bursts?.some(burst => burst.effect.includes('bomb') || burst.effect === 'super' || burst.effect === 'sphere-pair')) return;
    shake.value=withSequence(withTiming(-4,{duration:28}),withTiming(4,{duration:42}),withTiming(-2,{duration:36}),withTiming(0,{duration:53}));
  },[epoch,frame,shake,still]);
  const frameStyle=useAnimatedStyle(()=>({transform:[{translateX:shake.value}]}));
  const hit = new Set(frame?.hit);
  return <Animated.View style={[styles.outer,frameStyle]}><GestureDetector gesture={gesture}>
    <View style={[styles.field,{width:width*size,height:height*size}]}>
      {board.map((cell,i) => {
        if (cell.hole) return null;
        const x = i%width*size, y = Math.floor(i/width)*size;
        const art = cell.tile;
        const marked = selected===i || !!hint?.includes(i);
        const label = cell.block ? blockLabels[cell.block] : art && 'color' in art ? gemNames[art.color] : 'Предмет для доставки';
        const track = config.conveyor?.some(([col,row])=>row*width+col===i);
        const portal = config.portals?.some(pair=>pair.some(([col,row])=>row*width+col===i));
        const exit = config.exits?.some(([col,row])=>row*width+col===i);
        return <View key={i} accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:marked}}
          accessibilityActions={[{name:'activate'}]} onAccessibilityAction={()=>onCell(i)}
          style={[styles.slot,{width:size-1,height:size-1,left:x,top:y},i%2===0 && styles.even,marked && styles.marked,
            track && styles.track,portal && styles.portal,exit && styles.exit]}>
          {(track || portal || exit) && <View style={[styles.mark,portal && styles.portalMark]}/>}
        </View>;
      })}
      {board.map((cell,i) => cell.tile && !['crate','stone','cover','generator','bramble'].includes(cell.block ?? '') ?
        <Sprite key={tileKey(cell.tile)} tile={cell.tile} index={i} x={i%width*size} y={Math.floor(i/width)*size}
          size={size} kind={frame?.kind} hit={hit.has(i)} drag={drag} still={still}/> : null)}
      {board.map((cell,i) => cell.block ? <View key={i} pointerEvents="none" style={{position:'absolute',zIndex:5,left:i%width*size,top:Math.floor(i/width)*size}}>
        <Obstacle kind={cell.block} layers={cell.layers ?? 1} size={size}/>
      </View> : null)}
      {!still && frame?.kind === 'clear' && <View key={epoch} pointerEvents="none" style={[StyleSheet.absoluteFill,{zIndex:12}]}>
        {(frame.hit ?? []).slice(0,low?8:30).map((i,n)=><Flash key={i} x={i%width*size} y={Math.floor(i/width)*size} size={size} n={n}/>)}
        {frame.bursts?.slice(0,low?2:8).map((burst,i)=><Shock key={i} burst={burst} size={size} width={width} height={height}/>)}
      </View>}
    </View>
  </GestureDetector></Animated.View>;
}

const Sprite = memo(function Sprite({tile,index,x,y,size,kind,hit,drag,still}: {
  tile:Tile; index:number; x:number; y:number; size:number; kind?:Frame['kind']; hit:boolean; drag:Drag; still:boolean;
}) {
  const initial = useRef(true);
  const left = useSharedValue(x);
  const top = useSharedValue(y);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useLayoutEffect(()=>{
    const duration = still ? 0 : (kind === 'fall' ? flightTimes.fall : flightTimes.swap);
    if (initial.current && kind === 'fall' && !still) {
      top.value=y-size*1.6;
      opacity.value=.3;
    }
    initial.current=false;
    left.value=withTiming(x,{duration,easing:Easing.out(Easing.cubic)});
    if (kind==='fall' && !still && top.value!==y) {
      top.value=withSequence(withTiming(y+size*.055,{duration:Math.max(0,duration-65),easing:Easing.in(Easing.quad)}),
        withTiming(y-size*.032,{duration:28,easing:Easing.out(Easing.quad)}),withTiming(y,{duration:37}));
    } else top.value=withTiming(y,{duration,easing:Easing.out(Easing.cubic)});
    if (hit) {
      scale.value=still ? .72 : withSequence(withTiming(1.13,{duration:57}),withTiming(.48,{duration:111}));
      opacity.value=withTiming(.08,{duration:still ? 0 : 169});
    } else {
      scale.value=withTiming(1,{duration:still ? 0 : 125});
      opacity.value=withTiming(1,{duration:still ? 0 : 125});
    }
  },[hit,kind,left,opacity,scale,size,still,top,x,y]);
  const motion = useAnimatedStyle(()=>{
    const held = drag.index.value===index && !still;
    return {opacity:opacity.value,zIndex:held ? 10 : 2,
      transform:[{translateX:left.value+(held ? drag.x.value : 0)},{translateY:top.value+(held ? drag.y.value : 0)},{scale:scale.value*(held ? 1.085 : 1)}]};
  });
  const source = 'drop' in tile ? gems[0] : tile.special ? specialArt[tile.special] : gems[tile.color];
  return <Animated.View pointerEvents="none" style={[styles.sprite,{width:size,height:size},motion]}>
    {'drop' in tile && <View style={styles.delivery}/>}
    {'special' in tile && tile.special==='super' && <View style={styles.superRing}/>}
    <Image source={source} resizeMode="contain" fadeDuration={0} style={{width:size-2,height:size-2}}/>
  </Animated.View>;
},(prev,next)=>prev.x===next.x && prev.y===next.y && prev.size===next.size && prev.hit===next.hit && prev.still===next.still);

const obstacleFill: Record<Block,string> = {
  crate:'#764731', web:'#22292b', glass:'#2e7d9e', lock:'#5b4152', stone:'#55534a', dirt:'#623e30',
  fog:'#a4b6ae', chain:'#3e5056', cover:'#5c463c', generator:'#643c3a', switch:'#6d5834',bramble:'#46392b',dry:'#ab8052'
};
export const Obstacle = memo(function Obstacle({kind,layers,size}: {kind:Block;layers:number;size:number}) {
  const solid = ['crate','stone','cover','generator','bramble'].includes(kind);
  const base = obstacleFill[kind];
  return <Svg width={size-1} height={size-1} viewBox="0 0 48 48">
    <Defs><LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#f5da9b"/><Stop offset="1" stopColor="#7c502d"/></LinearGradient></Defs>
    <Rect x="2" y="2" width="44" height="44" rx="7" fill={base} fillOpacity={solid ? 1 : kind==='fog' ? '.55' : '.31'} stroke={solid ? '#a27652' : '#d4e4e1'} strokeOpacity=".8" strokeWidth="2"/>
    {kind==='crate' || kind==='cover' ? <G>
      <Path d="M4 13h40m-40 10h40m-40 11h40" stroke="#b9875a" strokeWidth="2"/>
      <Path d="M6 42L42 6M6 6h36v36H6z" stroke="url(#metal)" strokeWidth="4" fill="none"/>
    </G> : kind==='web' ? <Path d="M2 2l44 44M46 2L2 46M24 1v46M1 24h46m-12-12H12v24h24zM24 8l16 16-16 16L8 24z" fill="none" stroke="#e6e0cc" strokeWidth="1.4"/> :
      kind==='glass' ? <Path d="M5 29L30 4m-6 42 21-24M8 20l11 2 4 11 10 8M24 9l6 11 11 0" fill="none" stroke="#c9eeff" strokeWidth="2.4"/> :
      kind==='lock' || kind==='chain' ? <G stroke="url(#metal)" strokeWidth="3" fill="none">
        <Path d="M4 8l39 33M6 42L42 7" strokeDasharray="4 3"/><Rect x="17" y="19" width="15" height="13" rx="3" fill="#4b3533"/><Path d="M20 19v-3a4 4 0 0 1 8 0v3"/>
      </G> :
      kind==='stone' ? <Path d="M10 10l21-4 13 13-6 21-23 3L5 28zM10 10l15 14 19-5M25 24l-10 19" fill="#68685c" stroke="#b3aa91" strokeWidth="2"/> :
      kind==='bramble' ? <Path d="M4 39 43 10m-31 35 24-41M9 26l9-4-2-9m6 19 10 1 4-12m-24 13 4 8" stroke="#9cad56" strokeWidth="3.1" fill="none"/> :
      kind==='dry' ? <Path d="M6 8l15 14-2 19m2-19 14-5 7 10m-14-6 3-12M12 14l4-8m23 19-4 17" stroke="#f9d69d" strokeWidth="2.1" fill="none"/> :
      kind==='dirt' || kind==='fog' ? <Path d="M3 30q5-13 18-5 9 5 24-10m-38 20q7-5 13 0t20-4" stroke={kind==='fog'?'#e4fafa':'#c78e50'} opacity=".7" strokeWidth="3" fill="none"/> :
      <G stroke="url(#metal)" strokeWidth="3" fill="none"><Rect x="10" y="10" width="28" height="28" rx="7"/><Path d="M24 14l-5 12h9l-4 9" strokeWidth="3"/></G>}
    {layers>1 && <Rect x="36" y="34" width="6" height="6" rx="2" fill="#f9df9b"/>}
  </Svg>;
});

function Flash({x,y,size,n}:{x:number;y:number;size:number;n:number}) {
  const progress=useSharedValue(0);
  useLayoutEffect(()=>{progress.value=withTiming(1,{duration:flightTimes.clear,easing:Easing.out(Easing.cubic)});},[progress]);
  const flare=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{scale:.35+.95*progress.value}]}));
  const scatter=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{translateX:(n%2===0?1:-1)*size*.55*progress.value},
    {translateY:-size*.46*progress.value},{scale:1+progress.value*.4}]}));
  return <View style={{position:'absolute',left:x,top:y,width:size,height:size}}>
    <Animated.View style={[styles.flare,flare]}/>
    <Animated.View style={[styles.particle,scatter]}/>
  </View>;
}
function Shock({burst,size,width,height}:{burst:Burst;size:number;width:number;height:number}) {
  const progress=useSharedValue(0);
  useLayoutEffect(()=>{progress.value=withTiming(1,{duration:280,easing:Easing.out(Easing.cubic)});},[progress]);
  const glow=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{scale:.25+progress.value*1.32}]}));
  const rocket = burst.effect.includes('rocket');
  const horizontal=rocket && !burst.vertical;
  const radius = burst.effect==='sphere-pair' ? width*size*.5 : burst.effect==='super' ? size*3.4 : burst.effect==='bomb-pair' ? size*2.8 : size*1.7;
  const x=burst.at%width*size+size*.5, y=Math.floor(burst.at/width)*size+size*.5;
  const color = burst.effect.includes('sphere') ? '#ce90f2' : burst.effect.includes('bomb') ? '#ef984d' : '#ffedb0';
  return <>
    <Animated.View style={[styles.shock,{left:x-radius,top:y-radius,width:2*radius,height:2*radius,borderRadius:radius,borderColor:color},glow]}/>
    {horizontal && <Animated.View style={[styles.beam,{left:0,top:y-3,width:width*size,height:6,backgroundColor:color},glow]}/>}
    {rocket && (burst.vertical || burst.effect!=='rocket') && <Animated.View style={[styles.beam,{top:0,left:x-2,width:5,height:height*size,backgroundColor:color},glow]}/>}
  </>;
}

const styles=StyleSheet.create({
  outer:{alignSelf:'center',borderColor:'#d4ad72',borderWidth:2,borderRadius:17,padding:3,backgroundColor:'#232d40',elevation:9},
  field:{overflow:'hidden',borderRadius:10,backgroundColor:'#112434',position:'relative'},
  slot:{position:'absolute',backgroundColor:'#213748',borderRadius:5,borderColor:'#445566',borderWidth:1},
  even:{backgroundColor:'#294052'},marked:{backgroundColor:'#776342',borderWidth:2,borderColor:'#ffe2a1'},
  track:{borderBottomColor:'#aaa16b',borderBottomWidth:3},portal:{borderColor:'#b47cd2'},exit:{borderBottomColor:'#6dd5c1',borderBottomWidth:3},
  mark:{position:'absolute',bottom:2,left:'25%',width:'50%',height:2,backgroundColor:'#ffe1a54d'},
  portalMark:{backgroundColor:'#e6b5f9'},sprite:{position:'absolute',left:0,top:0,alignItems:'center',justifyContent:'center'},
  delivery:{position:'absolute',width:'75%',height:'75%',borderRadius:20,borderWidth:1,borderColor:'#f4ce7a',backgroundColor:'#f4ce7a36'},
  superRing:{position:'absolute',width:'86%',height:'86%',borderColor:'#ffd56c',borderWidth:2,borderRadius:20,backgroundColor:'#f5973c46'},
  flare:{...StyleSheet.absoluteFillObject,borderRadius:8,backgroundColor:'#ffce70a8'},
  particle:{position:'absolute',left:'47%',top:'46%',width:5,height:5,borderRadius:3,backgroundColor:'#fff2bf'},
  shock:{position:'absolute',borderWidth:3,backgroundColor:'#fff3a826'},
  beam:{position:'absolute',borderRadius:5},
});
