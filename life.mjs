const DAY = 86_400_000;
export const DAILY_XP_LIMIT = 500;
export const difficulties = { Easy: 10, Normal: 25, Hard: 50 };
export const sections = { daily:'Daily Quests', side:'Side Quests', main:'Main Quests' };
export const repeats = { daily:'Daily', weekly:'Weekly', monthly:'Monthly', once:'One time' };
const presets = ['Fitness','Study','Self-care','Housework','Personal Projects','Hobbies','Other'];
const idPattern = /^[a-z0-9-]{1,70}$/i;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validId = id => typeof id === 'string' && idPattern.test(id) && !Object.hasOwn(Object.prototype,id);
export const validDay = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day;
const dateInt = day => Date.parse(day) / DAY;
export const offsetDay = (day,n) => new Date((dateInt(day)+n)*DAY).toISOString().slice(0,10);
export const monday = day => offsetDay(day,-((new Date(day).getUTCDay()+6)%7));
export const localDate = (now=new Date()) => [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
const clean = (value,max) => typeof value === 'string' ? [...value.trim()].slice(0,max).join('') : '';
const bounded = (value,min,max,otherwise=min) => Number.isInteger(Number(value)) ? Math.max(min,Math.min(max,Number(value))) : otherwise;
const timeIsValid = time => typeof time==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
export const blankLife = () => ({
  categories:Object.fromEntries(presets.map((name,i)=>['preset-'+i,{id:'preset-'+i,name,updated:0}])),
  quests:{}, events:{}, rewards:{}, order:{ids:[],updated:0}, prefs:{streaks:true,cosmetic:'',updated:0}
});
export function cleanQuest(input, old, now=Date.now()) {
  const name=clean(input.name,80);
  if(!name || !validDay(input.start))throw Error('Enter a quest name and a valid start date.');
  const category=validId(input.category)?input.category:'preset-6';
  const difficulty=Object.hasOwn(difficulties,input.difficulty)?input.difficulty:'Normal';
  const time=timeIsValid(input.time)?input.time:'';
  const subtasks=(Array.isArray(input.subtasks)?input.subtasks:[]).slice(0,30).map(item=>({
    id:validId(item?.id)?item.id:crypto.randomUUID(), title:clean(item?.title,100)
  })).filter(task=>task.title);
  return {
    id:old?.id||crypto.randomUUID(), name, icon:clean(input.icon,12), description:clean(input.description,800),
    category, section:Object.hasOwn(sections,input.section)?input.section:'daily', difficulty,
    xp:bounded(input.xp,0,100,difficulties[difficulty]), start:input.start, time,
    repeat:Object.hasOwn(repeats,input.repeat)?input.repeat:'daily',
    reminder:time&&[0,5,15,30,60].includes(Number(input.reminder))&&input.reminder!==''?Number(input.reminder):null,
    subtasks, status:old?.status||'active', created:old?.created??now, updated:now
  };
}
export function occurrence(quest,day) {
  if(!validDay(day)||day<quest.start)return null;
  if(quest.repeat==='weekly'){
    if(new Date(day).getUTCDay()!==new Date(quest.start).getUTCDay())return null;
    return monday(day);
  }
  if(quest.repeat==='monthly'){
    const date=new Date(day);
    const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
    if(date.getUTCDate()!==Math.min(last,Number(quest.start.slice(8))))return null;
    return day.slice(0,7);
  }
  if(quest.repeat==='once')return 'once';
  return day;
}
const keyOf = (id,period) => id+'/'+period;
export function getEvent(life,quest,day) {
  const period=occurrence(quest,day);
  if(!period)return undefined;
  const primary=life.events[keyOf(quest.id,period)];
  if(primary)return primary;
  return [day,monday(day),day.slice(0,7),'once'].map(key=>life.events[keyOf(quest.id,key)]).find(event=>event?.day===day);
}
export const completed = life => Object.values(life.events).filter(event=>event.done).sort((a,b)=>b.day.localeCompare(a.day)||b.updated-a.updated);
export function dueOn(life,day) {
  return Object.values(life.quests).filter(q=>{
    if(q.status!=='active'||!occurrence(q,day))return false;
    if(q.repeat!=='once')return true;
    const event=getEvent(life,q,day);
    return !event?.done||event.day===day;
  });
}
export function dailyStatus(life,day) {
  const due = dueOn(life,day).filter(q=>q.section==='daily');
  const done=due.filter(q=>getEvent(life,q,day)?.done).length;
  return {done,total:due.length,percent:due.length?Math.round(done/due.length*100):0};
}
export function setQuestCompletion(life,id,day,done,today=localDate(),at=Date.now()) {
  const quest=life.quests[id];
  const period=quest&&occurrence(quest,day);
  if(!period||quest.status!=='active'||day>today)throw Error('This quest can be completed on its scheduled date.');
  const prior=getEvent(life,quest,day), eventPeriod=prior?.period??period;
  const key=keyOf(id,eventPeriod), eventDay=prior?.xp===undefined?day:prior.day;
  if(Boolean(prior?.done)===done)return prior;
  const used=Object.values(life.events).reduce((sum,row)=>sum+(row.done&&row.day===eventDay?row.xp:0),0);
  const xp=done?Math.min(prior?.xp??quest.xp,Math.max(0,DAILY_XP_LIMIT-used)):prior.xp;
  const event={id,period:eventPeriod,day:eventDay,done,xp, name:prior?.name??quest.name,
    category:prior?.category??quest.category, checked:prior?.checked??[], updated:at};
  life.events[key]=event;
  return event;
}
export function setSubtask(life,id,day,sub,checked,today=localDate(),at=Date.now()){
  const quest=life.quests[id], period=quest&&occurrence(quest,day);
  if(!period||day>today||quest.status!=='active'||!quest.subtasks.some(task=>task.id===sub))throw Error('This milestone can be checked on its scheduled date.');
  const prior=getEvent(life,quest,day)||{id,period,day,done:false,name:quest.name,category:quest.category,checked:[]};
  const key=keyOf(id,prior.period);
  const marks=new Set(prior.checked);
  if(checked)marks.add(sub);else marks.delete(sub);
  life.events[key]={...prior,checked:[...marks],updated:at};
}
export function categoryStats(life) {
  const totals={};
  for(const event of completed(life)){
    const stat=totals[event.category]||={xp:0,count:0};
    stat.xp+=event.xp;stat.count++;
  }
  return Object.values(life.categories).map(category=>{
    const {xp,count}=totals[category.id]||{xp:0,count:0};
    return {...category,xp,count,level:1+Math.floor(xp/100)};
  });
}
export function streak(life,quest,day) {
  if(!life.prefs.streaks||quest.repeat==='once')return 0;
  let run=0, first=true;
  for(let cursor=day;cursor>=quest.start;cursor=offsetDay(cursor,-1)){
    if(!occurrence(quest,cursor))continue;
    if(getEvent(life,quest,cursor)?.done){run++;first=false;continue;}
    if(first&&cursor===day){first=false;continue;}
    break;
  }
  return run;
}
export function reorder(life,source,target,at=Date.now()) {
  if(source===target||!life.quests[source]||!life.quests[target])return;
  const ids=ordered(life).map(q=>q.id);
  const from=ids.indexOf(source), to=ids.indexOf(target);
  ids.splice(from,1);
  ids.splice(to,0,source);
  life.order={ids,updated:at};
}
export function ordered(life) {
  const positions=new Map(life.order.ids.map((id,index)=>[id,index]));
  return Object.values(life.quests).sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity)||a.created-b.created);
}
export function unlocks(life,level) {
  const categories=new Map(categoryStats(life).map(entry=>[entry.id,entry.level]));
  return Object.values(life.rewards).filter(r=>!r.deleted).map(r=>({...r,unlocked:(r.category?categories.get(r.category)||1:level)>=r.level}));
}
export function parseLife(raw) {
  const out=blankLife();
  if(raw===undefined)return out;
  if(!object(raw))throw Error('Invalid custom quest data.');
  for(const [id,category] of Object.entries(object(raw.categories)?raw.categories:{})){
    if(validId(id)&&clean(category?.name,40)&&Number.isFinite(category.updated))out.categories[id]={id,name:clean(category.name,40),updated:category.updated};
  }
  for(const [id,quest] of Object.entries(object(raw.quests)?raw.quests:{})){
    if(!validId(id)||!object(quest)||!Number.isFinite(quest.updated)||!Number.isFinite(quest.created))continue;
    const status=['archived','deleted'].includes(quest.status)?quest.status:'active';
    out.quests[id]=cleanQuest({...quest,reminder:quest.reminder??''},{id,status,created:quest.created},quest.updated);
  }
  for(const [key,event] of Object.entries(object(raw.events)?raw.events:{})){
    if(!object(event)||!validId(event.id)||!validDay(event.day)||!validId(event.category)||!Number.isFinite(event.updated))continue;
    if(!/^(once|\d{4}-\d{2}(-\d{2})?)$/.test(event.period)||key!==keyOf(event.id,event.period))continue;
    const xp=event.xp===undefined&&!event.done?undefined:bounded(event.xp,0,100,0);
    out.events[key]={id:event.id,period:event.period,day:event.day,done:event.done===true,xp,
      name:clean(event.name,80)||'Custom quest',category:event.category,
      checked:Array.isArray(event.checked)?[...new Set(event.checked.filter(validId))].slice(0,30):[],updated:event.updated};
  }
  for(const [id,reward] of Object.entries(object(raw.rewards)?raw.rewards:{})){
    if(validId(id)&&clean(reward?.name,60)&&Number.isFinite(reward.updated))out.rewards[id]={
      id,name:clean(reward.name,60),icon:clean(reward.icon,12),level:bounded(reward.level,2,100,2),
      category:validId(reward.category)?reward.category:'',deleted:reward.deleted===true,updated:reward.updated
    };
  }
  if(Array.isArray(raw.order?.ids)&&Number.isFinite(raw.order.updated))out.order={ids:[...new Set(raw.order.ids.filter(validId))],updated:raw.order.updated};
  if(Number.isFinite(raw.prefs?.updated))out.prefs={streaks:raw.prefs.streaks!==false,cosmetic:validId(raw.prefs.cosmetic)?raw.prefs.cosmetic:'',updated:raw.prefs.updated};
  return out;
}
export function mergeLife(current,incoming) {
  for(const area of ['categories','quests','events','rewards']){
    for(const [key,value] of Object.entries(incoming[area]))if(!current[area][key]||current[area][key].updated<value.updated)current[area][key]=value;
  }
  for(const area of ['order','prefs'])if(current[area].updated<incoming[area].updated)current[area]=incoming[area];
}
