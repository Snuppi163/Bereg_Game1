import AsyncStorage from '@react-native-async-storage/async-storage';
import { freshProgress, regenerate } from '../progress/ProgressSystem.ts';
import type { Progress } from '../progress/ProgressSystem.ts';

const key = 'tikhiy-bereg.save.v1';
let writes: Promise<void> = Promise.resolve();
export async function loadSave(): Promise<Progress> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return freshProgress();
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || !parsed || !('schema' in parsed) || parsed.schema !== 1) {
    throw new Error('Неизвестная версия сохранения');
  }
  const stored = parsed as Partial<Progress>;
  const defaults = freshProgress();
  return regenerate({ ...defaults, ...stored, settings:{ ...defaults.settings, ...stored.settings } });
}
export function save(state: Progress) {
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(key, JSON.stringify(state)));
  return writes;
}
