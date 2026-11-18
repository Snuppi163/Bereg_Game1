import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { gems, specialArt } from '../assets/gameArt';
import { useGame } from '../components/GameContext';
import { blockLabels, flightTimes, MatchBoard, Obstacle } from '../components/MatchBoard';
import { Backdrop,Copy,GameButton,GameWindow,Icon,Instruction,Label,Row,SceneVeil,Screen } from '../components/ui';
import type { Glyph } from '../components/ui';
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
const toolsList: { id:Tool; label:string; art?:number; icon?:Glyph; mark?:string }[] = [
  {id:'hammer',label:'Молоток',icon:'hammer'}, {id:'glove',label:'Перчатка',icon:'hand'},
  {id:'rocket',label:'Ракета',art:specialArt.row as number}, {id:'bomb',label:'Бомба',art:specialArt.area as number},
  {id:'lightning',label:'Молния',art:specialArt.color as number}, {id:'super',label:'Супербомба',art:specialArt.super as number},
  {id:'moves',label:'Дополнительные ходы',mark:'+5'}, {id:'shuffle',label:'Перемешать',icon:'shuffle'},
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
  const [paused,setPaused]=useState(false);
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
  const useTool = (id:Tool) => {
    effect('select');
    setSelected(undefined);
    if (id==='moves') return void animate(()=>{engine.addMoves(5);return [];},id);
    if (id==='shuffle') return void animate(()=>{engine.shuffle();return [{kind:'shuffle',board:engine.snapshot(rng.snapshot()).board}];},id);
    setActive(current=>current===id ? undefined : id);
  };
  const toolPrompt=active==='hammer'?'Выбери клетку для удара':active==='glove'?'Выбери две соседние клетки':
    active?'Коснись клетки для активации':'';
  return <Screen scroll={scroll} style={styles.screen}>
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Backdrop source={backdrop} opacity={.37}/>
      <SceneVeil shade="edges"/>
    </View>
    <View style={styles.top}>
      <GameButton title="Пауза" icon="pause" variant="round" disabled={locked} onPress={()=>setPaused(true)}/>
      <View style={{flex:1,minWidth:0}}>
        <Label tone="gold">ТРИ В РЯД</Label><Text numberOfLines={1} adjustsFontSizeToFit style={styles.level}>
          {config.id===301?'Головоломка в саду':`Уровень ${config.id}`}
        </Text>
      </View>
      <GameButton title="Подсказка хода" icon="eye" variant="round" disabled={locked||lost} onPress={()=>setHint(engine.usefulHint())}/>
    </View>
    <View style={styles.objectives}>
      <View style={styles.goalRow}>{config.goals.map((goal,i)=><View key={i} accessible accessibilityLabel={`${remainingLabel(goal)}: ${goals[i]}`}
        style={[styles.goal,goals[i]===0&&styles.finished]}>
        <View style={styles.goalArt}>
          {goal.kind==='break'?<Obstacle kind={goal.target as Block} size={29} layers={1}/>:
            goal.kind==='irrigate'?<Obstacle kind="dry" size={29} layers={1}/>:
            goal.kind==='activate'?<Obstacle kind="switch" size={29} layers={1}/>:
            <Image source={gems[goal.kind==='collect'?Number(goal.target):0]} style={{width:30,height:30}}/>}
        </View>
        {goals[i]===0?<Icon name="check" color="#c6e2ab" size={14}/>:<Text style={styles.goalCount}>{goals[i]}</Text>}
      </View>)}</View>
      <View style={styles.hourglass}><Text style={[styles.moves,moves<5&&{color:'#ffab95'}]}>{moves}</Text><Label tone="gold">Ходы</Label></View>
    </View>
    {!!config.tutorial&&<Instruction visible={tutorial} title="Подсказка"
      text={config.tutorial.includes('Коснись бонуса')?config.tutorial:`${config.tutorial} Коснись бонуса для активации за один ход. Для сочетания сдвинь его к соседнему бонусу.`}
      button="Понятно" onClose={()=>setTutorial(false)}/>}
    <View style={[styles.stage,!scroll&&{flex:1}]}>
      <MatchBoard {...{board,config,size,frame,epoch,selected,hint,still,gesture}} low={low} drag={{index:dragIndex,x:dragX,y:dragY}} onCell={pick}/>
      {!!praise&&!!frame&&!still&&<Animated.Text pointerEvents="none" entering={FadeInDown.duration(215)} style={styles.praise}>
        {praise}{combo>1?` ×${combo}`:''}
      </Animated.Text>}
    </View>
    <View style={styles.shelf}>
      {toolsList.map(({id,label,art,icon,mark})=><View key={id} style={[styles.toolBucket,{width:toolWidth},active===id&&styles.toolSelected]}>
        {mark?<GameButton title={mark} compact disabled={locked||lost||!countTool(progress,id)}
          badge={countTool(progress,id)} onPress={()=>useTool(id)}/>:
          <GameButton title={`${label}, ${countTool(progress,id)}`} variant="round" {...{art,icon}}
            badge={countTool(progress,id)} disabled={locked||lost||!countTool(progress,id)} onPress={()=>useTool(id)}/>}
      </View>)}
    </View>
    {!!toolPrompt&&<View style={styles.prompt}><Label tone="gold">{toolPrompt}</Label></View>}
    <GameWindow center visible={paused} title="Пауза" onClose={()=>setPaused(false)}>
      <Copy>Текущее поле сохранится при выходе.</Copy>
      <Row><GameButton title="Выйти" icon="back" onPress={()=>{setPaused(false);navigation.goBack();}}/>
        <GameButton title="Продолжить" onPress={()=>setPaused(false)} variant="primary"/></Row>
    </GameWindow>
    <GameWindow center visible={lost} dismissible={false} title="Ходы закончились" onClose={()=>undefined}>
      {!!progress.boosters.moves&&<GameButton title="Добавить 5 ходов" icon="plus" variant="primary" onPress={()=>useTool('moves')}/>}
      <GameButton title="Завершить уровень" icon="back" onPress={()=>void finishLoss()}/>
    </GameWindow>
  </Screen>;
}

