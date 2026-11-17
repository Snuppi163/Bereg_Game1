import { chapterForLevel, discoveries, discoveryId } from '../story/campaignStory.ts';
import type { HiddenConfig, Hotspot, ObjectArt, ObjectTarget, RoomArt } from '../../core/hiddenObject/HiddenObjectEngine.ts';
import { originalHiddenLevels } from './original.ts';
import { seededRandom } from '../../utils/random.ts';

const labels: Record<ObjectArt,string> = {
  key:'Ключ',clock:'Часы',photo:'Фотография',spoon:'Ложка',lamp:'Лампа',coin:'Монета',letter:'Письмо',
  matches:'Спички',flashlight:'Фонарик',cassette:'Кассета',compass:'Компас',glasses:'Очки',lock:'Замок',
  pendant:'Медальон',notebook:'Блокнот',radio:'Радиодеталь',hook:'Крючок',map:'Карта',watch:'Карманные часы',
  rope:'Верёвка',battery:'Батарейка',note:'Записка',
};
const stored=Object.keys(labels) as ObjectArt[];
const rooms:RoomArt[] = ['kitchen','attic','dock','attic','archive','archive','archive','dock','attic','kitchen','dock','archive'];
const sceneNames = [
  ['Кухня бабушки','Чердак','Дом у пристани','Задняя веранда','Комната дежурного'],
  ['Кладовая дежурного','Гостиная','Подвал','Комната с телефоном','Кабинет дежурного'],
  ['Рыбацкий сарай','Причальный склад','Рубка катера','Под навесом','Будка обходчика'],
  ['Лесная сторожка','Над сеновалом','У печки','Угол сторожа','Сушильня'],
  ['Кладовая клуба','Гримёрная','Кинобудка','Служебный вход','Сцена клуба'],
  ['Кабинет истории','Фотолаборатория','Учительская','Шкаф выпускников','Архивариус'],
  ['Стол библиотекаря','Картотека','Комната для писем','Подшивки газет','Читальный зал'],
  ['Дом в низине','Мокрый подвал','Окно у воды','Служебный шкаф','Насосная'],
  ['Комната связиста','Стеллаж антенн','Паяльная','Радиорубка','Стол расшифровки'],
  ['Дом переправщика','Сени','Дальний шкаф','Кухня у окна','Комната брата'],
  ['Старый катер','Островная будка','Зал ожидания','Распределительный шкаф','Островная станция'],
  ['Караульная','Штурманский стол','Сигнальный пост','Последняя вахта','Утренний список'],
];
const placements:Record<RoomArt,[number,number][]> = {
  kitchen:[[72,83],[233,95],[114,179],[190,204],[282,246],[70,304],[190,342],[292,409],[112,435],[268,159]],
  attic:[[79,98],[224,102],[150,164],[275,218],[65,263],[193,301],[251,368],[95,402],[171,443],[297,294]],
  dock:[[84,83],[233,107],[109,181],[289,204],[57,258],[210,277],[102,321],[270,364],[151,416],[265,433]],
  archive:[[85,91],[224,104],[136,170],[291,205],[65,258],[167,302],[266,352],[57,409],[182,437],[259,436]],
};

export const hiddenLevels:HiddenConfig[]=Array.from({length:60},(_,index)=>{
  const id=(index+1)*5;
  const chapter=chapterForLevel(id);
  const zone=(id-chapter.first-4)/5;
  const background=zone===2 && chapter.number>1 ? rooms[chapter.number%rooms.length] : rooms[chapter.number-1];
  const random=seededRandom(id*2027);
  const legacy=originalHiddenLevels.find(level=>level.id===id);
  const mirror=!legacy && index%2===1;
  const source=[...stored];
  for(let i=source.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [source[i],source[j]]=[source[j],source[i]];
  }
  const ids=legacy?.targets.map(item=>item.id) ?? (index%3===0 ? ['key' as const,...source.filter(item=>item!=='key')] : source).slice(0,7+index%3);
  const gate = !legacy && index%4===0;
  const arts:Hotspot['art'][]=['cabinet','book','drawer'];
  const art=arts[Math.floor(index/4)%arts.length];
  if (gate && art==='cabinet') {
    const key=ids.indexOf('key');
    if(key<0) ids[0]='key';
    else [ids[0],ids[key]]=[ids[key],ids[0]];
  }
  const coords=placements[background];
  const size=legacy ? 43 : 35+index%4;
  const mirrorX=(x:number)=>mirror ? 360-x : x;
  const targets:ObjectTarget[]=ids.map((item,i)=>{
    const [x,y]=coords[(i+index%3)%coords.length];
    return {id:item,title:labels[item],x:mirrorX(x),y,size,angle:Math.floor(random()*37)-18,radius:23,
      behind:gate && i===ids.length-1 ? 'stash' : undefined};
  });
  const hiddenTarget=targets.at(-1)!;
  const hotspot=gate ? [{id:'stash',x:hiddenTarget.x,y:hiddenTarget.y,radius:28,art,
    title:art==='cabinet' ? 'Открыть шкаф' : art==='book' ? 'Сдвинуть книгу' : 'Открыть ящик',
    key:art==='cabinet' && ids.includes('key') ? 'key' as const : undefined}] : undefined;
  return {
    id,title:legacy?.title ?? sceneNames[chapter.number-1][zone],scene:legacy?.scene ?? (background==='archive'?'attic':background),
    targets,clue:legacy?.clue ?? discoveryId(id),tutorial:legacy?.tutorial ?? (id===25 ? 'Одна находка спрятана в тайнике. Коснись книги, ящика или дверцы, чтобы заглянуть внутрь.' : undefined),
    background,mirror,hotspots:hotspot,mode:!legacy && index%6===5 ? 'sequence' : !legacy && index%3===1 ? 'silhouette' : 'names',
  };
});
