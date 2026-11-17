import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { Settings } from '../core/progress/ProgressSystem';

const audio = {
  theme: require('../assets/audio/theme.mp3'),
  match: require('../assets/audio/match.mp3'),
  found: require('../assets/audio/found.mp3'),
  radio: require('../assets/audio/radio.mp3'),
};

export function useGameAudio(settings?: Settings) {
  const music = useAudioPlayer(audio.theme);
  const match = useAudioPlayer(audio.match);
  const found = useAudioPlayer(audio.found);
  const radio = useAudioPlayer(audio.radio);
  useEffect(() => {
    music.loop = true;
    music.volume = .42;
    if (settings?.music) music.play();
    else music.pause();
  }, [music, settings?.music]);

  return (effect: 'match' | 'found' | 'radio') => {
    if (settings?.sounds) {
      const player = { match, found, radio }[effect];
      void player.seekTo(0).then(() => player.play()).catch(() => undefined);
    }
    if (settings?.vibration && effect !== 'radio') {
      void Haptics.impactAsync(effect === 'found' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };
}
