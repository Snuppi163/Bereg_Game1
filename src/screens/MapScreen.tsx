import React, { memo, useEffect, useMemo, useRef } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Portrait } from '../assets/Portrait';
import { upperVillageMap, villageMap } from '../assets/gameArt';
import { useGame } from '../components/GameContext';
import { palette } from '../components/ui';
import { pendingAction } from '../core/story/StoryEngine';
import { campaignChapters } from '../data/story/campaignStory';
import { levelMode, totalLevels } from '../data/levels';
import type { Routes } from './routes';

const lower = [[249,710],[307,672],[276,621],[239,561],[186,532],[150,483],[198,455],[183,411],[171,353],
  [214,328],[185,290],[185,248],[227,226],[224,182],[251,146],[274,110],[310,88]];
const upper = [[236,481],[280,445],[321,412],[301,367],[257,348],[191,329],[132,310],[145,283]];
const fullMapHeight=782;
const upperArtHeight=587;
const upperCrop=264;
const headingHeight=53;
type Segment={first:number;end:number;alt:boolean;chapter:number;height:number;offset:number};
type Props=NativeStackScreenProps<Routes,'Map'>;

export function MapScreen({navigation}:Props) {
  const {progress}=useGame();
  const {width,height}=useWindowDimensions();
  const artWidth=Math.min(width,600);
  const scalar=artWidth/440;
  const action=pendingAction(progress);
  const levels=useMemo(()=>{
    const result:Omit<Segment,'height'|'offset'>[]=[];
    for(let level=1;level<=totalLevels;level+=25) {
      const chapter=Math.floor((level-1)/25);
      result.push({first:level,end:Math.min(level+16,totalLevels),alt:false,chapter});
      if(level+17<=totalLevels) result.push({first:level+17,end:Math.min(level+24,totalLevels),alt:true,chapter});
    }
    let offset=0;
    return result.reverse().map(segment=>{
      const height=headingHeight+(segment.alt ? upperArtHeight-upperCrop : fullMapHeight)*scalar;
      const item={...segment,height,offset};
      offset+=height;
      return item;
    });
  },[scalar]);
  const current=Math.min(totalLevels,progress.nextLevel);
  const activeIndex=Math.max(0,levels.findIndex(segment=>current>=segment.first && current<=segment.end));
  const list=useRef<FlatList<Segment>>(null);
  const centered=useRef(false);
  function focus(immediate=false) {
    const segment=levels[activeIndex];
    const point=(segment.alt ? upper : lower)[current-segment.first];
    if (!point) return;
    list.current?.scrollToOffset({animated:!immediate,offset:Math.max(0,segment.offset+headingHeight+
      (point[1]-(segment.alt ? upperCrop : 0))*scalar-height*.55)});
  }
  const openLevel=(id:number)=>{
    if (id===progress.nextLevel && action) {navigation.navigate('Dialogue',{id:action.id});return;}
    if (id>progress.nextLevel || progress.lives<1) return;
    if (levelMode(id)==='hidden') navigation.navigate('Hidden',{id});
    else navigation.navigate('Match',{id});
  };
  return <SafeAreaView style={css.screen}>
    <View style={css.top}>
      <Pressable accessibilityRole="button" onPress={navigation.goBack} style={css.topButton}><Text style={css.buttonText}>Назад</Text></Pressable>
      <View style={css.topTitle}><Text style={css.title}>Карта посёлка</Text><Text style={css.subtitle}>{progress.lives}/5 жизни · {progress.stars} звёзд</Text></View>
      <Portrait id="yulia" size={42}/>
    </View>
    <FlatList ref={list} data={levels} style={{flex:1}} contentContainerStyle={{alignItems:'center'}}
      keyExtractor={chapter=>String(chapter.first)} initialScrollIndex={activeIndex} initialNumToRender={2} maxToRenderPerBatch={3} windowSize={5}
      getItemLayout={(_,index)=>({length:levels[index].height,offset:levels[index].offset,index})}
      onLayout={()=>{if(!centered.current){centered.current=true;requestAnimationFrame(()=>focus(true));}}}
      renderItem={({item})=><MapSection segment={item} width={artWidth} scalar={scalar} next={progress.nextLevel}
        lives={progress.lives} pending={action?.id} still={progress.settings.reducedMotion} onLevel={openLevel}
        restored={progress.actions.includes('power')} onStory={()=>action && navigation.navigate('Dialogue',{id:action.id})}/>}/>
    <View style={css.bottom}>
      <Pressable accessibilityRole="button" style={css.topButton} onPress={()=>navigation.navigate('Journal')}><Text style={css.buttonText}>Дневник</Text></Pressable>
      <Pressable accessibilityRole="button" style={css.focus} onPress={()=>focus()}><Text style={css.focusText}>К уровню {current}</Text></Pressable>
      <Pressable accessibilityRole="button" style={css.topButton} onPress={()=>navigation.navigate('Settings')}><Text style={css.buttonText}>Настройки</Text></Pressable>
    </View>
  </SafeAreaView>;
}

