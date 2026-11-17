import { crops, decorations, goods, minute, pens, recipes, workshops } from './catalog.ts';
import type { Crop, Decoration, Good, PenKind, Recipe, Stock, WorkshopKind } from './catalog.ts';

export type CropCycle = {crop:Crop; plantedAt:number; readyAt:number; watered:boolean; fertilized:boolean};
type Animal = { readyAt:number|null };
type Batch = { recipe:Recipe; readyAt:number; accelerated:boolean };
type Ornament = { kind:Decoration; spot:number };
export type Farm = {
  xp:number; plots:(CropCycle|null)[]; land:number; capacity:number; stock:Stock; carry:number;
  pens:Partial<Record<PenKind,Animal[]>>; workshops:Partial<Record<WorkshopKind,Batch|null>>;
  fertilizer:number; accelerators:number; decor:Ornament[]; gifts:Partial<Record<Decoration,number>>;
  orders:{day:string;done:string[]};
};
export type FarmMetric = 'harvest'|'eggs'|'orders'|'trade'|'workshop'|'produce'|'build'|'fish';
export type FarmEvent=Partial<Record<FarmMetric,number>>;

export type FarmCommand =
  | {type:'plant';plot:number;crop:Crop} | {type:'water'|'fertilize'|'harvest';plot:number}
  | {type:'plot'|'land'|'storage'|'buy-fertilizer'|'buy-accelerator'}
  | {type:'sell';good:Good;amount:number} | {type:'order';id:string}
  | {type:'pen'|'animal';pen:PenKind} | {type:'feed'|'collect-animal';pen:PenKind;animal:number}
  | {type:'workshop'|'accelerate'|'collect-work';workshop:WorkshopKind}
  | {type:'start';workshop:WorkshopKind;recipe:Recipe}
  | {type:'decorate';kind:Decoration;spot:number}
  | {type:'move';from:number;to:number};

export const farmDay=(now:number)=>{
  const date=new Date(now);
  return [date.getFullYear(),date.getMonth()+1,date.getDate()].map(v=>String(v).padStart(2,'0')).join('-');
};

export function newFarm():Farm {
  return {xp:0,plots:[null,null,null,null],land:1,capacity:72,stock:{},carry:0,pens:{},workshops:{},
    fertilizer:1,accelerators:0,decor:[],gifts:{},orders:{day:'',done:[]}};
}
const rankXp=[0,30,80,155,270,440,650];
export const farmRank=(farm:Farm)=>rankXp.filter(xp=>xp<=farm.xp).length;
export const plotLimit=(farm:Farm)=>farm.land*6;
export const plotPrice=(farm:Farm)=>100+Math.max(0,farm.plots.length-4)*35;
export const landPrice=(farm:Farm)=>140+farm.land*65;
export const storagePrice=(farm:Farm)=>250+Math.max(0,(farm.capacity-72)/32)*85;
export const volume=(stock:Stock)=>Object.values(stock).reduce((sum,n)=>sum+n,0);
export const hasStock=(stock:Stock,items:Stock)=>stockEntries(items).every(([good,n])=>(stock[good]??0)>=n);
export const stockEntries=(stock:Stock)=>(Object.entries(stock) as [Good,number][]).filter(([,n])=>n>0);
export const saleQuote=(farm:Farm,good:Good,n:number)=>Math.floor((farm.carry+goods[good][1]*n)/100);
export const stageOf=(crop:CropCycle,now:number)=>now>=crop.readyAt ? 3 :
  now>=crop.plantedAt+.55*(crop.readyAt-crop.plantedAt) ? 2 : now>crop.plantedAt+.18*(crop.readyAt-crop.plantedAt) ? 1 : 0;
export function farmReady(farm:Farm,now:number) {
  return farm.plots.filter(item=>item && item.readyAt<=now).length +
    Object.values(farm.pens).reduce((sum,animals)=>sum+animals.filter(animal=>animal.readyAt!==null && animal.readyAt<=now).length,0) +
    Object.values(farm.workshops).filter(batch=>batch && batch.readyAt<=now).length;
}

