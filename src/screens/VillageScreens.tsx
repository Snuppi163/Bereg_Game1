import React,{useState} from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated,{FadeInDown} from 'react-native-reanimated';
import { farmShore,farmBuilding } from '../assets/farmArt';
import { roomArt,specialArt } from '../assets/gameArt';
import { Portrait } from '../assets/Portrait';
import { useGame } from '../components/GameContext';
import { IllustratedChest,RewardToken } from '../components/RewardVisual';
import { LedgerLine,PriceButton,ResourceBar,VillageFrame } from '../components/VillageUI';
import { Copy,GameButton,GameWindow,Heading,Icon,Label,palette,ProgressLine,Scene,SegmentControl,Title,Toast } from '../components/ui';
import type { Glyph } from '../components/ui';
import { boosterPrices,buyBooster } from '../core/farm/FarmProgress';
import type { ShopBooster } from '../core/farm/FarmProgress';
import { farmRank,landPrice,plotLimit,plotPrice,storagePrice } from '../core/farm/FarmEngine';
import type { FarmCommand } from '../core/farm/FarmEngine';
import { canClaimDailyChest,chestInfo,claimChest,claimQuest,questCards,rewardText } from '../core/quests/QuestEngine';
import type { Scope } from '../core/quests/QuestEngine';
import { pendingAction } from '../core/story/StoryEngine';
import { canRestore,restorePlace,villagePlaces } from '../data/village/places';
import { useWallClock } from '../utils/useWallClock';
import { useFarmCommands } from './FarmScreen';
import type { Routes } from './routes';

