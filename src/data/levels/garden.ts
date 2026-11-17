import type { Config } from '../../core/match3/Match3Engine.ts';

export const gardenLevel:Config={
  id:301,seed:14825,width:7,height:7,colors:5,moves:25,
  goals:[{kind:'irrigate',count:5},{kind:'break',target:'bramble',count:3}],
  blocks:[
    {kind:'bramble',at:[2,2],layers:2},{kind:'bramble',at:[3,3]},{kind:'bramble',at:[4,2]},
    {kind:'dry',at:[1,3]},{kind:'dry',at:[5,3]},{kind:'dry',at:[2,4]},{kind:'dry',at:[3,4]},{kind:'dry',at:[4,4]},
  ],
  tutorial:'Собирай ряды на сухой земле и рядом с колючками. Коснись бонуса, чтобы активировать его, или сдвинь его к другому бонусу для комбинации.',
};