type MarketOrder={id:string;person:string;title:string;need:Stock;hearts:number;rank:number};
export function marketOrders(now:number):MarketOrder[] {
  const day=farmDay(now);
  const pick=Number(day.replaceAll('-',''))%4;
  const neighbours=['Вера Павловна','Анна','Михаил','Почтальон Григорий'];
  const small:Stock[]=[{wheat:12},{carrot:8},{potato:7},{wheat:6,carrot:5}];
  const pop:Stock[]=[{eggs:6},{flour:5},{fish:4},{potato:8,carrot:7}];
  const grand:Stock[]=[{bread:8,eggs:10},{milk:12,jam:4},{smoked:8,honey:5},{butter:4,preserves:6}];
  return [
    {id:`${day}-home`,person:neighbours[pick],title:'К обеду',need:small[pick],hearts:[11,14,16,13][pick],rank:1},
    {id:`${day}-guest`,person:['Семья с пристани','Гости из Самары','Сосед с Волги','Учительница'][pick],
      title:'Покупатель у прилавка',need:pop[pick],hearts:[23,25,28,27][pick],rank:pick===2?2:1},
    {id:`${day}-character`,person:'Михаил',title:'В дорогу',need:{bread:3,fish:4},hearts:68,rank:2},
    {id:`${day}-fair`,person:'Сельская ярмарка',title:'Оптовая партия',need:grand[pick],hearts:[136,174,211,252][pick],rank:4},
  ];
}
export const orderDone=(farm:Farm,order:MarketOrder)=>farm.orders.done.includes(order.id);
type Result={ok:true;farm:Farm;hearts:number;message:string;event:FarmEvent}|{ok:false;message:string};
const fail=(message:string):Result=>({ok:false,message});
function changeStock(stock:Stock,items:Stock,sign:1|-1) {
  const result={...stock};
  for(const [good,n] of stockEntries(items)){
    const next=(result[good]??0)+n*sign;
    if(next===0) delete result[good];
    else result[good]=next;
  }
  return result;
}

