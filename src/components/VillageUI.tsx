import React,{useEffect,useRef,useState} from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated,{FadeInDown,FadeOutUp,useAnimatedStyle,useSharedValue,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
import { useGame } from './GameContext';
import { farmReady } from '../core/farm/FarmEngine';
import { canClaimDailyChest,questCards } from '../core/quests/QuestEngine';
import { pendingAction } from '../core/story/StoryEngine';
import { useWallClock } from '../utils/useWallClock';
import { GameButton, Heading, Icon, palette, Scene, Screen } from './ui';
import type { Glyph } from './ui';
import type { Routes } from '../screens/routes';

export type VillageTab='Home'|'Map'|'Farm'|'Tasks'|'Shop';
type Navigation=Pick<NativeStackNavigationProp<Routes>,'reset'>;
const destinations:{id:VillageTab;name:string;icon:Glyph}[]=[
  {id:'Home',name:'Играть',icon:'play'},{id:'Map',name:'Деревня',icon:'village'},
  {id:'Farm',name:'Ферма',icon:'farm'},{id:'Tasks',name:'Задания',icon:'tasks'},{id:'Shop',name:'Лавка',icon:'shop'},
];

export function VillageNav({active,navigation,overlay=false}:{active:VillageTab;navigation:Navigation;overlay?:boolean}){
  const {progress,effect}=useGame();
  const now=useWallClock(4500);
  const ready=farmReady(progress.farm,now);
  const news=progress.quests.chests.length+Number(!!pendingAction(progress))+
    questCards(progress,'daily',now).filter(card=>card.canClaim).length+Number(canClaimDailyChest(progress,now));
  function go(id:VillageTab){
    if(id===active)return;
    effect('button');
    navigation.reset({index:id==='Home'?0:1,routes:id==='Home'?[{name:'Home'}]:[{name:'Home'},{name:id}]});
  }
  return <View style={[style.nav,overlay&&style.navOverlay]}>
    {destinations.map(({id,name,icon})=>{
      const count=id==='Farm'?ready:id==='Tasks'?news:0;
      return <DockItem key={id} title={name} selected={id===active} {...{icon,count}} onPress={()=>go(id)}/>;
    })}
  </View>;
}
function DockItem({title,icon,count,selected,onPress}:{title:string;icon:Glyph;count:number;selected:boolean;onPress:()=>void}){
  const {progress}=useGame();
  const touch=useSharedValue(0);
  const press=useAnimatedStyle(()=>({transform:[{scale:1-.09*touch.value}]}));
  return <Pressable accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={count?`${title}: ${count}`:title}
    style={style.dockItem} onPressIn={()=>{if(!progress.settings.reducedMotion)touch.value=withTiming(1,{duration:90});}}
    onPressOut={()=>{touch.value=withTiming(0,{duration:115});}} onPress={onPress}>
    <Animated.View style={[style.dockMedal,selected&&style.dockSelected,press]}>
      <Icon name={icon} size={19} color={selected?'#37231a':'#f7d599'} filled={icon==='play'}/>
      {count>0&&<View style={style.dockBadge}><Text numberOfLines={1} style={style.badgeText}>{count>9?'9+':count}</Text></View>}
    </Animated.View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75} style={[style.dockLabel,selected&&{color:'#ffe1a5'}]}>{title}</Text>
  </Pressable>;
}

export function ResourceBar({compact=false}:{compact?:boolean}){
  const {progress}=useGame();
  const data:{key:Glyph;title:string;value:string|number;color:string}[]=[
    {key:'life',title:'Жизни',value:`${progress.lives}/5`,color:'#9fd5e8'},
    {key:'star',title:'Звёзды',value:progress.stars,color:'#f5c780'},
    {key:'heart',title:'Сердца',value:progress.hearts,color:'#eb9ca8'},
  ];
  return <View style={style.resources}>{data.map(({key,...item})=><ResourceToken key={key} icon={key} {...item} compact={compact}/>)}</View>;
}
function ResourceToken({icon,title,value,color,compact}:{icon:Glyph;title:string;value:string|number;color:string;compact:boolean}){
  const {progress}=useGame();
  const previous=useRef(value);
  const pulse=useSharedValue(1);
  const [gain,setGain]=useState(0);
  useEffect(()=>{
    const old=previous.current;
    previous.current=value;
    if(icon!=='heart'||typeof old!=='number'||typeof value!=='number')return;
    if(value<=old){setGain(0);return;}
    setGain(value-old);
    if(!progress.settings.reducedMotion)pulse.value=withSequence(withTiming(1.17,{duration:140}),withTiming(1,{duration:280}));
    const expiration=setTimeout(()=>setGain(0),1100);
    return ()=>clearTimeout(expiration);
  },[icon,progress.settings.reducedMotion,pulse,value]);
  const motion=useAnimatedStyle(()=>({transform:[{scale:pulse.value}]}));
  return <Animated.View accessible accessibilityLabel={`${title}: ${value}`} style={[style.resource,motion,compact&&style.resourceCompact]}>
    <Icon name={icon} size={15} color={color} filled={icon!=='life'}/>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[style.resourceValue,{color}]}>{value}</Text>
    {!!gain&&<Animated.Text entering={progress.settings.reducedMotion?undefined:FadeInDown.duration(170)}
      exiting={progress.settings.reducedMotion?undefined:FadeOutUp.duration(180)} pointerEvents="none" style={style.float}>+{gain}</Animated.Text>}
  </Animated.View>;
}

