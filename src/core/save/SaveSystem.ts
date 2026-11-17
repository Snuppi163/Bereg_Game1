import AsyncStorage from '@react-native-async-storage/async-storage';
import { freshProgress, regenerate } from '../progress/ProgressSystem.ts';
import { decodeSave } from './saveCodec.ts';
import type { Progress } from '../progress/ProgressSystem.ts';

const key = 'tikhiy-bereg.save.v1';
let writes: Promise<void> = Promise.resolve();
export async function loadSave(): Promise<Progress> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return freshProgress();
  return regenerate(decodeSave(raw));
}
export function save(state: Progress) {
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(key, JSON.stringify(state)));
  return writes;
}
