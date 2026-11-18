import React,{useEffect,useState} from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated,{FadeInUp,ZoomIn} from 'react-native-reanimated';
import Svg,{Defs,LinearGradient,Path,Stop} from 'react-native-svg';
import { animalArt,cropArt,farmBuilding,farmShore,farmTree } from '../assets/farmArt';
import { gems } from '../assets/gameArt';
import { useGame } from '../components/GameContext';
import { Copy,GameButton,GameWindow,Icon,Label,palette,Row,Scene,SegmentControl,Title,Toast } from '../components/ui';
import { LedgerLine,PriceButton,ResourceBar,SwayImage,VillageNav } from '../components/VillageUI';
import { farmRank,hasStock,landPrice,marketOrders,orderDone,plotLimit,plotPrice,saleQuote,stageOf,stockEntries,storagePrice,volume } from '../core/farm/FarmEngine';
import type { CropCycle,FarmCommand } from '../core/farm/FarmEngine';
import { farmTransaction } from '../core/farm/FarmProgress';
import { crops,decorations,goods,pens,recipes,workshops } from '../core/farm/catalog';
import type { Crop,Decoration,Good,PenKind,Stock,WorkshopKind } from '../core/farm/catalog';
import { useWallClock } from '../utils/useWallClock';
import type { FarmTab,Routes } from './routes';

