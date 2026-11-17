import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeOut, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { TileArt, tileColors, tileNames } from '../assets/Objects';
import { useGame } from '../components/GameContext';
import { Button, Heading, Instruction, Label, palette, Panel, Row, Screen } from '../components/ui';
import { Match3Engine } from '../core/match3/Match3Engine';
import type { Block, Board, Cell, Config, Frame, Goal } from '../core/match3/Match3Engine';
import { defeat, victory } from '../core/progress/ProgressSystem';
import { getMatch } from '../data/levels';
import type { Routes } from './routes';
import { seededRandom } from '../utils/random';

type Props = NativeStackScreenProps<Routes,'Match'>;
const blockNames: Record<Block,string> = {crate:'Ящики',web:'Паутина',glass:'Стекло',lock:'Замки'};
const labelGoal = (goal:Goal) => goal.kind === 'collect' ? tileNames[Number(goal.target)] :
  goal.kind === 'break' ? blockNames[goal.target as Block] : 'Конверты';
const wait = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
const Tile = memo(TileArt, (a,b) => a.size === b.size && a.cell.tile === b.cell.tile &&
  a.cell.block === b.cell.block && a.cell.layers === b.cell.layers);
const Spark = new Keyframe({0:{opacity:0,transform:[{scale:.32},{rotate:'-22deg'}]},30:{opacity:1},100:{opacity:0,transform:[{scale:1.32},{rotate:'28deg'}]}}).duration(225);
const shatter = (fromX:number,fromY:number,ms:number) => new Keyframe({
  0:{opacity:fromY < 0 ? .55 : 1,transform:[{translateX:fromX},{translateY:fromY}]},
  100:{opacity:1,transform:[{translateX:0},{translateY:0}]}
}).duration(ms);

export function MatchScreen(props:Props) {
  const config = getMatch(props.route.params.id);
  return config ? <MatchLevel key={config.id} config={config} {...props}/> : null;
}

function MatchLevel({navigation,config}:Props & {config:Config}) {
  const {progress,update,effect} = useGame();
  const [engine] = useState(() => new Match3Engine(config,config.seed === undefined ? undefined : seededRandom(config.seed)));
  const [board,setBoard] = useState(engine.board.map(cell => ({...cell})));
  const [motion,setMotion] = useState<Record<number,[number,number]>>({});
  const [frameId,setFrameId] = useState(0);
  const [hit,setHit] = useState<number[]>([]);
  const [moves,setMoves] = useState(engine.moves);
  const [selected,setSelected] = useState<number>();
  const [tutorial,setTutorial] = useState(!!config.tutorial);
  const [hint,setHint] = useState(config.tutorial ? engine.hint() : undefined);
  const [hammer,setHammer] = useState(false);
  const [locked,setLocked] = useState(false);
  const busy = useRef(false);
  const dead = useRef(false);
  const lastBoard = useRef<Board>(board);
  const hammerRunning = useRef(false);
  const {width,height} = useWindowDimensions();
  const size = Math.max(24,Math.floor(Math.min((width-34)/config.width,(height-312)/config.height,60)));
  useEffect(() => { dead.current = false; return () => { dead.current = true; }; }, []);

  const show = useCallback((frame:Frame) => {
    const shifts: Record<number,[number,number]> = {};
    if (frame.kind === 'swap' || frame.kind === 'fall') {
      const origins = new Map(lastBoard.current.map((cell,index) => [cell.tile,index]));
      frame.board.forEach((cell,i) => {
        if (!cell.tile || cell.block === 'crate') return;
        const from = origins.get(cell.tile);
        if (from === i) return;
        const x = i % config.width;
        const y = Math.floor(i / config.width);
        shifts[i] = from === undefined ? [0,-Math.min(y+1,3)*size] :
          [(from%config.width-x)*size,(Math.floor(from/config.width)-y)*size];
      });
    }
    lastBoard.current = frame.board;
    setMotion(shifts);
    setFrameId(n => n + 1);
    setBoard(frame.board);
    setHit(frame.hit ?? []);
  }, [config.width,size]);

  const play = async (a:number,b?:number) => {
    if (busy.current || (hammerRunning.current && b !== undefined) || engine.status !== 'playing') return;
    const previous = engine.moves;
    const frames = b === undefined ? engine.hammer(a) : engine.play(a,b);
    if (!frames.length) return;
    busy.current = true;
    setLocked(true);
    setSelected(undefined);
    setHint(undefined);
    setMoves(engine.moves);
    const outcome = String(engine.status);
    const won = outcome === 'won';
    const completion = outcome === 'playing' ? undefined : update(state => won ? victory(state,config.id) : defeat(state));
    if (b === undefined || engine.moves !== previous) effect('match');
    for (const frame of frames) {
      if (dead.current) return;
      show(frame);
      await wait(frame.kind === 'clear' ? 135 : 150);
    }
    if (dead.current) return;
    setHit([]);
    setLocked(false);
    busy.current = false;
    if (!completion) return;
    busy.current = true;
    await completion;
    if (!dead.current) navigation.replace('Result',{id:config.id,won});
  };

  const position = (x:number,y:number) => {
    const col = Math.floor(x/size), row = Math.floor(y/size);
    return col < 0 || row < 0 || col >= config.width || row >= config.height ? -1 : row*config.width+col;
  };
  const pick = async (index:number) => {
    if (index < 0 || busy.current || hammerRunning.current) return;
    if (hammer) {
      if (!progress.hammers || (!engine.board[index].block && (!engine.board[index].tile || 'drop' in engine.board[index].tile!))) return;
      hammerRunning.current = true;
      setHammer(false);
      await update(state => state.hammers > 0 ? {...state,hammers:state.hammers-1} : state);
      if (!dead.current) await play(index);
      hammerRunning.current = false;
      return;
    }
    if (selected === index) return setSelected(undefined);
    if (selected !== undefined && (Math.abs(selected%config.width-index%config.width) + Math.abs(Math.floor(selected/config.width)-Math.floor(index/config.width)) === 1)) {
      void play(selected,index);
    } else setSelected(index);
  };
  const swipe = (x:number,y:number,dx:number,dy:number) => {
    if (hammer) return;
    const a = position(x,y);
    const b = Math.abs(dx) >= Math.abs(dy) ? position(x+Math.sign(dx)*size,y) : position(x,y+Math.sign(dy)*size);
    if (a >= 0 && b >= 0) void play(a,b);
  };
  const gesture = Gesture.Exclusive(
    Gesture.Pan().maxPointers(1).minDistance(12).onEnd((e, ok) => { if (ok) scheduleOnRN(swipe,e.x-e.translationX,e.y-e.translationY,e.translationX,e.translationY); }),
    Gesture.Tap().maxDistance(11).onEnd((e, ok) => { if (ok) scheduleOnRN(onTap,e.x,e.y); })
  );
  function onTap(x:number,y:number) { void pick(position(x,y)); }
  const pause = () => Alert.alert('Пауза','Прогресс текущего поля сохраняется, пока уровень открыт.',[
    {text:'Продолжить',style:'cancel'}, {text:'Выйти',onPress:navigation.goBack}
  ]);
  return <Screen scroll={height < 520}>
    <Heading eyebrow={`Уровень ${config.id}`} title="Три в ряд" back="Пауза" onBack={locked ? undefined : pause}/>
    <Panel><Row><Label tone="gold">ЦЕЛИ</Label><Label tone={moves<5 ? 'rust' : 'green'}>Ходы · {moves}</Label></Row>
      <View style={css.goals}>{config.goals.map((goal,index) => <View key={index} style={css.goal}>
        <View style={[css.dot,{backgroundColor:goal.kind === 'collect' ? tileColors[Number(goal.target)] : palette.gold}]}/>
        <Label tone={engine.remaining[index] === 0 ? 'green' : 'muted'}>{labelGoal(goal)} · {engine.remaining[index] === 0 ? '✓' : engine.remaining[index]}</Label>
      </View>)}</View>
    </Panel>
    {!!config.tutorial && <Instruction visible={tutorial} title="Первое расследование" text={config.tutorial} button="Понятно" onClose={() => setTutorial(false)}/>}
    <View style={css.boardFrame}>
      <GestureDetector gesture={gesture}>
        <View style={[css.board,{width:size*config.width,height:size*config.height}]}>
          {board.map((cell,index) => <CellView key={index} size={size} cell={cell} selected={index === selected}
            hint={hint?.includes(index) ?? false} hit={hit.includes(index)} motion={motion[index]} frameId={frameId}
            onPress={() => void pick(index)}/>)}
        </View>
      </GestureDetector>
    </View>
    <Row>
      <Button title="Подсказка" onPress={() => setHint(engine.hint())} compact secondary disabled={locked}/>
      <Button title={hammer ? 'Отменить молоток' : `Молоток · ${progress.hammers}`} onPress={() => {setSelected(undefined);setHammer(active=>!active);}}
        compact secondary={!hammer} disabled={locked || (!hammer && !progress.hammers)}/>
    </Row>
    {hammer && <Label tone="gold">Выберите фишку или препятствие.</Label>}
  </Screen>;
}

