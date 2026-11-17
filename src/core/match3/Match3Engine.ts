export type Special = 'row' | 'column' | 'area' | 'color';
export type Block = 'crate' | 'web' | 'glass' | 'lock';
export type Tile = { color: number; special?: Special } | { drop: true };
export type Cell = { tile: Tile | null; block?: Block; layers?: number };
export type Board = Cell[];
export type Point = [number, number];
export type Goal = { kind: 'collect' | 'break' | 'drop'; target?: number | Block; count: number };
export type Config = {
  id: number; seed?: number; width: number; height: number; moves: number; colors: number; goals: Goal[];
  blocks?: { at: Point; kind: Block; layers?: number }[]; drops?: Point[]; tutorial?: string;
};
export type Frame = { board: Board; hit?: number[]; kind: 'swap' | 'clear' | 'fall' | 'shuffle' };
type Run = { cells: number[]; horizontal: boolean };

const colorOf = (cell: Cell) => cell.tile && 'color' in cell.tile && cell.block !== 'crate' && cell.tile.special !== 'color' ? cell.tile.color : -1;
const movable = (cell: Cell) => !!cell.tile && cell.block !== 'crate' && cell.block !== 'lock' && cell.block !== 'web';
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
  readonly config: Config;
  private readonly random: () => number;
  constructor(config: Config, random = Math.random, initial?: Board) {
    this.config = config;
    this.random = random;
    this.moves = config.moves;
    this.remaining = config.goals.map(goal => goal.count);
    this.board = initial ? copy(initial) : Array.from({ length: config.width * config.height }, () => ({ tile: null }));
    if (initial) return;
    for (const { at, kind, layers } of config.blocks ?? []) Object.assign(this.board[this.index(at)], { block: kind, layers: layers ?? 1 });
    for (const at of config.drops ?? []) this.board[this.index(at)].tile = { drop: true };
    this.shuffle();
  }

  index([x, y]: Point) { return y * this.config.width + x; }
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

  hint(): [number, number] | undefined {
    const { width } = this.config;
    for (let i = 0; i < this.board.length; i++) {
      if (!movable(this.board[i])) continue;
      for (const j of [i + 1, i + width]) {
        if (!this.board[j] || !this.adjacent(i, j) || !movable(this.board[j])) continue;
        if (this.combination(i, j)) return [i, j];
        this.swap(i, j);
        const valid = this.matches().some(run => run.cells.includes(i) || run.cells.includes(j));
        this.swap(i, j);
        if (valid) return [i, j];
      }
    }
  }

  shuffle() {
    const { width, colors } = this.config;
    const original = copy(this.board);
    for (let attempt = 0; attempt < 300; attempt++) {
      for (let i = 0; i < this.board.length; i++) {
        const cell = this.board[i];
        if (cell.block === 'crate' || (cell.tile && 'drop' in cell.tile) || this.special(i)) continue;
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

  play(a: number, b: number): Frame[] {
    if (this.status !== 'playing' || !this.board[a] || !this.board[b] || !this.adjacent(a, b) ||
        !movable(this.board[a]) || !movable(this.board[b])) return [];
    const combo = this.combination(a, b);
    this.swap(a, b);
    const frames: Frame[] = [{ kind: 'swap', board: copy(this.board) }];
    const matches = this.matches();
    if (!combo && !matches.some(run => run.cells.includes(a) || run.cells.includes(b))) {
      this.swap(a, b);
      return [...frames, { kind: 'swap', board: copy(this.board) }];
    }
    this.moves--;
    if (combo) this.explodeCombo(a, b, frames);
    this.resolve(frames, combo ? [] : [b, a]);
    return frames;
  }

  hammer(i: number): Frame[] {
    if (!this.board[i] || this.status !== 'playing') return [];
    const frames: Frame[] = [];
    this.clear(new Set([i]), new Map(), frames);
    this.resolve(frames, []);
    return frames;
  }

  private credit(kind: Goal['kind'], target?: Goal['target']) {
    this.config.goals.forEach((goal, index) => {
      if (goal.kind === kind && (goal.target === undefined || goal.target === target)) {
        this.remaining[index] = Math.max(0, this.remaining[index] - 1);
      }
    });
  }

  private zone(i: number, special: Special, radius = 1): number[] {
    const { width } = this.config;
    const x = i % width;
    const y = Math.floor(i / width);
    return this.board.flatMap((_, j) => {
      const dx = Math.abs(j % width - x);
      const dy = Math.abs(Math.floor(j / width) - y);
      const tile = this.board[i].tile;
      const hit = special === 'row' ? dy < radius : special === 'column' ? dx < radius :
        special === 'area' ? dx <= radius && dy <= radius :
        !!tile && 'color' in tile && colorOf(this.board[j]) === tile.color;
      return hit ? [j] : [];
    });
  }

  private explodeCombo(a: number, b: number, frames: Frame[]) {
    const first = this.special(a);
    const second = this.special(b);
    const hit = new Set([a, b]);
    if (first === 'color' && second === 'color') this.board.forEach((_, i) => hit.add(i));
    else if (first === 'color' || second === 'color') {
      const other = first === 'color' ? b : a;
      const color = colorOf(this.board[other]);
      const power = this.special(other);
      this.board.forEach((cell, i) => {
        if (colorOf(cell) !== color || color < 0) return;
        hit.add(i);
        if (power) this.zone(i, power).forEach(j => hit.add(j));
      });
    } else {
      const power: Special = first === 'area' && second === 'area' ? 'area' : 'row';
      const radius = first === 'area' || second === 'area' ? 2 : 1;
      this.zone(b, power, radius).forEach(i => hit.add(i));
      if (power === 'row') this.zone(b, 'column', radius).forEach(i => hit.add(i));
    }
    const usedColorBombs = new Set([a, b].filter(i => this.special(i) === 'color'));
    this.clear(hit, new Map(), frames, usedColorBombs);
  }

  private clear(hit: Set<number>, created: Map<number, Special>, frames: Frame[], alreadyTriggered = new Set<number>()) {
    for (const i of hit) {
      const special = this.special(i);
      if (special && !created.has(i) && !alreadyTriggered.has(i)) this.zone(i, special).forEach(j => hit.add(j));
    }
    const affected = new Set(hit);
    for (const i of hit) {
      for (const j of [i - 1, i + 1, i - this.config.width, i + this.config.width]) {
        if (this.board[j]?.block === 'crate' && this.adjacent(i, j)) affected.add(j);
      }
    }
    for (const i of affected) {
      const cell = this.board[i];
      const tile = cell.tile;
      if (cell.block) {
        const block = cell.block;
        cell.layers = (cell.layers ?? 1) - 1;
        if (cell.layers === 0) {
          delete cell.block;
          delete cell.layers;
          this.credit('break', block);
        }
        if (block === 'crate' || block === 'web' || block === 'lock') continue;
      }
      if (!hit.has(i) || !tile || 'drop' in tile) continue;
      this.credit('collect', tile.color);
      const special = created.get(i);
      cell.tile = special ? { color: tile.color, special } : null;
    }
    frames.push({ kind: 'clear', board: copy(this.board), hit: [...affected] });
  }

  private fall() {
    const { width, height } = this.config;
    const fixed = (i: number) => ['crate', 'lock', 'web'].includes(this.board[i].block ?? '');
    for (let x = 0; x < width; x++) {
      let write = height - 1;
      for (let y = height - 1; y >= 0; y--) {
        const i = y * width + x;
        if (fixed(i)) {
          while (write > y) this.board[write-- * width + x].tile = this.tile();
          write = y - 1;
        } else if (this.board[i].tile) {
          const to = write-- * width + x;
          if (to !== i) {
            this.board[to].tile = this.board[i].tile;
            this.board[i].tile = null;
          }
        }
      }
      while (write >= 0) this.board[write-- * width + x].tile = this.tile();
      const bottom = this.board[(height - 1) * width + x];
      if (bottom.tile && 'drop' in bottom.tile && !bottom.block) {
        for (let y = height - 1; y >= 0; y--) {
          const i = y * width + x;
          if (y === 0 || fixed(i - width)) {
            this.board[i].tile = this.tile();
            break;
          }
          this.board[i].tile = this.board[i - width].tile;
        }
        this.credit('drop');
      }
    }
  }

  private resolve(frames: Frame[], preferred: number[]) {
    for (let step = 0; step < 120; step++) {
      if (frames.at(-1)?.kind === 'clear') {
        this.fall();
        frames.push({ kind: 'fall', board: copy(this.board) });
      }
      const matches = this.matches();
      if (!matches.length) {
        if (this.status === 'playing' && !this.hint()) {
          this.shuffle();
          frames.push({ kind: 'shuffle', board: copy(this.board) });
        }
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
