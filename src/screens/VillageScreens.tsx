import React,{useState} from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated,{FadeInDown,ZoomIn} from 'react-native-reanimated';
import Svg,{Defs,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import { farmShore } from '../assets/farmArt';
import { roomArt,specialArt } from '../assets/gameArt';
import { Portrait } from '../assets/Portrait';
import { useGame } from '../components/GameContext';
import { CreamCard,paper,PaperText,PaperTitle,ResourceBar,TokenToast,VillageButton,VillageFrame,VillageIcon } from '../components/VillageUI';
import { Screen } from '../components/ui';
import { boosterPrices,buyBooster } from '../core/farm/FarmProgress';
import type { ShopBooster } from '../core/farm/FarmProgress';
import { farmRank,landPrice,plotLimit,plotPrice,storagePrice } from '../core/farm/FarmEngine';
import { canClaimDailyChest,chestInfo,claimChest,claimQuest,questCards,rewardText } from '../core/quests/QuestEngine';
import type { Scope } from '../core/quests/QuestEngine';
import { pendingAction } from '../core/story/StoryEngine';
import { canRestore,restorePlace,villagePlaces } from '../data/village/places';
import { useWallClock } from '../utils/useWallClock';
import { useFarmCommands } from './FarmScreen';
import type { Routes } from './routes';

type Props<T extends keyof Routes>=NativeStackScreenProps<Routes,T>;
const house=require('../assets/house.jpg');
const boosterImages:Record<ShopBooster,number|undefined>={
  bomb:specialArt.area as number,rocket:specialArt.row as number,lightning:specialArt.color as number,
  super:specialArt.super as number,moves:undefined,
};
const shopIds=Object.keys(boosterPrices) as ShopBooster[];
export function ShopScreen({navigation}:Props<'Shop'>){
  const {progress,update}=useGame();
  const {send,toast}=useFarmCommands();
  const [shopMessage,setShopMessage]=useState('');
  const {farm}=progress;
  return <VillageFrame active="Shop" navigation={navigation} title="Лавка Павла" kicker="НОВОДЕВИЧЬЕ">
    <CreamCard><PaperTitle>За сердца</PaperTitle><PaperText>Сердца можно заработать продажами и заказами фермы. Купленные усилители появятся под игровым полем.</PaperText>
      <VillageButton title="На рынок" compact green onPress={()=>navigation.navigate('Farm',{tab:'market'})}/>
    </CreamCard>
    <TokenToast message={toast.text||shopMessage} key={toast.key}/>
    {shopIds.map(id=>{
      const info=boosterPrices[id];
      return <CreamCard key={id}><View style={css.row}>
        {boosterImages[id]?<Image source={boosterImages[id]} resizeMode="contain" style={css.object}/>:<Text style={css.moves}>+5</Text>}
        <View style={{flex:1}}><PaperTitle>{info.title}</PaperTitle><PaperText small>В запасе: {progress.boosters[id]}</PaperText></View>
        <VillageButton title={`${info.price} сердец`} compact disabled={progress.hearts<info.price} onPress={async()=>{
          let changed=false;
          await update(state=>{const next=buyBooster(state,id);changed=state!==next;return next;});
          if(changed)setShopMessage(`В инвентаре: ${info.title.toLowerCase()}.`);
        }}/>
      </View></CreamCard>;
    })}
    <CreamCard><PaperTitle>Для хозяйства</PaperTitle>
      <PaperText small>Удобрения: {farm.fertilizer} · ускорители: {farm.accelerators}</PaperText>
      <VillageButton title="Удобрение · 25 сердец" compact onPress={()=>void send({type:'buy-fertilizer'})} disabled={progress.hearts<25}/>
      <VillageButton title="Ускоритель партии · 40 сердец" compact onPress={()=>void send({type:'buy-accelerator'})} disabled={progress.hearts<40}/>
      <VillageButton title={`Новая грядка · ${plotPrice(farm)} сердец`} compact onPress={()=>void send({type:'plot'})}
        disabled={farm.plots.length>=plotLimit(farm)||progress.hearts<plotPrice(farm)}/>
      <VillageButton title={`Новое поле · ${landPrice(farm)} сердец`} compact onPress={()=>void send({type:'land'})}
        disabled={farm.land>=4||progress.hearts<landPrice(farm)}/>
      <VillageButton title={`Склад +32 места · ${storagePrice(farm)} сердец`} compact onPress={()=>void send({type:'storage'})}
        disabled={progress.hearts<storagePrice(farm)}/>
    </CreamCard>
  </VillageFrame>;
}

type QuestTab=Scope|'story';
const questTabs:{id:QuestTab;label:string}[]=[
  {id:'story',label:'История'},{id:'daily',label:'Сегодня'},{id:'weekly',label:'Неделя'},{id:'season',label:'События'},{id:'all',label:'Достижения'},
];
export function TasksScreen({navigation}:Props<'Tasks'>){
  const {progress,update,effect}=useGame();
  const [tab,setTab]=useState<QuestTab>('daily');
  const [received,setReceived]=useState<{title:string;reward:string;key:number}>();
  const now=useWallClock(5000);
  const action=pendingAction(progress);
  const cards=tab==='story'?[]:questCards(progress,tab,now);
  async function collect(fn:(state:typeof progress)=>typeof progress,title:string,reward:string){
    let changed=false;
    await update(state=>{const next=fn(state);changed=next!==state;return next;});
    if(changed){effect('win');setReceived(old=>({title,reward,key:(old?.key??0)+1}));}
  }
  return <VillageFrame active="Tasks" navigation={navigation} title="Доска заданий" kicker="НОВОДЕВИЧЬЕ">
    <View style={css.tabs}>{questTabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:item.id===tab}}
      style={[css.tab,tab===item.id&&css.tabOn]} onPress={()=>setTab(item.id)}>
      <Text style={[css.tabLabel,tab===item.id&&{color:'#fff0bb'}]}>{item.label}</Text>
    </Pressable>)}</View>
    {received&&<Animated.View key={received.key} entering={progress.settings.reducedMotion?undefined:ZoomIn.duration(290)}>
      <CreamCard><View style={css.row}><Chest opened/><View style={{flex:1}}><PaperTitle>{received.title}</PaperTitle><PaperText>{received.reward}</PaperText></View></View>
      </CreamCard>
    </Animated.View>}
    {tab==='story'&&<>
      <CreamCard><PaperTitle>{action?.title??'Продолжи расследование'}</PaperTitle>
        {action?<><PaperText>{action.cost?`Нужно звёзд: ${action.cost}`:'Доступно бесплатно'}</PaperText>
          <VillageButton title="Открыть сцену" green disabled={action.cost>progress.stars} onPress={()=>navigation.navigate('Dialogue',{id:action.id})}/></>:
          <VillageButton title="К уровням" green onPress={()=>navigation.navigate('Home')}/>}
      </CreamCard>
      {villagePlaces.filter(place=>progress.nextLevel>=place.level).map(place=><CreamCard key={place.id}>
        <PaperTitle>{place.title}</PaperTitle><PaperText>{progress.village.includes(place.id)?place.done:place.task}</PaperText>
        <VillageButton title="Осмотреть" compact onPress={()=>navigation.navigate('Place',{id:place.id})}/>
      </CreamCard>)}
    </>}
    {tab==='daily'&&<VillageButton title="Ежедневная посылка" green compact onPress={()=>navigation.navigate('Daily')}/>}
    {cards.map(card=><CreamCard key={card.id}>
      <PaperTitle>{card.title}</PaperTitle><PaperText small>Награда · {rewardText(card.reward)}</PaperText>
      <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:card.target,now:card.done}}
        style={css.progress}><View style={[css.progressFill,{width:`${card.done/card.target*100}%`}]}/></View>
      <View style={css.row}><View style={{flex:1}}><PaperText>{card.done} / {card.target}</PaperText></View>
        <VillageButton title={card.claimed?'Получено':'Забрать'} compact green disabled={!card.canClaim}
          onPress={()=>void collect(state=>claimQuest(state,tab as Scope,card.id),'Награда получена',rewardText(card.reward))}/>
      </View>
    </CreamCard>)}
    {tab==='daily'&&<CreamCard><View style={css.row}><Chest/><View style={{flex:1}}><PaperTitle>Большой сундук дня</PaperTitle>
      <PaperText small>Все задания дня · 120 сердец, бомба, 5 ходов и 2 удобрения</PaperText></View></View>
      <VillageButton title="Открыть" compact green disabled={!canClaimDailyChest(progress,now)}
        onPress={()=>void collect(state=>claimQuest(state,'daily','chest'),'Сундук открыт','120 сердец · бомба · 5 ходов · 2 удобрения')}/>
    </CreamCard>}
    {(tab==='daily'||tab==='story')&&progress.quests.chests.map(id=>{
      const info=chestInfo(id);
      return <CreamCard key={id}><View style={css.row}><Chest/><View style={{flex:1}}><PaperTitle>{info.title}</PaperTitle>
        <PaperText small>{rewardText(info.reward)}</PaperText></View></View>
        <VillageButton title="Открыть сундук" green compact onPress={()=>void collect(state=>claimChest(state,id),'Сундук открыт',rewardText(info.reward))}/>
      </CreamCard>;
    })}
  </VillageFrame>;
}
function Chest({opened=false}:{opened?:boolean}){
  return <Svg width={67} height={56} viewBox="0 0 68 56">
    <Defs><LinearGradient id="chest" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#e79b46"/><Stop offset="1" stopColor="#7a442e"/></LinearGradient></Defs>
    {opened&&<Path d="m35 3 3 8 8 2-8 4-3 7-3-7-8-4 8-2ZM14 8l3 5-3 5-3-5Zm41-3 2 5 4 2-4 2-2 5-2-5-4-2 4-2Z" fill="#efba49"/>}
    <Rect x="7" y="27" width="54" height="22" rx="5" fill="url(#chest)" stroke="#643b2c" strokeWidth="2"/>
    <Path d={opened?'M7 26 12 17h47l2 9Z':'M7 28c0-10 6-15 13-15h27c8 0 14 5 14 15Z'}
      fill="#b46b33" stroke="#783e23" strokeWidth="2"/>
    <Path d="M13 29h42M18 24v24m32-24v24" fill="none" stroke="#e9b761" strokeWidth="4"/>
    <Rect x="28" y="24" width="12" height="12" rx="3" fill="#f0cf67" stroke="#966431" strokeWidth="2"/>
    <Path d="M34 28v4" stroke="#84542c" strokeWidth="2"/>
  </Svg>;
}
const settingsArt={yard:farmShore,farm:farmShore,archive:roomArt.archive,dock:roomArt.dock,house};
export function PlaceScreen({navigation,route}:Props<'Place'>){
  const {progress,update,effect}=useGame();
  const [toast,setToast]=useState('');
  const place=villagePlaces.find(item=>item.id===route.params.id);
  if(!place)return null;
  const done=progress.village.includes(place.id);
  const opened=progress.nextLevel>=place.level;
  const ready=canRestore(progress,place);
  const npc=place.npc.startsWith('Вера')?'vera':place.npc==='Михаил'?'mikhail':place.npc==='Анна'?'anna':undefined;
  async function improve(){
    let changed=false;
    await update(state=>{
      const next=restorePlace(state,route.params.id);
      changed=next!==state;
      return next;
    });
    if(changed){effect('found');setToast(`Получено сердец: ${place?.gift}.`);}
  }
  function activity(){
    if(place?.route==='Farm')navigation.navigate('Farm');
    if(place?.route==='Market')navigation.navigate('Farm',{tab:'market'});
    if(place?.route==='Pond')navigation.navigate('Farm',{tab:'workshops'});
    if(place?.route==='Shop')navigation.navigate('Shop');
    if(place?.route==='Journal')navigation.navigate('Journal');
  }
  return <Screen scroll>
    <ResourceBar compact/>
    <ImageBackground source={settingsArt[place.art]} style={css.placeArt} imageStyle={{opacity:done?1:.82}}>
      {done&&<Animated.View entering={progress.settings.reducedMotion?undefined:FadeInDown.duration(425)} style={css.placeGlow}/>}
      <View style={css.placeTag}><Text style={css.placeTitle}>{place.title}</Text></View>
    </ImageBackground>
    <CreamCard><View style={css.row}>{npc&&<Portrait id={npc} size={49}/>}<View style={{flex:1}}>
      <PaperTitle>{place.npc}</PaperTitle><PaperText>{opened?place.talk:`Доступно с уровня ${place.level}.`}</PaperText></View></View>
      <PaperText>{done?place.done:place.task}</PaperText>
      {opened&&!done&&<><PaperText small>{place.stars?`Звёзды: ${place.stars} · награда: ${place.gift} сердец`:
        `Награда: ${place.gift} сердец${place.id==='farm'&&farmRank(progress.farm)<2?' · со 2 уровня фермы':''}`}</PaperText>
        <VillageButton title={place.task} onPress={()=>void improve()} green disabled={!ready}/>
        {!ready&&place.stars>0&&<PaperText small>Сначала выполни активное сюжетное задание или накопи звёзды.</PaperText>}
      </>}
      {opened&&place.route&&<VillageButton title={place.route==='Farm'?'К грядкам':place.route==='Market'?'К рыночным заказам':
        place.route==='Shop'?'В лавку':place.route==='Pond'?'К рыбацкому садку':'Открыть дневник'} compact onPress={activity}/>}
    </CreamCard>
    <TokenToast message={toast} delta={toast?place.gift:0}/>
    <VillageButton title="Назад к карте" green onPress={()=>navigation.goBack()}/>
  </Screen>;
}
const css=StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',gap:9},object:{width:43,height:43},moves:{minWidth:40,textAlign:'center',fontSize:20,fontWeight:'900',color:paper.amber},
  tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tab:{justifyContent:'center',minHeight:44,borderColor:'#c7b185',
    borderWidth:1,borderRadius:15,paddingHorizontal:9,backgroundColor:'#fff6d9'},tabOn:{backgroundColor:'#486c4f',borderColor:'#466749'},
  tabLabel:{color:paper.ink,fontSize:12,fontWeight:'800'},progress:{height:8,borderRadius:5,backgroundColor:'#e8ddbc',overflow:'hidden'},
  progressFill:{height:8,backgroundColor:'#72a06a',borderRadius:5},
  placeArt:{height:265,borderRadius:18,overflow:'hidden',justifyContent:'flex-end',backgroundColor:'#293b29'},
  placeTag:{backgroundColor:'#403020dc',padding:11},placeTitle:{fontFamily:'serif',fontSize:26,fontWeight:'800',color:'#ffe9ae'},
  placeGlow:{position:'absolute',width:67,height:73,left:'23%',top:'20%',borderRadius:42,backgroundColor:'#fac75c44'},
});
