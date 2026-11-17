import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useGame } from '../components/GameContext';
import { Button, Copy, Heading, Label, palette, Panel, Row, Screen, Title } from '../components/ui';
import { Portrait, YuliaSprite } from '../assets/Portrait';
import { farmShore } from '../assets/farmArt';
import { gems, roomArt } from '../assets/gameArt';
import { characters } from '../data/characters';
import { clues, intro, locations } from '../data/story/chapter';
import type { Location } from '../data/story/chapter';
import { chapterForLevel, discoveries } from '../data/story/campaignStory';
import { chapterComplete, pendingAction, sceneAction, storyActions } from '../core/story/StoryEngine';
import { dailyReward, freshProgress, LIFE_INTERVAL, localDay, spend } from '../core/progress/ProgressSystem';
import type { Settings } from '../core/progress/ProgressSystem';
import { levelMode, totalLevels } from '../data/levels';
import { CreamCard,PaperText,PaperTitle,VillageButton,VillageFrame } from '../components/VillageUI';
import type { Routes } from './routes';

const house = require('../assets/house.jpg');
type Props<T extends keyof Routes> = NativeStackScreenProps<Routes,T>;

export function Splash() {
  return <Screen><View style={css.splash}><Image source={require('../assets/farm/splash.png')} style={{height:92,width:92,borderRadius:46}}/><Title>Тихий берег</Title><Label>Открываем дневник…</Label></View></Screen>;
}

export function MenuScreen({navigation}:Props<'Menu'>) {
  const {progress}=useGame();
  const {height}=useWindowDimensions();
  const play=()=>progress.introSeen?navigation.replace('Home'):navigation.replace('Dialogue',{id:'intro'});
  const motion=!progress.settings.reducedMotion&&!progress.settings.lowGraphics;
  return <Screen scroll={height<600}>
    <View style={[css.menuHero,height>=600&&{flex:1}]}>
      <ImageBackground source={farmShore} style={css.imageContent} resizeMode="cover">
        {motion&&[0,1,2].map(n=><AutumnLeaf seed={n} key={n}/>)}
        <Animated.View entering={motion?FadeInUp.duration(340):undefined} style={css.heroCopy}>
          <Text style={css.heroKicker}>НОВОДЕВИЧЬЕ · ВОЛГА</Text>
          <Text accessibilityRole="header" style={css.logo}>Тихий берег</Text>
          <Text style={css.heroLine}>Юля возвращается домой</Text>
        </Animated.View>
      </ImageBackground>
    </View>
    <VillageButton title="Играть" onPress={play}/>
    <VillageButton title="Настройки" compact green onPress={()=>navigation.navigate('Settings')}/>
  </Screen>;
}

function AutumnLeaf({seed}:{seed:number}){
  const time=useSharedValue(0);
  useEffect(()=>{time.value=withRepeat(withTiming(1,{duration:4800+seed*1200}),-1,false);},[seed,time]);
  const drift=useAnimatedStyle(()=>({opacity:Math.min(.76,Math.min(time.value,1-time.value)*4),
    transform:[{translateX:35*Math.sin(time.value*6+seed)},{translateY:time.value*(230+seed*27)},{rotate:`${time.value*205+seed*40}deg`}]}));
  return <Animated.View pointerEvents="none"
    style={[{position:'absolute',top:-18+seed*33,left:`${14+seed*24}%`,width:15+seed*4,height:15+seed*4,zIndex:1},drift]}>
    <Image source={gems[3]} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
  </Animated.View>;
}

