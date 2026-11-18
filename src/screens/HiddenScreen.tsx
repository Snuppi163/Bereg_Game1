import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ObjectGlyph } from '../assets/Objects';
import Svg from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HiddenRoom } from '../components/HiddenRoom';
import { useGame } from '../components/GameContext';
import { Copy, GameButton, GameWindow, Heading, Instruction, Label, palette, ProgressLine, Row, Screen } from '../components/ui';
import { HiddenObjectEngine } from '../core/hiddenObject/HiddenObjectEngine';
import type { HiddenConfig, ObjectArt } from '../core/hiddenObject/HiddenObjectEngine';
import { victory } from '../core/progress/ProgressSystem';
import { getHidden } from '../data/levels';
import type { Routes } from './routes';

type Props = NativeStackScreenProps<Routes,'Hidden'>;
const sceneWidth=360, sceneHeight=480;
const clamp = (value:number, min:number, max:number) => {
  'worklet';
  return Math.min(max,Math.max(min,value));
};

export function HiddenScreen(props:Props) {
  const config = getHidden(props.route.params.id);
  return config ? <HiddenLevel key={config.id} config={config} {...props}/> : null;
}

function HiddenLevel({config,navigation}:Props & {config:HiddenConfig}) {
  const {progress,update,effect} = useGame();
  const [engine] = useState(() => new HiddenObjectEngine(config,config.id === progress.nextLevel ? progress.hidden[config.id] : undefined));
  const [found,setFound] = useState(engine.snapshot().found);
  const [hint,setHint] = useState<string>();
  const [feedback,setFeedback]=useState('');
  const [tutorial,setTutorial] = useState(!!config.tutorial);
  const [paused,setPaused] = useState(false);
  const {width,height} = useWindowDimensions();
  const insets=useSafeAreaInsets();
  const available=height-insets.top-insets.bottom;
  const canvasWidth = Math.floor(Math.min(width-36,480,Math.max(180,(available-250)*.75)));
  const canvasHeight = canvasWidth*sceneHeight/sceneWidth;
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const pinching = useSharedValue(false);
  const sceneStyle = useAnimatedStyle(() => ({transform:[{translateX:tx.value},{translateY:ty.value},{scale:scale.value}]}));

  const tap = async (x:number,y:number) => {
    if (engine.complete) return;
    const item=engine.tap(x,y);
    const toggled=item ? undefined : engine.interact(x,y);
    if(toggled?.locked) {setFeedback('Сперва найди ключ от шкафа.');return;}
    if(!item && !toggled) return;
    setFeedback(toggled ? toggled.hotspot.title : '');
    const snapshot=engine.snapshot();
    setFound(snapshot.found);
    if(item?.id===hint || toggled?.hotspot.id===hint) setHint(undefined);
    effect(item?'found':'swap');
    await update(state => {
      if (config.id !== state.nextLevel) return state;
      const hidden = {...state.hidden};
      if (engine.complete) {
        delete hidden[config.id];
        return victory({...state,hidden},config.id);
      }
      hidden[config.id] = snapshot;
      return {...state,hidden};
    });
    if (snapshot.found.length === config.targets.length && navigation.isFocused()) navigation.replace('Result',{id:config.id,won:true,earned:config.id===progress.nextLevel});
  };
  const pinch = Gesture.Pinch().onStart(e => {
    pinching.value = true;
    baseScale.value = scale.value; baseX.value = tx.value; baseY.value = ty.value;
    focalX.value = e.focalX-canvasWidth/2; focalY.value = e.focalY-canvasHeight/2;
  }).onUpdate(e => {
    const next = clamp(baseScale.value*e.scale,1,3);
    const ratio = next/baseScale.value;
    tx.value = clamp(e.focalX-canvasWidth/2-(focalX.value-baseX.value)*ratio,-canvasWidth*(next-1)/2,canvasWidth*(next-1)/2);
    ty.value = clamp(e.focalY-canvasHeight/2-(focalY.value-baseY.value)*ratio,-canvasHeight*(next-1)/2,canvasHeight*(next-1)/2);
    scale.value = next;
  }).onFinalize(() => {pinching.value=false;});
  const pan = Gesture.Pan().maxPointers(1).minDistance(9).onStart(() => {
    panX.value=tx.value; panY.value=ty.value;
  }).onUpdate(e => {
    if (pinching.value) return;
    tx.value=clamp(panX.value+e.translationX,-canvasWidth*(scale.value-1)/2,canvasWidth*(scale.value-1)/2);
    ty.value=clamp(panY.value+e.translationY,-canvasHeight*(scale.value-1)/2,canvasHeight*(scale.value-1)/2);
  });
  const tapGesture = Gesture.Tap().maxDistance(8).onEnd((e, ok) => {
    if (!ok || pinching.value) return;
    const x = (e.x-canvasWidth/2-tx.value)/scale.value+canvasWidth/2;
    const y = (e.y-canvasHeight/2-ty.value)/scale.value+canvasHeight/2;
    scheduleOnRN(tap,x/canvasWidth*sceneWidth,y/canvasHeight*sceneHeight);
  });
  const gesture = Gesture.Simultaneous(pinch,Gesture.Exclusive(pan,tapGesture));
  const resetZoom = () => {
    const duration=progress.settings.reducedMotion?0:180;
    scale.value=withTiming(1,{duration});tx.value=withTiming(0,{duration});ty.value=withTiming(0,{duration});
  };
  const showHint = () => {
    resetZoom();
    setHint(engine.hint()?.id);
  };
  const searchLabel=config.mode==='sequence'?'По порядку':config.mode==='silhouette'?'По силуэтам':'Список Юли';

  return <Screen scroll={available < 620} style={css.page}>
    <Heading eyebrow={`Поиск предметов · Уровень ${config.id}`} title={config.title} back="Пауза" onBack={()=>setPaused(true)}
      end={<GameButton title="Исходный масштаб" icon="rewind" variant="round" onPress={resetZoom}/>}/>
    {!!config.tutorial && <Instruction visible={tutorial} title="Поиск предметов" text={config.tutorial} button="Начать поиск" onClose={() => setTutorial(false)}/>}
    <View style={css.stage}>
      <GestureDetector gesture={gesture}><View style={[css.canvas,{width:canvasWidth,height:canvasHeight}]}>
        <Animated.View style={sceneStyle} pointerEvents="none">
          <HiddenRoom {...{config,engine,found}} width={canvasWidth} height={canvasHeight} highlight={hint} still={progress.settings.reducedMotion||progress.settings.lowGraphics}/>
        </Animated.View>
      </View></GestureDetector>
      <View style={css.hint}><GameButton title="Подсказка" icon="eye" variant="round" onPress={showHint} disabled={engine.complete}/></View>
    </View>
    <View style={css.list}>
      <Row style={css.listTop}><Text style={css.listTitle}>{searchLabel}</Text><Label tone="gold">{found.length} / {config.targets.length}</Label></Row>
      <ProgressLine now={found.length} max={config.targets.length}/>
      {!!feedback && <Label>{feedback}</Label>}
      <View style={css.items}>{(config.mode==='sequence' ? engine.selectable : config.targets).map(item => {
        const marked=found.includes(item.id);
        return config.mode==='silhouette' ?
          <View key={item.id} accessible accessibilityLabel={item.title} style={[css.silhouette,{opacity:marked?.38:1}]}>
            <Svg width={32} height={32} viewBox="0 0 50 50"><ObjectGlyph id={item.id}/></Svg>
          </View> : <View key={item.id} style={css.slot}>
            <Text style={[css.item,marked&&css.found,item.id===hint&&{color:palette.gold}]}>{item.title}</Text>
          </View>;
      })}</View>
    </View>
    <GameWindow visible={paused} title="Поиск приостановлен" onClose={()=>setPaused(false)} center>
      <Copy>Найденные предметы сохраняются в сюжетном прохождении.</Copy>
      <Row>
        <GameButton title="Выйти" onPress={navigation.goBack} icon="back" compact/>
        <GameButton title="Продолжить" onPress={()=>setPaused(false)} variant="primary" compact/>
      </Row>
    </GameWindow>
  </Screen>;
}

const css = StyleSheet.create({
  page:{gap:9},
  stage:{alignSelf:'center',padding:2,borderRadius:21,borderWidth:1,borderColor:'#a18055',backgroundColor:'#0f1c27'},
  canvas:{overflow:'hidden',borderRadius:18,backgroundColor:'#604d3c'},
  hint:{position:'absolute',right:9,bottom:9},
  list:{paddingHorizontal:11,paddingVertical:8,gap:5,borderTopWidth:1,borderColor:'#856e50',backgroundColor:'#1c2c3a',borderRadius:12},
  listTop:{justifyContent:'space-between'},
  listTitle:{fontFamily:'serif',fontSize:19,fontWeight:'700',color:palette.cream},
  items:{flexDirection:'row',flexWrap:'wrap',columnGap:6,rowGap:1},
  slot:{width:'47%',paddingVertical:1,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#54606a'},
  item:{fontSize:12,color:palette.cream,lineHeight:16},
  silhouette:{paddingHorizontal:3,backgroundColor:'#d4bb91',borderRadius:6},
  found:{color:palette.green,textDecorationLine:'line-through'}
});
