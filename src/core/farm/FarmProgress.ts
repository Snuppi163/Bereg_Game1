import type { Booster, Progress } from '../progress/ProgressSystem.ts';
import { record } from '../quests/QuestEngine.ts';
import { executeFarm } from './FarmEngine.ts';
import type { FarmCommand } from './FarmEngine.ts';

export function farmTransaction(state:Progress,command:FarmCommand,now=Date.now()){
  const result=executeFarm(state.farm,state.hearts,command,now);
  if(!result.ok)return {state,message:result.message,changed:false};
  return {state:record({...state,farm:result.farm,hearts:result.hearts},result.event,now),message:result.message,changed:true};
}
export const boosterPrices = {
  bomb:{title:'Бомба',price:50},rocket:{title:'Ракета',price:75},lightning:{title:'Молния',price:120},
  super:{title:'Супербомба',price:180},moves:{title:'Ещё 5 ходов',price:150},
} satisfies Partial<Record<Booster,{title:string;price:number}>>;
export type ShopBooster=keyof typeof boosterPrices;
export function buyBooster(state:Progress,id:ShopBooster):Progress {
  const price=boosterPrices[id].price;
  if(state.hearts<price)return state;
  return {...state,hearts:state.hearts-price,boosters:{...state.boosters,[id]:state.boosters[id]+1}};
}
export function spendBooster(state:Progress,id:Booster):Progress {
  if(state.boosters[id]<1)return state;
  return {...state,boosters:{...state.boosters,[id]:state.boosters[id]-1}};
}