export function HomeScreen({navigation}:Props<'Home'>) {
  const {progress,saveError}=useGame();
  const action=pendingAction(progress);
  const latest=sceneAction(progress);
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const clock=setInterval(()=>setNow(Date.now()),15000);return ()=>clearInterval(clock);},[]);
  const current=chapterForLevel(progress.nextLevel);
  const location=latest?.location??'yard';
  const done=chapterComplete(progress);
  const remaining=progress.regenFrom===null?0:Math.max(0,Math.ceil((progress.regenFrom+LIFE_INTERVAL-Math.max(now,progress.regenFrom))/60000));
  function play(){
    if(done)return navigation.navigate('Finish');
    const id=progress.nextLevel;
    if(levelMode(id)==='hidden')navigation.navigate('Hidden',{id});
    else navigation.navigate('Match',{id});
  }
  return <VillageFrame active="Home" navigation={navigation} title={current.title} kicker={`НОВОДЕВИЧЬЕ · ГЛАВА ${current.number}`}>
    {saveError&&<PaperText small>Хранилище временно недоступно. Повторяем сохранение.</PaperText>}
    <View style={css.scene}>
      <LocationArt location={location} lit={progress.actions.includes('power')||progress.village.includes('home')}
        restored={progress.actions.includes('clear')||progress.village.includes('home')}/>
      <View pointerEvents="none" style={{position:'absolute',right:0,bottom:4}}><YuliaSprite still={progress.settings.reducedMotion||progress.settings.lowGraphics}/></View>
      <View style={css.sceneFooter}><Portrait id="yulia" size={42}/><View style={css.locationLabel}>
        <Label tone="gold">Юля</Label><Copy>{current.number===1?locations[location]:current.district}</Copy>
      </View></View>
    </View>
    {action?<CreamCard><PaperTitle>{action.title}</PaperTitle><PaperText small>
      {action.cost?`Нужно звёзд: ${action.cost} · награда: 12 сердец`:'Сюжетная сцена'}
    </PaperText><VillageButton title="Продолжить историю" green disabled={progress.stars<action.cost}
      onPress={()=>navigation.navigate('Dialogue',{id:action.id})}/></CreamCard>:
      <VillageButton title={done?'Финал расследования':`Играть · уровень ${progress.nextLevel}`} onPress={play}
        disabled={!done&&(progress.lives===0||progress.nextLevel>totalLevels)}/>}
    {!action&&!done&&progress.lives===0&&<PaperText small>До следующей жизни: {remaining} мин. Ферма открыта.</PaperText>}
    <View style={css.links}>
      <VillageButton title="Дневник" compact green onPress={()=>navigation.navigate('Journal')}/>
      <VillageButton title="Посылка" compact green onPress={()=>navigation.navigate('Daily')}/>
      <VillageButton title="Настройки" compact onPress={()=>navigation.navigate('Settings')}/>
    </View>
  </VillageFrame>;
}

export function DialogueScreen({navigation,route}:Props<'Dialogue'>) {
  const { progress, update, effect } = useGame();
  const {id,reread}=route.params;
  const action=storyActions.find(item=>item.id===id);
  const lines=id==='intro'?intro:action?.lines??[];
  const [index,setIndex]=useState(0);
  const [closing,setClosing]=useState(false);
  const closed=useRef(false);
  const line=lines[index];
  const finish=async()=>{
    if(closed.current)return;
    closed.current=true;
    setClosing(true);
    if(reread){navigation.goBack();return;}
    if(id==='intro')await update(state=>({...state,introSeen:true}));
    if(action)await update(state=>spend(state,action));
    if(id==='intro')navigation.replace('Home');
    else if(action?.after===totalLevels)navigation.replace('Finish');
    else navigation.goBack();
  };
  const next=()=>{
    if(index+1>=lines.length){void finish();return;}
    if(lines[index+1].speaker==='radio')effect('radio');
    setIndex(index+1);
  };
  return <Screen scroll>
    <Heading eyebrow={chapterForLevel(action?.after ?? 1).title} title={action?.title ?? 'Дорога домой'}/>
    <View style={css.storyArt}>
      <LocationArt location={action?.location ?? 'yard'} lit={id!=='final' && (id==='power' || progress.actions.includes('power'))}
        restored={id==='clear' || progress.actions.includes('clear')}/>
      {line?.speaker==='yulia' && <View pointerEvents="none" style={{position:'absolute',right:11,bottom:0}}>
        <YuliaSprite lantern={id==='final' || action?.location==='attic'} still={progress.settings.reducedMotion}/>
      </View>}
    </View>
    {line && <Animated.View entering={FadeIn.duration(200)} key={index}>
      <Panel><Row><Portrait id={line.speaker} size={68} mood={line.mood}/><View style={{flex:1}}>
        <Label tone="gold">{characters[line.speaker].name}</Label><Label>{index+1} / {lines.length}</Label>
      </View></Row><Copy>{line.text}</Copy></Panel>
    </Animated.View>}
    <VillageButton title={index+1>=lines.length?'Завершить сцену':'Дальше'} disabled={closing} onPress={next}/>
    {index+1<lines.length&&<VillageButton title="Пропустить сцену" compact green disabled={closing} onPress={()=>void finish()}/>}
  </Screen>;
}

