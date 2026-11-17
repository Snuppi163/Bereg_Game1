import test from 'node:test';
import solutions from './campaign-solutions.json' with { type:'json' };
import assert from 'node:assert/strict';
import { Match3Engine, runs } from '../src/core/match3/Match3Engine.ts';
import type { Board, Config, Special } from '../src/core/match3/Match3Engine.ts';
import { matchLevels } from '../src/data/levels/index.ts';
import { seededRandom } from '../src/utils/random.ts';

const base:Config = {id:1,width:7,height:7,moves:15,colors:6,goals:[{kind:'collect',target:0,count:60}]};
const pattern = (width:number,height:number, count=6): Board =>
  Array.from({length:width*height},(_,i)=>({tile:{color:(i%width+2*Math.floor(i/width))%count}}));
const put = (board: Board, i:number, color:number, special?:Special) => {board[i]={tile:{color,special}};};
const hasSpecial = (board:Board, type:Special) => board.some(({tile}) => tile && 'special' in tile && tile.special === type);

test('находит длинные ряды и пересечения', () => {
  const board=pattern(7,7);
  for (const i of [15,16,17,18,19,9,23]) put(board,i,0);
  const matches=runs(board,7,7);
  assert(matches.some(r => r.horizontal && r.cells.length>=5));
  assert(matches.some(r => !r.horizontal && r.cells.includes(16) && r.cells.length>=3));
});

test('недопустимый обмен откатывается, диагональ не начинается', () => {
  const board=pattern(7,7);
  const engine=new Match3Engine(base,seededRandom(10),board);
  assert.equal(engine.play(0,1).length,2);
  assert.equal(engine.moves,base.moves);
  assert.deepEqual(engine.board,board);
  assert.deepEqual(engine.play(0,8),[]);
});

test('правильный ход запускает очистку, каскад и падение вниз', () => {
  const config=matchLevels[0];
  const engine=new Match3Engine(config,seededRandom(config.seed!));
  assert.deepEqual(runs(engine.board,config.width,config.height),[]);
  assert(engine.hint());
  const frames=engine.play(38,39);
  assert.equal(engine.moves,config.moves-1);
  assert(frames.filter(f=>f.kind==='clear').length>=2);
  const cleared=frames.find(f=>f.kind==='clear')!.board;
  const fallen=frames.find(f=>f.kind==='fall')!.board;
  assert(cleared.some(c=>c.tile===null));
  assert(fallen.every(c=>c.tile));
  assert(cleared.some((cell,i) => cell.tile && fallen.some((destination,j) =>
    destination.tile===cell.tile && j>i && j%config.width===i%config.width)));
  assert(engine.remaining[0]<config.goals[0].count);
  assert.deepEqual(runs(engine.board,config.width,config.height),[]);
});

test('создаёт ракету, цветную бомбу и бомбу по области', () => {
  const cases: { indexes:number[]; swap:[number,number]; type:Special }[] = [
    { indexes:[21,22,24,16], swap:[16,23], type:'row' },
    { indexes:[21,22,24,25,16], swap:[16,23], type:'color' },
    { indexes:[22,24,16,30,44], swap:[16,23], type:'area' },
  ];
  for (const {indexes,swap,type} of cases) {
    const board=pattern(7,7);
    for (const i of indexes) put(board,i,0);
    if (type==='area') put(board,37,0);
    const engine=new Match3Engine(base,seededRandom(4),board);
    const cleared=engine.play(...swap).find(frame=>frame.kind==='clear');
    assert(cleared && hasSpecial(cleared.board,type),type);
  }
});

test('обмен двух цветных бомб очищает всё поле', () => {
  const board=pattern(7,7);
  put(board,0,0,'color');
  put(board,1,2,'color');
  const engine=new Match3Engine(base,seededRandom(8),board);
  const frames=engine.play(0,1);
  assert.equal(frames[1].kind,'clear');
  assert.equal(frames[1].hit?.length,49);
  assert.equal(engine.moves,base.moves-1);
});

test('цветная бомба выбирает цвет соседней фишки', () => {
  const board=pattern(7,7);
  put(board,0,5,'color');
  const engine=new Match3Engine(base,seededRandom(8),board);
  const hit=engine.play(0,1)[1].hit;
  assert(hit?.includes(0) && hit.includes(1));
  assert(hit?.includes(7) === false);
  assert(hit?.includes(5) === false);
});

test('перемешивание поля без ходов не расходует ход и сохраняет препятствия', () => {
  const config={...base,width:3,height:3,colors:3};
  const board:Board=[0,1,2,2,0,1,1,2,0].map(color=>({tile:{color}}));
  board[0].block='glass';board[0].layers=2;
  const engine=new Match3Engine(config,seededRandom(2),board);
  assert.equal(engine.hint(),undefined);
  engine.shuffle();
  assert.deepEqual(runs(engine.board,3,3),[]);
  assert(engine.hint());
  assert.equal(engine.board[0].block,'glass');
  assert.equal(engine.board[0].layers,2);
  assert.equal(engine.moves,base.moves);
});

test('последний ход приводит к победе либо поражению', () => {
  const config=matchLevels[0];
  const make=(count:number)=>new Match3Engine({...config,moves:1,goals:[{kind:'collect',count}]},seededRandom(config.seed!));
  const won=make(3);
  won.play(...won.hint()!);
  assert.equal(won.status,'won');
  const lost=make(999);
  lost.play(...lost.hint()!);
  assert.equal(lost.status,'lost');
  assert.deepEqual(lost.play(0,1),[]);
});

test('молоток снимает ровно один слой стекла и не отнимает ход', () => {
  const board=pattern(7,7);
  board[24].block='glass';board[24].layers=2;
  const engine=new Match3Engine({...base,goals:[{kind:'break',target:'glass',count:1}]},seededRandom(8),board);
  engine.hammer(24);
  assert.equal(engine.board[24].layers,1);
  assert.deepEqual(engine.remaining,[1]);
  engine.hammer(24);
  assert.equal(engine.board[24].block,undefined);
  assert.equal(engine.status,'won');
  assert.equal(engine.moves,base.moves);
});

for (const config of matchLevels) {
  test(`уровень ${config.id} проходим без бустеров`, () => {
    const engine=new Match3Engine(config,seededRandom(config.seed!));
    for (const [a,b] of (solutions as Record<string,number[][]>)[config.id]) {
      const moves=engine.moves;
      engine.play(a,b);
      assert.equal(engine.moves,moves-1,`обмен ${a} → ${b}`);
    }
    assert.equal(engine.status,'won');
    assert(engine.remaining.every(n=>n===0));
  });
}
