import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Text, View } from 'react-native';
import { Button, Copy, Label, palette, Panel, Screen, Title } from '../components/ui';
import { useGame } from '../components/GameContext';
import { specialArt } from '../assets/gameArt';
import { discoveries } from '../data/story/campaignStory';
import { getHidden } from '../data/levels';
import { clues } from '../data/story/chapter';
import type { Routes } from './routes';
type Props = NativeStackScreenProps<Routes,'Result'>;
export function ResultScreen({navigation,route}:Props) {
  const {id,won} = route.params;
  const {progress} = useGame();
  const clueId = getHidden(id)?.clue;
  const cluesById:Record<string,{title:string;text:string}>={...clues,...discoveries};
  const clue = clueId ? cluesById[clueId] : undefined;
  return <Screen scroll>
    <View style={{alignItems:'center',paddingTop:50,paddingBottom:10}}>
      <Image source={won ? specialArt.color : specialArt.column} resizeMode="contain" style={{width:96,height:96,opacity:won?1:.65}}/>
    </View>
    <Panel animated>
      <Label tone="gold">Уровень {id}</Label>
      <Title>{won ? 'Уровень пройден' : 'Ходы закончились'}</Title>
      {won && clue && <><Label tone="green">{clue.title}</Label><Copy>{clue.text}</Copy></>}
      <Copy>{won ? 'Звезда начисляется за первое прохождение.' : `Потеряна одна жизнь. Осталось ${progress.lives} из 5.`}</Copy>
      <Label>Звёзды · {progress.stars}</Label>
    </Panel>
    {!won && <Button title="Попробовать снова" onPress={() => navigation.replace('Match',{id})} disabled={!progress.lives}/>}
    <Button title="Вернуться к дому" secondary={!won} onPress={() => navigation.reset({index:0,routes:[{name:'Home'}]})}/>
  </Screen>;
}