const MapSection=memo(function MapSection({segment,width,scalar,next,lives,pending,still,restored,onLevel,onStory}:{
  segment:Segment;width:number;scalar:number;next:number;lives:number;pending?:string;still:boolean;restored:boolean;onLevel:(id:number)=>void;onStory:()=>void;
}) {
  const offset=segment.alt ? upperCrop : 0;
  const points=segment.alt ? upper : lower;
  const ownLevel=next>=segment.first && next<=segment.end;
  const drift=useSharedValue(0);
  useEffect(()=>{
    drift.value=ownLevel && !still ? withRepeat(withTiming(1,{duration:4300}),-1,true) : 0;
  },[drift,ownLevel,still]);
  const mist=useAnimatedStyle(()=>({opacity:.08+.095*drift.value,transform:[{translateX:drift.value*28}]}));
  const lamp=useAnimatedStyle(()=>({opacity:.3+.25*drift.value}));
  const improved=restored;
  return <View style={{width,height:segment.height}}>
    <View style={css.chapter}><Text style={css.chapterNumber}>Глава {segment.chapter+1}</Text>
      <Text style={css.chapterTitle}>{campaignChapters[segment.chapter].title}</Text></View>
    <View style={{width,height:segment.height-headingHeight,overflow:'hidden'}}>
      <Image source={segment.alt ? upperVillageMap : villageMap} resizeMode="stretch"
        style={{position:'absolute',width,height:(segment.alt ? upperArtHeight : fullMapHeight)*scalar,top:-offset*scalar}}/>
      {ownLevel && !still && <Animated.View pointerEvents="none" style={[css.fog,{top:(segment.alt ? 8 : 105)*scalar,right:-27},mist]}/>}
      {segment.first===1 && improved && <Animated.View pointerEvents="none" style={[css.windowLight,{left:103*scalar,top:593*scalar},lamp]}/>}
      {points.map(([x,y],index)=>{
        const id=segment.first+index;
        const opened=id<=next && (lives>0 || id===next && !!pending);
        const completed=id<next;
        const current=id===next;
        return <Pressable key={id} disabled={!opened || id>segment.end} onPress={()=>onLevel(id)}
          accessibilityRole="button" accessibilityLabel={`Уровень ${id}${completed?', пройден':current?', текущий':', закрыт'}`}
          accessibilityState={{disabled:!opened || id>segment.end}}
          style={[css.hit,{left:x*scalar-22,top:(y-offset)*scalar-22}]} hitSlop={0}>
          <View style={[css.node,{width:Math.max(25,31*scalar),height:Math.max(23,27*scalar)},completed && css.complete,current && css.current]}>
            <Text style={[css.number,current && css.numberCurrent]}>{id<=segment.end ? id : '·'}</Text>
            {id<=segment.end && id%5===0 && <View style={css.searchDot}/>}
          </View>
        </Pressable>;
      })}
      {segment.first===1 && ownLevel && pending && <Pressable accessibilityRole="button" accessibilityLabel="Осмотреть дом и начать задание"
        style={[css.poi,{left:22*scalar,top:618*scalar}]} onPress={onStory}><Text style={css.buttonText}>Улики у дома</Text></Pressable>}
      {segment.alt && ownLevel && pending && <Pressable accessibilityRole="button" style={[css.poi,{right:13*scalar,top:((upperArtHeight-upperCrop)*.4)*scalar}]}
        onPress={onStory}><Text style={css.buttonText}>Задание</Text></Pressable>}
    </View>
  </View>;
});
const css=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#172627'},top:{paddingHorizontal:12,paddingVertical:6,flexDirection:'row',gap:10,alignItems:'center',
    backgroundColor:'#272529',borderBottomColor:'#98724f',borderBottomWidth:1},topTitle:{flex:1},
  title:{color:'#f4ddad',fontFamily:'serif',fontWeight:'700',fontSize:20},subtitle:{fontSize:11,color:'#d4b08a'},
  topButton:{minHeight:44,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#76573d',
    borderRadius:14,backgroundColor:'#382e2a'},buttonText:{color:'#f4debb',fontWeight:'700',fontSize:12},
  bottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:9,gap:5,backgroundColor:'#282627'},
  focus:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',backgroundColor:'#d8ac73',borderRadius:13,paddingHorizontal:6},
  focusText:{color:'#39271c',fontWeight:'800',fontSize:13},chapter:{height:headingHeight,justifyContent:'center',alignItems:'center',
    backgroundColor:'#28292a',borderColor:'#927052',borderBottomWidth:1,borderTopWidth:1},chapterNumber:{color:'#d5aa78',fontSize:11},
  chapterTitle:{color:'#fcdfa6',fontFamily:'serif',fontWeight:'700',fontSize:20},
  hit:{position:'absolute',width:44,height:44,alignItems:'center',justifyContent:'center',zIndex:3},
  node:{justifyContent:'center',alignItems:'center',borderRadius:15,borderWidth:2,borderColor:'#b99b6d',backgroundColor:'#434448',elevation:4},
  complete:{backgroundColor:'#436447',borderColor:'#e0bf7e'},current:{backgroundColor:'#2d787c',borderColor:'#ffe19a',elevation:9},
  number:{color:'#fff1d3',fontWeight:'800',fontSize:11,includeFontPadding:false},numberCurrent:{fontSize:13},
  searchDot:{width:5,height:5,borderRadius:3,backgroundColor:'#f5be74',position:'absolute',right:-3,top:-3},
  fog:{position:'absolute',width:'64%',height:34,borderRadius:40,backgroundColor:'#e0ddc8',transform:[{rotate:'-4deg'}]},
  windowLight:{position:'absolute',height:25,width:19,borderRadius:9,backgroundColor:'#ffc061',elevation:5},
  poi:{position:'absolute',zIndex:4,padding:9,backgroundColor:'#402b20de',borderWidth:1,borderColor:palette.gold,borderRadius:10},
});
