import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { gems, specialArt } from '../assets/gameArt';
import { Portrait } from '../assets/Portrait';
import { useGame } from '../components/GameContext';
import { blockLabels, flightTimes, MatchBoard, Obstacle } from '../components/MatchBoard';
import { Instruction, palette, Screen } from '../components/ui';
import { canHammer, Match3Engine } from '../core/match3/Match3Engine';
import type { Block, Config, Frame, Goal } from '../core/match3/Match3Engine';
import { spendBooster } from '../core/farm/FarmProgress';
import { record } from '../core/quests/QuestEngine';
import { defeat, localDay, victory } from '../core/progress/ProgressSystem';
import type { Booster, Progress } from '../core/progress/ProgressSystem';
import { getMatch } from '../data/levels';
import type { Routes } from './routes';
import { seededRandom } from '../utils/random';
import { boardLayout } from '../utils/boardLayout';

type Props = NativeStackScreenProps<Routes,'Match'>;
type Tool = Booster | 'hammer';
const backdrop = require('../assets/house.jpg');
const pauseMs = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
const toolsList: { id:Tool; label:string; art?:number; mark?:string }[] = [
  {id:'hammer',label:'Молоток',mark:'Удар'}, {id:'glove',label:'Перчатка',mark:'Обмен'},
  {id:'rocket',label:'Ракета',art:specialArt.row as number}, {id:'bomb',label:'Бомба',art:specialArt.area as number},
  {id:'lightning',label:'Молния',art:specialArt.color as number}, {id:'super',label:'Супербомба',art:specialArt.super as number},
  {id:'moves',label:'Дополнительные ходы',mark:'+5'}, {id:'shuffle',label:'Перемешать',mark:'Смена'},
];
const remainingLabel = (goal:Goal) => goal.kind === 'collect' ? ['Ключи','Фонари','Капли','Листья','Радио','Кристаллы'][Number(goal.target)] :
  goal.kind === 'break' ? blockLabels[goal.target as Block] : goal.kind==='irrigate' ? 'Полить землю' : goal.kind==='activate' ? 'Механизм' : goal.kind==='deliver' ? 'Доставка' : 'Опустить ключ';
const countTool = (state:Progress, id:Tool) => id === 'hammer' ? state.hammers : state.boosters[id];
const consume = (state:Progress, id:Tool) => id==='hammer' ? {...state,hammers:state.hammers-1} :
  spendBooster(state,id);
const validCheck = (state:Progress,id:number,config:Config) => {
  const snapshot = state.match[id];
  return snapshot?.board.length===config.width*config.height && snapshot.remaining.length===config.goals.length ? snapshot : undefined;
};

export function MatchScreen(props:Props) {
  const config = getMatch(props.route.params.id);
  return config ? <MatchLevel key={config.id} config={config} {...props}/> : null;
}

