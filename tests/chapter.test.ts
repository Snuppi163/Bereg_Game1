import test from 'node:test';
import assert from 'node:assert/strict';
import { HiddenObjectEngine } from '../src/core/hiddenObject/HiddenObjectEngine.ts';
import { dailyReward, defeat, freshProgress, LIFE_INTERVAL, localDay, regenerate, spend, victory } from '../src/core/progress/ProgressSystem.ts';
import { chapterComplete, pendingAction } from '../src/core/story/StoryEngine.ts';
import { hiddenLevels, levelMode, levels } from '../src/data/levels/index.ts';
import { actions, chapter } from '../src/data/story/chapter.ts';

test('расписание поиска расширяется на каждую пятую позицию', () => {
  assert.equal(levels.length,15);
  assert.deepEqual(hiddenLevels.map(level=>level.id),[5,10,15]);
  assert.deepEqual(levels.filter(level=>levelMode(level.id)==='hidden').map(level=>level.id),[5,10,15]);
  for (const id of [20,25,30,105]) assert.equal(levelMode(id),'hidden');
  for (const id of [16,23,29,104]) assert.equal(levelMode(id),'match');
});

for (const level of hiddenLevels) {
  test(`поиск ${level.id}: попадание, подсказка, восстановление и завершение`, () => {
    const engine=new HiddenObjectEngine(level);
    assert.equal(engine.tap(0,0),undefined);
    const first=level.targets[0];
    assert.equal(engine.hint(),first);
    assert.equal(engine.tap(first.x,first.y),first);
    assert.equal(engine.tap(first.x,first.y),undefined);
    assert.equal(engine.remaining.length,7);
    const saved=JSON.parse(JSON.stringify(engine.snapshot()));
    const loaded=new HiddenObjectEngine(level,saved);
    assert(loaded.has(first.id));
    assert.equal(loaded.remaining.length,7);
    assert.equal(loaded.complete,false);
    for (const item of loaded.remaining) assert.equal(loaded.tap(item.x,item.y),item);
    assert.equal(loaded.remaining.length,0);
    assert.equal(loaded.hint(),undefined);
    assert.equal(loaded.complete,true);
    assert.equal(new HiddenObjectEngine(level,loaded.snapshot()).complete,true);
  });
}

test('глава проходит путь от первой звезды до финальной сцены без лишних наград', () => {
  let state=freshProgress();
  assert.equal(spend(state,actions[0]),state);
  assert.equal(victory(state,2),state);
  for (const level of levels) {
    state=victory(state,level.id);
    const previous=state;
    assert.equal(victory(state,level.id),previous);
    assert.equal(state.stars,1);
    assert(!chapterComplete(state));
    const action=pendingAction(state)!;
    assert.equal(action.after,level.id);
    state=spend(state,action);
    assert.equal(state.stars,0);
    assert.equal(state.actions.length,level.id);
  }
  assert(chapterComplete(state));
  assert.deepEqual(state.clues,['houseKey','photo','letter','cassette','ledger']);
  assert.equal(chapter.continuation,'Продолжение следует. Глава 2 — Старая пристань');
});

test('жизни регенерируют каждые 30 минут без накопления сверх лимита', () => {
  const at=1000;
  const state=defeat(defeat(freshProgress(),at),at+1);
  assert.equal(state.lives,3);
  assert.equal(regenerate(state,at+LIFE_INTERVAL-1).lives,3);
  assert.equal(regenerate(state,at+LIFE_INTERVAL).lives,4);
  assert.equal(regenerate(state,at+2*LIFE_INTERVAL).lives,5);
  assert.equal(regenerate(state,at+5*LIFE_INTERVAL).regenFrom,null);
});

test('ежедневная награда использует местную дату и не выдаётся повторно', () => {
  const day=localDay(new Date(1998,9,3,23,58));
  assert.equal(day,'1998-10-03');
  const initial=defeat(freshProgress(),1000);
  const claimed=dailyReward(initial,day);
  assert.equal(claimed.lives,5);
  assert.equal(claimed.regenFrom,null);
  assert.equal(claimed.hammers,initial.hammers+1);
  assert.equal(dailyReward(claimed,day),claimed);
  assert.equal(dailyReward(claimed,'1998-10-02'),claimed);
  assert.equal(dailyReward(claimed,'1998-10-04').hammers,initial.hammers+2);
});
