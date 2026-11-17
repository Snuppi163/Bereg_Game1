import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { Settings } from '../core/progress/ProgressSystem';

const ambient = {
  menu:require('../assets/audio/theme.mp3'), map:require('../assets/audio/map.mp3'),
  puzzle:require('../assets/audio/puzzle.mp3'), mystery:require('../assets/audio/mystery.mp3'),
};
export type Music = keyof typeof ambient;

export function useGameAudio(settings: Settings | undefined, scene: Music = 'menu') {
  const music=useAudioPlayer(ambient[scene]);
  const select=useAudioPlayer(require('../assets/audio/select.mp3'));
  const swap=useAudioPlayer(require('../assets/audio/swap.mp3'));
  const match=useAudioPlayer(require('../assets/audio/match.mp3'));
  const found=useAudioPlayer(require('../assets/audio/found.mp3'));
  const radio=useAudioPlayer(require('../assets/audio/radio.mp3'));
  const blast=useAudioPlayer(require('../assets/audio/blast.mp3'));
  const rocket=useAudioPlayer(require('../assets/audio/rocket.mp3'));
  const cascade=useAudioPlayer(require('../assets/audio/cascade.mp3'));
  const win=useAudioPlayer(require('../assets/audio/win.mp3'));
  const loss=useAudioPlayer(require('../assets/audio/loss.mp3'));
  const damage=useAudioPlayer(require('../assets/audio/break.mp3'));
  useEffect(()=>{
    music.loop=true;
    music.volume=.34;
    if(settings?.music) music.play();
    else music.pause();
  },[music,settings?.music]);
  const players={select,swap,match,found,radio,blast,rocket,cascade,win,loss,damage,button:select};
  return (effect:keyof typeof players)=>{
    if(settings?.sounds) {
      const player=players[effect];
      player.volume=.63;
      void player.seekTo(0).then(()=>player.play()).catch(()=>undefined);
    }
    if(!settings?.vibration) return;
    if(effect==='select'||effect==='button') void Haptics.selectionAsync().catch(()=>undefined);
    if(['found','blast','rocket','match','cascade','damage'].includes(effect)) {
      void Haptics.impactAsync(effect==='blast' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined);
    }
  };
}
