export type Special = 'row' | 'column' | 'area' | 'color' | 'super';
export type Block = 'crate' | 'web' | 'glass' | 'lock' | 'stone' | 'dirt' | 'fog' | 'chain' | 'cover' | 'generator' | 'switch' | 'bramble' | 'dry';
export type Combination = 'rocket' | 'bomb' | 'sphere' | 'rocket-pair' | 'rocket-bomb' |
  'bomb-pair' | 'sphere-rocket' | 'sphere-bomb' | 'sphere-pair' | 'super';
export type Burst = { at: number; effect: Combination; vertical?: boolean };
export type Tile = { color: number; special?: Special } | { drop: true };
export type Cell = { tile: Tile | null; block?: Block; layers?: number; hole?: boolean };
export type Board = Cell[];
export type Point = [number, number];
export type Goal = { kind: 'collect' | 'break' | 'drop' | 'deliver' | 'activate' | 'irrigate'; target?: number | Block; count: number };
export type Config = {
  id: number; seed?: number; width: number; height: number; moves: number; colors: number; goals: Goal[];
  blocks?: { at: Point; kind: Block; layers?: number }[]; drops?: Point[]; tutorial?: string;
  holes?: Point[]; exits?: Point[]; conveyor?: Point[]; portals?: [Point, Point][];
};
export type Frame = { board: Board; hit?: number[]; kind: 'swap' | 'clear' | 'fall' | 'shuffle'; bursts?: Burst[]; created?: Special[]; reversed?: boolean };
export type MatchSnapshot = { board: Board; moves: number; remaining: number[]; turns: number; rng: number };
type Run = { cells: number[]; horizontal: boolean };

const solid = (cell: Cell) => cell.hole || cell.block === 'crate' || cell.block === 'stone' || cell.block === 'cover' || cell.block === 'generator' || cell.block==='bramble';
const fixed = (cell: Cell) => solid(cell) || !!cell.block && ['web','lock','chain','switch'].includes(cell.block);
const colorOf = (cell: Cell) => cell.tile && 'color' in cell.tile && !solid(cell) && cell.tile.special !== 'color' ? cell.tile.color : -1;
const movable = (cell: Cell) => !!cell.tile && !fixed(cell);
export const canHammer = (cell: Cell) => !cell.hole && (!!cell.block || !!cell.tile && !('drop' in cell.tile));
const copy = (board: Board) => board.map(cell => ({ ...cell }));

export function runs(board: Board, width: number, height: number): Run[] {
  const result: Run[] = [];
  for (const horizontal of [true, false]) {
    const lines = horizontal ? height : width;
    const length = horizontal ? width : height;
    for (let line = 0; line < lines; line++) {
      let streak: number[] = [];
      let previous = -1;
      for (let step = 0; step <= length; step++) {
        const i = horizontal ? line * width + step : step * width + line;
        const color = step === length ? -1 : colorOf(board[i]);
        if (color !== previous || color < 0) {
          if (streak.length >= 3) result.push({ cells: streak, horizontal });
          streak = [];
        }
        if (color >= 0) streak.push(i);
        previous = color;
      }
    }
  }
  return result;
}

export class Match3Engine {
  board: Board;
  moves: number;
  remaining: number[];
  turns = 0;
  readonly config: Config;
  private readonly random: () => number;
  constructor(config: Config, random = Math.random, initial?: Board) {
    this.config = config;
    this.random = random;
    this.moves = config.moves;
    this.remaining = config.goals.map(goal => goal.count);
    this.board = initial ? copy(initial) : Array.from({ length: config.width * config.height }, () => ({ tile: null }));
    if (initial) return;
    for (const at of config.holes ?? []) this.board[this.index(at)].hole = true;
    for (const { at, kind, layers } of config.blocks ?? []) Object.assign(this.board[this.index(at)], { block: kind, layers: layers ?? 1 });
    for (const at of config.drops ?? []) this.board[this.index(at)].tile = { drop: true };
    this.shuffle();
  }

