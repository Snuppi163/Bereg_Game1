export type ObjectArt = 'key' | 'clock' | 'photo' | 'spoon' | 'lamp' | 'coin' | 'letter' | 'matches' |
  'flashlight' | 'cassette' | 'compass' | 'glasses' | 'lock' | 'pendant' | 'notebook' | 'radio' | 'hook' |
  'map' | 'watch' | 'rope' | 'battery' | 'note';
export type ObjectTarget = {
  id: ObjectArt; title: string; x: number; y: number; size: number; angle: number; radius: number;
};
export type HiddenConfig = {
  id: number; title: string; scene: 'kitchen' | 'attic' | 'dock'; targets: ObjectTarget[];
  clue: string; tutorial?: string;
};
export type HiddenSnapshot = { found: ObjectArt[] };
export class HiddenObjectEngine {
  private found: Set<ObjectArt>;
  readonly config: HiddenConfig;
  constructor(config: HiddenConfig, snapshot?: HiddenSnapshot) {
    this.config = config;
    this.found = new Set(config.targets.filter(item => snapshot?.found.includes(item.id)).map(item => item.id));
  }
  get remaining() { return this.config.targets.filter(item => !this.found.has(item.id)); }
  get complete() { return this.remaining.length === 0; }
  has(id: ObjectArt) { return this.found.has(id); }
  snapshot(): HiddenSnapshot { return { found: [...this.found] }; }
  hint() { return this.remaining[0]; }
  tap(x: number, y: number) {
    const hits = this.config.targets
      .map(item => ({ item, distance: Math.hypot(x - item.x, y - item.y) / item.radius }))
      .filter(hit => hit.distance <= 1)
      .sort((a, b) => a.distance - b.distance);
    const item = hits[0]?.item;
    if (!item || this.has(item.id)) return;
    this.found.add(item.id);
    return item;
  }
}
