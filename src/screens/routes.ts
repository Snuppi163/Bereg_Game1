export type FarmTab='field'|'animals'|'workshops'|'stock'|'market';
export type Routes = {
  Menu:undefined; Farm:{tab?:FarmTab}|undefined; Tasks:undefined; Shop:undefined;
  Place:{id:string}; Home:undefined; Map:undefined; Settings:undefined; Daily:undefined; Journal:undefined;
  Dialogue:{ id:string; reread?:boolean }; Match:{ id:number }; Hidden:{ id:number };
  Result:{ id:number; won:boolean; earned?:boolean }; Finish:undefined;
};