  index([x, y]: Point) { return y * this.config.width + x; }
  static restore(config: Config, random: () => number, snapshot: MatchSnapshot) {
    const engine = new Match3Engine(config, random, snapshot.board);
    engine.moves = snapshot.moves;
    engine.remaining = [...snapshot.remaining];
    engine.turns = snapshot.turns;
    return engine;
  }
  snapshot(rng: number): MatchSnapshot {
    return { board: copy(this.board), moves: this.moves, remaining: [...this.remaining], turns: this.turns, rng };
  }
  get status() { return this.remaining.every(count => count === 0) ? 'won' : this.moves <= 0 ? 'lost' : 'playing'; }
  private tile(): Tile { return { color: Math.floor(this.random() * this.config.colors) }; }
  private adjacent(a: number, b: number) {
    const { width } = this.config;
    return Math.abs(a % width - b % width) + Math.abs(Math.floor(a / width) - Math.floor(b / width)) === 1;
  }
  private swap(a: number, b: number) { [this.board[a].tile, this.board[b].tile] = [this.board[b].tile, this.board[a].tile]; }
  private special(i: number) {
    const tile = this.board[i].tile;
    return tile && 'color' in tile ? tile.special : undefined;
  }
  private combination(a: number, b: number) {
    const first = this.special(a);
    const second = this.special(b);
    return (first === 'color' && colorOf(this.board[b]) >= 0) ||
      (second === 'color' && colorOf(this.board[a]) >= 0) || !!(first && second);
  }
  private matches() { return runs(this.board, this.config.width, this.config.height); }

  hint() { return this.legalSwaps(1)[0]; }

  legalSwaps(limit = Infinity): [number,number][] {
    const swaps: [number,number][] = [];
    const { width } = this.config;
    for (let i = 0; i < this.board.length; i++) {
      if (!movable(this.board[i])) continue;
      for (const j of [i + 1, i + width]) {
        if (!this.board[j] || !this.adjacent(i, j) || !movable(this.board[j])) continue;
        if (this.combination(i, j)) {
          swaps.push([i,j]);
          if (swaps.length === limit) return swaps;
          continue;
        }
        if (colorOf(this.board[i]) === colorOf(this.board[j])) continue;
        this.swap(i, j);
        const valid = this.matches().some(run => run.cells.includes(i) || run.cells.includes(j));
        this.swap(i, j);
        if (valid) {
          swaps.push([i,j]);
          if (swaps.length === limit) return swaps;
        }
      }
    }
    return swaps;
  }

  shuffle() {
    const { width, colors } = this.config;
    const original = copy(this.board);
    for (let attempt = 0; attempt < 300; attempt++) {
      for (let i = 0; i < this.board.length; i++) {
        const cell = this.board[i];
        if (solid(cell) || (cell.tile && 'drop' in cell.tile) || this.special(i)) continue;
        const left = i % width >= 2 ? colorOf(this.board[i - 1]) : -1;
        const above = i >= width * 2 ? colorOf(this.board[i - width]) : -1;
        const choices = Array.from({ length: colors }, (_, color) => color).filter(color =>
          !(color === left && left === colorOf(this.board[i - 2])) &&
          !(color === above && above === colorOf(this.board[i - width * 2])));
        cell.tile = { color: choices[(Math.floor(this.random() * choices.length) + attempt * (i % 7 + 1)) % choices.length] };
      }
      if (!this.matches().length && this.hint()) return;
    }
    this.board = original;
    throw new Error('Для такой конфигурации невозможно подготовить поле с доступным ходом.');
  }

  canSwap(a: number, b: number) {
    return this.status === 'playing' && !!this.board[a] && !!this.board[b] && this.adjacent(a,b) &&
      movable(this.board[a]) && movable(this.board[b]);
  }
  play(a: number, b: number, free = false): Frame[] {
    if (!this.canSwap(a,b)) return [];
    const combo = this.combination(a, b);
    this.swap(a, b);
    const frames: Frame[] = [{ kind: 'swap', board: copy(this.board) }];
    const matches = this.matches();
    if (!free && !combo && !matches.some(run => run.cells.includes(a) || run.cells.includes(b))) {
      this.swap(a, b);
      return [...frames, { kind: 'swap', board: copy(this.board), reversed: true }];
    }
    if (!free) { this.moves--; this.turns++; }
    if (combo) this.explodeCombo(a, b, frames);
    if (free && !matches.length && !combo && this.collectDrops()) frames.push({kind:'fall',board:copy(this.board)});
    this.resolve(frames, combo ? [] : [b, a], false);
    if (!free && this.status !== 'won') this.environment(frames);
    this.ensureMove(frames);
    return frames;
  }

