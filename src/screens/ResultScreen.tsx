import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { Button, Copy, Label, palette, Panel, Screen, Title } from '../components/ui';
import { useGame } from '../components/GameContext';
import { getHidden } from '../data/levels';
import { clues } from '../data/story/chapter';
import type { ClueId } from '../data/story/chapter';
import type { Routes } from './routes';
type Props = NativeStackScreenProps<Routes,'Result'>;
export function ResultScreen({navigation,route}:Props) {
  const {id,won} = route.params;
  const {progress} = useGame();
  const clue = getHidden(id)?.clue as ClueId | undefined;
  return <Screen scroll>
    <View style={{alignItems:'center',paddingTop:50,paddingBottom:10}}>
      <Text style={{fontSize:73,color:won ? palette.gold : palette.rust}}>{won ? '✦' : '☾'}</Text>
    </View>
    <Panel animated>
      <Label tone="gold">Уровень {id}</Label>
      <Title>{won ? 'Уровень пройден' : 'Ходы закончились'}</Title>
      {won && clue && <><Label tone="green">{clues[clue].title}</Label><Copy>{clues[clue].text}</Copy></>}
      <Copy>{won ? 'Звезда начисляется за первое прохождение.' : `Потеряна одна жизнь. Осталось ${progress.lives} из 5.`}</Copy>
      <Label>Звёзды · {progress.stars}</Label>
    </Panel>
    {!won && <Button title="Попробовать снова" onPress={() => navigation.replace('Match',{id})} disabled={!progress.lives}/>}
    <Button title="Вернуться к дому" secondary={!won} onPress={() => navigation.reset({index:0,routes:[{name:'Home'}]})}/>
  </Screen>;
}