export function executeFarm(farm:Farm,hearts:number,cmd:FarmCommand,now=Date.now()):Result {
  const success=(patch:Partial<Farm>,message:string,delta=0,event:FarmEvent={}):Result=>
    ({ok:true,farm:{...farm,...patch},hearts:hearts+delta,message,event});
  const pay=(price:number,patch:Partial<Farm>,message:string,event?:FarmEvent):Result=>
    hearts<price ? fail(`Нужно ${price} сердец.`) : success(patch,message,-price,event);
  const rank=farmRank(farm);
  const output=(items:Stock)=>volume(farm.stock)+volume(items)<=farm.capacity;
  if(cmd.type==='plant'){
    const row=crops[cmd.crop];
    if(farm.plots[cmd.plot]!==null || rank<row.rank) return fail('Эта посадка пока недоступна.');
    const plots=[...farm.plots];
    plots[cmd.plot]={crop:cmd.crop,plantedAt:now,readyAt:now+row.minutes*minute,watered:false,fertilized:false};
    return pay(row.price,{plots},`Посадили: ${goods[cmd.crop][0].toLowerCase()}.`);
  }
  if(cmd.type==='water'||cmd.type==='fertilize'||cmd.type==='harvest'){
    const planted=farm.plots[cmd.plot];
    if(!planted) return fail('Грядка свободна.');
    const plots=[...farm.plots];
    if(cmd.type==='harvest'){
      if(now<planted.readyAt) return fail('Урожай ещё растёт.');
      const amount=crops[planted.crop].amount;
      const stock={[planted.crop]:amount};
      if(!output(stock)) return fail('Склад полон. Продай часть запасов.');
      plots[cmd.plot]=null;
      return success({plots,stock:changeStock(farm.stock,stock,1),xp:farm.xp+amount},`Собрано: ${goods[planted.crop][0].toLowerCase()} × ${amount}.`,0,{harvest:amount});
    }
    if(planted.readyAt<=now) return fail('Урожай уже созрел.');
    const water=cmd.type==='water';
    if(water ? planted.watered : planted.fertilized || farm.fertilizer<1) return fail(water ? 'Эта грядка уже полита.' : 'Удобрение недоступно для этой посадки.');
    plots[cmd.plot]={...planted,watered:planted.watered||water,fertilized:planted.fertilized||!water,
      readyAt:now+Math.round((planted.readyAt-now)*(water?.82:.5))};
    return success({plots,fertilizer:farm.fertilizer-(water?0:1)},water?'Грядка полита.':'Рост ускорен.');
  }
  switch(cmd.type){
    case 'plot':
      return farm.plots.length>=plotLimit(farm) ? fail('Открой новое поле для грядок.') :
        pay(plotPrice(farm),{plots:[...farm.plots,null],xp:farm.xp+4},'Новая грядка готова.',{build:1});
    case 'land':
      return farm.land>=4 ? fail('Все поля уже открыты.') :
        pay(landPrice(farm),{land:farm.land+1,xp:farm.xp+10},'Открыто новое поле.',{build:1});
    case 'storage':
      return pay(storagePrice(farm),{capacity:farm.capacity+32,xp:farm.xp+6},'На складе стало больше места.',{build:1});
    case 'buy-fertilizer': return pay(25,{fertilizer:farm.fertilizer+1},'Удобрение на складе.');
    case 'buy-accelerator': return pay(40,{accelerators:farm.accelerators+1},'Ускоритель на складе.');
    case 'sell': {
      if(!Number.isSafeInteger(cmd.amount)||cmd.amount<1||(farm.stock[cmd.good]??0)<cmd.amount) return fail('На складе нет такого количества.');
      const value=farm.carry+goods[cmd.good][1]*cmd.amount;
      const gain=Math.floor(value/100);
      return success({stock:changeStock(farm.stock,{[cmd.good]:cmd.amount},-1),carry:value%100},gain?`Получено сердец: ${gain}.`:'Остаток цены учтён в следующей продаже.',gain,{trade:gain});
    }
    case 'order': {
      const day=farmDay(now);
      const order=marketOrders(now).find(o=>o.id===cmd.id && o.rank<=rank);
      if(!order || day<farm.orders.day || orderDone(farm,order)) return fail('Этот заказ уже закрыт или недоступен.');
      if(!hasStock(farm.stock,order.need)) return fail('На складе не хватает товаров для заказа.');
      const done=farm.orders.day===day ? farm.orders.done : [];
      return success({stock:changeStock(farm.stock,order.need,-1),orders:{day,done:[...done,order.id]},xp:farm.xp+8},
        `Заказ выполнен. Получено сердец: ${order.hearts}.`,order.hearts,{orders:1,trade:order.hearts});
    }
    case 'pen': {
      const info=pens[cmd.pen];
      if(rank<info.rank || farm.pens[cmd.pen]) return fail('Постройка пока недоступна.');
      return pay(info.cost,{pens:{...farm.pens,[cmd.pen]:[]},xp:farm.xp+8},`${info.title} готов к работе.`,{build:1});
    }
    case 'animal': {
      const animals=farm.pens[cmd.pen];
      const info=pens[cmd.pen];
      if(!animals || animals.length>=Math.min(4,farm.land+1)) return fail('Нет свободного места. Можно расширить хозяйство.');
      return pay(info.animalCost,{pens:{...farm.pens,[cmd.pen]:[...animals,{readyAt:null}]}},`${info.animal} теперь на ферме.`);
    }
    case 'feed':
    case 'collect-animal': {
      const animals=farm.pens[cmd.pen], animal=animals?.[cmd.animal];
      if(!animals || !animal) return fail('Животное не найдено.');
      const info=pens[cmd.pen], next=[...animals];
      if(cmd.type==='feed'){
        if(animal.readyAt!==null) return fail('Прежняя продукция ещё не собрана.');
        if(!hasStock(farm.stock,info.feed)) return fail('Сначала вырасти корм.');
        next[cmd.animal]={readyAt:now+info.minutes*minute};
        return success({pens:{...farm.pens,[cmd.pen]:next},stock:changeStock(farm.stock,info.feed,-1)},'Животное накормлено.');
      }
      if(animal.readyAt===null || animal.readyAt>now) return fail('Продукция ещё не готова.');
      if(!output(info.output)) return fail('Склад полон.');
      next[cmd.animal]={readyAt:null};
      const amount=volume(info.output);
      return success({pens:{...farm.pens,[cmd.pen]:next},stock:changeStock(farm.stock,info.output,1),xp:farm.xp+amount},
        'Продукция отправлена на склад.',0,{produce:amount,eggs:cmd.pen==='chicken'?amount:0});
    }
    case 'workshop': {
      const info=workshops[cmd.workshop];
      if(rank<info.rank || cmd.workshop in farm.workshops) return fail('Постройка пока недоступна.');
      return pay(info.cost,{workshops:{...farm.workshops,[cmd.workshop]:null},xp:farm.xp+10},`${info.title} готова к работе.`,{workshop:1,build:1});
    }
    case 'start': {
      const info=workshops[cmd.workshop], recipe=recipes[cmd.recipe];
      if(farm.workshops[cmd.workshop]!==null || !info.recipes.some(recipeId=>recipeId===cmd.recipe)) return fail('Рецепт здесь недоступен.');
      if(!hasStock(farm.stock,recipe.input)) return fail('Сначала подготовь ингредиенты.');
      return success({workshops:{...farm.workshops,[cmd.workshop]:{recipe:cmd.recipe,readyAt:now+recipe.minutes*minute,accelerated:false}},
        stock:changeStock(farm.stock,recipe.input,-1)},'Производство запущено.');
    }
    case 'accelerate':
    case 'collect-work': {
      const batch=farm.workshops[cmd.workshop];
      if(!batch) return fail('В мастерской нет заказа.');
      if(cmd.type==='accelerate'){
        if(farm.accelerators<1 || batch.accelerated || batch.readyAt<=now) return fail('Ускоритель недоступен для этой партии.');
        return success({accelerators:farm.accelerators-1,workshops:{...farm.workshops,[cmd.workshop]:
          {...batch,accelerated:true,readyAt:now+Math.round((batch.readyAt-now)/3)}}},'Партия приготовится быстрее.');
      }
      if(batch.readyAt>now) return fail('Партия ещё готовится.');
      const items=recipes[batch.recipe].output;
      if(!output(items)) return fail('Склад полон.');
      const amount=volume(items);
      return success({stock:changeStock(farm.stock,items,1),workshops:{...farm.workshops,[cmd.workshop]:null},xp:farm.xp+amount*2},
        'Партия отправлена на склад.',0,{produce:amount,fish:batch.recipe==='fish'?amount:0});
    }
    case 'decorate': {
      if(!validSpot(cmd.spot) || farm.decor.some(item=>item.spot===cmd.spot)) return fail('Выбери свободное место.');
      const decor=[...farm.decor,{kind:cmd.kind,spot:cmd.spot}];
      const gift=farm.gifts[cmd.kind]??0;
      if(gift) return success({decor,gifts:{...farm.gifts,[cmd.kind]:gift-1}},'Награда установлена.');
      return pay(decorations[cmd.kind].price,{decor},'Украшение установлено.');
    }
    case 'move': {
      const item=farm.decor.find(dec=>dec.spot===cmd.from);
      if(!item || !validSpot(cmd.to)) return fail('Выбери место для украшения.');
      return success({decor:farm.decor.map(dec=>dec.spot===cmd.from ? {...dec,spot:cmd.to} : dec.spot===cmd.to ? {...dec,spot:cmd.from} : dec)},'Расположение изменено.');
    }
  }
}

const validSpot=(spot:number)=>Number.isInteger(spot)&&spot>=0&&spot<8;