  hammer(i: number): Frame[] {
    if (!this.board[i] || !canHammer(this.board[i]) || this.status !== 'playing') return [];
    const frames: Frame[] = [];
    this.clear(new Set([i]), new Map(), frames);
    this.resolve(frames, []);
    return frames;
  }

  activate(index:number,booster?:Special):Frame[] {
    const cell=this.board[index];
    if(this.status!=='playing'||!cell||!movable(cell)||!cell.tile||!('color' in cell.tile))return [];
    const special=booster??cell.tile.special;
    if(!special)return [];
    this.moves--;
    this.turns++;
    const frames:Frame[]=[];
    const zone=this.zone(index,special);
    const consumed=booster && cell.tile.special ? new Set<number>() : new Set([index]);
    this.clear(new Set([index,...zone]),new Map(),frames,consumed,[this.burst(index,special)]);
    this.resolve(frames,[],false);
    if(this.remaining.some(n=>n>0))this.environment(frames);
    this.ensureMove(frames);
    return frames;
  }

  usefulHint():[number,number]|undefined {
    if(this.status!=='playing')return;
    const candidate=this.board.findIndex((cell,i)=>movable(cell)&&!!this.special(i));
    if(candidate>=0)return [candidate,candidate];
    let best:[number,number]|undefined;
    let value=-1;
    for(const pair of this.legalSwaps()){
      const [a,b]=pair;
      this.swap(a,b);
      const matches=this.matches().filter(run=>run.cells.includes(a)||run.cells.includes(b));
      const cells=new Set(matches.flatMap(run=>run.cells));
      const worth=[...cells].reduce((total,i)=>{
        const color=colorOf(this.board[i]),block=this.board[i].block;
        const needed=this.config.goals.some((goal,index)=>this.remaining[index]>0&&
          (goal.kind==='collect'&&goal.target===color||goal.kind==='break'&&goal.target===block));
        return total+(needed?4:1);
      },0)+Math.max(0,...matches.map(run=>run.cells.length-3))*5;
      this.swap(a,b);
      if(worth>value){value=worth;best=pair;}
    }
    return best;
  }

  private burst(at:number,special:Special):Burst {
    return {at,effect:special==='area'?'bomb':special==='color'?'sphere':special==='super'?'super':'rocket',vertical:special==='column'};
  }

  placeSpecial(i: number, special: Special): Frame[] {
    if (this.status !== 'playing' || !this.board[i] || !movable(this.board[i]) ||
        !this.board[i].tile || !('color' in this.board[i].tile!)) return [];
    const tile = this.board[i].tile;
    if (!tile || !('color' in tile) || tile.special) return [];
    this.board[i].tile = { ...tile, special };
    const frames: Frame[] = [{ kind:'fall', board:copy(this.board) }];
    this.ensureMove(frames);
    return frames;
  }

  addMoves(count: number) { if (this.status !== 'won') this.moves += count; }

  private ensureMove(frames: Frame[]) {
    if (this.status !== 'playing' || this.hint()) return;
    this.shuffle();
    frames.push({kind:'shuffle',board:copy(this.board)});
  }

