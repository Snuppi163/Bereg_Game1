import test from 'node:test';
import assert from 'node:assert/strict';
import { executeFarm,farmReady,marketOrders,saleQuote,stageOf } from '../src/core/farm/FarmEngine.ts';
import type { FarmCommand } from '../src/core/farm/FarmEngine.ts';
import { farmTransaction,buyBooster,spendBooster } from '../src/core/farm/FarmProgress.ts';
import { crops,minute,recipes,goods } from '../src/core/farm/catalog.ts';
import { dailyReward,defeat,freshProgress,victory } from '../src/core/progress/ProgressSystem.ts';
import type { Progress } from '../src/core/progress/ProgressSystem.ts';
import { decodeSave } from '../src/core/save/saveCodec.ts';
import { canClaimDailyChest,claimChest,claimQuest,questCards,record } from '../src/core/quests/QuestEngine.ts';
import { Match3Engine } from '../src/core/match3/Match3Engine.ts';
import type { Board, Special } from '../src/core/match3/Match3Engine.ts';
import { getMatch } from '../src/data/levels/index.ts';
import { canRestore,restorePlace,villagePlaces } from '../src/data/village/places.ts';
import { seededRandom } from '../src/utils/random.ts';
import solutions from './campaign-solutions.json' with { type:'json' };

const now=new Date(2026,10,17,12).getTime();
const load=(current:Progress)=>decodeSave(JSON.stringify(current));
function apply(state:Progress,command:FarmCommand,time=now){
  const next=farmTransaction(state,command,time);
  assert(next.changed,next.message);
  return next.state;
}

test('игра → сохранение фермы → отложенный урожай → продажа → покупка и активация бомбы',()=>{
  const config=getMatch(1)!;
  const start=new Match3Engine(config,seededRandom(config.seed!));
  for(const [a,b] of solutions['1'])start.play(a,b);
  assert.equal(start.status,'won');
  let state=victory(freshProgress(),1,now);
  assert.equal(state.stars,1);
  for(let plot=0;plot<4;plot++)state=apply(state,{type:'plant',crop:'wheat',plot});
  assert.equal(farmReady(state.farm,now),0);
  assert.equal(farmTransaction(state,{type:'harvest',plot:0},now+minute).state,state);
  state=load(state);
  const ripeAt=now+2*minute;
  assert.equal(farmReady(state.farm,ripeAt),4);
  for(let plot=0;plot<4;plot++)state=apply(state,{type:'harvest',plot},ripeAt);
  assert.equal(state.farm.stock.wheat,32);
  assert.equal(farmTransaction(state,{type:'harvest',plot:0},ripeAt).state,state);
  assert.equal(saleQuote(state.farm,'wheat',32),16);
  state=apply(state,{type:'sell',good:'wheat',amount:32},ripeAt);
  const oldQuantity=state.boosters.bomb;
  state=buyBooster(load(state),'bomb');
  assert.equal(state.hearts,4);
  assert.equal(state.boosters.bomb,oldQuantity+1);
  const engine=new Match3Engine(config,seededRandom(config.seed!));
  const frames=engine.activate(17,'area');
  assert(frames[0].hit?.includes(17));
  assert.equal(frames[0].bursts?.[0].effect,'bomb');
  assert.equal(engine.moves,config.moves-1);
  assert.equal(spendBooster(state,'bomb').boosters.bomb,oldQuantity);
});

test('время всех 10 культур, полив, удобрение и полный склад',()=>{
  assert.deepEqual(Object.values(crops).slice(0,8).map(crop=>crop.minutes),[2,5,10,20,30,45,60,120]);
  assert.equal(Object.keys(crops).length,10);
  let state=apply(freshProgress(),{type:'plant',plot:0,crop:'wheat'});
  const first=state.farm.plots[0]!;
  assert.equal(stageOf(first,now),0);
  assert.equal(stageOf(first,now+minute),1);
  assert.equal(stageOf(first,now+90_000),2);
  state=apply(state,{type:'water',plot:0});
  assert(state.farm.plots[0]!.readyAt<first.readyAt);
  assert.equal(farmTransaction(state,{type:'water',plot:0},now).state,state);
  state=apply(state,{type:'fertilize',plot:0});
  assert.equal(state.farm.fertilizer,0);
  const readyAt=state.farm.plots[0]!.readyAt;
  const full={...state,farm:{...state.farm,stock:{carrot:72}}};
  assert.equal(farmTransaction(full,{type:'harvest',plot:0},readyAt).state,full);
  assert.equal(stageOf(load(state).farm.plots[0]!,readyAt),3);
});

test('рынок начисляет цену дробных продаж без потерь, заказ выдерживает перезапуск и откат даты',()=>{
  let original=freshProgress();
  const order=marketOrders(now)[0];
  original={...original,farm:{...original.farm,stock:{...order.need,wheat:(order.need.wheat??0)+10}}};
  let split=original;
  for(let i=0;i<10;i++)split=apply(split,{type:'sell',good:'wheat',amount:1});
  assert.deepEqual(split,apply(original,{type:'sell',good:'wheat',amount:10}));
  let state=apply(split,{type:'order',id:order.id});
  assert.equal(state.hearts,split.hearts+order.hearts);
  state=load(state);
  assert.equal(farmTransaction(state,{type:'order',id:order.id},now).state,state);
  const yesterday=now-24*60*minute;
  assert.equal(farmTransaction(state,{type:'order',id:marketOrders(yesterday)[0].id},yesterday).state,state);
});

