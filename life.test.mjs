import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from './dist/engine.mjs';
import * as L from './dist/life.mjs';

const day='2026-11-19';
const later='2026-11-20';
const save=(s,input={},old)=> {
  const q=L.cleanQuest({name:'Brush teeth',start:day,section:'daily',repeat:'daily',xp:10,category:'preset-2',...input},old);
  s.life.quests[q.id]=q;
  return q;
};
const award=(s,q,date=day,done=true,at=100)=>{
  L.setQuestCompletion(s.life,q.id,date,done,later,at);
  return E.reconcile(s,at);
};

test('daily custom XP joins workout XP and undo reverses the single award',()=>{
  const state=E.defaults();
  const quest=save(state);
  assert.deepEqual(L.dailyStatus(state.life,day),{done:0,total:1,percent:0});
  assert.equal(award(state,quest).xp,10);
  assert.equal(award(state,quest).xp,10);
  assert.equal(Object.values(state.ledger).length,1);
  assert.equal(E.snapshot(state).badgeDates['life-first'],day);
  assert.equal(E.setExercise(state,day,'squat',2,{},new Date(day+'T17:00:00')).xp,20);
  assert.equal(award(state,quest,day,false).xp,10);
  assert.equal(Object.values(state.ledger).filter(t=>t.source.startsWith('life:')).map(t=>t.delta).join(','),'10,-10');
});

test('daily reset keeps earned XP and opens another occurrence',()=>{
  const state=E.defaults();
  const q=save(state);
  award(state,q);
  assert.equal(L.dailyStatus(state.life,later).percent,0);
  assert.equal(E.snapshot(state).xp,10);
  assert.equal(award(state,q,later).xp,20);
  assert.equal(L.streak(state.life,q,later),2);
  state.life.prefs.streaks=false;
  assert.equal(L.streak(state.life,q,later),0);
  assert.equal(E.snapshot(state).xp,20);
});

test('weekly, monthly and one-time recurrence use stable periods',()=>{
  const state=E.defaults();
  const weekly=save(state,{repeat:'weekly'});
  assert.equal(L.occurrence(weekly,later),null);
  assert.equal(L.occurrence(weekly,'2026-11-26'),'2026-11-23');
  const monthly=save(state,{repeat:'monthly',start:'2026-01-31'});
  assert.equal(L.occurrence(monthly,'2026-02-28'),'2026-02');
  assert.equal(L.occurrence(monthly,'2026-04-30'),'2026-04');
  assert.equal(L.occurrence(monthly,'2028-02-29'),'2028-02');
  const one=save(state,{repeat:'once',section:'main'});
  assert.equal(L.occurrence(one,later),'once');
  assert.equal(award(state,one,later).xp,10);
  assert.equal(L.dueOn(state.life,'2026-11-21').some(q=>q.id===one.id),false);
});

test('subtasks, archive, delete and rescheduling preserve historical grants',()=>{
  const state=E.defaults();
  const q=save(state,{section:'main',repeat:'once',subtasks:[{title:'Write chapter one'}]});
  L.setSubtask(state.life,q.id,day,q.subtasks[0].id,true,day);
  assert.equal(E.snapshot(state).xp,0);
  assert.equal(L.getEvent(state.life,q,day).checked.length,1);
  award(state,q);
  const edited=save(state,{name:'Edited',start:later,repeat:'once',xp:99},q);
  assert.equal(award(state,edited,later).xp,10);
  edited.status='archived';
  assert.equal(L.dueOn(state.life,later).length,0);
  edited.status='deleted';
  assert.equal(E.snapshot(state).xp,10);
  assert.equal(L.completed(state.life)[0].name,'Brush teeth');
});

test('reward caps apply and eligible category cosmetics unlock',()=>{
  const state=E.defaults();
  for(let i=0;i<6;i++)award(state,save(state,{xp:200}));
  assert.equal(L.completed(state.life).reduce((n,r)=>n+r.xp,0),500);
  assert.equal(L.completed(state.life).length,6);
  const category=L.categoryStats(state.life).find(c=>c.id==='preset-2');
  assert.equal(category.level,6);
  state.life.rewards.reward={id:'reward',name:'Sunrise',category:'preset-2',level:6};
  assert.equal(L.unlocks(state.life,E.snapshot(state).rank.level)[0].unlocked,true);
});

test('custom backup merge keeps XP idempotent and preserves newer undo',()=>{
  const state=E.defaults(), quest=save(state);
  award(state,quest);
  const other=E.parseBackup(JSON.stringify(state));
  award(other,quest,day,false,200);
  E.merge(state,other);
  E.merge(state,other);
  assert.equal(E.snapshot(state).xp,0);
  assert.equal(L.getEvent(state.life,quest,day).done,false);
});

test('original fitness backups load and manual order can move both directions',()=>{
  const state=E.defaults();
  delete state.life;
  const current=E.parseBackup(JSON.stringify(state));
  const first=save(current), second=save(current,{name:'Study'});
  L.reorder(current.life,first.id,second.id);
  assert.deepEqual(L.ordered(current.life).map(q=>q.id),[second.id,first.id]);
  L.reorder(current.life,first.id,second.id);
  assert.deepEqual(L.ordered(current.life).map(q=>q.id),[first.id,second.id]);
});