export function SettingsScreen({navigation}:Props<'Settings'>) {
  const {progress, update} = useGame();
  const options: [keyof Settings,string][] = [['music','Музыка'],['sounds','Звуки'],['vibration','Вибрация'],['reducedMotion','Уменьшить анимацию'],['lowGraphics','Облегчённые эффекты']];
  return <Screen scroll>
    <Heading title="Настройки" onBack={navigation.goBack}/>
    <Panel>{options.map(([key,label]) => <Row key={key}><Copy>{label}</Copy><Switch accessibilityLabel={label} trackColor={{true:'#718d6e'}}
      thumbColor={progress.settings[key] ? palette.gold : '#b7c4b6'} value={progress.settings[key]}
      onValueChange={value => void update(s => ({...s,settings:{...s.settings,[key]:value}}))}/></Row>)}</Panel>
    <Button title="Сбросить прогресс" secondary onPress={() => Alert.alert('Начать сначала?', 'Уровни, хозяйство, деньги, улики и настройки будут удалены с этого устройства.', [
      {text:'Отмена',style:'cancel'},{text:'Сбросить',style:'destructive',onPress:() => {void update(freshProgress);navigation.reset({index:0,routes:[{name:'Menu'}]});}}
    ])}/>
  </Screen>;
}

export function DailyScreen({navigation}:Props<'Daily'>) {
  const {progress,update} = useGame();
  const claimed = !!progress.daily && progress.daily >= localDay();
  return <Screen scroll>
    <Heading title="Ежедневная награда" onBack={navigation.goBack}/>
    <Panel animated><Title small>Посылка у порога</Title><Copy>Внутри 12 сердец, удобрение, молоток и одна жизнь, если жизней меньше пяти.</Copy>
      <Label tone="gold">Молотки · {progress.hammers}</Label></Panel>
    <Button title={claimed ? 'Сегодня уже получено' : 'Забрать'} disabled={claimed} onPress={() => void update(s => dailyReward(s))}/>
  </Screen>;
}

