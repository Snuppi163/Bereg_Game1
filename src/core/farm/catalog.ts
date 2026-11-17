export const minute = 60_000;

export const goods = {
  wheat:['Пшеница',50], carrot:['Морковь',120], potato:['Картофель',160], corn:['Кукуруза',250],
  tomato:['Помидоры',340], strawberry:['Клубника',460], sunflower:['Подсолнечник',610], pumpkin:['Тыква',900],
  beet:['Свёкла',1100], raspberry:['Малина',1450], eggs:['Яйца',240], milk:['Молоко',500], truffle:['Трюфели',1250],
  wool:['Шерсть',720], honey:['Мёд',820], flour:['Мука',350], bread:['Хлеб',1050], cream:['Сливки',1230],
  butter:['Масло',2950], preserves:['Соленья',1560], jam:['Варенье',1750], fish:['Рыба',510], smoked:['Копчёная рыба',1940],
} as const;
export type Good = keyof typeof goods;
export type Stock = Partial<Record<Good,number>>;

export const crops = {
  wheat:{minutes:2,amount:8,price:0,rank:1,color:'#e4b751'},
  carrot:{minutes:5,amount:6,price:1,rank:1,color:'#df792f'},
  potato:{minutes:10,amount:5,price:2,rank:1,color:'#c39d60'},
  corn:{minutes:20,amount:6,price:3,rank:2,color:'#edbe46'},
  tomato:{minutes:30,amount:5,price:4,rank:2,color:'#c74439'},
  strawberry:{minutes:45,amount:5,price:6,rank:3,color:'#bd3b4e'},
  sunflower:{minutes:60,amount:4,price:7,rank:3,color:'#eab63c'},
  pumpkin:{minutes:120,amount:4,price:9,rank:4,color:'#e28137'},
  beet:{minutes:135,amount:4,price:12,rank:5,color:'#912e61'},
  raspberry:{minutes:165,amount:4,price:15,rank:6,color:'#b63c73'},
} as const;
export type Crop = keyof typeof crops;

export const pens = {
  chicken:{title:'Курятник',animal:'Курица',rank:1,cost:65,animalCost:20,feed:{wheat:3},minutes:12,output:{eggs:3}},
  cow:{title:'Коровник',animal:'Корова',rank:3,cost:145,animalCost:60,feed:{corn:2,wheat:2},minutes:30,output:{milk:3}},
  pig:{title:'Свинарник',animal:'Свинья',rank:4,cost:175,animalCost:70,feed:{potato:2,carrot:2},minutes:40,output:{truffle:3}},
  sheep:{title:'Овчарня',animal:'Овца',rank:3,cost:135,animalCost:55,feed:{wheat:3,carrot:1},minutes:42,output:{wool:3}},
  bees:{title:'Пасека',animal:'Пчелиная семья',rank:4,cost:165,animalCost:60,feed:{sunflower:2},minutes:38,output:{honey:3}},
} as const;
export type PenKind = keyof typeof pens;

export const recipes = {
  flour:{title:'Мука',input:{wheat:4},output:{flour:2},minutes:7},
  bread:{title:'Хлеб',input:{flour:2},output:{bread:2},minutes:14},
  cream:{title:'Сливки',input:{milk:3},output:{cream:2},minutes:18},
  butter:{title:'Масло',input:{cream:2},output:{butter:1},minutes:26},
  preserves:{title:'Овощные соленья',input:{tomato:2,carrot:3},output:{preserves:2},minutes:25},
  jam:{title:'Клубничное варенье',input:{strawberry:5},output:{jam:2},minutes:38},
  smoked:{title:'Копчёная рыба',input:{fish:3},output:{smoked:2},minutes:24},
  fish:{title:'Улов',input:{wheat:2},output:{fish:3},minutes:22},
} as const;
export type Recipe = keyof typeof recipes;
type WorkshopDetails={title:string;rank:number;cost:number;recipes:Recipe[]};
export const workshops = {
  mill:{title:'Мельница',rank:1,cost:90,recipes:['flour']},
  bakery:{title:'Пекарня',rank:2,cost:120,recipes:['bread']},
  dairy:{title:'Молочная мастерская',rank:3,cost:145,recipes:['cream','butter']},
  cannery:{title:'Консервный цех',rank:3,cost:150,recipes:['preserves']},
  jam:{title:'Варочная мастерская',rank:4,cost:165,recipes:['jam']},
  smokehouse:{title:'Коптильня',rank:3,cost:135,recipes:['smoked']},
  pond:{title:'Рыбацкий садок',rank:2,cost:105,recipes:['fish']},
} satisfies Record<string,WorkshopDetails>;
export type WorkshopKind = keyof typeof workshops;

export const decorations = {
  path:{title:'Дорожка',price:20}, fence:{title:'Резной забор',price:35}, tree:{title:'Осенний клён',price:50},
  flowers:{title:'Клумба',price:30}, lantern:{title:'Праздничный фонарь',price:75},
} as const;
export type Decoration = keyof typeof decorations;
