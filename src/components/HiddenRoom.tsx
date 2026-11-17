import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { roomArt, gems } from '../assets/gameArt';
import { ObjectGlyph } from '../assets/Objects';
import type { HiddenConfig, HiddenObjectEngine, Hotspot, ObjectArt } from '../core/hiddenObject/HiddenObjectEngine';

export function HiddenRoom({config,engine,width,height,highlight,found,still}:{
  config:HiddenConfig;engine:HiddenObjectEngine;width:number;height:number;highlight?:string;found:ObjectArt[];still:boolean;
}) {
  const closed=config.hotspots?.filter(spot=>!engine.snapshot().opened?.includes(spot.id));
  const coordinates=(x:number,y:number,size:number)=>({left:x*width/360-size/2,top:y*height/480-size/2,width:size,height:size});
  return <View style={{width,height,backgroundColor:'#3b2c27'}}>
    <Image source={roomArt[config.background ?? config.scene]} resizeMode="stretch" fadeDuration={0} style={[StyleSheet.absoluteFill,
      {width,height,transform:[{scaleX:config.mirror ? -1 : 1}]}]}/>
    {engine.visible.map(target=>{
      const size=target.size*width/360;
      const marked=found.includes(target.id);
      const rich = target.id==='key' ? gems[0] : target.id==='lamp' ? gems[1] : target.id==='radio' ? gems[4] : undefined;
      return <Animated.View key={target.id} entering={still ? undefined : FadeIn.duration(280)}
        style={[styles.prop,coordinates(target.x,target.y,size),marked && {opacity:.33},highlight===target.id && styles.highlight,
          {transform:[{rotate:`${target.angle}deg`}]}]}>
        {marked && !still && <Animated.View entering={ZoomIn.duration(240)} exiting={FadeOut.duration(160)} style={styles.ring}/>}
        {rich ? <Image source={rich} style={{width:size,height:size}}/> : <Svg width={size} height={size} viewBox="0 0 50 50"><ObjectGlyph id={target.id}/></Svg>}
      </Animated.View>;
    })}
    {closed?.map(spot=>{
      const size=spot.radius*1.55*width/360;
      return <Animated.View key={spot.id} exiting={still ? undefined : FadeOut.duration(160)}
        style={[styles.prop,coordinates(spot.x,spot.y,size),highlight===spot.id && styles.highlight]}>
        <BoxArt size={size} spot={spot}/>
      </Animated.View>;
    })}
  </View>;
}

function BoxArt({size,spot}:{size:number;spot:Hotspot}) {
  const book=spot.art==='book';
  return <Svg width={size} height={size} viewBox="0 0 50 50">
    <G transform={book?'rotate(-12 25 25)':undefined}>
      <Rect x="5" y="11" width="41" height="31" rx="4" fill={book?'#385549':'#7a5138'} stroke="#c29360" strokeWidth="2"/>
      <Path d="M8 17h35m-35 7h35m-35 12h35" stroke={book?'#628374':'#573a28'} strokeWidth="1.5"/>
      {book ? <Path d="M11 12v28m8-18h18m-18 4h13" stroke="#c6ab72" strokeWidth="2"/> :
        <Path d="M17 24h16q0 8-8 8t-8-8Z" fill="#50403a" stroke="#d8b678" strokeWidth="2"/>}
    </G>
  </Svg>;
}
const styles=StyleSheet.create({
  prop:{position:'absolute',alignItems:'center',justifyContent:'center'},
  ring:{...StyleSheet.absoluteFillObject,borderColor:'#f9db91',borderRadius:26,borderWidth:2,backgroundColor:'#f9d67855'},
  highlight:{borderRadius:25,backgroundColor:'#ffdd8d56',borderWidth:1,borderColor:'#fae7b0'},
});