export function JournalScreen({navigation}:Props<'Journal'>) {
  const {progress} = useGame();
  const [tab,setTab]=useState('Улики');
  const entries:Record<string,{title:string;text:string}>={...clues,...discoveries};
  const tabs=['Улики','Люди','Фото','Записки','События','Вопросы'];
  const found=progress.clues.map(id=>entries[id]).filter(Boolean);
  const listed=tab==='Фото' ? found.filter(entry=>/фото|снимок|негатив/i.test(entry.title)) :
    tab==='Записки' ? found.filter(entry=>/письмо|записк|журнал|дневник|лист|запис/i.test(entry.title)) : found;
  return <Screen scroll>
    <Heading title="Дневник Юли" onBack={navigation.goBack}/>
    <View style={css.links}>{tabs.map(title=><Button key={title} title={title} onPress={()=>setTab(title)} secondary={title!==tab} compact/>)}</View>
    {['Улики','Фото','Записки'].includes(tab) && <>
      {!listed.length && <Panel><Copy>Первые записи появятся после находок.</Copy></Panel>}
      {listed.map(entry=><Panel key={entry.title}><Label tone="gold">{entry.title}</Label><Copy>{entry.text}</Copy></Panel>)}
    </>}
    {tab==='Люди' && (['yulia','vera','anna','mikhail','stranger'] as const).filter(id => id==='yulia' ||
      progress.actions.includes({vera:'key',anna:'anna',mikhail:'mikhail',stranger:'figure'}[id])).map(id => <Panel key={id}>
        <Row><Portrait id={id} size={52}/><View style={{flex:1}}><Label tone="gold">{characters[id].name}</Label><Label>{characters[id].role}</Label></View></Row>
        <Copy>{characters[id].bio}</Copy>
    </Panel>)}
    {tab==='События' && storyActions.filter(action=>progress.actions.includes(action.id)).map(action=><Panel key={action.id}>
      <Label tone="gold">{action.title}</Label><Copy>{action.lines.at(-1)?.text}</Copy>
      <Button title="Перечитать диалог" secondary compact onPress={()=>navigation.navigate('Dialogue',{id:action.id,reread:true})}/>
    </Panel>)}
    {tab==='Вопросы' && <Panel><Copy>{chapterComplete(progress) ? 'Все двадцать три имени установлены. Список сохранён в дневнике.' :
      progress.nextLevel>225 ? 'Как удержать переправу открытой до рассвета?' :
      progress.nextLevel>75 ? 'Почему люди продолжают отвечать с того же дня?' : 'Что произошло у переправы в ночь на 17 августа 1987 года?'}</Copy></Panel>}
  </Screen>;
}

function LocationArt({location,lit,restored}:{location:Location;lit:boolean;restored:boolean}) {
  const source=location==='yard' || location==='shore' ? house : location==='hall' ? roomArt.archive : roomArt[location];
  return <ImageBackground source={source} style={StyleSheet.absoluteFill} imageStyle={{opacity:lit ? 1 : .71}}>
    <View style={[StyleSheet.absoluteFill,{backgroundColor:lit ? '#e9ad4d10' : '#101d213d'}]}/>
    {restored && lit && <View style={{position:'absolute',top:'12%',left:'23%',width:52,height:62,borderRadius:23,backgroundColor:'#ffd38830'}}/>}
  </ImageBackground>;
}

export function FinishScreen({navigation}:Props<'Finish'>) {
  return <Screen scroll>
    <View style={css.storyArt}><Image source={house} style={css.imageContent}/></View>
    <Panel animated><Label tone="gold">Расследование завершено</Label><Title>Ночь 1987 года</Title><Copy>Двадцать три имени снова на своём берегу.</Copy></Panel>
    <Button title="К дому" onPress={() => navigation.navigate('Home')}/>
  </Screen>;
}

const css = StyleSheet.create({
  splash:{flex:1,alignItems:'center',justifyContent:'center',gap:13},
  menuHero:{minHeight:290,borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  imageContent:{width:'100%',height:'100%',justifyContent:'flex-end'},
  heroCopy:{zIndex:2,padding:17,gap:4,backgroundColor:'#35452ae8'},
  heroKicker:{color:'#f2cc82',fontSize:12,fontWeight:'900',letterSpacing:1},
  heroLine:{color:'#fff1c5',fontSize:16,fontWeight:'700'},
  logo:{fontFamily:'serif',color:palette.cream,fontSize:43,lineHeight:48,fontWeight:'700',letterSpacing:-1.5},
  scene:{height:239,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  storyArt:{height:228,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  sceneFooter:{position:'absolute',left:10,bottom:10,right:10,flexDirection:'row',gap:8,alignItems:'center'},
  locationLabel:{backgroundColor:'#172929eb',borderRadius:12,paddingHorizontal:12,paddingVertical:5,flexShrink:1},
  guest:{position:'absolute',right:12,top:12},
  links:{flexDirection:'row',flexWrap:'wrap',gap:7},
});
