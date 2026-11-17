import React, { useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useGame } from '../components/GameContext';
import { Button, Copy, Heading, Label, palette, Panel, Row, Screen, Title } from '../components/ui';
import { Portrait, YuliaSprite } from '../assets/Portrait';
import { roomArt } from '../assets/gameArt';
import { characters } from '../data/characters';
import { clues, intro, locations } from '../data/story/chapter';
import type { Location } from '../data/story/chapter';
import { chapterForLevel, discoveries } from '../data/story/campaignStory';
import { chapterComplete, pendingAction, sceneAction, storyActions } from '../core/story/StoryEngine';
import { dailyReward, freshProgress, LIFE_INTERVAL, localDay, spend } from '../core/progress/ProgressSystem';
import type { Settings } from '../core/progress/ProgressSystem';
import { levelMode, totalLevels } from '../data/levels';
import type { Routes } from './routes';

const house = require('../assets/house.jpg');
type Props<T extends keyof Routes> = NativeStackScreenProps<Routes,T>;

export function Splash() {
  return <Screen><View style={css.splash}><Image source={require('../assets/splash.png')} style={{height:92,width:92,borderRadius:46}}/><Title>Тихий берег</Title><Label>Открываем дневник…</Label></View></Screen>;
}

export function MenuScreen({navigation}:Props<'Menu'>) {
  const { progress } = useGame();
  const play = () => {
    if (progress.introSeen) navigation.replace('Home');
    else navigation.replace('Dialogue',{id:'intro'});
  };
  return <Screen scroll>
    <View style={css.menuHero}>
      <ImageBackground source={house} style={css.imageContent} resizeMode="cover">
        <View style={css.heroShade}/>
        <Animated.View entering={FadeInUp.duration(420)} style={css.heroCopy}>
          <Label tone="gold">Волга · 1998 год</Label>
          <Text style={css.logo}>Тихий{ '\n' }берег</Text>
          <Copy>Глава {chapterForLevel(progress.nextLevel).number} · {chapterForLevel(progress.nextLevel).title}</Copy>
        </Animated.View>
      </ImageBackground>
    </View>
    <Button title={progress.introSeen ? 'Продолжить' : 'Начать историю'} onPress={play}/>
    <Button title="Настройки" onPress={() => navigation.navigate('Settings')} secondary/>
  </Screen>;
}

export function HomeScreen({navigation}:Props<'Home'>) {
  const { progress, saveError } = useGame();
  const action = pendingAction(progress);
  const latest = sceneAction(progress);
  const [now,setNow] = useState(() => Date.now());
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(clock);
  }, []);
  const location = latest?.location ?? 'yard';
  const current=chapterForLevel(progress.nextLevel);
  const done = chapterComplete(progress);
  const remaining = progress.regenFrom === null ? 0 : Math.max(0, Math.ceil((progress.regenFrom + LIFE_INTERVAL - Math.max(now,progress.regenFrom)) / 60000));
  const play = () => {
    if (done) return navigation.navigate('Finish');
    const params = { id:progress.nextLevel };
    if (levelMode(params.id) === 'hidden') navigation.navigate('Hidden', params);
    else navigation.navigate('Match', params);
  };
  return <Screen scroll>
    <Heading eyebrow={`Глава ${current.number}`} title={current.title} back="Настройки" onBack={() => navigation.navigate('Settings')}/>
    <Row><Label tone="rust">Жизни {progress.lives}/5{remaining ? ` · +1 через ${remaining} мин` : ''}</Label><Label tone="gold">Звёзды · {progress.stars}</Label></Row>
    {saveError && <Label tone="rust">Хранилище временно недоступно. Повторяем сохранение.</Label>}
    <View style={css.scene}>
      <LocationArt location={location} lit={progress.actions.includes('power')} restored={progress.actions.includes('clear')}/>
      <View pointerEvents="none" style={{position:'absolute',right:2,bottom:24}}><YuliaSprite still={progress.settings.reducedMotion}/></View>
      <View style={css.sceneFooter}><Portrait id="yulia" size={51}/><View style={css.locationLabel}><Label tone="gold">Тихий берег</Label><Copy>{current.number===1 ? locations[location] : current.district}</Copy></View></View>
      {latest?.id === 'anna' && <View style={css.guest}><Portrait id="anna" size={62}/></View>}
      {latest?.id === 'mikhail' && <View style={css.guest}><Portrait id="mikhail" size={62}/></View>}
      {latest?.id === 'key' && <View style={css.guest}><Portrait id="vera" size={62}/></View>}
    </View>
    {action ? <Panel animated><Label tone="gold">{action.cost ? `Сюжетное задание · ${action.cost} звезда` : 'Осмотр локации'}</Label>
      <Title small>{action.title}</Title>
      <Button title="Выполнить" disabled={progress.stars < action.cost} onPress={() => navigation.navigate('Dialogue',{id:action.id})}/>
    </Panel> : null}
    {progress.nextLevel <= totalLevels || done ? <Button title={done ? 'Финал расследования' : `Уровень ${progress.nextLevel} · ${levelMode(progress.nextLevel) === 'hidden' ? 'Поиск предметов' : 'Три в ряд'}`}
      onPress={play} disabled={!!action || (!done && progress.lives === 0)}/> : null}
    {!action && !done && progress.lives === 0 && <Copy>Дождитесь восстановления жизни или заберите ежедневную награду.</Copy>}
    <View style={css.links}>
      <Button title="Карта" onPress={() => navigation.navigate('Map')} secondary compact/>
      <Button title="Улики" onPress={() => navigation.navigate('Journal')} secondary compact/>
      <Button title={progress.daily && progress.daily >= localDay() ? 'Награда' : 'Забрать награду'} onPress={() => navigation.navigate('Daily')} secondary compact/>
    </View>
    <Button title="Главное меню" onPress={() => navigation.replace('Menu')} secondary compact/>
  </Screen>;
}

