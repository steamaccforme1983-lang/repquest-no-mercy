import {blankLife, parseLife, mergeLife, completed as completedLife, categoryStats} from './life.mjs';

export const exercises = [
  ['squat','Bodyweight squat','Strength','Lower body','reps',8,'Sit hips back toward a chair. Keep feet planted and stand smoothly.','Try a higher chair or a shallower bend.','Lower slowly for three counts.','Quads and glutes','squat'],
  ['push','Wall push-up','Strength','Upper body','reps',8,'Hands on a wall at shoulder height. Bend elbows and press away with your body in a straight line.','Stand closer to the wall.','Use a sturdy countertop for a lower incline.','Chest, shoulders and triceps','push'],
  ['bug','Dead bug','Balance','Core','reps',6,'Lie on your back with knees bent. Lower opposite hand and heel slowly, then switch sides.','Move only your legs and tap a heel.','Reach the moving leg farther while staying comfortable.','Abdominal muscles and hip stabilizers','bug'],
  ['bridge','Glute bridge','Strength','Lower body','reps',8,'Lie on your back, feet flat. Press through your feet to lift hips gently. Lower with control.','Lift through a smaller range.','Pause comfortably at the top.','Glutes and hamstrings','bridge'],
  ['march','Easy march','Endurance','Full body','sec',45,'March at a pace that lets you speak comfortably. Relax your shoulders.','March seated or keep your steps low.','Add an easy arm swing.','Hip flexors, legs and cardiovascular system','march'],
  ['bird','Bird dog','Balance','Core','reps',6,'On hands and knees, reach one arm and opposite leg, then switch. Keep your hips steady.','Reach just one limb at a time.','Pause briefly before returning.','Trunk and hip stabilizers','bird'],
  ['reach','Seated upper-body reach','Mobility','Mobility','sec',30,'Sit tall and reach one arm gently overhead. Alternate sides within a comfortable range.','Reach forward instead of overhead.','Add a small side bend if comfortable.','Shoulders and upper back','reach'],
  ['stretch','Gentle mobility flow','Mobility','Mobility','sec',60,'Move gently through shoulder rolls, ankle circles and comfortable seated reaches. Breathe normally.','Pick one movement that feels comfortable.','Move a little slower and explore a comfortable range.','Shoulders, ankles and upper back','reach'],
  ['row','Band row','Strength','Upper body','reps',8,'Use a secure band anchor at chest height. Draw elbows back slowly, then release with control.','Use a lighter band or choose a wall push-up.','Pause briefly with elbows back.','Upper back and biceps','push'],
  ['hinge','Dumbbell hip hinge','Strength','Lower body','reps',8,'Hold light dumbbells close to your thighs. With soft knees, send hips back and stand tall.','Practice the movement without weights.','Slow the lowering phase before adding load.','Hamstrings and glutes','squat'],
  ['rest','Recovery check-in','Consistency','Recovery','sec',60,'Choose rest, relaxed breathing or a gentle walk. Check in when you have taken time to recover.','A quiet seated break counts.','Keep today easy.','Recovery','reach']
].map(([id,name,skill,group,unit,target,how,easy,hard,muscles,pose])=>({id,name,skill,group,unit,target,how,easy,hard,muscles,pose}));
export const catalog=Object.fromEntries(exercises.map(e=>[e.id,e]));
export const focuses=['Full body','Upper body','Lower body','Core','Mobility','Recovery'];
export const skills=['Strength','Endurance','Mobility','Balance','Consistency'];
export const localDay=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const dateOf=day=>new Date(day+'T12:00:00');
export function addDays(day,amount){const d=dateOf(day); d.setDate(d.getDate()+amount);return localDay(d);}
export const weekOf=day=>addDays(day,-((dateOf(day).getDay()+6)%7));
export const step=level=>100+25*(level-1);
export function rank(xp){let level=1;while(xp>=step(level)){xp-=step(level++);}return {level,xp,next:step(level)};}
export const defaults=()=>({schema:1,profile:{name:'Adventurer',experience:'Beginner',equipment:'None',time:20,focus:'Full body',access:'Standard',goal:3,avatar:'Rift',title:'Novice Adventurer',ready:false},settings:{theme:'dark',motion:true,sound:false,achievements:true,weekly:false,workout:false,recovery:false,reminder:'17:00'},days:{},logs:{},notes:{},sessions:{},awards:{},ledger:{},favorites:[],life:blankLife()});
export const dateLabel=(day,options={month:'short',day:'numeric'})=>dateOf(day).toLocaleDateString(undefined,options);
export const logKey=(day,id)=>day+'/'+id;
export const outcome=(state,day,id)=>state.logs[logKey(day,id)]?.status || 0;
export const setsFor=(profile,e)=>e.unit==='reps'?(profile.time===10||profile.experience==='New' ? 1 : 2):1;
export function makePlan(day,profile,focus=profile.focus,time=profile.time,recovery=false){
  const pools={ 'Full body':['squat','push','bug','march','stretch'], 'Upper body':['push','reach','bug','march','stretch'], 'Lower body':['squat','bridge','march','stretch'], 'Core':['bug','bird','march','reach'], 'Mobility':['stretch','reach','march'] };
  let ids=recovery||focus==='Recovery'?['rest']:[...(pools[focus]||pools['Full body'])].slice(0,time===10?3:time===20?4:5);
  if(profile.equipment==='Resistance band'&&focus==='Upper body')ids[0]='row';
  if(profile.equipment==='Light dumbbells'&&focus==='Lower body')ids[0]='hinge';
  if(profile.access==='Seated options'&&ids[0]!=='rest') ids=['march','reach','stretch'];
  return {day,focus:ids[0]==='rest'?'Recovery':focus,time:ids[0]==='rest'?5:time,items:ids.map(id=>({id,level:profile.access==='Seated options'?'Easy':'Standard'})),updated:Date.now()};
}
export function suggested(state,day){
  const monday=weekOf(day);
  const indexes={2:[0,3],3:[0,2,4],4:[0,2,4,6]}[state.profile.goal]||[0,2,4];
  const dates=Array.from({length:7},(_,i)=>addDays(monday,i));
  const reserved=dates.filter(d=>state.days[d]&&state.days[d].focus!=='Recovery').length;
  const firstDay=localDay();
  const preferred=indexes.map(i=>dates[i]);
  if(!state.profile.ready&&dates.includes(firstDay)&&!preferred.includes(firstDay))preferred.unshift(firstDay);
  const open=preferred.filter(d=>!state.days[d]).slice(0,Math.max(0,state.profile.goal-reserved));
  const recovery=!open.includes(day);
  return makePlan(day,state.profile,state.profile.focus,state.profile.time,recovery);
}
export const planOf=(state,day)=>state.days[day]||suggested(state,day);
export const workoutDone=(state,plan)=>plan.focus!=='Recovery'&&plan.items.every(({id})=>outcome(state,plan.day,id)===2);
export const recordable=log=>log.status>0&&(log.reps>0||log.seconds>0);
export function records(state){
  const best={};
  Object.values(state.logs).filter(recordable).sort((a,b)=>a.day.localeCompare(b.day)).forEach(log=>{
    const value=log.reps*log.sets||log.seconds;
    if(!best[log.id]||best[log.id].value<value)best[log.id]={value,day:log.day,id:log.id};
  });
  return Object.values(best).sort((a,b)=>b.day.localeCompare(a.day));
}
export const badgeList=[
  ['first','First Quest','Finish your first workout.',50,'flag'],
  ['three','Getting Started','Finish three training sessions.',50,'bolt'],
  ['weekly','Consistency Hero','Reach your weekly workout target.',50,'shield'],
  ['early','Early Adventurer','Finish a workout before 9 AM.',50,'sun'],
  ['recover','Recovery Master','Complete three recovery quests.',50,'heart'],
  ['ten','Level 10','Reach character level 10.',50,'star'],
  ['hundred','Century Club','Finish 100 workouts.',50,'trophy'],
  ['life-first','Daily Adventurer','Complete your first custom quest.',0,'flag'],
  ['life-ten','Everyday Hero','Complete 10 custom quests.',25,'trophy'],
  ['life-skills','Well Rounded','Complete quests in three categories.',25,'star']
];
export function snapshot(state){
  const targets={}, completed=[], weeks={}, activity={}, scores=Object.fromEntries(skills.map(s=>[s,0]));
  const grant=(key,day,label,xp)=>{targets[key]={day,label,xp};};
  for(const log of Object.values(state.logs)){
    if(!log.status||!catalog[log.id])continue;
    const e=catalog[log.id];
    grant('ex:'+logKey(log.day,log.id),log.day,e.name+(log.status===1?' · partial':''),e.id==='rest'?(log.status===2?15:7):log.status*5);
    scores[e.skill]+=log.status===2?1:0.5;
    activity[log.day]=true;
  }
  for(const [day,note] of Object.entries(state.notes)) if(note.text.trim())grant('note:'+day,day,'Workout notes',5);
  for(const plan of Object.values(state.days).sort((a,b)=>a.day.localeCompare(b.day))){
    if(!workoutDone(state,plan))continue;
    const {day}=plan;const week=weekOf(day);
    completed.push(day);scores.Consistency++;
    (weeks[week]||=[]).push(day);
    grant('workout:'+day,day,'Workout complete',30);
  }
  for(const [week,days] of Object.entries(weeks)){
    const goal=state.awards['goal:'+week]?.goal||state.profile.goal;
    if(days.length>=goal)grant('week:'+week,days[goal-1],'Weekly consistency goal',100);
  }
  const badgeDates={}, recover=Object.values(state.logs).filter(l=>l.id==='rest'&&l.status===2).map(l=>l.day).sort();
  const early=completed.find(day=>state.sessions[day]?.hour<9);
  const life=state.life||blankLife();
  const lifeHistory=completedLife(life).reverse();
  const lifeCategories=categoryStats(life);
  const categories=new Set();
  let threeCategories;
  for(const record of lifeHistory){
    grant('life:'+record.id+'/'+record.period,record.day,record.name,record.xp);
    categories.add(record.category);
    if(categories.size===3)threeCategories??=record.day;
  }
  const qualified=[completed[0],completed[2],Object.values(targets).find(t=>t.label==='Weekly consistency goal')?.day,early,recover[2],null,completed[99],lifeHistory[0]?.day,lifeHistory[9]?.day,threeCategories];
  badgeList.forEach(([id,name,,xp],index)=>{
    if(!qualified[index])return;
    badgeDates[id]=qualified[index];
    grant('badge:'+id,qualified[index],name,xp);
  });
  let xp=Object.values(targets).reduce((a,b)=>a+b.xp,0);
  if(rank(xp).level>=10){const day=state.awards.ten?.day||localDay();badgeDates.ten=day;grant('badge:ten',day,'Level 10',50);xp+=50;}
  return {targets,xp,rank:rank(xp),completed,weeks,activity,scores,badgeDates,best:records(state),lifeCategories};
}
export function reconcile(state,now=Date.now()){
  let snap=snapshot(state);
  for(const [id,day] of Object.entries(snap.badgeDates))state.awards[id]||={day,updated:now};
  snap=snapshot(state);
  const totals={};
  for(const t of Object.values(state.ledger))totals[t.source]=(totals[t.source]||0)+t.delta;
  for(const source of new Set([...Object.keys(totals),...Object.keys(snap.targets)])){
    const target=snap.targets[source], delta=(target?.xp||0)-(totals[source]||0);
    if(!delta)continue;
    const ref=target||Object.values(state.ledger).find(t=>t.source===source);
    const id=globalThis.crypto.randomUUID();
    state.ledger[id]={id,source,delta,label:ref.label,day:ref.day,at:now};
  }
  return snap;
}
export function setExercise(state,day,id,status,counts={},now=new Date()){
  const plan=planOf(state,day), item=plan.items.find(item=>item.id===id);
  if(!item||![0,1,2].includes(status))return snapshot(state);
  state.days[day]||=plan;
  const key=logKey(day,id), old=state.logs[key], e=catalog[id];
  if((old?.status||0)===status&&!Object.keys(counts).length)return snapshot(state);
  const wasComplete=workoutDone(state,plan);
  if(plan.focus!=='Recovery')state.awards['goal:'+weekOf(day)]||={goal:state.profile.goal,updated:+now};
  state.logs[key]={day,id,status,sets:counts.sets??old?.sets??setsFor(state.profile,e),reps:counts.reps??old?.reps??(e.unit==='reps'?(status===1?Math.ceil(e.target/2):e.target):0),seconds:counts.seconds??old?.seconds??(e.unit==='sec'?(status===1?Math.ceil(e.target/2):e.target):0),updated:+now};
  if(!wasComplete&&workoutDone(state,plan))state.sessions[day]={...state.sessions[day],hour:now.getHours(),updated:+now};
  return reconcile(state,+now);
}
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const validDay=day=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(+dateOf(day))&&localDay(dateOf(day))===day;
export function parseBackup(raw){
  const data=JSON.parse(raw);
  if(!object(data)||data.schema!==1||!object(data.profile)||!object(data.settings))throw Error('Choose a RepQuest JSON backup.');
  const blank=defaults(), parsed={...blank};
  for(const [key,fallback] of Object.entries(blank.profile))if(typeof data.profile[key]===typeof fallback)parsed.profile[key]=data.profile[key];
  for(const [key,fallback] of Object.entries(blank.settings))if(typeof data.settings[key]===typeof fallback)parsed.settings[key]=data.settings[key];
  if(![2,3,4].includes(parsed.profile.goal))parsed.profile.goal=3;
  if(![10,20,30].includes(parsed.profile.time))parsed.profile.time=20;
  const number=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
  const checks={
    days:(k,v)=>validDay(k)&&v.day===k&&focuses.includes(v.focus)&&number(v.time,30)&&Array.isArray(v.items)&&v.items.length>0&&v.items.length<=8&&new Set(v.items.map(i=>i?.id)).size===v.items.length&&v.items.every(i=>i&&Object.hasOwn(catalog,i.id)&&['Easy','Standard','Challenge'].includes(i.level)),
    logs:(k,v)=>validDay(v.day)&&Object.hasOwn(catalog,v.id)&&logKey(v.day,v.id)===k&&[0,1,2].includes(v.status)&&number(v.sets,20)&&number(v.reps,200)&&number(v.seconds,3600),
    notes:(k,v)=>validDay(k)&&typeof v.text==='string'&&v.text.length<=2000,
    sessions:(k,v)=>validDay(k)&&(v.hour===undefined||number(v.hour,23))&&(v.seconds===undefined||number(v.seconds,86400)),
    awards:(k,v)=>k.startsWith('goal:')?[2,3,4].includes(v.goal):badgeList.some(b=>b[0]===k)&&validDay(v.day)
  };
  for(const [section,check] of Object.entries(checks)){
    if(!object(data[section]))throw Error('The backup is missing '+section+'.');
    for(const [key,value] of Object.entries(data[section])){
      if(!object(value)||!Number.isFinite(value.updated)||!check(key,value))throw Error('The backup has an invalid '+section+' entry.');
      parsed[section][key]=value;
    }
  }
  if(object(data.ledger))for(const [key,t] of Object.entries(data.ledger))if(object(t)&&/^[\da-f-]{36}$/i.test(key)&&key===t.id&&typeof t.source==='string'&&typeof t.label==='string'&&validDay(t.day)&&Number.isFinite(t.at)&&Number.isInteger(t.delta)&&Math.abs(t.delta)<=1000000)parsed.ledger[key]=t;
  parsed.favorites=Array.isArray(data.favorites)?data.favorites.filter(f=>f&&focuses.includes(f.focus)&&[10,20,30].includes(f.time)).slice(0,24):[];
  parsed.life=parseLife(data.life);
  return parsed;
}
export function merge(state,incoming){
  for(const section of ['days','logs','notes','sessions','awards']){
    for(const [key,value] of Object.entries(incoming[section])){
      if(!state[section][key]||state[section][key].updated<value.updated) state[section][key]=value;
    }
  }
  const changed=Object.keys(incoming.ledger).some(id=>!state.ledger[id]);
  mergeLife(state.life,incoming.life||blankLife());
  if(changed)Object.assign(state.ledger,incoming.ledger);
  reconcile(state);
  return state;
}
