import type { Booster, Progress } from '../progress/ProgressSystem.ts';
import type { Decoration } from '../farm/catalog.ts';
import { farmDay } from '../farm/FarmEngine.ts';
import type { FarmMetric } from '../farm/FarmEngine.ts';

export type Metric=FarmMetric|'wins'|'bombs'|'restoration';
export type Counters=Partial<Record<Metric,number>>;
type Reward={hearts?:number;boosters?:Partial<Record<Booster,number>>;decor?:Decoration;fertilizer?:number;accelerators?:number};
type Bucket={key:string;count:Counters;claimed:string[]};
export type Quests={daily:Bucket;weekly:Bucket;season:Bucket;all:Bucket;streak:number;chests:string[];plays:{day:string;ids:number[]}};
export type Scope='daily'|'weekly'|'season'|'all';
type Goal={id:string;title:string;metric:Metric;target:number;reward:Reward};
const bucket=(key=''):Bucket=>({key,count:{},claimed:[]});
export const newQuests=():Quests=>({daily:bucket(),weekly:bucket(),season:bucket(),all:bucket('all'),streak:0,chests:[],plays:{day:'',ids:[]}});

const daily:Goal[]=[
  {id:'play',title:'Выиграй на 3 уровнях «Три в ряд»',metric:'wins',target:3,reward:{hearts:50}},
  {id:'harvest',title:'Собери 20 единиц урожая',metric:'harvest',target:20,reward:{hearts:40}},
  {id:'market',title:'Выполни 2 заказа жителей',metric:'orders',target:2,reward:{hearts:70}},
  {id:'bombs',title:'Создай 5 бомб на поле',metric:'bombs',target:5,reward:{boosters:{bomb:1}}},
  {id:'eggs',title:'Собери 10 яиц',metric:'eggs',target:10,reward:{hearts:60}},
];
const weekly:Goal[]=[
  {id:'play',title:'Выиграй на 25 уровнях «Три в ряд»',metric:'wins',target:25,reward:{hearts:300,boosters:{rocket:3}}},
  {id:'trade',title:'Заработай торговлей 1000 сердец',metric:'trade',target:1000,reward:{decor:'lantern',hearts:100}},
  {id:'market',title:'Выполни 20 заказов',metric:'orders',target:20,reward:{hearts:250,boosters:{super:1}}},
  {id:'build',title:'Построй мастерскую',metric:'workshop',target:1,reward:{hearts:200,boosters:{lightning:2}}},
];
const all:Goal[]=[
  {id:'harvest',title:'Щедрый огород',metric:'harvest',target:100,reward:{hearts:100,fertilizer:2}},
  {id:'restoration',title:'Новая жизнь села',metric:'restoration',target:8,reward:{hearts:125,decor:'flowers'}},
  {id:'build',title:'Сельский мастер',metric:'build',target:6,reward:{hearts:100,accelerators:2}},
];
const events:Record<string,{title:string;metric:Metric;target:number;reward:Reward}> = {
  spring:{title:'Весенние посадки',metric:'harvest',target:150,reward:{hearts:190,decor:'flowers',fertilizer:3}},
  fish:{title:'Рыбацкий фестиваль на Волге',metric:'fish',target:21,reward:{hearts:240,boosters:{lightning:2}}},
  fair:{title:'Деревенская ярмарка',metric:'orders',target:14,reward:{hearts:275,decor:'lantern'}},
  autumn:{title:'Осенний урожай',metric:'harvest',target:220,reward:{hearts:225,decor:'tree',boosters:{bomb:2}}},
  winter:{title:'Зимняя подготовка',metric:'produce',target:45,reward:{hearts:220,decor:'fence',accelerators:3}},
};
const eventAt=(now:number)=>{
  const m=new Date(now).getMonth()+1;
  return events[m>=2&&m<=4?'spring':m<=6&&m>=5?'fish':m<=8&&m>=7?'fair':m<=10&&m>=9?'autumn':'winter'];
};
function weekAt(now:number){
  const day=new Date(now);
  day.setDate(day.getDate()-((day.getDay()+6)%7));
  return farmDay(day.getTime());
}
const keysAt=(now:number)=>({ daily:farmDay(now),weekly:weekAt(now),season:farmDay(now).slice(0,7),all:'all' });
function readyBucket(source:Bucket,key:string) {return source.key<key ? bucket(key) : source;}

function goalsFor(scope:Scope,now:number):Goal[] {
  if(scope==='daily')return daily;
  if(scope==='weekly')return weekly;
  if(scope==='all')return all;
  return [{id:'event',...eventAt(now)}];
}