export function DialogueScreen({navigation,route}:Props<'Dialogue'>) {
  const { progress, update, effect } = useGame();
  const { id } = route.params;
  const action = storyActions.find(item => item.id === id);
  const lines = id === 'intro' ? intro : action?.lines ?? [];
  const [index,setIndex] = useState(0);
  const [closing,setClosing] = useState(false);
  const line = lines[index];
  const next = async () => {
    if (closing) return;
    if (index + 1 < lines.length) {
      if (lines[index + 1].speaker === 'radio') effect('radio');
      setIndex(index + 1);
      return;
    }
    setClosing(true);
    if (id === 'intro') await update(s => ({ ...s, introSeen:true }));
    if (action) await update(s => spend(s, action));
    if (id === 'intro') navigation.replace('Home');
    else if (action?.after===totalLevels) navigation.replace('Finish');
    else navigation.goBack();
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
    <Button title={index+1 === lines.length ? 'Завершить сцену' : 'Дальше'} disabled={closing} onPress={() => void next()}/>
  </Screen>;
}

export function SettingsScreen({navigation}:Props<'Settings'>) {
  const {progress, update} = useGame();
  const options: [keyof Settings,string][] = [['music','Музыка'],['sounds','Звуки'],['vibration','Вибрация'],['reducedMotion','Уменьшить анимацию']];
  return <Screen scroll>
    <Heading title="Настройки" onBack={navigation.goBack}/>
    <Panel>{options.map(([key,label]) => <Row key={key}><Copy>{label}</Copy><Switch accessibilityLabel={label} trackColor={{true:'#718d6e'}}
      thumbColor={progress.settings[key] ? palette.gold : '#b7c4b6'} value={progress.settings[key]}
      onValueChange={value => void update(s => ({...s,settings:{...s.settings,[key]:value}}))}/></Row>)}</Panel>
    <Button title="Сбросить прогресс" secondary onPress={() => Alert.alert('Начать сначала?', 'Уровни, улики и настройки будут удалены с этого устройства.', [
      {text:'Отмена',style:'cancel'},{text:'Сбросить',style:'destructive',onPress:() => {void update(freshProgress);navigation.reset({index:0,routes:[{name:'Menu'}]});}}
    ])}/>
  </Screen>;
}

export function DailyScreen({navigation}:Props<'Daily'>) {
  const {progress,update} = useGame();
  const claimed = !!progress.daily && progress.daily >= localDay();
  return <Screen scroll>
    <Heading title="Ежедневная награда" onBack={navigation.goBack}/>
    <Panel animated><Title small>Посылка у порога</Title><Copy>Внутри один молоток и одна жизнь, если жизней меньше пяти.</Copy>
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
  menuHero:{height:460,borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  imageContent:{width:'100%',height:'100%',justifyContent:'flex-end'},
  heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'#1729293f'},
  heroCopy:{padding:23,gap:5,backgroundColor:'#162523c9'},
  logo:{fontFamily:'serif',color:palette.cream,fontSize:64,lineHeight:60,fontWeight:'700',letterSpacing:-1.5},
  scene:{height:282,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  storyArt:{height:228,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:palette.stroke},
  sceneFooter:{position:'absolute',left:10,bottom:10,right:10,flexDirection:'row',gap:8,alignItems:'center'},
  locationLabel:{backgroundColor:'#172929eb',borderRadius:12,paddingHorizontal:12,paddingVertical:5,flexShrink:1},
  guest:{position:'absolute',right:12,top:12},
  links:{flexDirection:'row',flexWrap:'wrap',gap:7},
});
