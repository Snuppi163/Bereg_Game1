import { writeFileSync } from 'node:fs';
import { seededRandom } from '../src/utils/random.ts';
import { originalMatchLevels } from '../src/data/levels/original.ts';
import { Match3Engine } from '../src/core/match3/Match3Engine.ts';
import type { Block, Config, Goal, Point } from '../src/core/match3/Match3Engine.ts';

function stage(id: number, variant: number): Config {
  const chapter = Math.floor((id-1)/25);
  const wave = (id-1)%25;
  const random = seededRandom(id*3817 + variant*71);
  const width = id%13 === 0 ? 7 : 8;
  const height = id%17 === 0 ? 7 : id%19 === 0 ? 9 : 8;
  const colors = wave < 5 && chapter < 4 ? 5 : 6;
  const holes: Point[] = id%4 === 0 ? [[0,0],[width-1,0],[0,height-1],[width-1,height-1]] :
    id%4 === 1 && chapter>0 ? [[0,1],[width-1,1],[0,2],[width-1,2]] :
    id%4 === 2 && chapter>1 ? [[1,0],[width-2,0],[0,height-1],[width-1,height-1]] : [];
  const placement: Point[] = Array.from({length:(width-2)*(height-4)},(_,i)=>[1+i%(width-2),2+Math.floor(i/(width-2))]);
  for (let i = placement.length-1; i > 0; i--) {
    const j = Math.floor(random()*(i+1));
    [placement[i],placement[j]] = [placement[j],placement[i]];
  }
  const types: Block[] = (id < 41 ? ['crate','web','glass','lock','cover'] :
    id < 101 ? ['crate','web','glass','lock','cover','fog','dirt','chain','stone','switch'] :
      ['crate','web','glass','lock','cover','fog','dirt','chain','stone','switch','generator']);
  const goals: Goal[] = [];
  const blocks: NonNullable<Config['blocks']> = [];
  const type = types[(id+Math.floor(id/4))%types.length];
  const add = (kind:Block, n:number) => {
    for (const at of placement.splice(0,n)) blocks.push({at,kind,layers:kind === 'generator' || kind === 'stone' ? 2 :
      ['crate','glass','chain','fog'].includes(kind) && wave >= 9 ? 2 : 1});
    goals.push(kind === 'switch' ? {kind:'activate',count:n} : {kind:'break',target:kind,count:n});
  };
  const drops: Point[] = [];
  let exits:Point[]|undefined;
  const conveyor:Point[]|undefined = id>125 && id%6 === 0 ? [[2,0],[3,0],[4,0],[5,0]] : undefined;
  const portals:[Point,Point][]|undefined = id>150 && id%7 === 1 ? [[[1,1],[width-2,height-2]]] : undefined;
  if (id%3 === 0 || id%7 === 0) {
    add(type,wave < 6 ? 2 : wave < 15 ? 3 : 4);
    if (chapter >= 3 && wave>=16) {
      const secondary = types.find((kind,i) => i >= chapter%types.length && kind !== type && kind !== 'generator');
      if (secondary) add(secondary,2);
    }
  }
  if (id%6 === 4 || id%8 === 0) {
    const count = wave > 14 && id%3 === 1 ? 2 : 1;
    const x = 1+Math.floor(random()*(width-2));
    drops.push([x,id%6 === 4 ? 2 : 1]);
    if (count===2) drops.push([x === 1 ? width-2 : 1,1]);
    if (id>=61 && id%6 === 4) exits = drops.map(([col]) => [col,height-1]);
    goals.push({kind:exits?'deliver':'drop',count});
  }
  for (const at of drops) {
    const i = blocks.findIndex(item => item.at[0] === at[0] && item.at[1] === at[1]);
    if (i < 0) continue;
    const relocated = placement.shift();
    if (relocated) blocks[i].at = relocated;
  }
  const color = (id+variant)%colors;
  if (goals.length < 3) goals.push({kind:'collect',target:color,count:8+Math.floor(wave/4)*2+Math.floor(chapter/3)});
  if (id%3 === 1 && goals.length < 3) goals.push({kind:'collect',target:(color+2)%colors,count:6+Math.floor(wave/5)*2});
  const tutorial = id===16 ? 'Под ключом нужно убрать фишки, чтобы он опустился к выходу.' :
    id===42 ? 'Туман и лёд рассеиваются, когда комбинация проходит по их клеткам.' :
    id===126 ? 'После каждого хода фишки на конвейере сдвигаются к следующей клетке.' : undefined;
  return {id, seed:Math.imul(id,19217)+variant*929, width,height,moves:18+Math.floor(wave/4)+Math.floor(chapter/2),
    colors,goals,blocks,drops,holes,exits,conveyor,portals,tutorial};
}

