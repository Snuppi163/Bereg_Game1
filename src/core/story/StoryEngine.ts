import { actions, chapter } from '../../data/story/chapter.ts';
import type { Action } from '../../data/story/chapter.ts';
export type StoryState = { actions: string[]; nextLevel: number; stars: number };
export function pendingAction(state: StoryState) {
  return actions.find(action => !state.actions.includes(action.id) && action.after < state.nextLevel &&
    (action.requires ?? []).every(id => state.actions.includes(id)));
}
export const canSpend = (state: StoryState, action: Action) => pendingAction(state)?.id === action.id && state.stars >= action.cost;
export const chapterComplete = (state: StoryState) => state.nextLevel > chapter.lastLevel && chapter.actions.every(action => state.actions.includes(action.id));
export const sceneAction = (state: StoryState) => [...actions].reverse().find(action => state.actions.includes(action.id));