  private environment(frames: Frame[]) {
    const { conveyor, portals, width } = this.config;
    let moved = false;
    if (conveyor && conveyor.length > 1) {
      const belt = conveyor.map(at => this.board[this.index(at)]);
      if (belt.every(movable)) {
        const tiles = belt.map(cell => cell.tile);
        belt.forEach((cell,i) => { cell.tile = tiles[(i+belt.length-1)%belt.length]; });
        moved = true;
      }
    }
    for (const [from,to] of portals ?? []) {
      const a = this.index(from), b = this.index(to);
      if (movable(this.board[a]) && movable(this.board[b])) {
        this.swap(a,b);
        moved = true;
      }
    }
    if (moved) {
      this.collectDrops();
      frames.push({kind:'fall',board:copy(this.board)});
      this.resolve(frames,[],false);
    }
    const recentDamage = new Set(frames.flatMap(frame => frame.hit ?? []));
    if (this.turns % 3 !== 0 || this.status === 'won') return;
    for (const source of this.board.keys()) {
      const block = this.board[source].block;
      if ((block !== 'generator' && block !== 'dirt') || recentDamage.has(source)) continue;
      const target = [source+width,source+1,source-1,source-width].find(i =>
        this.board[i] && this.adjacent(source,i) && !this.board[i].hole && !this.board[i].block &&
        this.board[i].tile && 'color' in this.board[i].tile!);
      if (target !== undefined) {
        Object.assign(this.board[target], {block:'dirt',layers:1});
        frames.push({kind:'fall',board:copy(this.board)});
        return;
      }
    }
  }

  private credit(kind: Goal['kind'], target?: Goal['target']) {
    this.config.goals.forEach((goal, index) => {
      if (goal.kind === kind && (goal.target === undefined || goal.target === target)) {
        this.remaining[index] = Math.max(0, this.remaining[index] - 1);
      }
    });
  }

  private zone(i: number, special: Special, radius = special==='super' ? 3 : 1): number[] {
    const { width } = this.config;
    const x = i % width;
    const y = Math.floor(i / width);
    return this.board.flatMap((_, j) => {
      const dx = Math.abs(j % width - x);
      const dy = Math.abs(Math.floor(j / width) - y);
      const tile = this.board[i].tile;
      const hit = special === 'row' ? dy < radius : special === 'column' ? dx < radius :
        (special === 'area' || special==='super') ? dx <= radius && dy <= radius :
        !!tile && 'color' in tile && colorOf(this.board[j]) === tile.color;
      return hit ? [j] : [];
    });
  }

  private explodeCombo(a: number, b: number, frames: Frame[]) {
    const first = this.special(a);
    const second = this.special(b);
    const hit = new Set([a, b]);
    let effect: Combination;
    if (first === 'color' && second === 'color') {
      effect = 'sphere-pair';
      this.board.forEach((cell, i) => { if (!cell.hole) hit.add(i); });
    } else if (first==='super' || second==='super') {
      effect='super';
      this.zone(b,'super',first==='super' && second==='super' ? 4 : 3).forEach(i=>hit.add(i));
    } else if (first === 'color' || second === 'color') {
      const other = first === 'color' ? b : a;
      const color = colorOf(this.board[other]);
      const power = this.special(other);
      effect = power === 'area' ? 'sphere-bomb' : power ? 'sphere-rocket' : 'sphere';
      this.board.forEach((cell, i) => {
        if (colorOf(cell) !== color || color < 0) return;
        hit.add(i);
        if (power) this.zone(i, power).forEach(j => hit.add(j));
      });
    } else if (first === 'area' && second === 'area') {
      effect = 'bomb-pair';
      this.zone(b,'area',3).forEach(i => hit.add(i));
    } else {
      const wide = first === 'area' || second === 'area';
      effect = wide ? 'rocket-bomb' : 'rocket-pair';
      const radius = wide ? 2 : 1;
      this.zone(b,'row',radius).forEach(i => hit.add(i));
      this.zone(b,'column',radius).forEach(i => hit.add(i));
    }
    const bursts:Burst[]=[{at:b,effect}];
    if(effect==='sphere-bomb'){
      const other=first==='color'?b:a;
      for(const i of hit){
        if(i!==a && i!==b && colorOf(this.board[i])===colorOf(this.board[other]))bursts.push(this.burst(i,'area'));
      }
    }
    this.clear(hit, new Map(), frames, new Set([a,b]), bursts);
  }

