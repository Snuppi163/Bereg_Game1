import React,{useEffect,useRef,useState} from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated,{FadeIn,FadeInUp,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import { useGame } from '../components/GameContext';
import { Confirm,Copy,GameButton,Heading,Icon,Label,palette,Scene,Screen,SegmentControl,Title } from '../components/ui';
import type { Glyph } from '../components/ui';
import { IllustratedChest,RewardToken } from '../components/RewardVisual';
import { LedgerLine,ResourceBar,VillageNav } from '../components/VillageUI';
import { Portrait,YuliaSprite } from '../assets/Portrait';
import { farmShore } from '../assets/farmArt';
import { gems,roomArt } from '../assets/gameArt';
import { characters } from '../data/characters';
import { clues,intro,locations } from '../data/story/chapter';
import type { Location } from '../data/story/chapter';
import { chapterForLevel,discoveries } from '../data/story/campaignStory';
import { chapterComplete,pendingAction,sceneAction,storyActions } from '../core/story/StoryEngine';
import { dailyReward,freshProgress,LIFE_INTERVAL,localDay,spend } from '../core/progress/ProgressSystem';
import type { Settings } from '../core/progress/ProgressSystem';
import { levelMode,totalLevels } from '../data/levels';
import { useWallClock } from '../utils/useWallClock';
import type { Routes } from './routes';

const house=require('../assets/house.jpg');
type Props<T extends keyof Routes>=NativeStackScreenProps<Routes,T>;

export function Splash(){
  return <Scene source={farmShore}><View style={css.splash}>
    <Image source={require('../assets/farm/splash.png')} style={{width:82,height:82,borderRadius:19}}/>
    <Title>Тихий берег</Title><Label tone="gold">Открываем дневник…</Label>
  </View></Scene>;
}

export function MenuScreen({navigation}:Props<'Menu'>){
  const {progress}=useGame();
  const motion=!progress.settings.reducedMotion&&!progress.settings.lowGraphics;
  const play=()=>progress.introSeen?navigation.replace('Home'):navigation.replace('Dialogue',{id:'intro'});
  return <Scene source={farmShore} shade="edges">
    <View style={css.menuTop}>
      <Text style={css.placeEyebrow}>НОВОДЕВИЧЬЕ · ВОЛГА</Text>
      <GameButton title="Настройки" icon="settings" variant="round" onPress={()=>navigation.navigate('Settings')}/>
    </View>
    {motion&&[0,1,2].map(seed=><AutumnLeaf key={seed} seed={seed}/>)}
    <View style={{flex:1}}/>
    <Animated.View entering={motion?FadeInUp.duration(380):undefined} style={css.menuBrand}>
      <Icon name="wave" color="#eed49d" size={28}/>
      <Text style={css.logo} accessibilityRole="header">Тихий берег</Text>
      <GameButton title="Играть" icon="play" onPress={play} variant="primary" style={css.play}/>
    </Animated.View>
  </Scene>;
}
function AutumnLeaf({seed}:{seed:number}){
  const time=useSharedValue(0);
  useEffect(()=>{time.value=withRepeat(withTiming(1,{duration:5000+seed*1300}),-1,false);},[seed,time]);
  const drift=useAnimatedStyle(()=>({opacity:Math.min(.7,Math.min(time.value,1-time.value)*4),
    transform:[{translateX:31*Math.sin(time.value*6+seed)},{translateY:time.value*(215+seed*24)},{rotate:`${time.value*190+seed*35}deg`}]}));
  return <Animated.View pointerEvents="none" style={[{position:'absolute',top:-18+seed*26,left:`${15+seed*24}%`,width:17,height:17},drift]}>
    <Image source={gems[3]} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
  </Animated.View>;
}

export function HomeScreen({navigation}:Props<'Home'>){
  const {progress,saveError}=useGame();
  const now=useWallClock(15000);
  const action=pendingAction(progress);
  const latest=sceneAction(progress);
  const chapter=chapterForLevel(progress.nextLevel);
  const location=latest?.location??'yard';
  const done=chapterComplete(progress);
  const remaining=progress.regenFrom===null?0:Math.max(0,Math.ceil((progress.regenFrom+LIFE_INTERVAL-Math.max(now,progress.regenFrom))/60000));
  const play=()=>{
    if(action)navigation.navigate('Dialogue',{id:action.id});
    else if(done)navigation.navigate('Finish');
    else if(levelMode(progress.nextLevel)==='hidden')navigation.navigate('Hidden',{id:progress.nextLevel});
    else navigation.navigate('Match',{id:progress.nextLevel});
  };
  const quiet=progress.settings.reducedMotion||progress.settings.lowGraphics;
  return <Scene source={locationSource(location)} shade="edges">
    <RestorationLight location={location} lit={progress.actions.includes('power')||progress.village.includes('home')}/>
    <View style={css.homeHud}>
      <Portrait id="yulia" size={41}/><ResourceBar compact/>
      <GameButton title="Настройки" icon="settings" variant="round" onPress={()=>navigation.navigate('Settings')}/>
    </View>
    <View style={css.chapterPlaque}>
      <Text style={css.placeEyebrow}>НОВОДЕВИЧЬЕ · ГЛАВА {chapter.number}</Text>
      <Text style={css.chapterTitle} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">{chapter.title}</Text>
      <Text style={css.chapterPlace} numberOfLines={1}>{chapter.number===1?locations[location]:chapter.district}</Text>
    </View>
    <View style={css.homeView}>
      <View pointerEvents="none" style={css.hero}><YuliaSprite still={quiet}/></View>
      <View style={css.shortcuts}>
        <GameButton title="Дневник" icon="book" variant="round" onPress={()=>navigation.navigate('Journal')}/>
        <GameButton title="Посылка" icon="gift" variant="round" badge={!progress.daily||progress.daily<localDay()?'!':undefined} onPress={()=>navigation.navigate('Daily')}/>
      </View>
    </View>
    <View style={css.homeActions}>
      {saveError&&<Label tone="rust">Сохранение временно недоступно</Label>}
      {action&&<Pressable accessibilityRole="button" accessibilityLabel={action.title} disabled={progress.stars<action.cost}
        onPress={play} style={css.questPlaque}>
        <View style={css.questSeal}><Icon name="tasks" size={19}/></View>
        <View style={{flex:1,minWidth:0}}><Text style={css.questKicker}>По сюжету</Text>
          <Text numberOfLines={2} style={css.questTitle}>{action.title}</Text></View>
        {action.cost>0&&<View style={css.questCost}><Icon name="star" filled size={13}/><Label tone="gold">{action.cost}</Label></View>}
        <Icon name="next" size={16}/>
      </Pressable>}
      {!action&&!done&&progress.lives===0&&<Label tone="rust">Следующая жизнь через {remaining} мин.</Label>}
      <GameButton title={done?'Финал':action?'Играть':`Играть · ${progress.nextLevel}`} icon="play" variant="primary" onPress={play} style={css.play}
        disabled={action?progress.stars<action.cost:!done&&(progress.lives<1||progress.nextLevel>totalLevels)}/>
    </View>
    <VillageNav active="Home" navigation={navigation} overlay/>
  </Scene>;
}

export function DialogueScreen({navigation,route}:Props<'Dialogue'>){
  const {progress,update,effect}=useGame();
  const {id,reread}=route.params;
  const action=storyActions.find(item=>item.id===id);
  const lines=id==='intro'?intro:action?.lines??[];
  const [index,setIndex]=useState(0),[closing,setClosing]=useState(false);
  const closed=useRef(false);
  const line=lines[index];
  async function finish(){
    if(closed.current)return;
    closed.current=true;setClosing(true);
    if(reread){navigation.goBack();return;}
    if(id==='intro')await update(state=>({...state,introSeen:true}));
    if(action)await update(state=>spend(state,action));
    if(id==='intro')navigation.replace('Home');
    else if(action?.after===totalLevels)navigation.replace('Finish');
    else navigation.goBack();
  }
  function next(){
    if(index+1>=lines.length){void finish();return;}
    if(lines[index+1].speaker==='radio')effect('radio');
    setIndex(index+1);
  }
  const quiet=progress.settings.reducedMotion||progress.settings.lowGraphics;
  return <Scene source={locationSource(action?.location??'yard')}>
    <RestorationLight location={action?.location??'yard'} lit={id!=='final'&&(id==='power'||progress.actions.includes('power')||progress.village.includes('home'))}/>
    <View style={css.dialogHeader}>
      <View style={{flex:1,minWidth:0}}><Text style={css.placeEyebrow}>{chapterForLevel(action?.after??1).title}</Text>
        <Text style={css.dialogTitle} numberOfLines={2}>{action?.title??'Дорога домой'}</Text></View>
      {index+1<lines.length&&<GameButton title="Пропустить" variant="label" onPress={()=>void finish()} disabled={closing}/>}
    </View>
    <View style={{flex:1}}>
      {line?.speaker==='yulia'&&<View style={css.dialogHero} pointerEvents="none">
        <YuliaSprite lantern={id==='final'||action?.location==='attic'} still={quiet}/></View>}
    </View>
    <View style={css.dialogFooter}>
      {line&&<Animated.View key={index} entering={quiet?undefined:FadeIn.duration(130)} style={css.speech}>
        <View style={css.speechTitle}>
          <Portrait id={line.speaker} size={51} mood={line.mood}/>
          <View style={{flex:1}}><Text style={css.actor}>{characters[line.speaker].name}</Text><Label>{index+1} / {lines.length}</Label></View>
        </View>
        <ScrollView style={{maxHeight:160}} contentContainerStyle={css.speechBody}><Text style={css.speechText}>{line.text}</Text></ScrollView>
      </Animated.View>}
      <GameButton title={index+1>=lines.length?'Завершить':'Дальше'} icon="next" variant="primary" style={css.next} disabled={closing} onPress={next}/>
    </View>
  </Scene>;
}

function RestorationLight({location,lit}:{location:Location;lit:boolean}){
  if(location==='shore'||location==='attic')return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{backgroundColor:lit?'#f8c97918':'#12233524'}]}/>;
}

