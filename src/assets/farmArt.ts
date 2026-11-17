import type { Crop, PenKind } from '../core/farm/catalog';
export const farmShore=require('./farm/shore.webp');
export const farmBuilding=require('./farm/barn.webp');
export const farmTree=require('./farm/tree.webp');
export const farmHarvest=require('./farm/harvest.webp');
export const animalArt:Record<PenKind,number>={
  chicken:require('./farm/chicken.webp'),cow:require('./farm/cow.webp'),pig:require('./farm/pig.webp'),
  sheep:require('./farm/sheep.webp'),bees:require('./farm/bees.webp'),
};
export const cropArt:Record<Crop,number>={
  wheat:require('./farm/wheat.webp'),carrot:require('./farm/carrot.webp'),potato:require('./farm/potato.webp'),
  corn:require('./farm/corn.webp'),tomato:require('./farm/tomato.webp'),strawberry:require('./farm/strawberry.webp'),
  sunflower:require('./farm/sunflower.webp'),pumpkin:require('./farm/pumpkin.webp'),beet:require('./farm/beet.webp'),
  raspberry:require('./farm/raspberry.webp'),
};