type Props=NativeStackScreenProps<Routes,'Farm'>;
type FarmWindow=Exclude<FarmTab,'field'>|'construction'|'decor';
const cropIds=Object.keys(crops) as Crop[];
const penIds=Object.keys(pens) as PenKind[];
const workshopIds=Object.keys(workshops) as WorkshopKind[];
const decorIds=Object.keys(decorations) as Decoration[];
const seedbed=require('../assets/interface/seedbed.webp');
const windowNames:Record<FarmWindow,string>={
  animals:'Двор с животными',workshops:'Мастерские',stock:'Амбар',market:'Рыночная доска',
  construction:'Строительство',decor:'Двор и сад',
};
const clock=(ms:number)=>{
  const seconds=Math.max(0,Math.ceil(ms/1000));
  const hours=Math.floor(seconds/3600);
  const time=[Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
  return hours?`${hours}:${time}`:time;
};
const describe=(stock:Stock)=>stockEntries(stock).map(([id,n])=>`${goods[id][0]} ×${n}`).join(' · ');

export function useFarmCommands(){
  const {update,effect}=useGame();
  const [toast,setToast]=useState({text:'',delta:0,key:0});
  async function send(cmd:FarmCommand){
    let result={text:'',delta:0,changed:false};
    await update(state=>{
      const action=farmTransaction(state,cmd);
      result={text:action.message,delta:Math.max(0,action.state.hearts-state.hearts),changed:action.changed};
      return action.state;
    });
    if(result.changed)effect(result.delta?'found':'select');
    setToast(t=>({...result,key:t.key+1}));
    return result.changed;
  }
  return {send,toast};
}

export function FarmScreen({navigation,route}:Props){
  const {progress}=useGame();
  const {farm,settings}=progress;
  const [window,setWindow]=useState<FarmWindow>();
  const [field,setField]=useState(0),[plot,setPlot]=useState<number>();
  const [selected,setSelected]=useState<Good>(),[quantity,setQuantity]=useState<number>();
  const [decor,setDecor]=useState<Decoration>('flowers'),[moveFrom,setMoveFrom]=useState<number>();
  const [construction,setConstruction]=useState<'land'|'barns'|'works'>('land');
  const {send,toast}=useFarmCommands();
  const now=useWallClock();
  const animate=!settings.reducedMotion&&!settings.lowGraphics;
  const rank=farmRank(farm);
  const actualField=Math.min(field,farm.land-1);
  const planted=plot===undefined?undefined:farm.plots[plot];
  const items=stockEntries(farm.stock);
  const good=selected&&farm.stock[selected]?selected:items[0]?.[0];
  const count=good?farm.stock[good]??0:0;
  const amount=Math.min(Math.max(1,quantity??count),Math.max(1,count));
  const builtPens=penIds.filter(id=>farm.pens[id]);
  const firstPen=builtPens.find(id=>farm.pens[id]?.some(item=>item.readyAt!==null&&item.readyAt<=now))??builtPens[0];
  const animals=firstPen?farm.pens[firstPen]??[]:[];
  const readyAnimal=animals.findIndex(item=>item.readyAt!==null&&item.readyAt<=now);
  const hungryAnimal=animals.findIndex(item=>item.readyAt===null);
  const readyBatch=workshopIds.find(id=>{const batch=farm.workshops[id];return batch&&batch.readyAt<=now;});

  useEffect(()=>{
    const tab=route.params?.tab;
    if(tab)setWindow(tab==='field'?undefined:tab);
  },[route.params?.tab]);

  async function handleBed(cmd:FarmCommand){
    if(await send(cmd)){
      if(cmd.type==='plant'||cmd.type==='harvest')setPlot(undefined);
    }
  }
  function visitAnimals(){
    if(firstPen&&readyAnimal>=0){void send({type:'collect-animal',pen:firstPen,animal:readyAnimal});return;}
    if(firstPen&&hungryAnimal>=0&&hasStock(farm.stock,pens[firstPen].feed)){void send({type:'feed',pen:firstPen,animal:hungryAnimal});return;}
    setWindow('animals');
  }
  function openConstruction(type:'land'|'barns'|'works'){
    setConstruction(type);setWindow('construction');
  }
  function closeWindow(){setWindow(undefined);setMoveFrom(undefined);}

  return <Scene source={farmShore} shade="edges">
    <View style={css.hud}>
      <View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={css.eyebrow}>ФЕРМА · РАНГ {rank}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.72} style={css.name}>Хозяйство Юли</Text></View>
      <ResourceBar compact/>
    </View>
    <View style={css.world}>
      <View style={css.leftTools}>
        <GameButton title="Амбар и продажа" icon="box" variant="round" badge={items.length||undefined} onPress={()=>setWindow('stock')}/>
        <GameButton title="Рынок" icon="market" variant="round" onPress={()=>setWindow('market')}/>
      </View>
      <View style={[css.spot,{left:'23%',top:'26%'}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={readyAnimal>=0?'Собрать продукцию':firstPen?'Покормить или осмотреть животных':'Животноводство'}
          onPress={visitAnimals} style={css.hotspot}>
          {firstPen?<SwayImage source={animalArt[firstPen]} size={47} moving enabled={animate}/>:<Icon name="farm" size={22}/>}
          {readyAnimal>=0&&<View style={css.spark}/>}
        </Pressable>
        <GameButton title="Управлять животными" icon="next" variant="round" compact onPress={()=>setWindow('animals')} style={css.pinMore}/>
      </View>
      <View style={[css.spot,{right:'16%',top:'30%'}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={readyBatch?'Забрать готовую партию':'Мастерские'}
          onPress={()=>readyBatch?void send({type:'collect-work',workshop:readyBatch}):setWindow('workshops')} style={css.hotspot}>
          <Image source={farmBuilding} resizeMode="contain" style={{width:47,height:45}}/>
          {!!readyBatch&&<View style={css.spark}/>}
        </Pressable>
        <GameButton title="Управлять мастерскими" icon="next" variant="round" compact onPress={()=>setWindow('workshops')} style={css.pinMore}/>
      </View>
      {Array.from({length:6},(_,i)=>{
        const index=actualField*6+i;
        const current=farm.plots[index];
        const vacant=index>=farm.plots.length;
        if(vacant&&index!==farm.plots.length)return null;
        return <View key={index} style={[css.bedPosition,{left:`${8+(i%3)*29}%`,top:`${48+Math.floor(i/3)*22}%`}]}>
          <PlotBed plot={current} index={index} now={now} vacant={vacant} animate={animate} onPress={()=>{
            if(vacant){openConstruction('land');return;}
            if(current&&current.readyAt<=now){void send({type:'harvest',plot:index});return;}
            setPlot(index);
          }}/>
        </View>;
      })}
      {farm.decor.filter(entry=>Math.floor(entry.spot/4)===actualField%2).map(entry=><Pressable
        key={entry.spot} accessibilityRole="button" accessibilityLabel={decorations[entry.kind].title}
        onPress={()=>{setMoveFrom(entry.spot);setWindow('decor');}}
        style={{position:'absolute',bottom:'1%',left:`${11+22*(entry.spot%4)}%`,minHeight:44,minWidth:44}}>
        <DecorationSprite kind={entry.kind} size={35}/>
      </Pressable>)}
      {!window&&plot===undefined&&<View style={css.sceneToast} pointerEvents="none"><Toast key={toast.key} message={toast.text} delta={toast.delta}/></View>}
    </View>
    <View style={css.fieldTools}>
      <GameButton title="Строительство" icon="build" variant="round" onPress={()=>openConstruction('land')}/>
      <GameButton title="Оформление участка" icon="farm" variant="round" onPress={()=>setWindow('decor')}/>
      <View style={css.fieldPage}>
        {farm.land>1&&<GameButton title="Предыдущее поле" icon="back" variant="round" disabled={actualField===0} onPress={()=>setField(n=>n-1)}/>}
        <Text numberOfLines={1} style={css.fieldName}>Поле {actualField+1}/{farm.land}</Text>
        {farm.land>1&&<GameButton title="Следующее поле" icon="next" variant="round" disabled={actualField+1>=farm.land} onPress={()=>setField(n=>n+1)}/>}
      </View>
      <GameButton title="Садовая головоломка" icon="play" variant="round" disabled={progress.lives===0} onPress={()=>navigation.navigate('Match',{id:301})}/>
    </View>
    <VillageNav active="Farm" navigation={navigation} overlay/>

    <GameWindow visible={plot!==undefined} title={planted?goods[planted.crop][0]:`Грядка ${(plot??0)+1}`} onClose={()=>setPlot(undefined)}>
      {plot!==undefined&&(planted?<>
        <View style={css.plotDetail}>
          <SwayImage source={cropArt[planted.crop]} size={84} enabled={animate}/>
          <View style={{flex:1}}><Title small>{goods[planted.crop][0]}</Title>
            <Label tone={planted.readyAt<=now?'gold':'muted'}>{planted.readyAt<=now?'Можно собирать':`До сбора: ${clock(planted.readyAt-now)}`}</Label>
          </View>
        </View>
        {planted.readyAt<=now?<GameButton title="Собрать" icon="farm" variant="primary" onPress={()=>void handleBed({type:'harvest',plot})}/>:
          <Row>
            <GameButton title={planted.watered?'Полито':'Полить'} icon="water" disabled={planted.watered} onPress={()=>void send({type:'water',plot})}/>
            <GameButton title="Удобрить" badge={farm.fertilizer} icon="farm" disabled={planted.fertilized||farm.fertilizer===0} onPress={()=>void send({type:'fertilize',plot})}/>
          </Row>}
      </>:<View style={css.seeds}>{cropIds.map(crop=>{
        const info=crops[crop];
        return <Pressable key={crop} disabled={rank<info.rank} accessibilityRole="button" accessibilityLabel={`Посадить: ${goods[crop][0]}`}
          onPress={()=>void handleBed({type:'plant',crop,plot})} style={[css.seed,rank<info.rank&&{opacity:.43}]}>
          <Image source={cropArt[crop]} resizeMode="contain" style={css.seedArt}/>
          <Text numberOfLines={1} adjustsFontSizeToFit style={css.seedName}>{goods[crop][0]}</Text>
          <Label tone={rank<info.rank?'muted':'gold'}>{rank<info.rank?`Ранг ${info.rank}`:`${info.minutes} мин · ${info.price}`}</Label>
        </Pressable>;
      })}</View>)}
      <Toast key={toast.key} message={toast.text} delta={toast.delta}/>
    </GameWindow>

    <GameWindow visible={!!window} title={window?windowNames[window]:''} onClose={closeWindow}>
      <Toast key={toast.key} message={toast.text} delta={toast.delta}/>
      {window==='stock'&&<>
        <Row><Label tone="gold">Запасы · {volume(farm.stock)}/{farm.capacity}</Label>
          <GameButton title="Открыть рынок" icon="market" variant="round" onPress={()=>setWindow('market')}/></Row>
        {!items.length&&<Copy>Собери урожай на грядках.</Copy>}
        <View style={css.stock}>{items.map(([id,n])=><Pressable key={id} accessibilityRole="button"
          accessibilityState={{selected:id===good}} accessibilityLabel={`${goods[id][0]}, ${n}`}
          onPress={()=>{setSelected(id);setQuantity(undefined);}} style={[css.stockCell,id===good&&css.stockOn]}>
          {id in cropArt?<Image source={cropArt[id as Crop]} resizeMode="contain" style={css.stockArt}/>:<Icon name="box" size={22}/>}
          <Text style={css.stockCount}>×{n}</Text><Text numberOfLines={2} style={css.stockName}>{goods[id][0]}</Text>
        </Pressable>)}</View>
        {good&&<View style={css.sell}>
          <Row>
            <GameButton title="Уменьшить количество" icon="minus" variant="round" disabled={amount<=1} onPress={()=>setQuantity(amount-1)}/>
            <Text style={css.quantity}>{amount} / {count}</Text>
            <GameButton title="Увеличить количество" icon="plus" variant="round" disabled={amount>=count} onPress={()=>setQuantity(amount+1)}/>
            <GameButton title="Всё" onPress={()=>setQuantity(count)} compact/>
          </Row>
          <PriceButton title="Продать" price={saleQuote(farm,good,amount)} onPress={()=>void send({type:'sell',good,amount})}/>
        </View>}
      </>}
      {window==='market'&&<>
        {marketOrders(now).map(order=><LedgerLine key={order.id} icon={orderDone(farm,order)?'check':'market'} title={order.title}
          detail={`${order.person}\n${describe(order.need)}`} end={<PriceButton title={orderDone(farm,order)?'Готово':rank<order.rank?`Ранг ${order.rank}`:'Сдать'}
            price={order.hearts} disabled={orderDone(farm,order)||rank<order.rank||!hasStock(farm.stock,order.need)} onPress={()=>void send({type:'order',id:order.id})}/>}/>)}
        <GameButton title="Продажа со склада" icon="box" onPress={()=>setWindow('stock')}/>
      </>}
      {window==='animals'&&<>
        {!builtPens.length&&<Copy>Выбери постройку, чтобы завести животных.</Copy>}
        {builtPens.map(id=>{
          const pen=pens[id], herd=farm.pens[id]??[];
          return <View key={id} style={css.section}>
            <LedgerLine art={animalArt[id]} title={pen.title} detail={`${describe(pen.output)} · ${pen.minutes} мин`}
              end={<PriceButton title="Купить" price={pen.animalCost} disabled={herd.length>=Math.min(4,farm.land+1)}
                onPress={()=>void send({type:'animal',pen:id})}/>}/>
            <Label>{describe(pen.feed)}</Label>
            {herd.map((animal,i)=>{
              const ready=animal.readyAt!==null&&animal.readyAt<=now;
              return <LedgerLine key={i} icon={ready?'gift':'clock'} title={`${pen.animal} ${i+1}`}
                detail={ready?'Готово к сбору':animal.readyAt===null?'Ждёт корм':clock(animal.readyAt-now)}
                end={<GameButton compact title={ready?'Собрать':'Кормить'} icon={ready?'box':'farm'}
                  disabled={!ready&&(animal.readyAt!==null||!hasStock(farm.stock,pen.feed))}
                  onPress={()=>void send({type:ready?'collect-animal':'feed',pen:id,animal:i})}/>}/>;
            })}
          </View>;
        })}
        <GameButton title="Построить" icon="build" onPress={()=>openConstruction('barns')}/>
      </>}
      {window==='workshops'&&<>
        {!workshopIds.some(id=>id in farm.workshops)&&<Copy>Выбери мастерскую в меню строительства.</Copy>}
        {workshopIds.filter(id=>id in farm.workshops).map(id=>{
          const info=workshops[id],batch=farm.workshops[id];
          const ready=!!batch&&batch.readyAt<=now;
          return <View key={id} style={css.section}>
            <LedgerLine art={farmBuilding} title={info.title} detail={batch?`${recipes[batch.recipe].title} · ${ready?'готово':clock(batch.readyAt-now)}`:undefined}
              end={batch?<GameButton compact title={ready?'Забрать':'Ускорить'} icon={ready?'box':'clock'} badge={ready?undefined:farm.accelerators}
                disabled={!ready&&(batch.accelerated||!farm.accelerators)} onPress={()=>void send({type:ready?'collect-work':'accelerate',workshop:id})}/>:undefined}/>
            {!batch&&info.recipes.map(recipe=><LedgerLine key={recipe} title={recipes[recipe].title}
              detail={`${describe(recipes[recipe].input)} → ${describe(recipes[recipe].output)} · ${recipes[recipe].minutes} мин`}
              end={<GameButton title="Запустить" icon="play" variant="round" disabled={!hasStock(farm.stock,recipes[recipe].input)}
                onPress={()=>void send({type:'start',workshop:id,recipe})}/>}/>)}
          </View>;
        })}
        <GameButton title="Построить" icon="build" onPress={()=>openConstruction('works')}/>
      </>}
      {window==='construction'&&<>
        <SegmentControl options={[{id:'land',label:'Участок'},{id:'barns',label:'Животные'},{id:'works',label:'Мастерские'}] as const}
          value={construction} onChange={setConstruction}/>
        {construction==='land'&&<>
          <LedgerLine title="Грядка" icon="farm" detail={`${farm.plots.length} / ${plotLimit(farm)} мест`} end={
            <PriceButton title="Добавить" price={plotPrice(farm)} disabled={farm.plots.length>=plotLimit(farm)} onPress={async()=>{
              if(await send({type:'plot'})){setField(Math.floor(farm.plots.length/6));closeWindow();}
            }}/>}/>
          <LedgerLine title="Новое поле" icon="village" detail={`Открыто: ${farm.land} / 4`} end={
            <PriceButton title="Открыть" price={landPrice(farm)} disabled={farm.land>=4} onPress={async()=>{
              if(await send({type:'land'})){setField(farm.land);closeWindow();}
            }}/>}/>
          <LedgerLine title="Склад" icon="box" detail="32 дополнительных места" end={
            <PriceButton title="Расширить" price={storagePrice(farm)} onPress={()=>void send({type:'storage'})}/>}/>
        </>}
        {construction==='barns'&&penIds.filter(id=>!farm.pens[id]).map(id=><LedgerLine key={id} art={animalArt[id]} title={pens[id].title}
          detail={rank<pens[id].rank?`Ранг ${pens[id].rank}`:describe(pens[id].output)} end={<PriceButton title="Строить" price={pens[id].cost}
            disabled={rank<pens[id].rank} onPress={async()=>{if(await send({type:'pen',pen:id}))setWindow('animals');}}/>}/>)}
        {construction==='works'&&workshopIds.filter(id=>!(id in farm.workshops)).map(id=><LedgerLine key={id} art={farmBuilding} title={workshops[id].title}
          detail={rank<workshops[id].rank?`Ранг ${workshops[id].rank}`:workshops[id].recipes.map(recipe=>recipes[recipe].title).join(' · ')}
          end={<PriceButton title="Строить" price={workshops[id].cost} disabled={rank<workshops[id].rank}
            onPress={async()=>{if(await send({type:'workshop',workshop:id}))setWindow('workshops');}}/>}/>)}
      </>}
      {window==='decor'&&<>
        <View style={css.stock}>{decorIds.map(id=><Pressable key={id} accessibilityRole="button" accessibilityLabel={decorations[id].title}
          accessibilityState={{selected:id===decor}} onPress={()=>{setDecor(id);setMoveFrom(undefined);}} style={[css.stockCell,id===decor&&css.stockOn]}>
          <DecorationSprite kind={id} size={38}/><Text style={css.stockName}>{decorations[id].title}</Text>
        </Pressable>)}</View>
        <Label tone="gold">{moveFrom===undefined?`${decorations[decor].title} · ${decorations[decor].price} сердец · подарков ${farm.gifts[decor]??0}`:'Выбери другое место'}</Label>
        <View style={css.stock}>{Array.from({length:8},(_,spot)=>{
          const put=farm.decor.find(entry=>entry.spot===spot);
          return <GameButton key={spot} title={put?decorations[put.kind].title:`Место ${spot+1}`}
            art={put?decorationSource(put.kind):undefined} icon={put?undefined:'plus'} variant="round" compact
            onPress={()=>{
              if(moveFrom!==undefined){void send({type:'move',from:moveFrom,to:spot});setMoveFrom(undefined);}
              else if(put)setMoveFrom(spot);
              else void send({type:'decorate',kind:decor,spot});
            }}/>;
        })}</View>
      </>}
    </GameWindow>
  </Scene>;
}

function PlotBed({plot,index,now,vacant,animate,onPress}:{plot?:CropCycle|null;index:number;now:number;vacant:boolean;animate:boolean;onPress:()=>void}){
  const stage=plot?stageOf(plot,now):0;
  return <Pressable accessibilityRole="button" accessibilityLabel={vacant?'Купить новую грядку':
    `Грядка ${index+1}${plot?`, ${goods[plot.crop][0]}${stage===3?', созрела':''}`: ', свободна'}`}
    style={({pressed})=>[css.bed,pressed&&{transform:[{scale:.95}]}]} onPress={onPress}>
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Image source={seedbed} resizeMode="contain" style={[css.soil,vacant&&{opacity:.42}]}/>
    </View>
    {plot&&<Animated.View key={stage} pointerEvents="none" entering={animate?ZoomIn.duration(210):undefined} style={css.crop}>
      <SwayImage source={cropArt[plot.crop]} size={[27,36,50,56][stage]} enabled={animate&&stage>0}/>
    </Animated.View>}
    {!plot&&<View style={css.seedPin}><Icon name={vacant?'plus':'farm'} size={15} color="#f8d6a4"/></View>}
    {plot&&<Text style={[css.timer,stage===3&&css.ripe]}>{stage===3?'Готово':clock(plot.readyAt-now)}</Text>}
  </Pressable>;
}
function decorationSource(kind:Decoration){
  return kind==='flowers'?cropArt.sunflower:kind==='lantern'?gems[1]:farmTree;
}
function DecorationSprite({kind,size}:{kind:Decoration;size:number}){
  if(kind==='path'||kind==='fence')return <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs><LinearGradient id="decor" x1="0" x2="1" y1="0" y2="1"><Stop stopColor={kind==='path'?'#e7d4a7':'#cca06e'}/><Stop offset="1" stopColor={kind==='path'?'#8c8271':'#715137'}/></LinearGradient></Defs>
    <Path d={kind==='path'?'M6 33l7-16 13-8 14 6 4 17-12 7-15-2ZM13 17l12 11 15-13M25 28l7 11':
      'M6 12l4-6 4 6v27H6ZM34 12l4-6 4 6v27h-8ZM14 17h20v5H14Zm0 12h20v5H14Z'}
      fill="url(#decor)" stroke="#785234" strokeWidth="1.5"/>
  </Svg>;
  return <Image source={decorationSource(kind)} resizeMode="contain" style={{width:size,height:size}}/>;
}
const css=StyleSheet.create({
  hud:{marginHorizontal:12,marginTop:6,flexDirection:'row',alignItems:'center',gap:4},
  eyebrow:{fontSize:9,color:'#fadbab',fontWeight:'900',letterSpacing:.85},
  name:{fontFamily:'serif',fontSize:20,lineHeight:25,fontWeight:'800',color:palette.cream},
  world:{flex:1,minHeight:200},leftTools:{position:'absolute',top:12,left:10,zIndex:3,gap:5},
  spot:{position:'absolute',alignItems:'center',zIndex:3},hotspot:{minWidth:53,minHeight:48,
    borderWidth:1,borderColor:'#ffdfa6',borderRadius:16,backgroundColor:'#132631c2',justifyContent:'center',alignItems:'center'},
  spark:{position:'absolute',right:-4,top:-4,width:12,height:12,borderRadius:6,borderWidth:1,borderColor:'#fff2bf',backgroundColor:'#f58f50'},
  pinMore:{position:'absolute',left:49,top:5},
  bedPosition:{position:'absolute',width:'25%',height:'15%'},
  bed:{flex:1,minHeight:45,maxHeight:75,justifyContent:'center',alignItems:'center',position:'relative'},
  soil:{width:'100%',height:'100%'},
  seedPin:{borderRadius:15,padding:4,backgroundColor:'#3f2c249b'},
  crop:{position:'absolute',top:-8},
  timer:{position:'absolute',bottom:0,color:'#fee5b4',fontSize:10,fontWeight:'900',paddingHorizontal:6,paddingVertical:1,
    borderRadius:7,overflow:'hidden',backgroundColor:'#382521'},
  ripe:{color:'#4b2e1d',backgroundColor:'#ffdb86'},
  fieldTools:{paddingHorizontal:9,paddingVertical:3,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4},
  fieldPage:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,flex:1,minWidth:0},
  fieldName:{color:palette.cream,fontWeight:'800',fontSize:10,backgroundColor:'#183048e3',borderRadius:11,paddingHorizontal:5,paddingVertical:5},
  sceneToast:{position:'absolute',bottom:1,left:15,right:15,zIndex:6},
  plotDetail:{flexDirection:'row',alignItems:'center',gap:12},
  seeds:{flexDirection:'row',flexWrap:'wrap',gap:5},seed:{width:'32%',alignItems:'center',minHeight:93,
    paddingVertical:4,paddingHorizontal:2,borderRadius:12,borderWidth:1,borderColor:'#756753',backgroundColor:'#273a48'},
  seedArt:{width:43,height:45},seedName:{fontSize:12,fontWeight:'700',color:palette.cream,marginTop:1},
  stock:{flexDirection:'row',flexWrap:'wrap',gap:5},stockCell:{width:'23.8%',minHeight:76,borderRadius:12,borderWidth:1,borderColor:'#5d6b76',
    backgroundColor:'#263746',paddingVertical:5,paddingHorizontal:1,alignItems:'center',justifyContent:'center'},
  stockOn:{backgroundColor:'#394b54',borderColor:'#ebbd78'},stockArt:{width:39,height:37},
  stockName:{color:palette.cream,fontSize:10,fontWeight:'700',textAlign:'center'},
  stockCount:{color:palette.gold,fontSize:12,fontWeight:'800'},sell:{gap:7,alignItems:'center'},
  quantity:{color:palette.cream,fontSize:16,fontWeight:'800'},section:{gap:3,paddingBottom:8},
});
