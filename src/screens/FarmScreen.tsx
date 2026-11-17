import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg,{Defs,LinearGradient,Path,Stop} from 'react-native-svg';
import { gems } from '../assets/gameArt';
import Animated,{FadeInUp} from 'react-native-reanimated';
import { animalArt,cropArt,farmBuilding,farmShore,farmTree } from '../assets/farmArt';
import { useGame } from '../components/GameContext';
import { CreamCard,paper,PaperText,PaperTitle,SwayImage,TokenToast,VillageButton,VillageFrame } from '../components/VillageUI';
import { farmRank,hasStock,marketOrders,orderDone,plotLimit,plotPrice,saleQuote,stageOf,stockEntries,volume } from '../core/farm/FarmEngine';
import type { CropCycle,FarmCommand } from '../core/farm/FarmEngine';
import { farmTransaction } from '../core/farm/FarmProgress';
import { crops,decorations,goods,pens,recipes,workshops } from '../core/farm/catalog';
import type { Crop,Decoration,Good,PenKind,Stock,WorkshopKind } from '../core/farm/catalog';
import { useWallClock } from '../utils/useWallClock';
import type { FarmTab,Routes } from './routes';

type Props=NativeStackScreenProps<Routes,'Farm'>;
const sections:{id:FarmTab;label:string}[]=[
  {id:'field',label:'Грядки'},{id:'animals',label:'Животные'},{id:'workshops',label:'Мастерские'},
  {id:'stock',label:'Склад'},{id:'market',label:'Рынок'},
];
const cropIds=Object.keys(crops) as Crop[];
const penIds=Object.keys(pens) as PenKind[];
const workshopIds=Object.keys(workshops) as WorkshopKind[];
const decorIds=Object.keys(decorations) as Decoration[];
const clock=(ms:number)=>{
  const seconds=Math.max(0,Math.ceil(ms/1000)), hours=Math.floor(seconds/3600);
  const time=[Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
  return hours?`${hours}:${time}`:time;
};
const describe=(stock:Stock)=>stockEntries(stock).map(([id,n])=>`${goods[id][0]} ×${n}`).join(' · ');

export function useFarmCommands(){
  const {update,effect}=useGame();
  const [toast,setToast]=useState({text:'',delta:0,key:0});
  async function send(cmd:FarmCommand){
    let result:{text:string;delta:number;changed:boolean}={text:'',delta:0,changed:false};
    await update(state=>{
      const action=farmTransaction(state,cmd);
      result={text:action.message,delta:Math.max(0,action.state.hearts-state.hearts),changed:action.changed};
      return action.state;
    });
    if(result.changed) effect(result.delta?'found':'select');
    setToast(t=>({...result,key:t.key+1}));
    return result.changed;
  }
  return {send,toast};
}

export function FarmScreen({navigation,route}:Props){
  const {progress}=useGame();
  const {farm,settings}=progress;
  const [tab,setTab]=useState<FarmTab>(route.params?.tab??'field');
  const [field,setField]=useState(0);
  const [plot,setPlot]=useState<number>();
  const [item,setItem]=useState<Good>('wheat');
  const [quantity,setQuantity]=useState(1);
  const [decor,setDecor]=useState<Decoration>('flowers');
  const [moveFrom,setMoveFrom]=useState<number>();
  const [showDecor,setShowDecor]=useState(false);
  const now=useWallClock();
  const {width}=useWindowDimensions();
  const {send,toast}=useFarmCommands();
  const animate=!settings.reducedMotion&&!settings.lowGraphics;
  const rank=farmRank(farm);
  const planted=plot===undefined?undefined:farm.plots[plot];
  const quantityNow=Math.max(1,Math.min(quantity,farm.stock[item]??0));
  useEffect(()=>{if(route.params?.tab)setTab(route.params.tab);},[route.params?.tab]);
  function go(which:FarmTab){
    setTab(which);
    if(which==='stock'){
      const first=stockEntries(farm.stock)[0];
      if(first){setItem(first[0]);setQuantity(first[1]);}
    }
  }
  const handleBed=async(command:FarmCommand)=>{
    if(await send(command)){
      if(command.type==='plant'||command.type==='harvest')setPlot(undefined);
    }
  };
  return <VillageFrame active="Farm" title="Хозяйство Юли" kicker={`НОВОДЕВИЧЬЕ · ФЕРМА ${rank} УРОВНЯ`} navigation={navigation}>
    <View style={css.chips}>{sections.map(section=><Pressable key={section.id} onPress={()=>go(section.id)} accessibilityRole="tab"
      accessibilityState={{selected:tab===section.id}} style={[css.chip,tab===section.id&&css.chipOn]}>
      <Text style={[css.chipText,tab===section.id&&css.chipTextOn]}>{section.label}</Text></Pressable>)}</View>
    <TokenToast key={toast.key} message={toast.text} delta={toast.delta}/>
    {tab==='field'&&<>
      <ImageBackground source={farmShore} resizeMode="stretch" style={[css.land,{height:Math.min(446,(width-24)*1.14)}]}>
        <View style={css.fieldHeader}>
          <Text style={css.fieldLabel}>Поле {field+1} из {farm.land}</Text>
          {farm.land>1&&<View style={css.arrows}>
            <Pressable accessibilityRole="button" accessibilityLabel="Предыдущее поле" disabled={field===0} onPress={()=>setField(n=>n-1)} style={css.arrow}><Text style={css.fieldLabel}>‹</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Следующее поле" disabled={field+1>=farm.land} onPress={()=>setField(n=>n+1)} style={css.arrow}><Text style={css.fieldLabel}>›</Text></Pressable>
          </View>}
        </View>
        {!!Object.keys(farm.pens).length&&<Pressable accessibilityRole="button" accessibilityLabel="Постройки для животных" style={[css.sceneIcon,{left:'16%',top:'28%'}]} onPress={()=>go('animals')}>
          <SwayImage source={animalArt[(Object.keys(farm.pens) as PenKind[])[0]]} size={43} moving enabled={animate}/></Pressable>}
        {!!Object.keys(farm.workshops).length&&<Pressable accessibilityRole="button" accessibilityLabel="Производственные постройки" style={[css.sceneIcon,{right:'10%',top:'33%'}]} onPress={()=>go('workshops')}>
          <SwayImage source={farmBuilding} size={52} enabled={false}/></Pressable>}
        {Array.from({length:6},(_,i)=>{
          const index=field*6+i;
          const current=farm.plots[index];
          const emptySlot=index>=farm.plots.length;
          return <View key={index} style={{position:'absolute',width:'25%',height:'19%',left:`${9+(i%3)*28}%`,top:`${47+Math.floor(i/3)*21}%`}}>
            <PlotBed plot={current} index={index} now={now} vacant={emptySlot} active={!emptySlot||index===farm.plots.length} animate={animate}
              onPress={()=>emptySlot?void send({type:'plot'}):setPlot(index)}/>
          </View>;
        })}
        {farm.decor.filter(d=>d.spot<4).map(entry=><Pressable key={entry.spot} accessibilityRole="button"
          accessibilityLabel={decorations[entry.kind].title} onPress={()=>setShowDecor(true)}
          style={{position:'absolute',left:`${7+23*entry.spot}%`,bottom:'3%',width:'15%'}}>
          <DecorationSprite kind={entry.kind} size={40}/>
        </Pressable>)}
      </ImageBackground>
      <View style={css.split}>
        <VillageButton title={`Грядка · ${plotPrice(farm)} сердец`} disabled={farm.plots.length>=plotLimit(farm)} compact onPress={async()=>{
          if(await send({type:'plot'}))setField(Math.floor(farm.plots.length/6));
        }}/>
        <VillageButton title="Расширить ферму" green compact onPress={()=>navigation.navigate('Shop')}/>
      </View>
      <CreamCard><PaperTitle>Садовая головоломка</PaperTitle>
        <PaperText small>Освободи грядки от колючек. Первая победа за день приносит 20 сердец и удобрение.</PaperText>
        <VillageButton title="Сыграть в саду" compact green disabled={progress.lives<1} onPress={()=>navigation.navigate('Match',{id:301})}/>
      </CreamCard>
      <CreamCard><PaperTitle>Оформление участка</PaperTitle>
        <VillageButton title={showDecor?'Свернуть':'Расставить украшения'} compact green onPress={()=>setShowDecor(v=>!v)}/>
        {showDecor&&<>
          <View style={css.chips}>{decorIds.map(kind=><Pressable key={kind} onPress={()=>{setDecor(kind);setMoveFrom(undefined);}}
            style={[css.chip,kind===decor&&css.chipOn]} accessibilityRole="button" accessibilityState={{selected:kind===decor}}>
            <Text style={[css.chipText,kind===decor&&css.chipTextOn]}>{decorations[kind].title}</Text>
          </Pressable>)}</View>
          <PaperText small>{moveFrom===undefined?`Цена: ${decorations[decor].price} сердец · в подарках: ${farm.gifts[decor]??0}`:'Выбери другое место. Занятые места поменяются.'}</PaperText>
          <View style={css.chips}>{Array.from({length:8},(_,spot)=>{
            const placed=farm.decor.find(entry=>entry.spot===spot);
            return <Pressable key={spot} accessibilityRole="button" accessibilityLabel={placed?decorations[placed.kind].title:`Место ${spot+1}`}
              onPress={()=>{
                if(moveFrom!==undefined){void send({type:'move',from:moveFrom,to:spot});setMoveFrom(undefined);}
                else if(placed)setMoveFrom(spot);
                else void send({type:'decorate',kind:decor,spot});
              }} style={[css.decorSlot,moveFrom===spot&&{borderColor:'#b6641d'}]}>
              {placed?<DecorationSprite kind={placed.kind} size={35}/>:<Text style={css.chipText}>{spot+1}</Text>}
            </Pressable>;
          })}</View>
        </>}
      </CreamCard>
    </>}
    {tab==='animals'&&penIds.map(pen=>{
      const info=pens[pen], animals=farm.pens[pen];
      return <Animated.View key={pen} entering={animate?FadeInUp.duration(270):undefined}><CreamCard>
        <View style={css.info}><SwayImage source={animalArt[pen]} size={64} moving={!!animals?.length} enabled={animate}/>
          <View style={{flex:1}}><PaperTitle>{info.title}</PaperTitle><PaperText small>{describe(info.output)} · {info.minutes} мин</PaperText></View>
        </View>
        {!animals?<VillageButton title={rank<info.rank?`Откроется на уровне фермы ${info.rank}`:`Построить · ${info.cost} сердец`}
          compact disabled={rank<info.rank} onPress={()=>void send({type:'pen',pen})}/>:
          <>
            <PaperText small>Корм на цикл: {describe(info.feed)}</PaperText>
            {animals.map((animal,index)=>{
              const ready=animal.readyAt!==null&&animal.readyAt<=now;
              return <Animated.View key={`${index}-${animal.readyAt}`} entering={animate?FadeInUp.duration(240):undefined} style={css.info}>
                <View style={{flex:1}}><PaperText>{info.animal} {index+1}</PaperText><PaperText small>{ready?'Продукция готова':animal.readyAt===null?'Ждёт корм':clock(animal.readyAt-now)}</PaperText></View>
                <VillageButton title={ready?'Собрать':'Кормить'} compact green disabled={!ready&&(animal.readyAt!==null||!hasStock(farm.stock,info.feed))}
                  onPress={()=>void send({type:ready?'collect-animal':'feed',pen,animal:index})}/>
              </Animated.View>;
            })}
            <VillageButton title={`Купить животное · ${info.animalCost} сердец`} compact
              disabled={animals.length>=Math.min(4,farm.land+1)} onPress={()=>void send({type:'animal',pen})}/>
          </>}
      </CreamCard></Animated.View>;
    })}
    {tab==='workshops'&&workshopIds.map(workshop=>{
      const info=workshops[workshop], batch=farm.workshops[workshop], built=workshop in farm.workshops;
      const ready=!!batch&&batch.readyAt<=now;
      return <Animated.View key={workshop} entering={animate?FadeInUp.duration(270):undefined}><CreamCard>
        <View style={css.info}><Image source={farmBuilding} style={{width:60,height:58}} resizeMode="contain"/><View style={{flex:1}}>
          <PaperTitle>{info.title}</PaperTitle><PaperText small>{info.recipes.map(recipe=>recipes[recipe].title).join(' · ')}</PaperText>
        </View></View>
        {!built?<VillageButton title={rank<info.rank?`Откроется на уровне фермы ${info.rank}`:`Построить · ${info.cost} сердец`} compact
          disabled={rank<info.rank} onPress={()=>void send({type:'workshop',workshop})}/>:
          batch?<>
            <PaperText>{recipes[batch.recipe].title} · {ready?'готово':clock(batch.readyAt-now)}</PaperText>
            <VillageButton title={ready?'Забрать партию':`Ускорить · ${farm.accelerators} в запасе`} green compact
              disabled={!ready&&(batch.accelerated||farm.accelerators===0)}
              onPress={()=>void send({type:ready?'collect-work':'accelerate',workshop})}/>
          </>: info.recipes.map(recipe=><View key={recipe} style={css.recipe}>
            <PaperText>{recipes[recipe].title} · {recipes[recipe].minutes} мин</PaperText>
            <PaperText small>{describe(recipes[recipe].input)} → {describe(recipes[recipe].output)}</PaperText>
            <VillageButton title="Запустить" compact green disabled={!hasStock(farm.stock,recipes[recipe].input)}
              onPress={()=>void send({type:'start',workshop,recipe})}/>
          </View>)}
      </CreamCard></Animated.View>;
    })}
    {tab==='stock'&&<CreamCard>
      <PaperTitle>Склад · {volume(farm.stock)}/{farm.capacity}</PaperTitle>
      {!volume(farm.stock)&&<PaperText>На складе пусто. Собери урожай на грядках.</PaperText>}
      <View style={css.chips}>{stockEntries(farm.stock).map(([good,n])=><Pressable key={good} onPress={()=>{setItem(good);setQuantity(n);}}
        style={[css.chip,item===good&&css.chipOn]} accessibilityRole="button" accessibilityState={{selected:item===good}}>
        <Text style={[css.chipText,item===good&&css.chipTextOn]}>{goods[good][0]} · {n}</Text>
      </Pressable>)}</View>
      {!!farm.stock[item]&&<>
        <PaperText>{goods[item][0]} · {quantityNow} из {farm.stock[item]}</PaperText>
        <View style={css.chips}>
          <VillageButton title="−1" compact disabled={quantityNow<=1} onPress={()=>setQuantity(quantityNow-1)}/>
          <VillageButton title="+1" compact disabled={quantityNow>=farm.stock[item]!} onPress={()=>setQuantity(quantityNow+1)}/>
          <VillageButton title="Всё" compact onPress={()=>setQuantity(farm.stock[item]!)}/>
        </View>
        <VillageButton title={`Продать ×${quantityNow} · ${saleQuote(farm,item,quantityNow)} сердец`} green onPress={()=>void send({type:'sell',good:item,amount:quantityNow})}/>
        <PaperText small>Доли сердца суммируются при следующих продажах.</PaperText>
      </>}
      <VillageButton title="Доска заказов" compact onPress={()=>go('market')}/>
    </CreamCard>}
    {tab==='market'&&<>
      <CreamCard><PaperTitle>Рынок Новодевичья</PaperTitle><PaperText>Заказы жителей обновляются в начале нового дня.</PaperText>
        <VillageButton title="Продать со склада" green compact onPress={()=>go('stock')}/>
      </CreamCard>
      {marketOrders(now).map(order=><CreamCard key={order.id}>
        <PaperTitle>{order.title}</PaperTitle><PaperText small>{order.person}</PaperText>
        <PaperText>{describe(order.need)}</PaperText>
        <VillageButton title={orderDone(farm,order)?'Выполнен':rank<order.rank?`С уровня фермы ${order.rank}`:`Отдать заказ · ${order.hearts} сердец`}
          green compact disabled={orderDone(farm,order)||rank<order.rank||!hasStock(farm.stock,order.need)} onPress={()=>void send({type:'order',id:order.id})}/>
      </CreamCard>)}
    </>}
    <Modal visible={plot!==undefined} transparent animationType="fade" onRequestClose={()=>setPlot(undefined)}>
      <View style={css.modal}><View style={css.sheet}>
        <View style={css.info}><View style={{flex:1}}><PaperTitle>{planted?goods[planted.crop][0]:`Грядка ${(plot??0)+1}`}</PaperTitle></View>
          <VillageButton title="Закрыть" compact onPress={()=>setPlot(undefined)}/></View>
        {plot!==undefined&&planted?<>
          <View style={{alignItems:'center'}}><SwayImage source={cropArt[planted.crop]} size={90} enabled={animate}/></View>
          <PaperText>{planted.readyAt<=now?'Готово к сбору':`До сбора: ${clock(planted.readyAt-now)}`}</PaperText>
          {planted.readyAt<=now ? <VillageButton title="Собрать урожай" green onPress={()=>void handleBed({type:'harvest',plot})}/>:
            <View style={{gap:6}}><VillageButton title={planted.watered?'Уже полито':'Полить'} compact disabled={planted.watered}
              onPress={()=>void send({type:'water',plot})}/>
              <VillageButton title={`Удобрить · ${farm.fertilizer} в запасе`} compact disabled={planted.fertilized||!farm.fertilizer}
                onPress={()=>void send({type:'fertilize',plot})}/></View>}
        </>:plot!==undefined&&<ScrollSeeds {...{rank,plot}} onSeed={crop=>void handleBed({type:'plant',crop,plot})}/>}
        <TokenToast key={toast.key} message={toast.text} delta={toast.delta}/>
      </View></View>
    </Modal>
  </VillageFrame>;
}
function ScrollSeeds({rank,onSeed}:{rank:number;plot:number;onSeed:(id:Crop)=>void}){
  return <View style={css.seeds}>{cropIds.map(crop=>{
    const info=crops[crop];
    return <Pressable key={crop} accessibilityRole="button" accessibilityState={{disabled:rank<info.rank}}
      accessibilityLabel={`Посадить: ${goods[crop][0]}`} disabled={rank<info.rank} onPress={()=>onSeed(crop)}
      style={[css.seed,rank<info.rank&&{opacity:.45}]}>
      <Image source={cropArt[crop]} style={{width:29,height:28}} resizeMode="contain"/>
      <View style={{flex:1}}><Text style={css.seedName} numberOfLines={1} adjustsFontSizeToFit>{goods[crop][0]}</Text>
        <Text style={css.seedInfo}>{rank<info.rank?`С уровня ${info.rank}`:`${info.minutes} мин · ${info.price} серд.`}</Text></View>
    </Pressable>;
  })}</View>;
}
function PlotBed({plot,index,now,vacant,active,animate,onPress}:{plot?:CropCycle|null;index:number;now:number;vacant:boolean;active:boolean;animate:boolean;onPress:()=>void}){
  const stage=plot?stageOf(plot,now):0;
  return <Pressable disabled={!active} onPress={onPress} accessibilityRole="button" accessibilityLabel={vacant?'Купить новую грядку':
    `Грядка ${index+1}${plot?', '+goods[plot.crop][0]:', свободна'}`}
    style={({pressed})=>[css.bed,vacant&&css.vacant,stage===3&&css.bedReady,pressed&&{transform:[{scale:.96}]}]}>
    {!vacant&&[0,1,2].map(row=><View pointerEvents="none" key={row} style={[css.furrow,{top:`${22+22*row}%`}]}/>)}
    {plot&&<Animated.View key={stage} entering={animate?FadeInUp.duration(260):undefined} pointerEvents="none"
      style={{position:'absolute',top:stage===3?'-27%':stage===2?'-18%':'-8%'}}>
      <SwayImage source={cropArt[plot.crop]} size={[28,39,55,70][stage]} enabled={animate&&stage>0}/>
    </Animated.View>}
    {!plot&&<Text style={css.bedEmpty}>{vacant?(active?'+':''):'Посадить'}</Text>}
    {plot&&<Text style={[css.bedTimer,stage===3&&css.readyTimer]}>{stage===3?'Собрать':clock(plot.readyAt-now)}</Text>}
  </Pressable>;
}
function DecorationSprite({kind,size}:{kind:Decoration;size:number}){
  if(kind==='path'||kind==='fence')return <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs><LinearGradient id="decor" x1="0" x2="1" y1="0" y2="1"><Stop stopColor={kind==='path'?'#e7d4a7':'#cca06e'}/><Stop offset="1" stopColor={kind==='path'?'#8c8271':'#715137'}/></LinearGradient></Defs>
    {kind==='path'?<Path d="M6 33l7-16 13-8 14 6 4 17-12 7-15-2ZM13 17l12 11 15-13M25 28l7 11" fill="url(#decor)" stroke="#857756" strokeWidth="2"/>:
      <Path d="M6 12l4-6 4 6v27H6ZM34 12l4-6 4 6v27h-8ZM14 17h20v5H14Zm0 12h20v5H14Z" fill="url(#decor)" stroke="#785234" strokeWidth="1.5"/>}
  </Svg>;
  const source=kind==='flowers'?cropArt.sunflower:kind==='lantern'?gems[1]:farmTree;
  return <Image source={source} resizeMode="contain" style={{width:size,height:size}} accessibilityLabel={decorations[kind].title}/>;
}

const css=StyleSheet.create({
  chips:{flexDirection:'row',flexWrap:'wrap',gap:5},chip:{minHeight:45,borderRadius:15,paddingHorizontal:9,alignItems:'center',
    justifyContent:'center',borderWidth:1,borderColor:'#bfa979',backgroundColor:'#fcf6df'},
  chipOn:{borderColor:'#597653',backgroundColor:'#527752'},chipText:{fontSize:12,fontWeight:'800',color:'#3e573b'},chipTextOn:{color:'#fff2c6'},
  land:{borderWidth:2,borderColor:'#b88450',borderRadius:20,overflow:'hidden',backgroundColor:'#b3c36a'},
  fieldHeader:{position:'absolute',top:8,left:8,right:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  fieldLabel:{backgroundColor:'#355339ed',color:'#fff4cc',fontSize:13,fontWeight:'800',padding:8,borderRadius:11},
  arrows:{flexDirection:'row',gap:5},arrow:{minWidth:42,minHeight:44,justifyContent:'center',alignItems:'center'},
  sceneIcon:{position:'absolute',borderRadius:23,backgroundColor:'#f9edc06b',borderWidth:1,borderColor:'#eadb8f'},
  bed:{flex:1,justifyContent:'center',alignItems:'center',borderRadius:14,backgroundColor:'#744b31',borderColor:'#c89d5c',borderWidth:2,elevation:3},
  bedReady:{borderColor:'#f9df7d',borderWidth:2},vacant:{backgroundColor:'#4e69298f',borderStyle:'dashed',borderColor:'#f6e1ad'},
  furrow:{position:'absolute',height:3,width:'91%',alignSelf:'center',borderRadius:4,backgroundColor:'#a87849'},
  bedEmpty:{color:'#fff3cf',fontWeight:'800',fontSize:11,textShadowColor:'#54351a',textShadowRadius:3},
  bedTimer:{position:'absolute',bottom:3,fontSize:10,fontWeight:'900',backgroundColor:'#f8df90',color:'#4b2e18',
    borderRadius:8,paddingHorizontal:6,paddingVertical:2,overflow:'hidden'},
  readyTimer:{backgroundColor:'#fff4af',color:'#36512b'},
  split:{flexDirection:'row',gap:5,flexWrap:'wrap',justifyContent:'space-between'}, info:{flexDirection:'row',gap:8,alignItems:'center'},
  recipe:{gap:5,paddingTop:6,borderTopWidth:1,borderTopColor:'#e4d5ab'},decorSlot:{minWidth:46,minHeight:45,justifyContent:'center',alignItems:'center',
    backgroundColor:'#e3edc4',borderRadius:9,borderWidth:1,borderColor:'#c9b578'},
  modal:{flex:1,backgroundColor:'#213223a9',alignItems:'center',justifyContent:'center',padding:14},
  sheet:{width:'100%',maxWidth:480,padding:13,borderRadius:21,borderWidth:1,borderColor:paper.line,backgroundColor:paper.panel,gap:9},
  seeds:{flexDirection:'row',flexWrap:'wrap',gap:5},
  seed:{width:'48.5%',paddingHorizontal:5,minHeight:48,gap:4,flexDirection:'row',alignItems:'center',borderRadius:11,
    backgroundColor:'#f5e4bb',borderWidth:1,borderColor:'#dac192'},seedName:{fontSize:12,color:paper.ink,fontWeight:'800'},
  seedInfo:{fontSize:10,color:paper.muted},
});