const settings:{key:keyof Settings;text:string;icon:Glyph}[]=[
  {key:'music',text:'Музыка',icon:'music'},{key:'sounds',text:'Звуки',icon:'sound'},{key:'vibration',text:'Вибрация',icon:'hand'},
  {key:'reducedMotion',text:'Уменьшить анимацию',icon:'motion'},{key:'lowGraphics',text:'Облегчённые эффекты',icon:'quality'},
];
export function SettingsScreen({navigation}:Props<'Settings'>){
  const {progress,update}=useGame();
  const [reset,setReset]=useState(false);
  return <Screen scroll>
    <Heading title="Настройки" onBack={navigation.goBack}/>
    <View style={css.settingsBook}>
      {settings.map(({key,text,icon})=><Pressable key={key} accessibilityRole="switch" accessibilityLabel={text}
        accessibilityState={{checked:progress.settings[key]}}
        onPress={()=>void update(state=>({...state,settings:{...state.settings,[key]:!state.settings[key]}}))}>
        <LedgerLine title={text} icon={icon} end={<View style={[css.switchTrack,progress.settings[key]&&css.switchOn]}>
          <View style={[css.switchKnob,progress.settings[key]&&css.switchKnobOn]}/>
        </View>}/>
      </Pressable>)}
    </View>
    <GameButton title="Сбросить прогресс" variant="danger" compact icon="trash" onPress={()=>setReset(true)}/>
    <Confirm visible={reset} title="Начать сначала?" text="Уровни, хозяйство, деньги, улики и настройки будут удалены с этого устройства."
      action="Сбросить" danger onClose={()=>setReset(false)} onConfirm={async()=>{
        setReset(false);await update(freshProgress);navigation.reset({index:0,routes:[{name:'Menu'}]});
      }}/>
  </Screen>;
}

