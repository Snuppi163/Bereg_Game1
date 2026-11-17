import { campaignBoards } from './campaign.generated.ts';
import { gardenLevel } from './garden.ts';
import { hiddenLevels } from './hiddenCampaign.ts';

export { hiddenLevels };
export const matchLevels=campaignBoards;
export function levelMode(id:number) {return id%5===0 ? 'hidden' : 'match';}
export const levels=[...matchLevels,...hiddenLevels].sort((a,b)=>a.id-b.id);
export const totalLevels=levels.length;
const matchById=new Map(matchLevels.map(level=>[level.id,level]));
const hiddenById=new Map(hiddenLevels.map(level=>[level.id,level]));
export const getMatch=(id:number)=>id===gardenLevel.id?gardenLevel:matchById.get(id);
export const getHidden=(id:number)=>hiddenById.get(id);