test('животноводство и цепочка мука → хлеб используют время и склад',()=>{
  let state=freshProgress();
  state={...state,hearts:600,farm:{...state.farm,xp:40,stock:{wheat:24}}};
  state=apply(state,{type:'pen',pen:'chicken'});
  state=apply(state,{type:'animal',pen:'chicken'});
  state=apply(state,{type:'feed',pen:'chicken',animal:0});
  assert.equal(state.farm.stock.wheat,21);
  assert.equal(farmTransaction(state,{type:'feed',pen:'chicken',animal:0},now).state,state);
  state=apply(load(state),{type:'collect-animal',pen:'chicken',animal:0},now+12*minute);
  assert.equal(state.farm.stock.eggs,3);
  assert.equal(state.quests.daily.count.eggs,3);
  state=apply(state,{type:'workshop',workshop:'mill'});
  state=apply(state,{type:'workshop',workshop:'bakery'});
  state=apply(state,{type:'start',workshop:'mill',recipe:'flour'});
  assert.equal(farmTransaction(state,{type:'collect-work',workshop:'mill'},now+minute).state,state);
  state=apply(load(state),{type:'collect-work',workshop:'mill'},now+7*minute);
  state=apply(state,{type:'start',workshop:'bakery',recipe:'bread'},now+7*minute);
  state=apply(load(state),{type:'collect-work',workshop:'bakery'},now+21*minute);
  assert.equal(state.farm.stock.bread,2);
  assert.equal(state.farm.stock.flour,undefined);
  for(const recipe of Object.values(recipes)){
    const value=(items:Record<string,number>)=>Object.entries(items).reduce((sum,[id,n])=>sum+goods[id as keyof typeof goods][1]*n,0);
    assert(value(recipe.output)>value(recipe.input));
  }
});

test('сундуки, задания, недельный период и восстановление не дублируют награды',()=>{
  let state=record(freshProgress(),{wins:3,harvest:20,orders:2,bombs:5,eggs:10,workshop:1},now);
  for(const card of questCards(state,'daily',now)){
    assert(card.canClaim);
    state=claimQuest(state,'daily',card.id,now);
    assert.equal(claimQuest(load(state),'daily',card.id,now).hearts,state.hearts);
  }
  assert(canClaimDailyChest(state,now));
  state=claimQuest(state,'daily','chest',now);
  assert(!canClaimDailyChest(load(state),now));
  state=claimQuest(state,'weekly','build',now);
  assert.equal(state.boosters.lightning,3);
  const yesterday=now-24*60*minute;
  assert.equal(claimQuest(state,'daily','play',yesterday),state);
  state=victory(victory(victory(state,1,now),2,now),3,now);
  assert.equal(victory(state,3,now),state);
  assert.deepEqual(state.quests.chests,['streak-3']);
  state=claimChest(state,'streak-3');
  assert.equal(claimChest(load(state),'streak-3').hearts,state.hearts);
  assert.equal(defeat(state,now).quests.streak,0);
  assert.equal(canRestore(state,villagePlaces[0]),true);
  state=restorePlace(state,'home',now);
  assert.equal(restorePlace(state,'home',now),state);
  assert.equal(dailyReward(dailyReward(state,'2026-11-17'),'2026-11-17').hearts,state.hearts+12);
});

test('схема 2 мигрирует без сброса жизни, звёзд, бустеров и прежнего сохранения поля',()=>{
  const saved={schema:2,nextLevel:111,stars:23,lives:2,actions:['key'],clues:['photo'],boosters:{bomb:7,glove:0},settings:{sounds:false},match:{111:{moves:12}}};
  const next=decodeSave(JSON.stringify(saved));
  assert.deepEqual([next.schema,next.nextLevel,next.stars,next.lives,next.boosters.bomb,next.boosters.glove],[3,111,23,2,7,0]);
  assert.deepEqual(next.match,saved.match);
  assert.equal(next.settings.sounds,false);
  assert.equal(next.farm.plots.length,4);
  assert.deepEqual(load(next),next);
});

test('каждый специальный элемент запускается касанием и расходует ровно один ход',()=>{
  const base=getMatch(1)!;
  const center=24;
  for(const special of ['area','row','column','color','super'] satisfies Special[]){
    const board:Board=Array.from({length:49},(_,i)=>({tile:{color:(i%7+Math.floor(i/7)*2)%4}}));
    board[center]={tile:{color:1,special}};
    board[center+1]={tile:{color:1,special:'row'}};
    const boardCopy=board.map(cell=>({...cell}));
    const engine=new Match3Engine(base,seededRandom(140),boardCopy);
    const hit=engine.activate(center)[0];
    assert.equal(engine.moves,base.moves-1);
    assert.equal(engine.turns,1);
    assert(hit.bursts?.some(b=>b.at===center));
    if(special!=='column')assert(hit.bursts?.some(b=>b.at===center+1));
    assert(hit.hit?.includes(center));
  }
});

test('сухая почва и колючки проходимы, сад платит только раз в день',()=>{
  const config=getMatch(301)!;
  const engine=new Match3Engine(config,seededRandom(config.seed!));
  for(const [a,b] of [[25,32],[10,17],[14,15],[19,20],[24,25]])engine.play(a,b);
  assert.equal(engine.status,'won');
  const state=victory(freshProgress(),301,now);
  assert.equal(state.nextLevel,1);
  assert.equal(state.hearts,55);
  assert.equal(victory(load(state),301,now).hearts,55);
  assert.equal(victory(state,301,now-24*60*minute),state);
});