export function VillageFrame({active,navigation,title,kicker,children,headerArt,leading,end}:{
  active:VillageTab;navigation:Navigation;title:string;kicker?:string;children:React.ReactNode;headerArt?:ImageSourcePropType;
  leading?:React.ReactNode;end?:React.ReactNode;
}){
  const content=<View style={style.frame}>
    <View style={style.frameHead}>
      <Heading title={title} eyebrow={kicker} end={end}/>
      <ResourceBar compact/>
      {leading}
    </View>
    <ScrollView style={{flex:1}} contentContainerStyle={style.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    <VillageNav active={active} navigation={navigation} overlay={!!headerArt}/>
  </View>;
  return headerArt?<Scene source={headerArt}>{content}</Scene>:<Screen>{content}</Screen>;
}

export function SwayImage({source,size,moving=false,enabled=true}:{source:ImageSourcePropType;size:number;moving?:boolean;enabled?:boolean}){
  const wave=useSharedValue(0);
  useEffect(()=>{wave.value=enabled?withRepeat(withTiming(1,{duration:moving?850:2300}),-1,true):0;},[enabled,moving,wave]);
  const animated=useAnimatedStyle(()=>({transform:[{translateX:moving?wave.value*5:0},{translateY:-wave.value*(moving?4:2)},
    {rotate:`${(wave.value-.5)*(moving?5:2)}deg`}]}));
  return <Animated.View style={animated}><Image source={source} resizeMode="contain" style={{width:size,height:size}}/></Animated.View>;
}
export function PriceButton({title,price,onPress,disabled=false}:{title:string;price:number;onPress:()=>void;disabled?:boolean}){
  return <GameButton title={`${title} · ${price}`} icon="heart" onPress={onPress} disabled={disabled} compact/>;
}
export function LedgerLine({title,detail,art,icon,end}:{
  title:string;detail?:string;art?:ImageSourcePropType;icon?:Glyph;end?:React.ReactNode;
}){
  return <View style={style.ledger}>
    {art?<Image source={art} resizeMode="contain" style={style.ledgerArt}/>:
      icon?<View style={style.ledgerStamp}><Icon name={icon} size={20}/></View>:null}
    <View style={style.ledgerContent}><Text style={style.ledgerTitle}>{title}</Text>
      {!!detail&&<Text style={style.ledgerDetail}>{detail}</Text>}</View>{end}
  </View>;
}

const style=StyleSheet.create({
  nav:{minHeight:65,flexDirection:'row',alignItems:'stretch',paddingHorizontal:6,paddingTop:4,paddingBottom:3,
    backgroundColor:'#172735',borderTopColor:'#756346',borderTopWidth:1},
  navOverlay:{marginHorizontal:10,borderRadius:25,backgroundColor:'#162536f5',borderColor:'#857152',borderWidth:1,marginBottom:3},
  dockItem:{flex:1,minWidth:0,minHeight:52,alignItems:'center',justifyContent:'center',gap:2},
  dockMedal:{width:38,height:38,borderRadius:20,borderColor:'#927652',borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'#283b4b'},
  dockSelected:{backgroundColor:'#e0ad65',borderColor:'#ffe7a6',borderWidth:2},
  dockLabel:{color:'#c0cdd6',fontSize:10,fontWeight:'800'},
  dockBadge:{position:'absolute',right:-3,top:-3,minWidth:17,height:17,paddingHorizontal:2,borderRadius:9,
    backgroundColor:'#a84b60',borderWidth:1,borderColor:'#f5b5a7',alignItems:'center',justifyContent:'center'},
  badgeText:{color:'#fff3db',fontSize:9,fontWeight:'800'},
  resources:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1},
  resource:{flexDirection:'row',alignItems:'center',gap:4,minWidth:52,paddingHorizontal:6,height:30,borderRadius:15,
    borderWidth:1,borderColor:'#796b55',backgroundColor:'#162333ef',position:'relative'},
  resourceCompact:{height:28,minWidth:48},resourceValue:{fontSize:13,fontWeight:'800',fontVariant:['tabular-nums'],flexShrink:1},
  float:{position:'absolute',right:2,top:27,backgroundColor:'#64323e',color:'#ffcebe',fontSize:11,fontWeight:'800',
    borderRadius:10,overflow:'hidden',paddingHorizontal:5,zIndex:6,elevation:7},
  frame:{flex:1},
  frameHead:{paddingHorizontal:13,paddingTop:7,paddingBottom:8,gap:7,overflow:'hidden',borderBottomWidth:1,borderColor:'#a88759',backgroundColor:'#142333d9'},
  scroll:{paddingHorizontal:13,paddingTop:8,paddingBottom:12,gap:9},
  ledger:{flexDirection:'row',gap:8,alignItems:'center',minHeight:62,paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#57616a'},
  ledgerContent:{flex:1,minWidth:0},ledgerArt:{width:42,height:44},
  ledgerStamp:{width:39,height:39,borderWidth:1,borderColor:'#8c7552',borderRadius:12,backgroundColor:'#273a4b',alignItems:'center',justifyContent:'center'},
  ledgerTitle:{fontSize:15,fontWeight:'700',color:palette.cream},ledgerDetail:{fontSize:12,lineHeight:16,color:palette.muted,marginTop:2},
});
