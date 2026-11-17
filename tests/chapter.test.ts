import test from 'node:test';
import assert from 'node:assert/strict';
import { HiddenObjectEngine } from '../src/core/hiddenObject/HiddenObjectEngine.ts';
import { dailyReward, defeat, freshProgress, LIFE_INTERVAL, localDay, regenerate, spend, victory } from '../src/core/progress/ProgressSystem.ts';
import { chapterComplete, pendingAction, storyActions } from '../src/core/story/StoryEngine.ts';
import { hiddenLevels, levelMode, levels } from '../src/data/levels/index.ts';
import { actions } from '../src/data/story/chapter.ts';

test('расписание поиска расширяется на каждую пятую позицию', () => {
  assert.equal(levels.length,300);
  assert.equal(hiddenLevels.length,60);
  assert.deepEqual(hiddenLevels.map(level=>level.id),Array.from({length:60},(_,i)=>(i+1)*5));
  assert.deepEqual(levels.filter(level=>levelMode(level.id)==='hidden').map(level=>level.id),hiddenLevels.map(level=>level.id));
  for (const id of [20,25,30,105]) assert.equal(levelMode(id),'hidden');
  for (const id of [16,23,29,104]) assert.equal(levelMode(id),'match');
});

for (const level of hiddenLevels) {
  test(`поиск ${level.id}: открытие тайников, восстановление и завершение`,()=>{
    let engine=new HiddenObjectEngine(level);
    assert.equal(engine.tap(0,0),undefined);
    assert.equal(engine.remaining.length,level.targets.length);
    for(let n=0;n<level.targets.length+(level.hotspots?.length ?? 0);n++) {
      const next=engine.hint();
      assert(next,`нет доступной находки на шаге ${n}`);
      if('size' in next) assert.equal(engine.tap(next.x,next.y)?.id,next.id);
      else assert.deepEqual(engine.interact(next.x,next.y),{hotspot:next,locked:false});
      engine=new HiddenObjectEngine(level,JSON.parse(JSON.stringify(engine.snapshot())));
    }
    assert.equal(engine.remaining.length,0);
    assert.equal(engine.hint(),undefined);
    assert.equal(engine.complete,true);
  });
}

test('кампания проходится за 300 уровней, начисляет награды один раз и сохраняет первую главу',()=>{
  let state=freshProgress();
  assert.equal(spend(state,actions[0]),state);
  assert.equal(victory(state,2),state);
  for(const level of levels) {
    const previous=state;
    state=victory(state,level.id);
    assert.equal(victory(state,level.id),state);
    assert.equal(state.stars,previous.stars+1);
    assert(!chapterComplete(state));
    while(pendingAction(state)) {
      const action=pendingAction(state)!;
      assert.equal(action.after,level.id);
      const updated=spend(state,action);
      assert(updated!==state);
      state=updated;
    }
  }
  assert(chapterComplete(state));
  assert.equal(state.actions.length,storyActions.length);
  assert.deepEqual(state.clues.slice(0,5),['houseKey','photo','letter','cassette','ledger']);
  assert(state.clues.includes('discovery-300'));
  assert(state.stars>0);
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
