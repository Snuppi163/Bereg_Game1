import { getHidden, totalLevels } from '../../data/levels/index.ts';
import { canSpend } from '../story/StoryEngine.ts';
import type { Action } from '../../data/story/chapter.ts';
import type { HiddenSnapshot } from '../hiddenObject/HiddenObjectEngine.ts';

export const MAX_LIVES = 5;
export const LIFE_INTERVAL = 30 * 60 * 1000;
export type Settings = { music: boolean; sounds: boolean; vibration: boolean };
export type Progress = {
  schema: 1; nextLevel: number; stars: number; lives: number; regenFrom: number | null;
  actions: string[]; clues: string[]; introSeen: boolean; daily: string | null;
  settings: Settings; hammers: number; hidden: Record<number, HiddenSnapshot>;
};
export function freshProgress(): Progress {
  return { schema:1, nextLevel:1, stars:0, lives:MAX_LIVES, regenFrom:null, actions:[], clues:[], introSeen:false,
    daily:null, settings:{ music:true, sounds:true, vibration:true }, hammers:3, hidden:{} };
}
export function regenerate(state: Progress, now = Date.now()): Progress {
  if (state.regenFrom === null || state.lives >= MAX_LIVES) return state;
  const restored = Math.floor((now - state.regenFrom) / LIFE_INTERVAL);
  if (restored <= 0) return state;
  const lives = Math.min(state.lives + restored, MAX_LIVES);
  return { ...state, lives, regenFrom: lives === MAX_LIVES ? null : state.regenFrom + restored * LIFE_INTERVAL };
}
export function defeat(progress: Progress, now = Date.now()): Progress {
  const state = regenerate(progress, now);
  if (state.lives < 1) return state;
  return { ...state, lives:state.lives - 1, regenFrom:state.regenFrom ?? now };
}
export function victory(state: Progress, id: number): Progress {
  if (id !== state.nextLevel || id > totalLevels) return state;
  const clue = getHidden(id)?.clue;
  return { ...state, nextLevel:id + 1, stars:state.stars + 1, clues:clue ? [...new Set([...state.clues, clue])] : state.clues };
}
export function spend(state: Progress, action: Action): Progress {
  if (!canSpend(state, action)) return state;
  return { ...state, stars:state.stars - action.cost, actions:[...state.actions, action.id],
    clues:action.clue ? [...new Set([...state.clues, action.clue])] : state.clues };
}
export function localDay(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2,'0')).join('-');
}
export function dailyReward(state: Progress, day = localDay()): Progress {
  if (state.daily && day <= state.daily) return state;
  return { ...state, daily:day, hammers:state.hammers + 1, lives:Math.min(MAX_LIVES, state.lives + 1),
    regenFrom:state.lives + 1 >= MAX_LIVES ? null : state.regenFrom };
}
