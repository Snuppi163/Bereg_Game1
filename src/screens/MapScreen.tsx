import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { upperVillageMap, villageMap } from '../assets/gameArt';
import { useGame } from '../components/GameContext';
import { LedgerLine,ResourceBar,VillageNav } from '../components/VillageUI';
import { villagePlaces } from '../data/village/places';
import { GameButton,GameWindow,Heading,Icon,palette } from '../components/ui';
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
const headingHeight=36;
type Segment={first:number;end:number;alt:boolean;chapter:number;height:number;offset:number};
type Props=NativeStackScreenProps<Routes,'Map'>;

export function MapScreen({navigation}:Props) {
  const {progress}=useGame();
  const [places,setPlaces]=useState(false);
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
    <View style={css.mapArea}>
    <FlatList ref={list} data={levels} style={{flex:1}} contentContainerStyle={{alignItems:'center'}}
      keyExtractor={chapter=>String(chapter.first)} initialScrollIndex={activeIndex} initialNumToRender={2} maxToRenderPerBatch={3} windowSize={5}
      getItemLayout={(_,index)=>({length:levels[index].height,offset:levels[index].offset,index})}
      onLayout={()=>{if(!centered.current){centered.current=true;requestAnimationFrame(()=>focus(true));}}}
      renderItem={({item})=><MapSection segment={item} width={artWidth} scalar={scalar} next={progress.nextLevel}
        lives={progress.lives} pending={action?.id} still={progress.settings.reducedMotion||progress.settings.lowGraphics} onLevel={openLevel}
        restored={progress.actions.includes('power')||progress.village.includes('home')} fixedPlaces={progress.village}
        onPlace={id=>navigation.navigate('Place',{id})} onStory={()=>action && navigation.navigate('Dialogue',{id:action.id})}/>}/>
      <View pointerEvents="box-none" style={css.mapHud}>
        <View style={css.mapPlaque}><Heading title="Новодевичье" eyebrow="Берег Волги"
          onBack={navigation.goBack} end={<GameButton title="Настройки" icon="settings" variant="round" onPress={()=>navigation.navigate('Settings')}/>}/>
          <ResourceBar compact/>
        </View>
      </View>
      <View pointerEvents="box-none" style={css.mapTools}>
        <GameButton title="Места" icon="village" compact onPress={()=>setPlaces(true)}/>
        <GameButton title={`К уровню ${current}`} icon="play" compact onPress={()=>focus()}/>
        <GameButton title="Дневник" icon="book" variant="round" onPress={()=>navigation.navigate('Journal')}/>
      </View>
    </View>
    <VillageNav active="Map" navigation={navigation} overlay/>
    <GameWindow visible={places} title="Места Новодевичья" onClose={()=>setPlaces(false)}>
      {villagePlaces.map(place=><LedgerLine key={place.id} title={place.title}
        detail={progress.village.includes(place.id)?'Восстановлено':progress.nextLevel>=place.level?place.npc:`С уровня ${place.level}`}
        icon={place.id==='farm'?'farm':progress.nextLevel<place.level?'lock':'village'}
        end={<GameButton title={`Осмотреть: ${place.title}`} icon="next" variant="round" onPress={()=>{setPlaces(false);navigation.navigate('Place',{id:place.id});}}/>}/>)}
    </GameWindow>
  </SafeAreaView>;
}

const MapSection=memo(function MapSection({segment,width,scalar,next,lives,pending,still,restored,fixedPlaces,onPlace,onLevel,onStory}:{
  segment:Segment;width:number;scalar:number;next:number;lives:number;pending?:string;still:boolean;restored:boolean;fixedPlaces:string[];onPlace:(id:string)=>void;onLevel:(id:number)=>void;onStory:()=>void;
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
    <View style={css.chapter}><Text style={css.chapterNumber}>Глава {segment.chapter+1}</Text><Icon name="wave" size={13}/><Text style={css.chapterTitle}>{campaignChapters[segment.chapter].title}</Text></View>
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
      {segment.first===1&&villagePlaces.map(place=>{
        const [x,y]=place.position;
        const done=fixedPlaces.includes(place.id);
        return <Pressable accessibilityRole="button" key={place.id} accessibilityLabel={place.title}
          style={[css.placePin,{left:x*scalar-21,top:y*scalar-21},done&&css.placeFixed,next<place.level&&{opacity:.65}]}
          onPress={()=>onPlace(place.id)}>
          <Icon name={place.id==='farm'?'farm':place.id==='market'||place.id==='shop'?'shop':'village'} size={17} color="#fff1ba"/>
        </Pressable>;
      })}
      {segment.alt && ownLevel && pending && <Pressable accessibilityRole="button" style={[css.poi,{right:13*scalar,top:((upperArtHeight-upperCrop)*.4)*scalar}]}
        onPress={onStory}><Text style={css.buttonText}>Задание</Text></Pressable>}
    </View>
  </View>;
});
const css=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#172735'},
  mapArea:{flex:1},
  mapHud:{position:'absolute',top:6,left:10,right:10},
  mapPlaque:{alignSelf:'center',width:'100%',maxWidth:480,borderWidth:1,borderColor:'#9c845c',
    borderRadius:17,backgroundColor:'#172b3df0',paddingHorizontal:7,paddingVertical:3,gap:3},
  mapTools:{position:'absolute',bottom:6,left:9,right:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},
  chapter:{height:headingHeight,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,
    backgroundColor:'#1d3243',borderColor:'#a18a62',borderBottomWidth:1},chapterNumber:{color:'#ebbf83',fontSize:10,fontWeight:'800'},
  chapterTitle:{color:'#fcdfa6',fontFamily:'serif',fontWeight:'700',fontSize:16},
  buttonText:{color:'#ffe7b9',fontWeight:'800',fontSize:12},
  hit:{position:'absolute',width:44,height:44,alignItems:'center',justifyContent:'center',zIndex:3},
  node:{justifyContent:'center',alignItems:'center',borderRadius:15,borderWidth:2,borderColor:'#b99b6d',backgroundColor:'#434448',elevation:4},
  complete:{backgroundColor:'#635337',borderColor:'#e0bf7e'},current:{backgroundColor:'#345b81',borderColor:'#ffe19a',elevation:9},
  number:{color:'#fff1d3',fontWeight:'800',fontSize:11,includeFontPadding:false},numberCurrent:{fontSize:13},
  searchDot:{width:5,height:5,borderRadius:3,backgroundColor:'#f5be74',position:'absolute',right:-3,top:-3},
  fog:{position:'absolute',width:'64%',height:34,borderRadius:40,backgroundColor:'#e0ddc8',transform:[{rotate:'-4deg'}]},
  windowLight:{position:'absolute',height:25,width:19,borderRadius:9,backgroundColor:'#ffc061',elevation:5},
  placePin:{position:'absolute',zIndex:5,width:43,height:43,borderRadius:22,borderWidth:2,borderColor:'#e5ba75',
    backgroundColor:'#25445ced',alignItems:'center',justifyContent:'center',elevation:5},
  placeFixed:{backgroundColor:'#a26235',borderColor:'#fff1b1',borderWidth:3},
  poi:{position:'absolute',zIndex:4,padding:9,backgroundColor:'#402b20de',borderWidth:1,borderColor:palette.gold,borderRadius:10},
});
