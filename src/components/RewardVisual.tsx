import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated,{FadeInDown,ZoomIn} from 'react-native-reanimated';
import { useGameOptional } from './GameContext';
import { Icon, palette } from './ui';
import type { Glyph } from './ui';

const chest=require('../assets/interface/chest.webp');
export function IllustratedChest({size=112,opened=false}:{size?:number;opened?:boolean}){
  const reduce=useGameOptional()?.progress.settings.reducedMotion;
  return <View style={{width:size,height:size*.88,alignItems:'center',justifyContent:'center'}}>
    {opened&&<Animated.View entering={reduce?undefined:ZoomIn.duration(380)} style={style.light}>
      <Icon name="star" size={26} color="#fff0ae" filled/>
    </Animated.View>}
    <Animated.View entering={opened&&!reduce?ZoomIn.springify().damping(16):undefined}>
      <Image source={chest} resizeMode="contain" style={{width:size,height:size*.88}}/>
    </Animated.View>
  </View>;
}

export function RewardToken({icon,label,delay=0}:{icon:Glyph;label:string;delay?:number}){
  const reduce=useGameOptional()?.progress.settings.reducedMotion;
  return <Animated.View entering={reduce?undefined:FadeInDown.duration(230).delay(delay)} style={style.reward}>
    <Icon name={icon} size={16} color={icon==='heart'?'#f1a1ad':palette.gold} filled={icon==='star'||icon==='heart'}/>
    <Text style={style.label}>{label}</Text>
  </Animated.View>;
}
const style=StyleSheet.create({
  light:{position:'absolute',top:-5,alignSelf:'center',alignItems:'center',justifyContent:'center',
    width:'77%',height:'55%',borderRadius:44,backgroundColor:'#eab15c32'},
  reward:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:16,borderColor:'#a58b5a',borderWidth:1,
    backgroundColor:'#273c4d',paddingVertical:6,paddingHorizontal:8},
  label:{color:palette.cream,fontWeight:'800',fontSize:13},
});