function score(engine: Match3Engine) {
  const { width,height,goals,exits } = engine.config;
  const goal = engine.remaining.reduce((sum,left,i)=>sum - left*(goals[i].kind === 'collect' ? 1 : 15),0);
  const cells = engine.board.reduce((sum,cell,i)=>{
    if (cell.tile && 'drop' in cell.tile) {
      const y = Math.floor(i/width);
      const x = i%width;
      const distance = exits ? Math.min(...exits.map(([a,b])=>Math.abs(a-x)+Math.abs(b-y))) : height-y-1;
      return sum-distance*2.5;
    }
    return sum + (cell.tile && 'color' in cell.tile && cell.tile.special ? 2 : 0) - (cell.layers ?? 0)*.65;
  },0);
  return goal+cells;
}

function solve(config: Config): Point[] | undefined {
  let rng = seededRandom(config.seed!);
  let engine = new Match3Engine(config,rng);
  const path: Point[] = [];
  for (let n=0; n<config.moves && engine.status==='playing';n++) {
    let best: { engine:Match3Engine; rng:typeof rng; move:Point; score:number } | undefined;
    for (const move of engine.legalSwaps()) {
      const candidateRng = seededRandom(rng.snapshot());
      const candidate = Match3Engine.restore(config,candidateRng,engine.snapshot(rng.snapshot()));
      candidate.play(...move);
      const value = score(candidate) + (candidate.status === 'won' ? 10000 : 0);
      if (!best || best.score < value) best = {engine:candidate,rng:candidateRng,move,score:value};
    }
    if (!best) return;
    engine = best.engine;
    rng = best.rng;
    path.push(best.move);
  }
  return engine.status === 'won' ? path : undefined;
}

const original = new Map(originalMatchLevels.map(level=>[level.id,level]));
const plans: Config[] = [];
const solutions: Record<number, Point[]> = {};
for (let id=1; id<=300; id++) {
  if (id%5 === 0) {
    if ([25,50,100,200,300].includes(id)) process.stderr.write(`Проверено до уровня ${id}: ${Object.keys(solutions).length} полей\n`);
    continue;
  }
  let accepted = false;
  for (let attempt=0; attempt<30; attempt++) {
    const legacy = original.get(id);
    const config = legacy ? {...legacy,seed:legacy.seed!+attempt*57} : stage(id,attempt);
    if (attempt>15) config.moves += 4;
    try {
      const path = solve(config);
      if (!path) continue;
      plans.push(config);
      solutions[id] = path;
      accepted = true;
      break;
    } catch (error) { if (attempt===29) process.stderr.write(String(error)+'\n'); }
  }
  if (!accepted) throw Error(`Не найдено прохождение уровня ${id}`);
}
writeFileSync(new URL('../src/data/levels/campaign.generated.ts',import.meta.url),
  "import type { Config } from '../../core/match3/Match3Engine.ts';\n\n// Генерация: npm run campaign:generate\nexport const campaignBoards: Config[] = [\n"+plans.map(level=>'  '+JSON.stringify(level)).join(',\n')+"\n];\n");
writeFileSync(new URL('../tests/campaign-solutions.json',import.meta.url),JSON.stringify(solutions)+'\n');
