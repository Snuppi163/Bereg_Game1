import React from 'react';
import { Alert, StatusBar, StyleSheet } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/components/GameContext';
import { Button, Copy, palette, Panel, Screen, Title } from './src/components/ui';
import { DailyScreen, DialogueScreen, FinishScreen, HomeScreen, JournalScreen, MapScreen, MenuScreen, SettingsScreen, Splash } from './src/screens/StoryScreens';
import { MatchScreen } from './src/screens/MatchScreen';
import { HiddenScreen } from './src/screens/HiddenScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import type { Routes } from './src/screens/routes';

const Stack = createNativeStackNavigator<Routes>();
const theme = {...DarkTheme,colors:{...DarkTheme.colors,background:palette.bg,card:palette.panel,text:palette.cream,primary:palette.gold}};

export default function App() {
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider>
    <StatusBar barStyle="light-content"/>
    <GameProvider fallback={<Splash/>} error={(retry,reset) => <Screen scroll><Panel><Title small>Дневник не открылся</Title>
      <Copy>Попробуйте загрузить сохранение ещё раз.</Copy><Button title="Повторить" onPress={retry}/></Panel>
      <Button title="Начать сначала" secondary onPress={() => Alert.alert('Стереть сохранение?', 'Игра начнётся с первого уровня.',[
        {text:'Отмена',style:'cancel'}, {text:'Стереть',style:'destructive',onPress:reset}
      ])}/></Screen>}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator initialRouteName="Menu" screenOptions={{headerShown:false,animation:'fade',contentStyle:{backgroundColor:palette.bg}}}>
          <Stack.Screen name="Menu" component={MenuScreen}/>
          <Stack.Screen name="Home" component={HomeScreen}/>
          <Stack.Screen name="Dialogue" component={DialogueScreen}/>
          <Stack.Screen name="Match" component={MatchScreen}/>
          <Stack.Screen name="Hidden" component={HiddenScreen}/>
          <Stack.Screen name="Result" component={ResultScreen}/>
          <Stack.Screen name="Settings" component={SettingsScreen}/>
          <Stack.Screen name="Map" component={MapScreen}/>
          <Stack.Screen name="Daily" component={DailyScreen}/>
          <Stack.Screen name="Journal" component={JournalScreen}/>
          <Stack.Screen name="Finish" component={FinishScreen}/>
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  </SafeAreaProvider></GestureHandlerRootView>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:palette.bg}});