function MatchLevel({navigation,config}:Props & {config:Config}) {
  const {progress,update,effect} = useGame();
  const [{engine,rng}] = useState(()=>{
    const saved = validCheck(progress,config.id,config);
    const rng = seededRandom(saved?.rng ?? config.seed ?? config.id*251);
    return {rng,engine:saved ? Match3Engine.restore(config,rng,saved) : new Match3Engine(config,rng)};
  });
  const [board,setBoard] = useState(engine.snapshot(rng.snapshot()).board);
  const [frame,setFrame] = useState<Frame>();
  const [epoch,setEpoch] = useState(0);
  const [moves,setMoves] = useState(engine.moves);
  const [goals,setGoals] = useState([...engine.remaining]);
  const [selected,setSelected] = useState<number>();
  const [tutorial,setTutorial] = useState(!!config.tutorial && engine.turns===0);
  const [hint,setHint] = useState<[number,number] | undefined>(config.tutorial && engine.turns===0 ? engine.hint() : undefined);
  const [active,setActive] = useState<Tool>();
  const [locked,setLocked] = useState(false);
  const [lost,setLost] = useState(engine.status==='lost');
  const [combo,setCombo]=useState(0);
  const [praise,setPraise] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const {width,height,fontScale} = useWindowDimensions();
  const { size, scroll, toolWidth } = boardLayout(width,height,config.width,config.height,fontScale);
  const still = progress.settings.reducedMotion;
  const low = progress.settings.lowGraphics;
  const dragIndex = useSharedValue(-1);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const allowDrag = useSharedValue(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  useEffect(()=>{allowDrag.value=!locked && !lost && !active;},[active,allowDrag,locked,lost]);

  function commit(paid:Tool|undefined,won:boolean,bombs:number) {
    return update(state=>{
      const paidState = paid ? consume(state,paid) : state;
      const match={...paidState.match};
      if (won) delete match[config.id];
      else match[config.id]=engine.snapshot(rng.snapshot());
      const updated=record({...paidState,match},{bombs});
      return won ? victory(updated,config.id) : updated;
    });
  }

  async function animate(execute:()=>Frame[], paid?:Tool) {
    if (busy.current || paid && countTool(progress,paid)<1) return;
    const before=engine.snapshot(rng.snapshot()).board;
    const frames=execute();
    if (!frames.length && paid!=='moves') return;
    busy.current=true;
    setLocked(true);
    setActive(undefined);
    setSelected(undefined);
    setHint(undefined);
    setPraise('');
    setCombo(0);
    const status=engine.status;
    const bombs=frames.flatMap(item=>item.created??[]).filter(item=>item==='area'||item==='super').length;
    const persist=frames.some(candidate=>candidate.reversed) ? undefined : commit(paid,status==='won',bombs);
    let visible=before;
    let cascade=0;
    for (const next of frames) {
      if (!mounted.current) return;
      if (next.kind==='clear') {
        cascade++;
        setBoard(visible);
        setCombo(cascade);
        if (cascade>=2 || next.bursts?.length) setPraise(cascade>=4 ? 'Невероятно!' : cascade>=3 ? 'Великолепно!' : 'Отлично!');
        const burst=next.bursts?.[0]?.effect;
        effect(burst?.includes('rocket') ? 'rocket' : burst ? 'blast' : cascade>1 ? 'cascade' : next.hit?.some(i=>visible[i]?.block && !next.board[i]?.block) ? 'damage' : 'match');
      } else {
        setBoard(next.board);
        if (next.kind==='swap') effect('swap');
      }
      setFrame(next);
      setEpoch(n=>n+1);
      visible=next.board;
      if (!still) await pauseMs(next.bursts?.length ? 270 : flightTimes[next.kind]);
    }
    if (!mounted.current) return;
    setBoard(engine.snapshot(rng.snapshot()).board);
    setFrame(undefined);
    setEpoch(n=>n+1);
    setMoves(engine.moves);
    setGoals([...engine.remaining]);
    await persist;
    if (!mounted.current) return;
    if (status==='won') {
      effect('win');
      navigation.replace('Result',{id:config.id,won:true,earned:config.id===301 ? (!progress.gardenDay||localDay()>progress.gardenDay) : config.id===progress.nextLevel});
      return;
    }
    busy.current=false;
    setLocked(false);
    setLost(status==='lost');
  }

  async function finishLoss() {
    if (busy.current) return;
    busy.current=true;
    await update(state=>{
      const match={...state.match};
      delete match[config.id];
      return defeat({...state,match});
    });
    if (mounted.current) {
      effect('loss');
      navigation.replace('Result',{id:config.id,won:false});
    }
  }

  function indexAt(x:number,y:number) {
    const col=Math.floor(x/size), row=Math.floor(y/size);
    return col<0 || row<0 || col>=config.width || row>=config.height ? -1 : row*config.width+col;
  }
  function pick(index:number) {
    if (index<0 || busy.current || lost || engine.board[index].hole) return;
    const cell=engine.board[index];
    if (active==='hammer') {
      if (canHammer(cell)) void animate(()=>engine.hammer(index),'hammer');
      return;
    }
    if(active==='rocket'||active==='bomb'||active==='lightning'||active==='super'){
      const special=active==='rocket'?'row':active==='bomb'?'area':active==='lightning'?'color':'super';
      void animate(()=>engine.activate(index,special),active);
      return;
    }
    if(!active && cell.tile && 'color' in cell.tile && cell.tile.special){
      void animate(()=>engine.activate(index));
      return;
    }
    if (selected===index) return setSelected(undefined);
    if (selected!==undefined && engine.canSwap(selected,index)) {
      void animate(()=>engine.play(selected,index,active==='glove'),active==='glove' ? 'glove' : undefined);
    } else {
      effect('select');
      setSelected(index);
    }
  }

  const swipe = (x:number,y:number,dx:number,dy:number) => {
    if (busy.current || lost || active) return;
    const a=indexAt(x,y);
    const b=Math.abs(dx)>=Math.abs(dy) ? indexAt(x+Math.sign(dx)*size,y) : indexAt(x,y+Math.sign(dy)*size);
    if (a>=0 && b>=0) void animate(()=>engine.play(a,b));
  };
  const tap = (x:number,y:number)=>pick(indexAt(x,y));
  const gesture=Gesture.Exclusive(
    Gesture.Pan().maxPointers(1).minDistance(5).onStart(e=>{
      if (!allowDrag.value) return;
      const x=Math.floor((e.x-e.translationX)/size), y=Math.floor((e.y-e.translationY)/size);
      dragIndex.value=x<0 || y<0 || x>=config.width || y>=config.height ? -1 : y*config.width+x;
    }).onUpdate(e=>{
      if (dragIndex.value<0) return;
      const horizontal=Math.abs(e.translationX)>=Math.abs(e.translationY);
      dragX.value=horizontal ? Math.max(-size,Math.min(size,e.translationX*.8)) : 0;
      dragY.value=horizontal ? 0 : Math.max(-size,Math.min(size,e.translationY*.8));
    }).onEnd((e,ok)=>{
      if (ok && allowDrag.value && Math.max(Math.abs(e.translationX),Math.abs(e.translationY))>=12) {
        scheduleOnRN(swipe,e.x-e.translationX,e.y-e.translationY,e.translationX,e.translationY);
      }
    }).onFinalize(()=>{
      dragX.value=withTiming(0,{duration:75});
      dragY.value=withTiming(0,{duration:75},()=>{dragIndex.value=-1;});
    }),
    Gesture.Tap().maxDistance(10).onEnd((e,ok)=>{if(ok)scheduleOnRN(tap,e.x,e.y);})
  );
  const pause = () => Alert.alert('Пауза','Текущее поле сохранится при выходе.',[
    {text:'Продолжить',style:'cancel'}, {text:'Выйти',onPress:navigation.goBack}
  ]);
  const useTool = (id:Tool) => {
    effect('select');
    setSelected(undefined);
    if (id==='moves') return void animate(()=>{engine.addMoves(5);return [];},id);
    if (id==='shuffle') return void animate(()=>{engine.shuffle();return [{kind:'shuffle',board:engine.snapshot(rng.snapshot()).board}];},id);
    setActive(current=>current===id ? undefined : id);
  };
  return <Screen scroll={scroll}>
    <ImageBackground source={backdrop} style={StyleSheet.absoluteFill} imageStyle={{opacity:.26}}/>
    <View style={styles.top}>
      <View><Text style={styles.name}>Тихий берег</Text><Text style={styles.kicker}>{config.id===301?'ГОЛОВОЛОМКА В САДУ':`ТРИ В РЯД · УРОВЕНЬ ${config.id}`}</Text></View>
      <Pressable accessibilityRole="button" disabled={locked} onPress={pause} style={styles.pause}><Text style={styles.pauseText}>Пауза</Text></Pressable>
    </View>
    <View style={styles.summary}>
      <Portrait id="yulia" size={size<39 ? 39 : 52}/>
      <View style={styles.paper}>
        <Text style={styles.goalTitle}>Цели</Text>
        <View style={styles.goalRow}>{config.goals.map((goal,i)=><View key={i} accessible accessibilityLabel={`${remainingLabel(goal)}: ${goals[i]}`} style={styles.goal}>
          {goal.kind==='break' ? <Obstacle kind={goal.target as Block} size={29} layers={1}/> :
            goal.kind==='irrigate' ? <Obstacle kind="dry" size={29} layers={1}/> :
            goal.kind==='activate' ? <Obstacle kind="switch" size={29} layers={1}/> :
            <Image source={gems[goal.kind==='collect' ? Number(goal.target) : 0]} style={{width:29,height:29}}/>}
          <Text style={[styles.goalCount,goals[i]===0 && {color:'#346045'}]}>{goals[i]===0 ? 'Готово' : goals[i]}</Text>
        </View>)}</View>
      </View>
      <View style={styles.moves}><Text style={styles.movesLabel}>Ходы</Text><Text style={[styles.movesValue,moves<5 && {color:'#ffab95'}]}>{moves}</Text></View>
    </View>
    {!!config.tutorial && <Instruction visible={tutorial} title="Подсказка" text={config.tutorial.includes('Коснись бонуса')?config.tutorial:`${config.tutorial} Коснись бонуса для активации за один ход. Для сочетания сдвинь его к соседнему бонусу.`} button="Понятно" onClose={()=>setTutorial(false)}/>}
    <View style={[styles.stage,!scroll && {flex:1}]}>
      <MatchBoard {...{board,config,size,frame,epoch,selected,hint,still,gesture}} low={low} drag={{index:dragIndex,x:dragX,y:dragY}} onCell={pick}/>
      {!!praise && !!frame && !still && <Animated.Text pointerEvents="none" entering={FadeInDown.duration(215)} style={styles.praise}>{praise}{combo>1 ? ` ×${combo}` : ''}</Animated.Text>}
    </View>
    <View style={styles.shelf}>
      {toolsList.map(({id,label,art,mark})=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label}, ${countTool(progress,id)}`}
        accessibilityState={{selected:active===id,disabled:locked || lost || !countTool(progress,id)}} onPress={()=>useTool(id)}
        disabled={locked || lost || !countTool(progress,id)} style={({pressed})=>[styles.tool,{width:toolWidth},active===id && styles.toolOn,
          (pressed || !countTool(progress,id)) && {opacity:.6}]}>
        {art ? <Image source={art} resizeMode="contain" style={styles.toolImage}/> : <Text style={styles.toolMark}>{mark}</Text>}
        <Text style={styles.toolCount}>{countTool(progress,id)}</Text>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" onPress={()=>setHint(engine.usefulHint())} disabled={locked || lost} style={styles.hint}>
      <Text style={styles.hintText}>{active==='hammer' ? 'Выбери клетку для удара' : active==='glove' ? 'Коснись двух соседних фишек' :
        active ? 'Коснись клетки для активации' : 'Показать выгодный ход'}</Text>
    </Pressable>
    {lost && <View style={styles.lastChance}><View style={styles.lastCard}>
      <Text style={styles.lastTitle}>Ходы закончились</Text>
      {!!progress.boosters.moves && <Pressable accessibilityRole="button" style={styles.lastButton} onPress={()=>useTool('moves')}>
        <Text style={styles.lastText}>Добавить 5 ходов</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" style={styles.lastButton} onPress={()=>void finishLoss()}><Text style={styles.lastText}>Завершить уровень</Text></Pressable>
    </View></View>}
  </Screen>;
}

const styles=StyleSheet.create({
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingHorizontal:2},
  name:{fontFamily:'serif',fontSize:24,lineHeight:28,color:'#f6e0b3',fontWeight:'700'},
  kicker:{color:'#d3b38a',fontSize:10,fontWeight:'800',letterSpacing:.8},
  pause:{borderColor:'#b98552',borderWidth:1,borderRadius:18,paddingHorizontal:13,minHeight:44,justifyContent:'center',backgroundColor:'#402c28'},
  pauseText:{color:'#ffdfaa',fontWeight:'700',fontSize:13},
  summary:{flexDirection:'row',alignItems:'center',gap:6},
  paper:{flex:1,backgroundColor:'#d5ae7b',borderWidth:2,borderColor:'#6b462e',borderRadius:12,paddingHorizontal:7,paddingVertical:4,minHeight:66},
  goalTitle:{fontFamily:'serif',fontSize:15,color:'#452718',fontWeight:'700'},
  goalRow:{flexDirection:'row',justifyContent:'space-between',gap:3},
  goal:{flexDirection:'column',alignItems:'center',minWidth:27},
  goalCount:{fontSize:10,color:'#442919',fontWeight:'800'},
  moves:{minWidth:58,alignItems:'center',alignSelf:'stretch',justifyContent:'center',paddingHorizontal:5,backgroundColor:'#663c2d',
    borderWidth:2,borderColor:'#c89760',borderRadius:14},
  movesLabel:{fontSize:12,color:'#e4bb8f',fontWeight:'700'},
  movesValue:{fontFamily:'serif',fontSize:29,lineHeight:33,color:'#ffe3aa',fontWeight:'800'},
  stage:{position:'relative',alignItems:'center',justifyContent:'center'},
  praise:{position:'absolute',top:16,color:'#fff0b9',fontFamily:'serif',fontSize:26,fontWeight:'800',
    textShadowColor:'#492409',textShadowRadius:6,textShadowOffset:{width:1,height:2}},
  shelf:{borderWidth:1,borderColor:'#ae7645',backgroundColor:'#352624',borderRadius:16,padding:6,flexDirection:'row',
    alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4},
  tool:{height:46,borderRadius:13,backgroundColor:'#63432f',borderColor:'#b88857',borderWidth:1,
    alignItems:'center',justifyContent:'center'},
  toolOn:{borderColor:'#fff3bb',backgroundColor:'#957144'},
  toolImage:{width:29,height:30,marginBottom:3},
  toolMark:{fontSize:10,color:'#f8ddb1',fontWeight:'800',marginBottom:3,includeFontPadding:false},
  toolCount:{position:'absolute',right:0,bottom:-2,color:'#462414',backgroundColor:'#edc28a',borderRadius:8,
    minWidth:15,textAlign:'center',fontWeight:'800',fontSize:10,overflow:'hidden',paddingHorizontal:2},
  hint:{alignItems:'center',minHeight:40,justifyContent:'center'},
  hintText:{color:'#ecd1a5',fontSize:13,fontWeight:'600'},
  lastChance:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',backgroundColor:'#182524b8',zIndex:11,padding:22},
  lastCard:{padding:18,borderRadius:17,borderColor:'#c19463',borderWidth:1,backgroundColor:'#342724',alignItems:'stretch',gap:9,width:'100%'},
  lastTitle:{color:palette.cream,fontFamily:'serif',fontWeight:'700',fontSize:24,marginBottom:5},
  lastButton:{backgroundColor:'#805b3c',borderRadius:10,padding:13},
  lastText:{color:palette.cream,fontWeight:'700',textAlign:'center'},
});
