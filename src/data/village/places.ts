import type { Progress } from '../../core/progress/ProgressSystem.ts';
import { record } from '../../core/quests/QuestEngine.ts';
import { pendingAction } from '../../core/story/StoryEngine.ts';
import { farmRank } from '../../core/farm/FarmEngine.ts';

type Place={
  id:string;title:string;npc:string;talk:string;level:number;stars:number;gift:number;task:string;done:string;
  art:'house'|'dock'|'archive'|'farm'|'yard';position:[number,number];route?:'Farm'|'Market'|'Shop'|'Pond'|'Journal';
};
export const villagePlaces:Place[]=[
  {id:'home',title:'Дом Юли',npc:'Вера Павловна',talk:'Ставни продувает. Я покажу, где дед держал запасные петли, если хочешь.',
    level:3,stars:1,gift:22,task:'Починить ставни',done:'Ставни держат тепло. В окне снова горит свет.',art:'house',position:[87,596],route:'Journal'},
  {id:'street',title:'Центральная улица',npc:'Григорий, почтальон',talk:'До дальней калитки я и в сумерках дорогу найду. А вот у поворота хорошо бы зажечь фонарь.',
    level:7,stars:1,gift:26,task:'Зажечь уличные фонари',done:'Улица освещена. Григорий снова разносит вечернюю почту.',art:'yard',position:[120,461]},
  {id:'shop',title:'Сельский магазин',npc:'Павел Андреевич',talk:'Знаешь, что люди спрашивают чаще всего? Можно ли принести свежий хлеб к субботе.',
    level:1,stars:1,gift:24,task:'Починить крыльцо магазина',done:'У крыльца новые ступени, двери магазина открыты.',art:'archive',position:[82,403],route:'Shop'},
  {id:'square',title:'Деревенская площадь',npc:'Анна',talk:'Давай выставим лавки полукругом, чтобы у старого клёна осталось место для музыкантов.',
    level:16,stars:2,gift:38,task:'Расставить ярмарочные лавки',done:'На площади расставлены лавки и развешены флажки.',art:'yard',position:[106,315],route:'Market'},
  {id:'farm',title:'Ферма на окраине',npc:'Вера Павловна',talk:'Вот твои первые четыре грядки. Начни с пшеницы. Земля отдохнула, урожай пойдёт.',
    level:1,stars:0,gift:13,task:'Привести в порядок садовую калитку',done:'Калитка закрывается легко, вдоль ограды посажены цветы.',art:'farm',position:[353,690],route:'Farm'},
  {id:'market',title:'Деревенский рынок',npc:'Павел Андреевич',talk:'Прямо со склада можно продать остатки. А по заказу выйдет выгоднее, если хватает на всю корзину.',
    level:1,stars:1,gift:23,task:'Восстановить доску заказов',done:'Новые объявления видны с улицы.',art:'archive',position:[107,361],route:'Market'},
  {id:'dock',title:'Пристань',npc:'Михаил',talk:'Эту доску положи поперёк. Весной вода стояла выше поручней, надо бы крепление усилить.',
    level:12,stars:2,gift:38,task:'Отремонтировать мостки',done:'Мостки укреплены, над водой зажглись огни.',art:'dock',position:[359,325]},
  {id:'bank',title:'Берег Волги',npc:'Степан Ильич',talk:'Здесь и раньше смотрели, как садится солнце. Поставим лавку лицом к реке, как когда-то.',
    level:20,stars:1,gift:25,task:'Поставить лавку у воды',done:'Дорожка к лавке расчищена.',art:'farm',position:[394,242]},
  {id:'fish',title:'Рыбацкая зона',npc:'Михаил',talk:'В садке рыба не пропадёт. Заведи его на ферме, будешь брать улов для коптильни.',
    level:1,stars:1,gift:24,task:'Привести в порядок рыбацкий навес',done:'Снасти просушены, навес защищает от ветра.',art:'dock',position:[347,200],route:'Pond'},
  {id:'abandoned',title:'Старый заброшенный дом',npc:'Степан Ильич',talk:'Это дом смотрителя. Когда он уезжал, ключ от верхней комнаты оставлял в щели оконной рамы.',
    level:25,stars:2,gift:44,task:'Расчистить вход в дом',done:'Подход к дому снова безопасен. В дневнике Юли появилась отметка.',art:'house',position:[85,207],route:'Journal'},
  {id:'forest',title:'Лесная дорога',npc:'Григорий, почтальон',talk:'Мне старый указатель знаком. По нему можно пройти даже после дождя, если свернуть у двух берёз.',
    level:51,stars:2,gift:47,task:'Вернуть указатели на просеку',done:'На тропе появились свежие указатели и метки.',art:'yard',position:[127,115]},
];

export function canRestore(state:Progress,place:Place){
  const reserve=pendingAction(state)?.cost??0;
  return state.nextLevel>=place.level && !state.village.includes(place.id) &&
    state.stars>=place.stars+reserve && (place.id!=='farm'||farmRank(state.farm)>=2);
}
export function restorePlace(state:Progress,id:string,now=Date.now()){
  const place=villagePlaces.find(item=>item.id===id);
  if(!place || !canRestore(state,place))return state;
  return record({...state,stars:state.stars-place.stars,hearts:state.hearts+place.gift,
    village:[...state.village,id]},{restoration:1},now);
}