  private clear(hit: Set<number>, created: Map<number, Special>, frames: Frame[], alreadyTriggered = new Set<number>(), bursts: Burst[] = []) {
    for (const i of hit) {
      const special = this.special(i);
      if (special && !created.has(i) && !alreadyTriggered.has(i)) {
        this.zone(i, special).forEach(j => hit.add(j));
        bursts.push(this.burst(i,special));
      }
    }
    const affected = new Set([...hit].filter(i => !this.board[i].hole));
    for (const i of hit) {
      for (const j of [i - 1, i + 1, i - this.config.width, i + this.config.width]) {
        if (this.board[j] && this.adjacent(i,j) && solid(this.board[j]) && !this.board[j].hole) affected.add(j);
      }
    }
    for (const i of affected) {
      const cell = this.board[i];
      const tile = cell.tile;
      if (cell.block) {
        const held = fixed(cell);
        const block = cell.block;
        cell.layers = (cell.layers ?? 1) - 1;
        if (cell.layers === 0) {
          delete cell.block;
          delete cell.layers;
          this.credit('break', block);
          if (block === 'switch') this.credit('activate');
          if (block === 'dry') this.credit('irrigate');
        }
        if (held) continue;
      }
      if (!hit.has(i) || !tile || 'drop' in tile) continue;
      this.credit('collect', tile.color);
      const special = created.get(i);
      cell.tile = special ? { color: tile.color, special } : null;
    }
    frames.push({ kind: 'clear', board: copy(this.board), hit: [...affected], bursts, created:[...created.values()] });
  }

  private fall() {
    this.compactColumns();
    this.collectDrops();
  }

  private compactColumns() {
    const { width, height } = this.config;
    for (let x = 0; x < width; x++) {
      let open: Cell[] = [];
      const fill = () => {
        const tiles = open.flatMap(cell => cell.tile ? [cell.tile] : []);
        open.forEach((cell,index) => { cell.tile = tiles[index] ?? this.tile(); });
        open = [];
      };
      for (let y = height - 1; y >= 0; y--) {
        const cell = this.board[y * width + x];
        if (cell.hole) continue;
        if (fixed(cell)) fill();
        else open.push(cell);
      }
      fill();
    }
  }

  private collectDrops() {
    const { width } = this.config;
    const exits = this.config.exits?.map(at => this.index(at)) ??
      Array.from({length:width},(_,x) => this.board.findLastIndex((cell,i) => i % width === x && !cell.hole));
    const delivery = !!this.config.exits;
    let changed = false;
    while (true) {
      let collected = false;
      for (const i of exits) {
        const cell = this.board[i];
        if (!cell?.tile || !('drop' in cell.tile) || cell.block) continue;
        cell.tile = null;
        this.credit(delivery ? 'deliver' : 'drop');
        collected = true;
      }
      if (!collected) return changed;
      changed = true;
      this.compactColumns();
    }
  }

  private resolve(frames: Frame[], preferred: number[], ensure = true) {
    for (let step = 0; step < 120; step++) {
      if (frames.at(-1)?.kind === 'clear') {
        this.fall();
        frames.push({ kind: 'fall', board: copy(this.board) });
      }
      const matches = this.matches();
      if (!matches.length) {
        if (ensure) this.ensureMove(frames);
        return;
      }
      const groups: Run[][] = [];
      for (const run of matches) {
        const connected = groups.filter(group => group.some(other => other.cells.some(i => run.cells.includes(i))));
        groups.push([run, ...connected.flat()]);
        for (const group of connected) groups.splice(groups.indexOf(group), 1);
      }
      const hit = new Set(matches.flatMap(run => run.cells));
      const created = new Map<number, Special>();
      for (const group of groups) {
        const longest = group.reduce((a, b) => a.cells.length >= b.cells.length ? a : b);
        const intersect = longest.cells.find(i => group.some(other => other.horizontal !== longest.horizontal && other.cells.includes(i)));
        const special = longest.cells.length >= 5 ? 'color' : intersect !== undefined ? 'area' :
          longest.cells.length === 4 ? longest.horizontal ? 'row' : 'column' : undefined;
        const candidates = [...preferred, ...(intersect === undefined ? [] : [intersect]), ...longest.cells];
        const anchor = candidates.find(i => longest.cells.includes(i) && movable(this.board[i]) && !this.special(i));
        if (special && anchor !== undefined) created.set(anchor, special);
      }
      this.clear(hit, created, frames);
      preferred = [];
    }
    this.shuffle();
    frames.push({ kind: 'shuffle', board: copy(this.board) });
  }
}