export function record(state:Progress,event:Counters,now=Date.now()):Progress {
  if(!Object.values(event).some(n=>n>0)) return state;
  const quest={...state.quests};
  const keys=keysAt(now);
  for(const scope of Object.keys(keys) as Scope[]){
    const current=readyBucket(quest[scope],keys[scope]);
    if(current.key!==keys[scope])continue;
    const count={...current.count};
    for(const [metric,n] of Object.entries(event) as [Metric,number][]){
      if(n>0)count[metric]=(count[metric]??0)+n;
    }
    quest[scope]={...current,count};
  }
  return {...state,quests:quest};
}

export function matchWin(state:Progress,id:number,now=Date.now()):Progress {
  const day=farmDay(now), previous=state.quests.plays;
  if(day<previous.day || day===previous.day&&previous.ids.includes(id))return state;
  const ids=day===previous.day?[...previous.ids,id]:[id];
  return record({...state,quests:{...state.quests,plays:{day,ids}}},{wins:1},now);
}

export function streakAfterWin(state:Progress,id:number):Progress {
  const streak=state.quests.streak+1;
  const earned=[...(streak%3===0?[`streak-${id}`]:[]),...(id%25===0?[`chapter-${id}`]:[])];
  return {...state,quests:{...state.quests,streak,chests:[...state.quests.chests,...earned]}};
}

export function questCards(state:Progress,scope:Scope,now=Date.now()){
  const key=keysAt(now)[scope];
  const data=readyBucket(state.quests[scope],key);
  const same=data.key===key;
  return goalsFor(scope,now).map(goal=>{
    const done=same?Math.min(goal.target,data.count[goal.metric]??0):0;
    const claimed=same&&data.claimed.includes(goal.id);
    return {...goal,done,claimed,canClaim:same&&done>=goal.target&&!claimed};
  });
}
function rewardTo(state:Progress,reward:Reward):Progress {
  const boosters={...state.boosters};
  for(const [id,n] of Object.entries(reward.boosters??{}) as [Booster,number][])boosters[id]+=n;
  const farm={...state.farm,fertilizer:state.farm.fertilizer+(reward.fertilizer??0),accelerators:state.farm.accelerators+(reward.accelerators??0)};
  if(reward.decor) farm.gifts={...farm.gifts,[reward.decor]:(farm.gifts[reward.decor]??0)+1};
  return {...state,farm,boosters,hearts:state.hearts+(reward.hearts??0)};
}

const dailyChest:Reward={hearts:120,boosters:{bomb:1,moves:1},fertilizer:2};
export const canClaimDailyChest=(state:Progress,now=Date.now())=>state.quests.daily.key===keysAt(now).daily &&
  daily.every(goal=>state.quests.daily.claimed.includes(goal.id))&&!state.quests.daily.claimed.includes('chest');
export function claimQuest(state:Progress,scope:Scope,id:string,now=Date.now()):Progress {
  const goal=questCards(state,scope,now).find(card=>card.id===id && card.canClaim);
  const dailyReward=scope==='daily' && id==='chest' && canClaimDailyChest(state,now) ? dailyChest : undefined;
  const reward=goal?.reward??dailyReward;
  if(!reward)return state;
  const data=readyBucket(state.quests[scope],keysAt(now)[scope]);
  return rewardTo({...state,quests:{...state.quests,[scope]:{...data,claimed:[...data.claimed,id]}}},reward);
}
export function chestInfo(id:string){
  return id.startsWith('chapter-') ? {title:'Сундук за главу',reward:{hearts:110,boosters:{super:1,moves:1}}}:
    {title:'Сундук за серию побед',reward:{hearts:45,boosters:{rocket:1}}};
}
export function claimChest(state:Progress,id:string):Progress {
  if(!state.quests.chests.includes(id))return state;
  return rewardTo({...state,quests:{...state.quests,chests:state.quests.chests.filter(item=>item!==id)}},chestInfo(id).reward);
}
const boosterLabels:Partial<Record<Booster,string>>={bomb:'бомбы',rocket:'ракеты',lightning:'молнии',super:'супербомбы',moves:'добавочные ходы'};
export function rewardText(reward:Reward){
  return [
    reward.hearts?`${reward.hearts} сердец`:'',
    ...Object.entries(reward.boosters??{}).map(([key,n])=>`${boosterLabels[key as Booster]} ×${n}`),
    reward.decor?'украшение для фермы':'',
    reward.fertilizer?`удобрения ×${reward.fertilizer}`:'',
    reward.accelerators?`ускорители ×${reward.accelerators}`:'',
  ].filter(Boolean).join(' · ');
}
