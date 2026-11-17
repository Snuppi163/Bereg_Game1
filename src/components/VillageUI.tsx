import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg,{Defs,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import Animated,{FadeInUp,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import { useGame } from './GameContext';
import { farmReady } from '../core/farm/FarmEngine';
import { useWallClock } from '../utils/useWallClock';
import type { Routes } from '../screens/routes';

export const paper={background:'#ebeedc',panel:'#fffae8',ink:'#283a29',muted:'#53664d',amber:'#b76927',line:'#c9ae7c',green:'#416d50',rose:'#aa4d47'};
export type VillageTab='Home'|'Map'|'Farm'|'Tasks'|'Shop';
type Navigation=Pick<NativeStackNavigationProp<Routes>,'reset'>;
type Glyph='play'|'village'|'farm'|'tasks'|'shop'|'heart'|'star'|'life';
const tabItems:{id:VillageTab;name:string;icon:Glyph}[]=[
  {id:'Home',name:'Играть',icon:'play'},{id:'Map',name:'Деревня',icon:'village'},
  {id:'Farm',name:'Ферма',icon:'farm'},{id:'Tasks',name:'Задания',icon:'tasks'},{id:'Shop',name:'Магазин',icon:'shop'},
];
const paths:Record<Glyph,string>={
  play:'M8 4.5v15l12-7.5Z',
  village:'M2 11.5 12 3l10 8.5M5 10v10h14V10M9 20v-6h6v6',
  farm:'M12 22V8M12 13C5 13 3 10 3 6c5 0 9 2 9 7Zm0 4c7 0 9-3 9-7-5 0-9 2-9 7ZM12 8c-3-3-2-5 0-7 2 2 3 4 0 7Z',
  tasks:'M7 5H4v16h16V5h-3M8 3h8v5H8M8 12h8M8 16h8',
  shop:'M3 9h18l-2 12H5Zm3 0L10 3m8 6-4-6M9 13v4m6-4v4',
  heart:'M12 21 3.8 13C-1 8 6 1 12 7c6-6 13 1 8.2 6Z',
  star:'m12 2 3 6.5 7 .8-5 5 1.2 7L12 18l-6.2 3.3 1.2-7-5-5 7-.8Z',
  life:'M12 2c3 4 7 8 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13Zm-2 13 2 2 3-4',
};
export function VillageIcon({name,size=22,color='#f5db97',filled=false}:{name:Glyph;size?:number;color?:string;filled?:boolean}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={paths[name]} fill={filled?color:'none'} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>;
}
export function VillageNav({active,navigation}:{active:VillageTab;navigation:Navigation}){
  const {progress,effect}=useGame();
  const now=useWallClock(4500);
  const ready=farmReady(progress.farm,now);
  const go=(id:VillageTab)=>{
    if(id===active)return;
    effect('button');
    navigation.reset({index:id==='Home'?0:1,routes:id==='Home'?[{name:'Home'}]:[{name:'Home'},{name:id}]});
  };
  return <View style={style.nav}>
    {tabItems.map(({id,name,icon})=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:id===active}}
      accessibilityLabel={id==='Farm'&&ready?`Ферма, готовые продукты: ${ready}`:name} onPress={()=>go(id)}
      style={({pressed})=>[style.navItem,id===active&&style.active,pressed&&{opacity:.7}]}>
      <VillageIcon name={icon} size={20} color={id===active?'#ffe6a0':'#c5ddc1'} filled={icon==='play'}/>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={style.navText}>{name}</Text>
      {id==='Farm'&&ready>0&&<View style={style.badge}><Text style={style.badgeText}>{ready>9?'9+':ready}</Text></View>}
    </Pressable>)}
  </View>;
}
export function ResourceBar({compact=false}:{compact?:boolean}){
  const {progress}=useGame();
  const data:{key:Glyph;title:string;value:string|number;color:string}[]=[
    {key:'life',title:'Жизни',value:`${progress.lives}/5`,color:'#2b6279'},
    {key:'star',title:'Звёзды',value:progress.stars,color:'#a45e1d'},
    {key:'heart',title:'Сердца',value:progress.hearts,color:'#a74444'},
  ];
  return <View style={style.resources}>{data.map(item=><View key={item.key} accessible accessibilityLabel={`${item.title}: ${item.value}`} style={style.resource}>
    <VillageIcon name={item.key} size={17} color={item.color} filled={item.key!=='life'}/>
    <View style={{flexShrink:1}}>{!compact&&<Text numberOfLines={1} style={style.resourceLabel}>{item.title}</Text>}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[style.resourceValue,{color:item.color}]}>{item.value}</Text></View>
  </View>)}</View>;
}

