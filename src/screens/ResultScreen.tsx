import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated,{FadeInDown,ZoomIn} from 'react-native-reanimated';
import { Copy, GameButton, Icon, Label, Row, Scene, palette } from '../components/ui';
import { ResourceBar } from '../components/VillageUI';
import { RewardToken } from '../components/RewardVisual';
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
  const garden=id===301;
  const motion=!progress.settings.reducedMotion&&!progress.settings.lowGraphics;
  const leave=()=>{
    if(garden)navigation.reset({index:1,routes:[{name:'Home'},{name:'Farm'}]});
    else navigation.reset({index:0,routes:[{name:'Home'}]});
  };

  return <Scene source={farmShore}>
    <View style={css.hud}><ResourceBar compact/></View>
    <ScrollView contentContainerStyle={css.page}>
      <View style={css.stage}>
        <Animated.View entering={motion?ZoomIn.springify().damping(14):undefined} style={[css.seal,!won&&css.sealLost]}>
          <View style={css.sealRing}/>
          {won?<Icon name="star" size={77} color="#ffe0a0" filled/>:
            <Image source={specialArt.column} resizeMode="contain" style={css.rocket}/>}
          {won&&<><View style={[css.spark,{left:2,top:16}]}><Icon name="star" size={16} filled/></View>
            <View style={[css.spark,{right:-5,bottom:20}]}><Icon name="star" size={17} filled/></View></>}
        </Animated.View>
        <Label tone="gold">{garden?'Садовая головоломка':`Уровень ${id}`}</Label>
        <Text accessibilityRole="header" style={css.title}>{won?'Победа!':'Ходы закончились'}</Text>
      </View>
      <Animated.View entering={motion?FadeInDown.delay(150).duration(260):undefined} style={css.outcome}>
        {won&&earned&&<Row style={css.rewards}>
          {!garden&&<RewardToken icon="star" label="+1 звезда"/>}
          <RewardToken icon="heart" label={`+${garden?20:3} сердец`} delay={80}/>
          {garden&&<RewardToken icon="farm" label="+1 удобрение" delay={145}/>}
        </Row>}
        {won&&clue&&<View style={css.clue}>
          <Row><Icon name="book" size={17}/><Label tone="gold">Запись в дневнике</Label></Row>
          <Text style={css.clueTitle}>{clue.title}</Text><Copy>{clue.text}</Copy>
        </View>}
        {!won&&<Copy>Осталось жизней: {progress.lives} из 5</Copy>}
        <View style={css.actions}>
          {!won&&<GameButton title="Попробовать снова" icon="rewind" variant="primary"
            onPress={()=>navigation.replace('Match',{id})} disabled={!progress.lives}/>}
          <GameButton title={won?(garden?'На ферму':'Продолжить'):(garden?'На ферму':'В деревню')}
            icon={won?'next':'back'} variant={won?'primary':'label'} onPress={leave}/>
          {won&&progress.quests.chests.length>0&&<GameButton title="К сундукам" icon="gift" variant="label" onPress={()=>navigation.navigate('Tasks')}/>}
        </View>
      </Animated.View>
    </ScrollView>
  </Scene>;
}

const css=StyleSheet.create({
  hud:{paddingHorizontal:14,paddingTop:8,alignItems:'center'},
  page:{flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:15,paddingVertical:16,gap:14},
  stage:{alignItems:'center',gap:7,paddingTop:12},
  seal:{width:126,height:126,borderRadius:63,alignItems:'center',justifyContent:'center',backgroundColor:'#4b3025df',
    borderColor:'#edc37c',borderWidth:3,shadowColor:'#ffba59',shadowOpacity:.45,shadowRadius:24,elevation:6},
  sealLost:{backgroundColor:'#1c2e3cea',borderColor:'#81949f',shadowOpacity:.2,shadowColor:'#77abc9'},
  sealRing:{position:'absolute',left:5,right:5,top:5,bottom:5,borderWidth:1,borderColor:'#f8d49ba1',borderRadius:59},
  spark:{position:'absolute'},rocket:{width:75,height:75,opacity:.8},
  title:{fontSize:34,lineHeight:39,fontFamily:'serif',fontWeight:'700',textAlign:'center',color:palette.cream,
    textShadowColor:'#0d1926',textShadowRadius:9,textShadowOffset:{width:0,height:2}},
  outcome:{width:'100%',maxWidth:420,alignItems:'center',gap:13},
  rewards:{justifyContent:'center'},
  clue:{gap:4,width:'100%',borderTopWidth:1,borderBottomWidth:1,borderColor:'#997c52',backgroundColor:'#132435d9',paddingHorizontal:12,paddingVertical:10},
  clueTitle:{fontFamily:'serif',fontSize:19,fontWeight:'700',color:palette.cream},
  actions:{width:'83%',maxWidth:275,gap:5},
});
