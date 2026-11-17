import { getHidden, totalLevels } from '../../data/levels/index.ts';
import { canSpend } from '../story/StoryEngine.ts';
import type { Action } from '../../data/story/chapter.ts';
import type { MatchSnapshot } from '../match3/Match3Engine.ts';
import type { HiddenSnapshot } from '../hiddenObject/HiddenObjectEngine.ts';

export const MAX_LIVES = 5;
export const LIFE_INTERVAL = 30 * 60 * 1000;
export type Settings = { music: boolean; sounds: boolean; vibration: boolean; reducedMotion: boolean };
export type Booster = 'glove' | 'moves' | 'bomb' | 'rocket' | 'shuffle';
export type Progress = {
  schema: 2; nextLevel: number; stars: number; lives: number; regenFrom: number | null;
  actions: string[]; clues: string[]; introSeen: boolean; daily: string | null;
  settings: Settings; hammers: number; boosters: Record<Booster,number>; match: Record<number,MatchSnapshot>; hidden: Record<number, HiddenSnapshot>;
};
export function freshProgress(): Progress {
  return { schema:2, nextLevel:1, stars:0, lives:MAX_LIVES, regenFrom:null, actions:[], clues:[], introSeen:false,
    daily:null, settings:{ music:true, sounds:true, vibration:true, reducedMotion:false }, hammers:3, boosters:{glove:3,moves:2,bomb:2,rocket:2,shuffle:3}, match:{}, hidden:{} };
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
  const bonus: Booster[] = ['glove','rocket','shuffle','bomb','moves'];
  const key = bonus[(Math.floor(id/5)-1)%bonus.length];
  const boosters = id%5 === 0 ? {...state.boosters,[key]:state.boosters[key]+1} : state.boosters;
  return { ...state, boosters, nextLevel:id + 1, stars:state.stars + 1, clues:clue ? [...new Set([...state.clues, clue])] : state.clues };
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