export function DailyScreen({navigation}:Props<'Daily'>){
  const {progress,update,effect}=useGame();
  const [opened,setOpened]=useState(false);
  const claimed=!!progress.daily&&progress.daily>=localDay();
  return <Scene source={house}>
    <View style={css.sceneHeader}><Heading title="Посылка у порога" onBack={navigation.goBack}/><ResourceBar compact/></View>
    <View style={{flex:1}}/>
    <View style={css.rewardStage}>
      <IllustratedChest size={164} opened={opened}/>
      <View style={css.rewardTokens}>
        <RewardToken icon="heart" label="+12"/><RewardToken icon="hammer" label="+1" delay={80}/>
        <RewardToken icon="farm" label="Удобрение" delay={120}/>{progress.lives<5&&<RewardToken icon="life" label="+1" delay={160}/>}
      </View>
      <GameButton title={claimed?'Посылка получена':'Открыть посылку'} variant="primary" style={css.play}
        disabled={claimed} onPress={async()=>{
          let changed=false;await update(state=>{const next=dailyReward(state);changed=next!==state;return next;});
          if(changed){effect('win');setOpened(true);}
        }}/>
    </View>
  </Scene>;
}

const journalTabs=([
  {id:'clues',label:'Улики'},{id:'people',label:'Люди'},{id:'photos',label:'Фото'},{id:'notes',label:'Записки'},
  {id:'events',label:'События'},{id:'questions',label:'Вопросы'},
] as const);
type JournalTab=typeof journalTabs[number]['id'];
export function JournalScreen({navigation}:Props<'Journal'>){
  const {progress}=useGame();
  const [tab,setTab]=useState<JournalTab>('clues');
  const entries:Record<string,{title:string;text:string}>={...clues,...discoveries};
  const found=progress.clues.map(id=>entries[id]).filter(Boolean);
  const listed=tab==='photos'?found.filter(entry=>/фото|снимок|негатив/i.test(entry.title)):
    tab==='notes'?found.filter(entry=>/письмо|записк|журнал|дневник|лист|запис/i.test(entry.title)):found;
  return <Screen scroll>
    <Heading title="Дневник Юли" onBack={navigation.goBack}/>
    <SegmentControl options={journalTabs} value={tab} onChange={setTab}/>
    <View style={css.journal}>
      {['clues','photos','notes'].includes(tab)&&<>
        {!listed.length&&<Text style={css.journalCopy}>Здесь пока нет записей.</Text>}
        {listed.map(entry=><View style={css.journalEntry} key={entry.title}>
          <Text style={css.journalTitle}>{entry.title}</Text><Text style={css.journalCopy}>{entry.text}</Text>
        </View>)}
      </>}
      {tab==='people'&&(['yulia','vera','anna','mikhail','stranger'] as const).filter(id=>id==='yulia'||
        progress.actions.includes({vera:'key',anna:'anna',mikhail:'mikhail',stranger:'figure'}[id])).map(id=><View key={id} style={css.journalEntry}>
          <View style={css.journalPerson}><Portrait id={id} size={44}/><View style={{flex:1}}>
            <Text style={css.journalTitle}>{characters[id].name}</Text><Text style={css.journalCopy}>{characters[id].role}</Text></View></View>
          <Text style={css.journalCopy}>{characters[id].bio}</Text>
        </View>)}
      {tab==='events'&&storyActions.filter(action=>progress.actions.includes(action.id)).map(action=><View key={action.id} style={css.journalEntry}>
        <View style={css.journalPerson}><Text style={[css.journalTitle,{flex:1}]}>{action.title}</Text>
          <GameButton title="Перечитать диалог" icon="rewind" variant="round"
            onPress={()=>navigation.navigate('Dialogue',{id:action.id,reread:true})}/></View>
        <Text style={css.journalCopy}>{action.lines.at(-1)?.text}</Text>
      </View>)}
      {tab==='questions'&&<Text style={css.journalCopy}>{chapterComplete(progress)?'Все двадцать три имени установлены. Список сохранён в дневнике.':
        progress.nextLevel>225?'Как удержать переправу открытой до рассвета?':progress.nextLevel>75?
        'Почему люди продолжают отвечать с того же дня?':'Что произошло у переправы в ночь на 17 августа 1987 года?'}</Text>}
    </View>
  </Screen>;
}
function locationSource(location:Location){
  return location==='yard'||location==='shore'?house:location==='hall'?roomArt.archive:roomArt[location];
}

