import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from './dist/engine.mjs';

const day='2026-11-16';
const at=new Date(day+'T16:15:00');
const sum=s=>Object.values(s.ledger).reduce((n,r)=>n+r.delta,0);
const clone=s=>E.parseBackup(JSON.stringify(s));
const plan=s=>E.planOf(s,day);
const complete=(s,key,status=2)=>E.setExercise(s,day,key,status,{},at);

test('exercise completion is idempotent and undo is recorded as a reversal',()=>{
  const s=E.defaults(), id=plan(s).items[0].id;
  assert.equal(complete(s,id).xp,10);
  assert.equal(complete(s,id).xp,10);
  assert.equal(Object.keys(s.ledger).length,1);
  assert.equal(complete(s,id,0).xp,0);
  assert.equal(sum(s),0);
  assert.deepEqual(Object.values(s.ledger).map(t=>t.delta),[10,-10]);
});
test('partial credit upgrades to full credit and keeps logged repetitions',()=>{
  const s=E.defaults(), id=plan(s).items[0].id;
  E.setExercise(s,day,id,1,{sets:1,reps:4},at);
  assert.equal(sum(s),5);
  assert.equal(s.logs[E.logKey(day,id)].reps,4);
  complete(s,id);
  assert.equal(sum(s),10);
});
test('workout, milestone and notes cross a level threshold and reverse correctly',()=>{
  const s=E.defaults(), items=plan(s).items;
  for(const {id} of items)complete(s,id);
  const snap=E.snapshot(s);
  assert.equal(snap.xp,120);
  assert.deepEqual(snap.rank,{level:2,xp:20,next:125});
  assert.equal(snap.badgeDates.first,day);
  s.notes[day]={text:'Felt comfortable',updated:+at};
  assert.equal(E.reconcile(s,+at).xp,125);
  assert.equal(complete(s,items[0].id,0).rank.level,1);
  assert.equal(sum(s),35);
});
test('rest earns XP without adding a workout',()=>{
  const s=E.defaults();
  s.days[day]=E.makePlan(day,s.profile,'Recovery',10);
  const snap=complete(s,'rest');
  assert.equal(snap.xp,15);
  assert.deepEqual(snap.completed,[]);
  assert.equal(snap.activity[day],true);
});
test('storage round trip preserves exercise logs, XP, and preferences',()=>{
  const s=E.defaults(),id=plan(s).items[0].id;
  complete(s,id);s.settings.theme='light';
  const restored=clone(s);
  assert.equal(restored.settings.theme,'light');
  assert.equal(E.outcome(restored,day,id),2);
  assert.equal(E.snapshot(restored).xp,10);
  assert.equal(sum(restored),10);
});
test('independent offline copies merge once and converge after reimport',()=>{
  const left=E.defaults(), right=E.defaults(), id=plan(left).items[0].id, second=plan(left).items[1].id;
  complete(left,id);complete(right,id);complete(right,second);
  const backup=clone(right);
  E.merge(left,backup);
  const transactionCount=Object.keys(left.ledger).length;
  E.merge(left,backup);
  assert.equal(sum(left),20);
  assert.equal(E.snapshot(left).xp,20);
  assert.equal(Object.keys(left.ledger).length,transactionCount);
  E.merge(right,clone(left));
  assert.equal(sum(right),20);
  assert.equal(E.snapshot(right).xp,20);
});
test('a newer offline undo is applied when backups merge',()=>{
  const s=E.defaults(), id=plan(s).items[0].id;
  complete(s,id);
  const incoming=clone(s);
  E.setExercise(incoming,day,id,0,{},new Date(+at+1000));
  E.merge(s,incoming);
  assert.equal(sum(s),0);
  assert.equal(E.outcome(s,day,id),0);
});
test('weekly completion adds a single bonus and schedules recovery',()=>{
  const s=E.defaults(), week=['2026-11-16','2026-11-18','2026-11-20'];
  s.profile.ready=true;
  assert.equal(E.planOf(s,'2026-11-17').focus,'Recovery');
  for(const date of week)for(const {id} of E.planOf(s,date).items)E.setExercise(s,date,id,2,{},new Date(date+'T17:00:00'));
  const snap=E.snapshot(s);
  assert.equal(snap.targets['week:'+day].xp,100);
  assert.equal(snap.badgeDates.weekly,week[2]);
  assert.equal(snap.completed.length,3);
  assert.equal(E.snapshot(clone(s)).xp,snap.xp);
});
test('invalid backup records are rejected',()=>{
  const s=E.defaults();
  s.logs[day+'/bad']={day,id:'bad',status:2,sets:2,reps:4,seconds:0,updated:+at};
  assert.throws(()=>clone(s),/invalid logs/);
});