export function VillageFrame({active,navigation,title,kicker,children}:{active:VillageTab;navigation:Navigation;title:string;kicker?:string;children:React.ReactNode}){
  const {progress}=useGame();
  return <SafeAreaView style={style.safe}>
    <StatusBar barStyle="dark-content"/>
    <View style={style.header}>
      {!!kicker&&<Text numberOfLines={1} style={style.eyebrow}>{kicker}</Text>}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.72} accessibilityRole="header" style={style.title}>{title}</Text>
      <ResourceBar/>
    </View>
    <ScrollView style={{flex:1}} contentContainerStyle={style.content} keyboardShouldPersistTaps="handled">
      <Animated.View entering={progress.settings.reducedMotion?undefined:FadeInUp.duration(220)} style={{gap:10}}>{children}</Animated.View>
    </ScrollView>
    <VillageNav {...{active,navigation}}/>
  </SafeAreaView>;
}
export function CreamCard({children}:{children:React.ReactNode}){return <View style={style.card}>{children}</View>;}
export function PaperTitle({children}:{children:React.ReactNode}){return <Text style={style.cardTitle}>{children}</Text>;}
export function PaperText({children,small=false}:{children:React.ReactNode;small?:boolean}){
  return <Text style={[style.copy,small&&style.small]}>{children}</Text>;
}
export function VillageButton({title,onPress,disabled=false,green=false,compact=false}:{title:string;onPress:()=>void;disabled?:boolean;green?:boolean;compact?:boolean}){
  const {effect}=useGame();
  return <Pressable disabled={disabled} accessibilityState={{disabled}} accessibilityRole="button" onPress={()=>{effect('button');onPress();}}
    style={({pressed})=>[style.button,green&&style.greenButton,compact&&style.short,disabled&&{opacity:.43},pressed&&{transform:[{scale:.975}]}]}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs><LinearGradient id="surface" x1="0%" y1="0%" x2="0%" y2="100%"><Stop stopColor={green?'#6d9a62':'#ffe3a0'}/>
        <Stop offset="100%" stopColor={green?'#386344':'#d48b36'}/></LinearGradient></Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#surface)"/>
    </Svg>
    <Text style={[style.buttonCopy,green&&{color:'#fff6dc'},compact&&{fontSize:12}]}>{title}</Text>
  </Pressable>;
}
export function TokenToast({message,delta=0}:{message:string;delta?:number}){
  const {progress}=useGame();
  if(!message)return null;
  return <Animated.View accessibilityLiveRegion="polite" entering={progress.settings.reducedMotion?undefined:FadeInUp.duration(250)} style={style.toast}>
    {!!delta&&<VillageIcon name="heart" size={20} filled color="#f6998d"/>}
    <Text style={style.toastText}>{message}</Text>
  </Animated.View>;
}
export function SwayImage({source,size,moving=false,enabled=true}:{source:number;size:number;moving?:boolean;enabled?:boolean}){
  const wave=useSharedValue(0);
  useEffect(()=>{wave.value=enabled?withRepeat(withTiming(1,{duration:moving?850:2300}),-1,true):0;},[enabled,moving,wave]);
  const animated=useAnimatedStyle(()=>({transform:[{translateX:moving?wave.value*5:0},{translateY:-wave.value*(moving?4:2)},
    {rotate:`${(wave.value-.5)*(moving?5:2)}deg`}]}));
  return <Animated.View style={animated}><Image source={source} resizeMode="contain" style={{width:size,height:size}}/></Animated.View>;
}
const style=StyleSheet.create({
  safe:{flex:1,backgroundColor:paper.background},header:{paddingHorizontal:14,paddingTop:7,paddingBottom:8,gap:4,
    backgroundColor:'#fbf1d3',borderBottomWidth:1,borderBottomColor:paper.line},eyebrow:{color:paper.amber,fontSize:11,fontWeight:'800',letterSpacing:.75},
  title:{fontFamily:'serif',fontSize:29,lineHeight:35,color:paper.ink,fontWeight:'800'},
  resources:{flexDirection:'row',gap:6,marginTop:3},resource:{flex:1,minWidth:0,minHeight:37,flexDirection:'row',alignItems:'center',gap:5,
    borderRadius:12,backgroundColor:'#fffdf1',borderWidth:1,borderColor:'#dfcca4',paddingHorizontal:7,paddingVertical:3},
  resourceLabel:{fontSize:9,color:paper.muted,fontWeight:'700'},resourceValue:{fontSize:14,fontWeight:'900'},
  content:{paddingHorizontal:12,paddingTop:10,paddingBottom:14},
  nav:{paddingTop:5,paddingBottom:4,paddingHorizontal:4,flexDirection:'row',backgroundColor:'#2c5443',
    borderTopWidth:2,borderTopColor:'#cfa363',elevation:7},navItem:{flex:1,minWidth:0,minHeight:53,alignItems:'center',
    justifyContent:'center',borderRadius:13,borderWidth:1,borderColor:'transparent',gap:3},active:{backgroundColor:'#536f43',borderColor:'#d6b879'},
  navText:{color:'#fff2ce',fontSize:11,fontWeight:'800'},badge:{position:'absolute',right:3,top:0,minWidth:16,height:16,
    alignItems:'center',justifyContent:'center',paddingHorizontal:2,borderRadius:9,backgroundColor:'#b64445'},
  badgeText:{color:'#fff5da',fontSize:9,fontWeight:'900'},
  card:{borderWidth:1,borderColor:'#d8bf93',borderRadius:18,backgroundColor:paper.panel,padding:12,gap:6,elevation:2},
  cardTitle:{fontFamily:'serif',fontSize:20,lineHeight:24,color:paper.ink,fontWeight:'800'},
  copy:{fontSize:14,lineHeight:20,color:paper.ink},small:{fontSize:12,lineHeight:17,color:paper.muted},
  button:{position:'relative',overflow:'hidden',minHeight:49,paddingHorizontal:12,paddingVertical:7,justifyContent:'center',
    borderColor:'#b47b3b',borderWidth:1,borderBottomWidth:3,borderRadius:20,backgroundColor:'#d48b36',elevation:3},
  greenButton:{borderColor:'#355338',backgroundColor:'#386344'},
  short:{minHeight:44,borderRadius:16},buttonCopy:{fontSize:15,fontWeight:'800',textAlign:'center',color:'#482a15'},
  toast:{borderRadius:13,backgroundColor:'#406448',padding:9,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},
  toastText:{color:'#fff4d2',fontSize:13,fontWeight:'700',textAlign:'center',flexShrink:1},
});