export function FinishScreen({navigation}:Props<'Finish'>){
  return <Scene source={house}>
    <View style={{flex:1}}/>
    <View style={css.rewardStage}>
      <Icon name="wave" size={42}/><Label tone="gold">Расследование завершено</Label><Title>Ночь 1987 года</Title>
      <Copy>Двадцать три имени снова на своём берегу.</Copy>
      <GameButton title="К дому" icon="village" variant="primary" style={css.play} onPress={()=>navigation.navigate('Home')}/>
    </View>
  </Scene>;
}

const css=StyleSheet.create({
  splash:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
  menuTop:{paddingHorizontal:15,paddingTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  placeEyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.25,color:'#f6d5a0',textShadowColor:'#182133',textShadowRadius:4},
  menuBrand:{alignItems:'center',gap:6,paddingBottom:31,paddingHorizontal:18},
  logo:{fontFamily:'serif',fontSize:42,lineHeight:49,fontWeight:'700',color:'#ffebbf',textAlign:'center',
    textShadowColor:'#091420',textShadowOffset:{width:1,height:2},textShadowRadius:8},
  play:{alignSelf:'center',width:'76%',minWidth:180,maxWidth:290},
  homeHud:{paddingHorizontal:9,paddingTop:5,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},
  chapterPlaque:{marginLeft:13,marginTop:12,maxWidth:'92%'},
  chapterTitle:{fontFamily:'serif',color:'#fff0cb',fontSize:27,lineHeight:33,fontWeight:'700',
    textShadowColor:'#0b1622',textShadowRadius:6,textShadowOffset:{width:0,height:2}},
  chapterPlace:{color:'#edddbd',fontSize:12,fontWeight:'600',textShadowColor:'#091323',textShadowRadius:4},
  homeView:{flex:1,minHeight:95},hero:{position:'absolute',bottom:-9,right:'9%'},
  shortcuts:{position:'absolute',left:12,bottom:6,gap:7,alignItems:'flex-start'},
  homeActions:{paddingHorizontal:13,paddingBottom:4,alignItems:'center',gap:6},
  questPlaque:{flexDirection:'row',alignItems:'center',gap:7,width:'100%',maxWidth:410,
    paddingHorizontal:9,paddingVertical:5,backgroundColor:'#20374beF',borderRadius:17,borderWidth:1,borderColor:'#92754d',minHeight:52},
  questSeal:{width:33,height:33,borderRadius:17,borderWidth:1,borderColor:'#debb7a',backgroundColor:'#54462f',alignItems:'center',justifyContent:'center'},
  questKicker:{color:'#e5be87',fontSize:10,fontWeight:'800'},questTitle:{color:'#fff0d0',fontSize:13,fontWeight:'700'},
  questCost:{flexDirection:'row',alignItems:'center',gap:3},
  dialogHeader:{marginTop:9,marginHorizontal:15,flexDirection:'row',gap:8,alignItems:'center'},
  dialogTitle:{fontFamily:'serif',fontSize:23,lineHeight:27,fontWeight:'700',color:palette.cream,textShadowColor:'#0b1622',textShadowRadius:4},
  dialogHero:{position:'absolute',right:'7%',bottom:-10},
  dialogFooter:{paddingHorizontal:12,paddingBottom:7,gap:5},
  speech:{backgroundColor:'#ead8b1',borderColor:'#ac8050',borderWidth:2,borderRadius:16,overflow:'hidden'},
  speechTitle:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:5,backgroundColor:'#273748'},
  actor:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:palette.cream},
  speechBody:{paddingVertical:9,paddingHorizontal:13},speechText:{fontSize:16,lineHeight:22,color:'#342b25'},
  next:{alignSelf:'flex-end',minWidth:125},settingsBook:{borderRadius:17,borderWidth:1,borderColor:'#75654c',backgroundColor:'#203343',paddingHorizontal:9},
  switchTrack:{width:46,height:24,borderRadius:13,borderWidth:1,borderColor:'#738092',backgroundColor:'#162435',padding:2,justifyContent:'center'},
  switchOn:{backgroundColor:'#aa7542',borderColor:'#f1cca0'},
  switchKnob:{width:18,height:18,borderRadius:10,backgroundColor:'#abbcc8'},switchKnobOn:{alignSelf:'flex-end',backgroundColor:'#ffddb0'},
  sceneHeader:{paddingHorizontal:12,paddingTop:8,gap:7},
  rewardStage:{alignItems:'center',gap:10,paddingHorizontal:13,paddingBottom:28},
  rewardTokens:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:5},
  journal:{backgroundColor:'#eaddbd',borderColor:'#aa895d',borderWidth:1,borderLeftWidth:6,borderRadius:12,paddingHorizontal:12,paddingVertical:5},
  journalEntry:{gap:5,paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#c4ae82'},
  journalTitle:{fontFamily:'serif',fontSize:18,fontWeight:'700',color:'#493325'},journalCopy:{fontSize:14,lineHeight:20,color:'#4a4136'},
  journalPerson:{flexDirection:'row',alignItems:'center',gap:9},
});