type Props<T extends keyof Routes>=NativeStackScreenProps<Routes,T>;
const house=require('../assets/house.jpg');
const shopTabs=[{id:'boosters',label:'Усилители'},{id:'farm',label:'Хозяйство'}] as const;
const boosterImages:Record<ShopBooster,number|undefined>={
  bomb:specialArt.area as number,rocket:specialArt.row as number,lightning:specialArt.color as number,
  super:specialArt.super as number,moves:undefined,
};
export function ShopScreen({navigation}:Props<'Shop'>){
  const {progress,update,effect}=useGame();
  const {send,toast}=useFarmCommands();
  const [tab,setTab]=useState<'boosters'|'farm'>('boosters');
  const [selected,setSelected]=useState<ShopBooster>();
  const [receipt,setReceipt]=useState('');
  const {farm}=progress;
  const item=selected?boosterPrices[selected]:undefined;
  const upgrades:{title:string;detail:string;type:FarmCommand['type'];price:number;disabled?:boolean;icon:Glyph}[]=[
    {title:'Удобрение',detail:`В запасе: ${farm.fertilizer}`,type:'buy-fertilizer',price:25,icon:'farm'},
    {title:'Ускоритель',detail:`В запасе: ${farm.accelerators}`,type:'buy-accelerator',price:40,icon:'clock'},
    {title:'Грядка',detail:`Грядок: ${farm.plots.length} / ${plotLimit(farm)}`,type:'plot',price:plotPrice(farm),disabled:farm.plots.length>=plotLimit(farm),icon:'farm'},
    {title:'Новое поле',detail:`Полей: ${farm.land} / 4`,type:'land',price:landPrice(farm),disabled:farm.land>=4,icon:'build'},
    {title:'Расширение склада',detail:'32 места',type:'storage',price:storagePrice(farm),icon:'box'},
  ];
  async function checkout(){
    if(!selected||!item)return;
    let changed=false;
    await update(state=>{const next=buyBooster(state,selected);changed=state!==next;return next;});
    if(changed){effect('found');setReceipt(`${item.title} в инвентаре`);setSelected(undefined);}
  }
  return <VillageFrame active="Shop" navigation={navigation} title="Лавка Павла" headerArt={roomArt.archive}
    end={<GameButton title="Рынок" icon="market" variant="round" onPress={()=>navigation.navigate('Farm',{tab:'market'})}/>}
    leading={<SegmentControl options={shopTabs} value={tab} onChange={setTab}/>}>
    <Toast key={toast.key} message={toast.text||receipt}/>
    {tab==='boosters'&&<View style={css.shelf}>
      {(Object.keys(boosterPrices) as ShopBooster[]).map(id=>{
        const info=boosterPrices[id];
        return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${info.title}, ${info.price} сердец`}
          onPress={()=>{setReceipt('');setSelected(id);}} style={({pressed})=>[css.ware,pressed&&css.warePressed]}>
          <View pointerEvents="none" style={css.wareLight}/>
          <View pointerEvents="none" style={css.shelfEdge}/>
          {boosterImages[id]?<Image source={boosterImages[id]} resizeMode="contain" style={css.wareArt}/>:
            <View style={css.moves}><Text style={css.movesText}>+5</Text></View>}
          <Text numberOfLines={2} style={css.wareName}>{info.title}</Text>
          <View style={css.price}><Icon name="heart" size={14} filled color="#f5a0aa"/><Text style={css.priceText}>{info.price}</Text></View>
          <Text style={css.inStock}>В запасе: {progress.boosters[id]}</Text>
        </Pressable>;
      })}
    </View>}
    {tab==='farm'&&<View style={css.ledgerPanel}>{upgrades.map(upgrade=><LedgerLine key={upgrade.type} title={upgrade.title} detail={upgrade.detail}
      icon={upgrade.icon} end={<PriceButton title="Купить" price={upgrade.price} disabled={upgrade.disabled||progress.hearts<upgrade.price}
        onPress={()=>void send({type:upgrade.type} as FarmCommand)}/>}/>)}</View>}
    <GameWindow center visible={!!item} title={item?.title??''} onClose={()=>setSelected(undefined)}>
      {item&&selected&&<View style={css.checkout}>
        {boosterImages[selected]?<Image source={boosterImages[selected]} resizeMode="contain" style={{width:82,height:82}}/>:
          <View style={css.moves}><Text style={css.movesText}>+5</Text></View>}
        <Label>В запасе: {progress.boosters[selected]} · Сердца: {progress.hearts}</Label>
        <PriceButton title="Купить" price={item.price} disabled={progress.hearts<item.price} onPress={()=>void checkout()}/>
      </View>}
    </GameWindow>
  </VillageFrame>;
}

const questTabs=[{id:'story',label:'История'},{id:'daily',label:'Сегодня'},{id:'weekly',label:'Неделя'},
  {id:'season',label:'События'},{id:'all',label:'Достижения'}] as const;
type QuestTab=typeof questTabs[number]['id'];
export function TasksScreen({navigation}:Props<'Tasks'>){
  const {progress,update,effect}=useGame();
  const [tab,setTab]=useState<QuestTab>('daily');
  const [reward,setReward]=useState<{title:string;description:string}>();
  const now=useWallClock(5000);
  const action=pendingAction(progress);
  const cards=tab==='story'?[]:questCards(progress,tab,now);
  const block=tab!=='story'&&tab!=='daily'?null:progress.quests.chests;
  async function collect(fn:(state:typeof progress)=>typeof progress,title:string,description:string){
    let changed=false;
    await update(state=>{const next=fn(state);changed=next!==state;return next;});
    if(changed){effect('win');setReward({title,description});}
  }
  return <VillageFrame active="Tasks" navigation={navigation} title="Доска заданий" headerArt={roomArt.archive}
    end={<GameButton title="Ежедневная посылка" icon="gift" variant="round" onPress={()=>navigation.navigate('Daily')}/>}
    leading={<SegmentControl options={questTabs} value={tab} onChange={setTab}/>}>
    {tab==='story'&&<>
      <View style={css.storyTicket}>
        <Icon name="tasks" size={22}/><View style={{flex:1,minWidth:0}}>
          <Title small>{action?.title??'Расследование'}</Title>
          <Label tone="gold">{action? action.cost?`Звёзды: ${action.cost}`:'Доступно бесплатно':`Уровень ${progress.nextLevel}`}</Label>
        </View>
        <GameButton title="Продолжить историю" icon="next" variant="round" disabled={!!action&&progress.stars<action.cost}
          onPress={()=>action?navigation.navigate('Dialogue',{id:action.id}):navigation.navigate('Home')}/>
      </View>
      <View style={css.ledgerPanel}>{villagePlaces.filter(place=>progress.nextLevel>=place.level).map(place=><LedgerLine
        key={place.id} title={place.title} detail={progress.village.includes(place.id)?place.done:place.task}
        icon={progress.village.includes(place.id)?'check':'village'}
        end={<GameButton title={`Осмотреть: ${place.title}`} icon="next" variant="round" onPress={()=>navigation.navigate('Place',{id:place.id})}/>}/>)}</View>
    </>}
    {!!block&&(block.length>0||tab==='daily')&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={css.chestRail}>
      {tab==='daily'&&<ChestTicket title="Сундук дня" description="Заверши задания дня" ready={canClaimDailyChest(progress,now)}
        onPress={()=>void collect(state=>claimQuest(state,'daily','chest'),'Сундук дня','120 сердец · бомба · 5 ходов · 2 удобрения')}/>}
      {block.map(id=>{
        const info=chestInfo(id);
        return <ChestTicket key={id} title={info.title} description={rewardText(info.reward)} ready
          onPress={()=>void collect(state=>claimChest(state,id),info.title,rewardText(info.reward))}/>;
      })}
    </ScrollView>}
    {!!cards.length&&<View style={css.noticeboard}>{cards.map(card=><View key={card.id} style={[css.questRow,card.canClaim&&css.questReady]}>
      <View style={css.questStamp}><Icon name={card.claimed?'check':card.canClaim?'gift':'tasks'} size={18} color="#674429"/></View>
      <View style={{flex:1,minWidth:0,gap:4}}>
        <Text style={css.questTitle}>{card.title}</Text><Text style={css.questReward}>{rewardText(card.reward)}</Text>
        <ProgressLine now={card.done} max={card.target}/>
      </View>
      <View style={{alignItems:'center',gap:4}}>
        <Text style={css.questReward}>{card.done}/{card.target}</Text>
        {card.canClaim?<GameButton title={`Забрать награду: ${card.title}`} icon="gift" variant="round"
          onPress={()=>void collect(state=>claimQuest(state,tab as Scope,card.id),'Награда получена',rewardText(card.reward))}/>:
          <Icon name={card.claimed?'check':'lock'} color="#765741" size={18}/>}
      </View>
    </View>)}</View>}
    <GameWindow center visible={!!reward} title={reward?.title??''} onClose={()=>setReward(undefined)}>
      {reward&&<View style={css.checkout}>
        <IllustratedChest opened size={148}/><Copy>{reward.description}</Copy>
        <GameButton title="Готово" variant="primary" onPress={()=>setReward(undefined)}/>
      </View>}
    </GameWindow>
  </VillageFrame>;
}
function ChestTicket({title,description,ready,onPress}:{title:string;description:string;ready:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:!ready}}
    disabled={!ready} onPress={onPress} style={({pressed})=>[css.chestTicket,ready&&css.chestReady,pressed&&css.warePressed]}>
    <IllustratedChest size={60}/>
    <View style={{flex:1,minWidth:0}}><Text numberOfLines={2} style={css.chestTitle}>{title}</Text>
      <Text numberOfLines={2} style={css.chestDetail}>{description}</Text></View>
    <Icon name={ready?'next':'lock'} size={13}/>
  </Pressable>;
}

const placeArt={yard:farmShore,farm:farmShore,archive:roomArt.archive,dock:roomArt.dock,house};
export function PlaceScreen({navigation,route}:Props<'Place'>){
  const {progress,update,effect}=useGame();
  const [earned,setEarned]=useState(false);
  const place=villagePlaces.find(item=>item.id===route.params.id);
  if(!place)return null;
  const done=progress.village.includes(place.id), opened=progress.nextLevel>=place.level;
  const ready=canRestore(progress,place);
  const npc=place.npc.startsWith('Вера')?'vera':place.npc==='Михаил'?'mikhail':place.npc==='Анна'?'anna':undefined;
  async function improve(){
    let changed=false;
    await update(state=>{const next=restorePlace(state,route.params.id);changed=next!==state;return next;});
    if(changed){effect('found');setEarned(true);}
  }
  function activity(){
    if(place?.route==='Farm')navigation.navigate('Farm');
    if(place?.route==='Market')navigation.navigate('Farm',{tab:'market'});
    if(place?.route==='Pond')navigation.navigate('Farm',{tab:'workshops'});
    if(place?.route==='Shop')navigation.navigate('Shop');
    if(place?.route==='Journal')navigation.navigate('Journal');
  }
  return <Scene source={placeArt[place.art]}>
    {done&&<Animated.View pointerEvents="none" entering={progress.settings.reducedMotion?undefined:FadeInDown.duration(395)} style={css.placeGlow}/>}
    <View style={css.placeHeader}><Heading title={place.title} onBack={navigation.goBack}/><ResourceBar compact/></View>
    <View style={{flex:1}}/>
    <View style={css.placeActions}>
      <View style={css.dialogue}>
        {npc&&<Portrait id={npc} size={45}/>}
        <View style={{flex:1,minWidth:0}}>
          <Text style={css.chestTitle}>{place.npc}</Text>
          <Copy>{opened?(done?place.done:place.talk):`Доступно с уровня ${place.level}.`}</Copy>
        </View>
      </View>
      {earned&&<RewardToken icon="heart" label={`+${place.gift}`}/>}
      {opened&&!done&&<>
        {!ready&&<Label tone="gold">{place.stars?`Нужно звёзд: ${place.stars}`:`Ранг фермы: ${farmRank(progress.farm)} / 2`}</Label>}
        <GameButton title={place.task} onPress={()=>void improve()} icon="build" variant="primary" disabled={!ready} style={{alignSelf:'stretch'}}/>
      </>}
      {opened&&place.route&&<GameButton title={place.route==='Farm'?'К грядкам':place.route==='Market'?'К заказам':
        place.route==='Shop'?'В лавку':place.route==='Pond'?'К садку':'В дневник'} icon={place.route==='Farm'?'farm':place.route==='Shop'?'shop':'next'}
        compact onPress={activity}/>}
    </View>
  </Scene>;
}
const css=StyleSheet.create({
  shelf:{flexDirection:'row',flexWrap:'wrap',borderLeftWidth:3,borderRightWidth:3,borderTopWidth:2,borderColor:'#a78253',
    borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden',backgroundColor:'#211a1ac9'},
  ware:{width:'50%',minHeight:153,paddingTop:6,paddingBottom:14,paddingHorizontal:4,alignItems:'center',gap:3},
  warePressed:{transform:[{scale:.968}],backgroundColor:'#b88e5041'},
  wareLight:{position:'absolute',width:'90%',height:88,borderRadius:52,top:4,backgroundColor:'#d2965134'},
  shelfEdge:{position:'absolute',bottom:0,width:'100%',height:9,backgroundColor:'#513323',borderTopWidth:2,borderTopColor:'#b18755',
    borderBottomWidth:2,borderBottomColor:'#281a17'},
  wareArt:{width:69,height:66},wareName:{fontFamily:'serif',fontSize:16,color:palette.cream,fontWeight:'700',textAlign:'center'},
  moves:{height:66,justifyContent:'center'},movesText:{fontFamily:'serif',color:palette.gold,fontSize:33,fontWeight:'800'},
  price:{flexDirection:'row',alignItems:'center',gap:4,borderRadius:12,paddingVertical:2,paddingHorizontal:6,
    borderColor:'#a98a60',borderWidth:1,backgroundColor:'#402d3b'},
  priceText:{color:'#ffdfb1',fontWeight:'800',fontSize:13},inStock:{fontSize:10,color:palette.muted},
  checkout:{alignItems:'center',gap:11},ledgerPanel:{paddingHorizontal:8,borderRadius:13,
    borderColor:'#6f644f',borderWidth:1,backgroundColor:'#1e3040'},
  storyTicket:{padding:10,flexDirection:'row',alignItems:'center',gap:8,borderRadius:16,
    backgroundColor:'#354154',borderColor:'#a28557',borderWidth:1},
  chestRail:{gap:6,paddingRight:8},chestTicket:{width:205,minHeight:70,flexDirection:'row',alignItems:'center',gap:5,
    borderWidth:1,borderColor:'#6f685b',borderRadius:13,paddingRight:6,backgroundColor:'#253743'},
  chestReady:{borderColor:'#e4b575',backgroundColor:'#403748'},
  chestTitle:{fontFamily:'serif',fontSize:15,lineHeight:18,fontWeight:'700',color:palette.cream},
  chestDetail:{fontSize:10,lineHeight:14,color:'#debc8a'},
  noticeboard:{gap:1,borderWidth:2,borderColor:'#91724b',padding:5,borderRadius:12,backgroundColor:'#4a3025'},
  questRow:{flexDirection:'row',alignItems:'center',gap:8,minHeight:65,paddingVertical:7,paddingHorizontal:6,
    backgroundColor:'#ecdbb5',borderBottomWidth:1,borderBottomColor:'#b79b76',borderRadius:3},
  questStamp:{borderRadius:17,backgroundColor:'#d9bf92',borderWidth:1,borderColor:'#bc9b73',padding:5},
  questReady:{backgroundColor:'#ffdfa3'},
  questTitle:{fontFamily:'serif',fontSize:15,lineHeight:19,fontWeight:'800',color:'#352823'},
  questReward:{fontSize:11,lineHeight:15,fontWeight:'700',color:'#6d493c'},
  placeHeader:{paddingHorizontal:12,paddingTop:7,gap:6},placeGlow:{position:'absolute',width:74,height:76,left:'28%',top:'31%',borderRadius:40,backgroundColor:'#ffd78251'},
  placeActions:{paddingHorizontal:12,paddingBottom:13,gap:8},
  dialogue:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:9,borderRadius:14,borderWidth:1,borderColor:'#9d8057',backgroundColor:'#23374cf5'},
});
