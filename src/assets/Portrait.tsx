import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { characters } from '../data/characters';
import type { CharacterId } from '../data/characters';
import type { Line } from '../data/story/chapter';

const yulia = require('./yulia.jpg');
export function Portrait({ id, size = 72, mood }: { id:CharacterId; size?:number; mood?:Line['mood'] }) {
  const { hair, coat, skin } = characters[id];
  return <View accessibilityLabel={characters[id].name} style={{width:size,height:size,borderWidth:1,borderColor:'#b89969',borderRadius:size/2,overflow:'hidden',backgroundColor:'#263c39'}}>
    {id === 'yulia' ? <Image source={yulia} accessibilityIgnoresInvertColors style={{width:'100%',height:'100%',transform:[{scale:mood === 'surprise' ? 1.1 : 1}]}}/> :
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs><LinearGradient id="portrait"><Stop stopColor="#536660"/><Stop offset="1" stopColor="#223531"/></LinearGradient></Defs>
        <Rect width="100" height="100" fill="url(#portrait)"/>
        <Circle cx="60" cy="28" r="28" fill="#d6b079" opacity=".14"/>
        {id === 'radio' ? <G transform="translate(13 28)">
          <Rect width="74" height="48" rx="7" fill="#806047" stroke="#c3a374" strokeWidth="2"/>
          <Rect x="7" y="8" width="34" height="31" rx="4" fill="#433c32"/>
          <Path d="M11 14h26m-26 6h26m-26 6h26m-26 6h26" stroke="#927a59" strokeWidth="2"/>
          <Rect x="46" y="10" width="21" height="8" fill="#f0c480"/><Circle cx="57" cy="30" r="8" fill="#c69f6a"/>
        </G> : <G>
          <Path d="M10 100q0-24 25-29l8-8h14l8 8q25 5 25 29" fill={coat} stroke="#a69172" strokeWidth="1"/>
          <Path d="M31 50q-8-34 17-36 27-3 24 36l-7 22H35z" fill={hair}/>
          <Path d="M43 57h14l4 17-11 8-11-8z" fill={skin}/>
          <Path d="M33 38q4-21 16-17 16-2 19 17l-3 18q-6 12-15 13-10-2-16-13z" fill={skin}/>
          {id === 'stranger' ? <Path d="M19 64Q18 9 48 8q28 0 31 55l-13 12 6-29-5-21H35l-5 22 4 32z" fill={hair} stroke="#546061" strokeWidth="2"/> :
            <G>
              <Path d="M31 39q-4-21 14-27 25-7 29 25l-11-5-9-11-9 11z" fill={hair}/>
              <Path d="M37 42q4-3 8 0m10 0q4-3 8 0M51 44l-3 8h4m-9 5q7 4 13 0" stroke="#695044" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              <Ellipse cx="42" cy="44" rx="1.9" ry="1.5" fill="#333c35"/><Ellipse cx="58" cy="44" rx="1.9" ry="1.5" fill="#333c35"/>
              {id === 'vera' && <Path d="M28 37q0-26 21-27 20-2 24 24L60 23l-25 13m-5 2 4 34-10-10z" fill="#b29a93"/>}
              {id === 'mikhail' && <Path d="M27 36l4-13q21-15 41 0l2 13-32-4-14 6M35 55q13 13 31 0l-5 12-12 6-11-9" fill="#45443a"/>}
              {id === 'anna' && <Path d="M31 36l5 13-4 24-11 10 4-34zm38 0 7 20 1 24-11-10-2-18z" fill={hair}/>}
            </G>}
          <Path d="M21 99l13-26 15 10 18-10 13 26M50 84v16" fill="none" stroke="#c3ac81" opacity=".5" strokeWidth="2"/>
        </G>}
      </Svg>}
  </View>;
}
