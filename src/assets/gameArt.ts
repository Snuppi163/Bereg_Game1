import type { ImageSourcePropType } from 'react-native';
import type { Special } from '../core/match3/Match3Engine';

export const villageMap = require('../../assets/game/maps/village_level_map.webp');
export const upperVillageMap = require('../../assets/game/maps/village_map_alternate.webp');
export const yuliaArt = {
  calm: require('./yulia/calm.webp'),
  smile: require('./yulia/smile.webp'),
  worried: require('./yulia/worried.webp'),
  surprise: require('./yulia/surprise.webp'),
  standing: require('./yulia/standing.webp'),
  lantern: require('./yulia/lantern.webp'),
  portrait: require('./yulia/portrait.webp'),
};
export const gems: ImageSourcePropType[] = [
  require('../../assets/game/tiles/key.png'),
  require('../../assets/game/tiles/lantern.png'),
  require('../../assets/game/tiles/water.png'),
  require('../../assets/game/tiles/leaf.png'),
  require('../../assets/game/tiles/radio.png'),
  require('../../assets/game/tiles/crystal.png'),
];
export const specialArt: Record<Special, ImageSourcePropType> = {
  row: require('../../assets/game/tiles/rocket_horizontal.png'),
  column: require('../../assets/game/tiles/rocket_vertical.png'),
  area: require('../../assets/game/tiles/bomb.png'),
  color: require('../../assets/game/tiles/color_bomb.png'),
};
export const roomArt = {
  kitchen: require('./rooms/kitchen.webp'),
  attic: require('./rooms/attic.webp'),
  dock: require('./rooms/dock.webp'),
  archive: require('./rooms/archive.webp'),
};
