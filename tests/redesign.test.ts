import test from 'node:test';
import assert from 'node:assert/strict';
import { Match3Engine, runs } from '../src/core/match3/Match3Engine.ts';
import type { Board, Config, Special, Combination } from '../src/core/match3/Match3Engine.ts';
import { matchLevels, hiddenLevels } from '../src/data/levels/index.ts';
import { freshProgress, victory } from '../src/core/progress/ProgressSystem.ts';
import { decodeSave } from '../src/core/save/saveCodec.ts';
import { boardLayout } from '../src/utils/boardLayout.ts';
import { seededRandom } from '../src/utils/random.ts';

test('старое сохранение сохраняет уровни, улики и звёзды при миграции',()=>{
  const v1={schema:1,nextLevel:16,stars:4,hammers:7,clues:['photo'],actions:['key','final'],settings:{sounds:false},hidden:{20:{found:['key']}}};
  const migrated=decodeSave(JSON.stringify(v1));
  assert.equal(migrated.schema,2);
  for(const key of ['stars','hammers','nextLevel','clues','actions','hidden'] as const) assert.deepEqual(migrated[key],v1[key]);
  assert.equal(migrated.settings.sounds,false);
  assert.equal(migrated.settings.reducedMotion,false);
  assert(migrated.boosters.glove>0);
  assert.deepEqual(migrated,decodeSave(JSON.stringify(migrated)));
});

test('сохранённые ходы и генератор случайных чисел восстанавливают одинаковый следующий каскад',()=>{
  const level=matchLevels[0];
  const random=seededRandom(level.seed!);
  const live=new Match3Engine(level,random);
  live.play(...live.hint()!);
  const saved=JSON.parse(JSON.stringify(live.snapshot(random.snapshot())));
  const restoreRng=seededRandom(saved.rng);
  const restored=Match3Engine.restore(level,restoreRng,saved);
  const move=live.hint()!;
  assert.deepEqual(restored.play(...move),live.play(...move));
  assert.deepEqual(restored.snapshot(restoreRng.snapshot()),live.snapshot(random.snapshot()));
});

test('стартовые поля, диапазоны целей и состав уровней 1–300',()=>{
  assert.equal(matchLevels.length,240);
  const fingerprints=new Set();
  for(const level of matchLevels) {
    const board=new Match3Engine(level,seededRandom(level.seed!));
    assert.deepEqual(runs(board.board,level.width,level.height),[]);
    assert(board.hint(),`нет обмена уровня ${level.id}`);
    assert(level.goals.every(goal=>goal.count>0));
    assert(level.goals.filter(goal=>goal.kind==='collect').every(goal=>Number(goal.target)<level.colors));
    const {id,seed,tutorial,...gameplay}=level;
    fingerprints.add(JSON.stringify(gameplay));
    assert(board.board.every((cell,i)=>!cell.hole||!cell.tile),String(id));
  }
  assert(fingerprints.size>215);
  assert.equal(new Set(hiddenLevels.map(level=>JSON.stringify(level.targets))).size,60);
});

test('каждая пара бонусов формирует свой эффект и повреждает поле',()=>{
  const combos:[Special,Special,Combination][]=[
    ['row','column','rocket-pair'],['row','area','rocket-bomb'],['area','area','bomb-pair'],
    ['color','row','sphere-rocket'],['color','area','sphere-bomb'],['color','color','sphere-pair'],
  ];
  const config:Config={id:2,width:8,height:8,colors:6,moves:30,goals:[{kind:'break',target:'glass',count:1}]};
  for(const [first,second,effect] of combos){
    const board:Board=Array.from({length:64},(_,i)=>({tile:{color:i%8%6}}));
    board[27]={tile:{color:1,special:first}};
    board[28]={tile:{color:2,special:second},block:'glass',layers:1};
    const engine=new Match3Engine(config,seededRandom(390),board);
    const frames=engine.play(27,28);
    const impact=frames.find(frame=>frame.kind==='clear');
    assert(impact,effect);
    assert(impact?.hit?.includes(28),effect);
    assert.equal(impact.bursts?.[0].effect,effect);
    assert.equal(impact.board[28].block,undefined);
    assert.equal(engine.status,'won');
  }
});

test('перчатка допускает обмен без совпадения, бустеры восстанавливают ходы',()=>{
  const rng=seededRandom(338);
  const config=matchLevels[1];
  const engine=new Match3Engine(config,rng);
  const legal=engine.legalSwaps();
  const index=engine.board.findIndex((_,i)=>engine.canSwap(i,i+1)&&!legal.some(([a,b])=>a===i&&b===i+1));
  const moves=engine.moves;
  const old=engine.board[index].tile;
  assert(engine.play(index,index+1,true).length);
  assert.equal(engine.moves,moves);
  assert.equal(engine.board[index+1].tile,old);
  engine.addMoves(5);
  assert.equal(engine.moves,moves+5);
  const state={...freshProgress(),nextLevel:5};
  const won=victory(state,5);
  assert.equal(won.boosters.glove,state.boosters.glove+1);
  assert.equal(victory(won,5),won);
});

for(const [width,height] of [[320,720],[360,800],[393,852],[412,915],[384,854]]) test(`поле и нижняя панель помещаются в ${width}×${height}`,()=>{
  for(const columns of [7,8]) for(const rows of [7,8,9]){
    const {size,toolWidth,scroll}=boardLayout(width,height,columns,rows);
    assert(size>=30);
    assert(size*columns+10<=width-32);
    assert(toolWidth*6+24<=width-32);
    assert(!scroll);
  }
});
