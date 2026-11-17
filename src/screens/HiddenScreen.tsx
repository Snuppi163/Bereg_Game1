import React, { useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ObjectGlyph } from '../assets/Objects';
import Svg from 'react-native-svg';
import { HiddenRoom } from '../components/HiddenRoom';
import { useGame } from '../components/GameContext';
import { Button, Heading, Instruction, Label, palette, Panel, Row, Screen } from '../components/ui';
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
  const {width,height} = useWindowDimensions();
  const canvasWidth = Math.floor(Math.min(width-32,480,Math.max(180,(height-327)*.75)));
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
    if (snapshot.found.length === config.targets.length && navigation.isFocused()) navigation.replace('Result',{id:config.id,won:true});
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
  const resetZoom = () => {scale.value=withTiming(1);tx.value=withTiming(0);ty.value=withTiming(0);};
  const showHint = () => {
    resetZoom();
    setHint(engine.hint()?.id);
  };
  const pause = () => Alert.alert('Пауза','Найденные предметы сохраняются в сюжетном прохождении.',[
    {text:'Продолжить',style:'cancel'}, {text:'Выйти',onPress:navigation.goBack}
  ]);

  return <Screen scroll={height < 550}>
    <Heading eyebrow={`Уровень ${config.id} · Поиск предметов`} title={config.title} back="Пауза" onBack={pause}/>
    {!!config.tutorial && <Instruction visible={tutorial} title="Поиск предметов" text={config.tutorial} button="Начать поиск" onClose={() => setTutorial(false)}/>}
    <GestureDetector gesture={gesture}><View style={[css.canvas,{width:canvasWidth,height:canvasHeight}]}>
      <Animated.View style={sceneStyle} pointerEvents="none">
        <HiddenRoom {...{config,engine,found}} width={canvasWidth} height={canvasHeight} highlight={hint} still={progress.settings.reducedMotion}/>
      </Animated.View>
    </View></GestureDetector>
    <Panel>
      <Label tone="gold">Найдено {found.length} из {config.targets.length}{config.mode==='sequence' ? ' · по порядку' : config.mode==='silhouette' ? ' · по рисунку' : ''}</Label>
      {!!feedback && <Label>{feedback}</Label>}
      <View style={css.items}>{(config.mode==='sequence' ? engine.selectable : config.targets).map(item => {
        const marked=found.includes(item.id);
        return config.mode==='silhouette' ?
          <View key={item.id} accessible accessibilityLabel={item.title} style={{opacity:marked?.38:1}}>
            <Svg width={32} height={32} viewBox="0 0 50 50"><ObjectGlyph id={item.id}/></Svg>
          </View> : <Text key={item.id} style={[css.item,marked && css.found,item.id === hint && {color:palette.gold}]}>
            {item.title}
          </Text>;
      })}</View>
    </Panel>
    <Row><Button title="Подсказка" onPress={showHint} secondary compact disabled={engine.complete}/>
      <Button title="Сбросить масштаб" onPress={resetZoom} secondary compact/></Row>
  </Screen>;
}

const css = StyleSheet.create({
  canvas:{alignSelf:'center',overflow:'hidden',borderRadius:15,backgroundColor:'#604d3c'},
  items:{flexDirection:'row',flexWrap:'wrap',columnGap:9,rowGap:4},
  item:{fontSize:14,flexBasis:'47%',color:palette.cream,lineHeight:20},
  found:{color:palette.green,textDecorationLine:'line-through'}
});
