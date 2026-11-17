import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Animated,{FadeInUp,ZoomIn} from 'react-native-reanimated';
import { Screen } from '../components/ui';
import { CreamCard,PaperText,PaperTitle,ResourceBar,VillageButton,VillageIcon } from '../components/VillageUI';
import { useGame } from '../components/GameContext';
import { farmShore } from '../assets/farmArt';
import { specialArt } from '../assets/gameArt';
import { discoveries } from '../data/story/campaignStory';
import { getHidden } from '../data/levels';
import { clues } from '../data/story/chapter';
import type { Routes } from './routes';

type Props=NativeStackScreenProps<Routes,'Result'>;
export function ResultScreen({navigation,route}:Props){
  const {id,won,earned}=route.params;
  const {progress}=useGame();
  const clueId=getHidden(id)?.clue;
  const entries:Record<string,{title:string;text:string}>={...clues,...discoveries};
  const clue=clueId?entries[clueId]:undefined;
  const motion=!progress.settings.reducedMotion&&!progress.settings.lowGraphics;
  return <Screen scroll>
    <ResourceBar compact/>
    <ImageBackground source={farmShore} imageStyle={{opacity:.78}} style={css.hero}>
      <Animated.View entering={motion?ZoomIn.duration(450):undefined} style={css.emblem}>
        {won?<VillageIcon name="star" size={82} color="#ffe7a1" filled/>:
          <Image source={specialArt.column} resizeMode="contain" style={{width:71,height:71}}/>}
      </Animated.View>
      <Text style={css.banner}>{id===301?'Садовая головоломка':`Уровень ${id}`}</Text>
    </ImageBackground>
    <Animated.View entering={motion?FadeInUp.duration(360).delay(110):undefined}>
      <CreamCard>
        <PaperTitle>{won?'Победа!':'Ходы закончились'}</PaperTitle>
        {won&&earned&&<View style={css.rewards}>
          {id!==301&&<View style={css.reward}><VillageIcon name="star" color="#ab6b27" filled/><PaperText>+1 звезда</PaperText></View>}
          <View style={css.reward}><VillageIcon name="heart" color="#bd5955" filled/><PaperText>+{id===301?20:3} сердец</PaperText></View>
          {id===301&&<PaperText>+1 удобрение</PaperText>}
        </View>}
        {won&&clue&&<><PaperTitle>{clue.title}</PaperTitle><PaperText>{clue.text}</PaperText></>}
        {won&&!earned&&<PaperText>Уровень пройден.</PaperText>}
        {!won&&<PaperText>Потеряна одна жизнь. Осталось {progress.lives} из 5.</PaperText>}
      </CreamCard>
    </Animated.View>
    {won&&progress.quests.chests.length>0&&<VillageButton title="К сундукам" compact green onPress={()=>navigation.navigate('Tasks')}/>}
    {!won&&<VillageButton title="Попробовать снова" onPress={()=>navigation.replace('Match',{id})} disabled={!progress.lives}/>}
    <VillageButton title={id===301?'На ферму':'Продолжить'} green onPress={()=>{
      if(id===301)navigation.reset({index:1,routes:[{name:'Home'},{name:'Farm'}]});
      else navigation.reset({index:0,routes:[{name:'Home'}]});
    }}/>
  </Screen>;
}

const css=StyleSheet.create({
  hero:{height:205,borderRadius:21,borderWidth:1,borderColor:'#9b7e50',overflow:'hidden',alignItems:'center',justifyContent:'center'},
  emblem:{width:114,height:114,borderRadius:58,alignItems:'center',justifyContent:'center',backgroundColor:'#774e2fbf',borderColor:'#e5b969',borderWidth:3},
  banner:{marginTop:7,borderRadius:13,backgroundColor:'#354e3bdf',color:'#ffedbf',overflow:'hidden',paddingHorizontal:15,paddingVertical:5,fontWeight:'800'},
  rewards:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9},
  reward:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:7,paddingVertical:3,borderRadius:11,backgroundColor:'#f3dfb6'},
});
