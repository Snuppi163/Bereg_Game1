import { actions } from '../../data/story/chapter.ts';
import { campaignActions, campaignChapters } from '../../data/story/campaignStory.ts';
import type { Action } from '../../data/story/chapter.ts';

export const storyActions=[...actions,...campaignActions];
export type StoryState = { actions: string[]; nextLevel: number; stars: number };
export function pendingAction(state: StoryState) {
  return storyActions.find(action => !state.actions.includes(action.id) && action.after < state.nextLevel &&
    (action.requires ?? []).every(id => state.actions.includes(id)));
}
export const canSpend = (state: StoryState, action: Action) => pendingAction(state)?.id === action.id && state.stars >= action.cost;
export const chapterComplete = (state: StoryState) => state.nextLevel > campaignChapters.at(-1)!.last &&
  storyActions.every(action => state.actions.includes(action.id));
export const sceneAction = (state: StoryState) => [...storyActions].reverse().find(action => state.actions.includes(action.id));