const styles=StyleSheet.create({
  screen:{gap:7,paddingHorizontal:14,paddingBottom:6},
  top:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:1},
  level:{fontFamily:'serif',fontSize:24,lineHeight:26,color:'#ffedc7',fontWeight:'700'},
  objectives:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between',
    borderRadius:18,borderWidth:1,borderColor:'#a4875e',backgroundColor:'#203347db',padding:4},
  goalRow:{flex:1,flexDirection:'row',justifyContent:'center',gap:8,alignItems:'center'},
  goal:{width:46,alignItems:'center',height:57,borderWidth:1,borderColor:'#7f7a68',backgroundColor:'#152537',borderRadius:13,paddingTop:2},
  goalArt:{height:33,justifyContent:'center',alignItems:'center'},
  goalCount:{fontSize:14,color:'#ffdc9c',fontWeight:'800',fontVariant:['tabular-nums']},
  finished:{backgroundColor:'#3b4b43',borderColor:'#b0a476'},
  hourglass:{alignItems:'center',justifyContent:'center',minWidth:60,minHeight:56,borderRadius:15,paddingHorizontal:4,
    backgroundColor:'#534136',borderColor:'#ddad71',borderWidth:1},
  moves:{fontFamily:'serif',fontSize:29,lineHeight:30,fontVariant:['tabular-nums'],color:'#ffe3a6',fontWeight:'800'},
  stage:{position:'relative',alignItems:'center',justifyContent:'center',paddingVertical:3},
  praise:{position:'absolute',top:10,color:'#ffe6ab',fontFamily:'serif',fontSize:22,fontWeight:'800',textShadowColor:'#37231d',
    textShadowRadius:6,textShadowOffset:{width:1,height:2}},
  shelf:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-around',gap:2,paddingVertical:3,paddingHorizontal:4,
    backgroundColor:'#1e2f43ee',borderWidth:1,borderTopColor:'#bd9a65',borderColor:'#746452',borderRadius:21},
  toolBucket:{height:47,alignItems:'center',justifyContent:'center',borderRadius:18,borderWidth:1,borderColor:'transparent'},
  toolSelected:{backgroundColor:'#745438',borderColor:'#f6cd84'},
  prompt:{position:'absolute',bottom:103,alignSelf:'center',paddingHorizontal:8,paddingVertical:3,borderRadius:10,backgroundColor:'#132235ef'},
});
