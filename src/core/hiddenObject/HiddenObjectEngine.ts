export type ObjectArt = 'key' | 'clock' | 'photo' | 'spoon' | 'lamp' | 'coin' | 'letter' | 'matches' |
  'flashlight' | 'cassette' | 'compass' | 'glasses' | 'lock' | 'pendant' | 'notebook' | 'radio' | 'hook' |
  'map' | 'watch' | 'rope' | 'battery' | 'note';
export type RoomArt = 'kitchen' | 'attic' | 'dock' | 'archive';
export type ObjectTarget = { id:ObjectArt; title:string; x:number; y:number; size:number; angle:number; radius:number; behind?:string };
export type Hotspot = { id:string; title:string; x:number; y:number; radius:number; key?:ObjectArt; art:'drawer'|'book'|'cabinet' };
export type HiddenConfig = {
  id:number; title:string; scene:'kitchen'|'attic'|'dock'; targets:ObjectTarget[];
  clue:string; tutorial?:string; background?:RoomArt; mirror?:boolean; mode?:'names'|'silhouette'|'sequence'; hotspots?:Hotspot[];
};
export type HiddenSnapshot = { found:ObjectArt[]; opened?:string[] };
export type HotspotResult = { hotspot:Hotspot; locked:boolean };
export class HiddenObjectEngine {
  private found:Set<ObjectArt>;
  private opened:Set<string>;
  readonly config:HiddenConfig;
  constructor(config:HiddenConfig,snapshot?:HiddenSnapshot) {
    this.config=config;
    this.found=new Set(config.targets.filter(item=>snapshot?.found.includes(item.id)).map(item=>item.id));
    this.opened=new Set(config.hotspots?.filter(item=>snapshot?.opened?.includes(item.id)).map(item=>item.id));
  }
  get remaining() {return this.config.targets.filter(item=>!this.found.has(item.id));}
  get complete() {return !this.remaining.length;}
  get visible() {return this.config.targets.filter(item=>!item.behind || this.opened.has(item.behind));}
  get selectable() {
    const visible=this.visible.filter(item=>!this.has(item.id));
    return this.config.mode==='sequence' ? visible.slice(0,1) : visible;
  }
  has(id:ObjectArt) {return this.found.has(id);}
  snapshot():HiddenSnapshot {return {found:[...this.found],opened:[...this.opened]};}
  hint(): ObjectTarget | Hotspot | undefined {
    return this.selectable[0] ?? this.config.hotspots?.find(item=>!this.opened.has(item.id) && (!item.key || this.has(item.key)));
  }
  tap(x:number,y:number) {
    const item=closest(this.selectable,x,y);
    if(!item) return;
    this.found.add(item.id);
    return item;
  }
  interact(x:number,y:number):HotspotResult | undefined {
    const hotspot=closest(this.config.hotspots?.filter(item=>!this.opened.has(item.id)) ?? [],x,y);
    if(!hotspot) return;
    const locked=!!hotspot.key && !this.has(hotspot.key);
    if(!locked) this.opened.add(hotspot.id);
    return {hotspot,locked};
  }
}
function closest<T extends {x:number;y:number;radius:number}>(items:T[],x:number,y:number):T|undefined {
  return items.map(item=>({item,range:Math.hypot(x-item.x,y-item.y)/item.radius}))
    .filter(({range})=>range<=1).sort((a,b)=>a.range-b.range)[0]?.item;
}