function CellView({cell,size,selected,hint,hit,motion,frameId,onPress}: {
  cell:Cell;size:number;selected:boolean;hint:boolean;hit:boolean;motion?:[number,number];frameId:number;onPress:()=>void;
}) {
  const description = cell.block ? blockNames[cell.block] : cell.tile && 'color' in cell.tile ? tileNames[cell.tile.color] : 'Конверт';
  return <View accessible accessibilityRole="button" accessibilityLabel={description} accessibilityState={{selected}}
    accessibilityActions={[{name:'activate'}]} onAccessibilityAction={onPress}
    style={[css.cell,{width:size,height:size},(selected || hint) && css.marked]}>
    {motion ? <Animated.View key={frameId} entering={shatter(...motion,145)} pointerEvents="none" style={css.art}>
      <Tile cell={cell} size={size-2}/>
    </Animated.View> : <View style={css.art} pointerEvents="none"><Tile cell={cell} size={size-2}/></View>}
    {hit && <Animated.View pointerEvents="none" entering={Spark} exiting={FadeOut.duration(80)} style={css.spark}>
      <Text style={{fontSize:size*.45,color:'#fff0b4'}}>✦</Text>
    </Animated.View>}
  </View>;
}

const css = StyleSheet.create({
  goals:{flexDirection:'row',flexWrap:'wrap',gap:7},
  goal:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:7,paddingVertical:4,backgroundColor:'#334944',borderRadius:7},
  dot:{width:8,height:8,borderRadius:4},
  boardFrame:{alignSelf:'center',borderWidth:1,borderColor:'#6f7862',borderRadius:13,backgroundColor:'#101e1e'},
  board:{overflow:'hidden',borderRadius:12,flexDirection:'row',flexWrap:'wrap'},
  cell:{borderColor:'#495d53',borderWidth:1,backgroundColor:'#29403f'},
  marked:{borderColor:palette.gold,backgroundColor:'#506154'},
  art:{position:'absolute',left:0,top:0,zIndex:1},
  spark:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',zIndex:3,backgroundColor:'#fed89035'}
});
