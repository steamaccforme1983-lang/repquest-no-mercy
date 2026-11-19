import * as E from './engine.mjs';
import * as L from './life.mjs';
import {createLifeUI} from './life-ui.mjs';
import {icon,emblem,demo} from './visuals.mjs';

const $=selector=>document.querySelector(selector);
const html=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>new Intl.NumberFormat().format(value);
const KEY='repquest:no-mercy:v1';
let state=E.defaults(), storageError=false;
try{const raw=localStorage.getItem(KEY);if(raw)state=E.parseBackup(raw);}catch{storageError=true;}
let today=E.localDay(), picked=today, route='dashboard', mobile=false, windowSize=7, chartType='xp', historyMonth=today.slice(0,7), search='', dialogType='', lastTrigger=null, install, coachPlan;
let workout={start:0,paused:0,day:today}, restEnd=0, restSeconds=60, alertKeys=new Set(), audioContext;
let onlineCoach=false, coachWaiting=false;
let messages=[{type:'coach',text:'Hi, Adventurer. I can help you plan a short workout, find a comfortable variation, or practice exercise form. What would you like to work on?'}];
const routes=[
 ['dashboard','grid','Dashboard'],['life','flag','Life Quests'],['quests','sword','Workout Quests'],['progress','chart','Progress'],['character','user','Character'],['achievements','trophy','Achievements'],['coach','spark','Fitness Coach'],['integrations','plug','Integrations'],['settings','settings','Settings']
];
const names=Object.fromEntries(routes.map(([key,,name])=>[key,name]));
const colors={Strength:'violet',Endurance:'orange',Mobility:'mint',Balance:'blue',Consistency:'pink'};
const emojis={Strength:'dumbbell',Endurance:'bolt',Mobility:'heart',Balance:'target',Consistency:'shield'};
const body=()=>$('#main');
const dialog=$('#dialog');
const btn=(label,action,opts={})=>'<button type="button" class="'+(opts.cls||'btn')+'" data-action="'+action+'"'+(opts.value===undefined?'':' data-value="'+html(opts.value)+'"')+(opts.aria?' aria-label="'+html(opts.aria)+'"':'')+(opts.disabled?' disabled':'')+'>'+(opts.icon?icon(opts.icon,17):'')+(label?'<span>'+html(label)+'</span>':'')+'</button>';
const field=(name,label,inner)=>'<label class="field" for="'+name+'"><span>'+label+'</span>'+inner+'</label>';
const select=(name,values,current)=>'<select name="'+name+'" id="'+name+'">'+values.map(v=>{const [value,label]=Array.isArray(v)?v:[v,v];return '<option value="'+html(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+html(label)+'</option>';}).join('')+'</select>';
const panelTitle=(title,extra='')=>'<div class="panel-head"><h2>'+title+'</h2>'+extra+'</div>';
const xpPill=xp=>'<span class="xp-pill">'+icon('bolt',13)+' '+xp+' XP</span>';
const tile=(name,tone='violet')=>'<span class="tile '+tone+'">'+icon(name,19)+'</span>';
const empty=text=>'<p class="empty">'+html(text)+'</p>';
const h=(title,sub,action='')=>'<section class="page-head"><div><h1>'+title+'</h1><p>'+sub+'</p></div>'+action+'</section>';
const duration=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const over=(snap)=>Math.min(100,snap.rank.xp/snap.rank.next*100);
const sameFavorite=(plan,favorite)=>favorite.focus===plan.focus&&favorite.time===(plan.focus==='Recovery'?10:plan.time);

function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
  catch{say('This browser could not save your changes. Download a backup from Settings.');return false;}
}
function say(message){
  $('#announcement').textContent=message;
  const dialogStatus=dialog.open&&$('#dialog-status');
  if(dialogStatus){dialogStatus.textContent=message;dialogStatus.hidden=false;}
  const el=$('#toast');el.textContent=message;el.hidden=false;
  clearTimeout(say.timeout);say.timeout=setTimeout(()=>el.hidden=true,4200);
}
function sound(up=false){
  if(!state.settings.sound)return;
  try{
    audioContext ||= new AudioContext();
    audioContext.resume().catch(()=>{});
    const gain=audioContext.createGain(), osc=audioContext.createOscillator(), t=audioContext.currentTime;
    gain.gain.setValueAtTime(.07,t);gain.gain.exponentialRampToValueAtTime(.001,t+.25);
    osc.frequency.setValueAtTime(up?520:460,t);osc.frequency.exponentialRampToValueAtTime(up?980:610,t+.2);
    osc.connect(gain).connect(audioContext.destination);osc.start(t);osc.stop(t+.26);
  }catch{}
}
function change(update,message='Saved'){
  const before=E.snapshot(state);
  update();
  const after=E.reconcile(state);
  const saved=persist();render();
  const unlocked=E.badgeList.find(b=>after.badgeDates[b[0]]&&!before.badgeDates[b[0]]);
  if(!saved)return;
  const up=after.rank.level>before.rank.level;
  if(up||unlocked&&state.settings.achievements){
    say(up?'Level up! You reached Level '+after.rank.level+'.':'Achievement unlocked · '+unlocked[1]);
    document.querySelector('.hero')?.classList.add('celebrate');
  }else say(message+(after.xp===before.xp?'':' · '+(after.xp>before.xp?'+':'−')+fmt(Math.abs(after.xp-before.xp))+' XP'));
  if(after.xp>before.xp)sound(up);
}
function navigate(path){
  if(location.hash!=='#'+path)location.hash=path;
  else setRoute(path);
}
function setRoute(path){
  route=Object.hasOwn(names,path)?path:'dashboard';mobile=false;search='';
  closeDialog();render();window.scrollTo(0,0);body()?.focus({preventScroll:true});
}
addEventListener('hashchange',()=>setRoute(location.hash.slice(1)));
addEventListener('storage',event=>{
  if(event.key!==KEY)return;
  try{state=event.newValue?E.parseBackup(event.newValue):E.defaults();render();}catch{say('Another tab saved data this app could not read.');}
});
function profileIcon(snap){const cosmetic=lifeUI.cosmetic(snap);return '<span class="avatar '+html(state.profile.avatar.toLowerCase())+'" '+(cosmetic?'title="'+html(cosmetic.name)+'"':'')+'>'+(cosmetic?.icon?html(cosmetic.icon):icon(state.profile.avatar==='Ember'?'fire':state.profile.avatar==='Nova'?'star':'spark',17))+'</span>';}
function render(){
  today=E.localDay();
  const snap=E.snapshot(state);
  const focus=document.activeElement;
  const focusData=focus?.closest('#shell')&&focus.dataset.action?[focus.dataset.action,focus.dataset.value]:null;
  const oldWidth=$('.xp-meter > i')?.style.width;
  const openSubtasks=new Set([...document.querySelectorAll('.life-subtasks[open]')].map(el=>el.closest('[data-quest-row]').dataset.questRow));
  const manageOpen=$('.life-manage')?.open;
  document.documentElement.dataset.theme=state.settings.theme==='light'?'light':'dark';
  document.documentElement.dataset.motion=state.settings.motion?'on':'off';
  document.title=names[route]+' · RepQuest';
  const links=items=>items.map(([key,ico,label])=>'<a href="#'+key+'" '+(route===key?'aria-current="page"':'')+'>'+icon(ico,18)+'<span>'+label+'</span>'+(route===key?'<i></i>':'')+'</a>').join('');
  $('#shell').innerHTML='<div class="layout"><button class="scrim" type="button" aria-label="Close navigation" data-action="menu" '+(mobile?'':'hidden')+'></button><aside class="sidebar '+(mobile?'shown':'')+'"><a class="brand" href="#dashboard"><img src="./mark.svg" width="40" height="40" alt=""><span><strong>REPQUEST</strong><small>NO MERCY</small></span></a><nav aria-label="Main navigation"><div class="nav-set"><p>QUESTS</p>'+links(routes.slice(0,4))+'</div><div class="nav-set"><p>ADVENTURER</p>'+links(routes.slice(4,7))+'</div><div class="nav-set"><p>PREFERENCES</p>'+links(routes.slice(7))+'</div></nav><div class="side-foot"><a href="#character" class="profile-link">'+profileIcon(snap)+'<span><strong>'+html(state.profile.name)+'</strong><small>Level '+snap.rank.level+' adventurer</small></span>'+icon('chevron',15)+'</a></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">'+btn('', 'menu',{icon:'menu',cls:'icon-btn mobile-menu',aria:'Toggle navigation'})+'<span>RepQuest</span>'+icon('chevron',13)+'<strong>'+names[route]+'</strong></div><div class="top-actions"><span class="connection"><i></i><span>'+(!navigator.onLine?'Offline':'Local save')+'</span></span>'+btn('','notifications',{icon:'bell',cls:'icon-btn bell',aria:'Notifications'})+'<button class="avatar-button" data-action="go" data-value="character" aria-label="Character">'+profileIcon(snap)+'</button></div></header><main id="main" tabindex="-1"></main></div></div>';
  const pages={dashboard,life:lifeUI.page,quests,progress,character,achievements,coach,integrations,settings};
  body().innerHTML=pages[route](snap);
  for(const node of body().querySelectorAll('.life-subtasks'))if(openSubtasks.has(node.closest('[data-quest-row]').dataset.questRow))node.open=true;
  if(manageOpen&&$('.life-manage'))$('.life-manage').open=true;
  if(focusData){
    [...document.querySelectorAll('#shell [data-action]')].find(e=>e.dataset.action===focusData[0]&&e.dataset.value===focusData[1])?.focus({preventScroll:true});
  }
  const meter=$('.xp-meter > i');
  if(meter&&oldWidth&&oldWidth!==meter.style.width){
    const width=meter.style.width;meter.style.width=oldWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>meter.style.width=width));
  }
  updateTimers();
}
const dayLong=day=>E.dateLabel(day,{weekday:'long',month:'long',day:'numeric'});
function xpGauge(snap){
  const {xp,next}=snap.rank;
  return '<button class="xp-control" data-action="xp" aria-label="XP history. '+xp+' of '+next+' XP toward next level"><span class="xp-meter"><i style="width:'+over(snap)+'%"></i></span><span class="xp-label"><b>'+fmt(xp)+' <span>/ '+fmt(next)+' XP</span></b><span>XP history '+icon('chevron',13)+'</span></span></button>';
}
const lifeUI=createLifeUI({state:()=>state,today:()=>today,show,close:closeDialog,render,change,say,html,btn,field,select,panelTitle,empty,xpPill,xpGauge,icon,tile,h,dayLong,download});
function nextRest(day){
  for(let i=1;i<=14;i++){const date=E.addDays(day,i);if(E.planOf(state,date).focus==='Recovery')return date;}
  return null;
}
function dashboard(snap){
  const plan=E.planOf(state,today);
  const done=plan.items.filter(i=>E.outcome(state,today,i.id)===2).length;
  const recent=E.badgeList.filter(b=>snap.badgeDates[b[0]]).sort((a,b)=>snap.badgeDates[b[0]].localeCompare(snap.badgeDates[a[0]])).slice(0,2);
  const rest=nextRest(today);
  const weekDays=Array.from({length:7},(_,i)=>E.addDays(E.weekOf(today),i));
  const week=(snap.weeks[E.weekOf(today)]||[]).length;
  const goal=state.awards['goal:'+E.weekOf(today)]?.goal||state.profile.goal;
  const active=Object.keys(snap.activity).filter(d=>d>=E.weekOf(today)&&d<=today).length;
  const best=snap.best[0];
  return h('Dashboard','Your routines, training, and character progress.',btn('Add Quest','life-add',{icon:'plus',cls:'btn primary head-action'}))+
    '<section class="hero"><div class="hero-copy"><div class="level-chip">'+icon('spark',14)+' LEVEL '+snap.rank.level+'</div><h2>'+html(state.profile.title)+'</h2><p>'+fmt(snap.rank.next-snap.rank.xp)+' XP to level '+(snap.rank.level+1)+'</p>'+xpGauge(snap)+'</div><div class="hero-art">'+emblem()+'</div></section>'+
    lifeUI.board()+'<div class="fitness-heading">'+panelTitle('Fitness',btn(state.profile.ready?'Customize plan':'Set up my plan','profile',{icon:'settings',cls:'btn'}))+'</div>'+
    '<div class="metric-row">'+metric('dumbbell','violet',snap.completed.length,'Workouts completed')+metric('fire','orange',active+' '+(active===1?'day':'days'),'Active this week')+metric('target','mint',week+' / '+goal,'Weekly workout goal')+'</div>'+
    '<div class="dash-grid"><section class="panel quests-panel">'+panelTitle("Today's Workout Quests",btn('View plan','go',{value:'quests',cls:'text-btn'}))+'<div class="section-meta">'+icon(plan.focus==='Recovery'?'moon':'calendar',15)+' '+html(dayLong(today))+'<span class="meta-dot"></span>'+html(plan.focus)+'</div><div class="quest-list">'+plan.items.map(i=>questRow(plan,i)).join('')+'</div><div class="quest-footer"><span><b>'+done+' of '+plan.items.length+'</b> quests complete</span>'+btn('Workout notes','note',{icon:'note',cls:'text-btn',value:today})+'</div></section>'+
    '<div class="dash-side"><section class="panel weekly">'+panelTitle('Weekly activity')+'<div class="week-grid">'+weekDays.map(day=>'<button type="button" data-action="day" data-value="'+day+'" class="week-day" aria-label="'+html(dayLong(day))+(snap.activity[day]?', logged activity':'')+'"><span>'+html(E.dateLabel(day,{weekday:'short'}).slice(0,2))+'</span><i class="'+(snap.completed.includes(day)?'logged':snap.activity[day]?'active':day===today?'current':'')+'">'+(snap.completed.includes(day)?icon('check',15):E.dateOf(day).getDate())+'</i></button>').join('')+'</div><p class="muted">'+week+' of '+goal+' scheduled workouts complete</p></section>'+
    '<section class="panel recovery">'+panelTitle('Recovery')+'<div class="detail-line">'+tile('moon','blue')+'<div><strong>'+(plan.focus==='Recovery'?'Recovery today':rest?html(dayLong(rest)):'Choose a rest day')+'</strong><small>'+(plan.focus==='Recovery'?'Your recovery quest is ready.':rest?'Next planned recovery day':'Set a weekly goal to plan recovery.')+'</small></div></div></section></div></div>'+
    '<div class="dash-grid bottom-grid"><section class="panel">'+panelTitle('Recent achievements',btn('All badges','go',{value:'achievements',cls:'text-btn'}))+(recent.length?recent.map(b=>'<div class="detail-line">'+tile(b[4],'orange')+'<div><strong>'+b[1]+'</strong><small>'+E.dateLabel(snap.badgeDates[b[0]])+'</small></div></div>').join(''):empty('Complete your first workout to unlock First Quest.'))+'</section><section class="panel">'+panelTitle('Personal records')+(best?'<div class="detail-line">'+tile('trophy','orange')+'<div><strong>'+E.catalog[best.id].name+'</strong><small>'+best.value+' '+E.catalog[best.id].unit+' · '+E.dateLabel(best.day)+'</small></div></div>':empty('Log an exercise to set your first record.'))+'</section></div>';
}
function metric(ico,tone,value,label){return '<div class="metric">'+tile(ico,tone)+'<div><strong>'+html(value)+'</strong><span>'+label+'</span></div></div>';}
function questRow(plan,item){
  const e=E.catalog[item.id], status=E.outcome(state,plan.day,item.id), log=state.logs[E.logKey(plan.day,item.id)];
  const desc=e.id==='rest'?'Rest or gentle movement':log&&status?(e.unit==='sec'?log.seconds+' sec':log.sets+' sets × '+log.reps+' reps'):(e.unit==='sec'?e.target+' sec':E.setsFor(state.profile,e)+' sets × '+e.target+' reps');
  const anchor=plan.day+'/'+item.id;
  return '<div class="quest-row"><button type="button" class="checkbox status-'+status+'" role="checkbox" aria-checked="'+(status===1?'mixed':status===2)+'" aria-label="'+html((status===2?'Undo ':'Complete ')+e.name)+'" data-action="check" data-value="'+anchor+'">'+(status?icon(status===1?'minus':'check',14):'')+'</button><button class="quest-info" type="button" data-action="exercise" data-value="'+anchor+'">'+tile(emojis[e.skill],colors[e.skill])+'<span><strong>'+e.name+'</strong><small>'+html(desc)+(status===1?' · Partial':'')+'</small></span></button>'+xpPill('+'+(e.id==='rest'?15:10))+'<button class="row-chevron" type="button" data-action="exercise" data-value="'+anchor+'" aria-label="View '+html(e.name)+'">'+icon('chevron',16)+'</button></div>';
}

function quests(snap){
  const plan=E.planOf(state,picked), start=E.weekOf(picked);
  const days=Array.from({length:7},(_,i)=>E.addDays(start,i));
  return h('Workout Quests','Plan your week and log each exercise at a comfortable pace.',btn('Generate a workout','generator',{icon:'plus',cls:'btn primary'}))+
   '<section class="panel week-plan">'+panelTitle('Weekly plan','<div class="inline">'+btn('Previous','prev-week',{cls:'text-btn'})+'<span class="muted">'+E.dateLabel(start)+' – '+E.dateLabel(E.addDays(start,6))+'</span>'+btn('Next','next-week',{cls:'text-btn'})+'</div>')+'<div class="week-cards">'+days.map(day=>{const p=E.planOf(state,day);return '<button class="week-card '+(day===picked?'chosen':'')+'" data-action="day" data-value="'+day+'" aria-pressed="'+(day===picked)+'"><span>'+html(E.dateLabel(day,{weekday:'short',day:'numeric'}))+'</span><strong>'+icon(p.focus==='Recovery'?'moon':'dumbbell',15)+' '+p.focus+'</strong><small>'+(snap.completed.includes(day)?'Completed':p.focus==='Recovery'?'Rest or light movement':p.time+' min budget')+'</small></button>';}).join('')+'</div></section>'+
   '<div class="dash-grid subgrid"><section class="panel">'+panelTitle(html(dayLong(picked)),btn('Adjust plan','generator',{cls:'text-btn'}))+'<div class="section-meta">'+html(plan.focus)+' · '+plan.time+' min budget</div><div class="quest-list">'+plan.items.map(i=>questRow(plan,i)).join('')+'</div><div class="quest-footer">'+btn('Workout notes','note',{value:picked,icon:'note',cls:'text-btn'})+btn(state.favorites.some(f=>sameFavorite(plan,f))?'Remove favorite':'Save favorite','favorite',{icon:'star',cls:'text-btn',value:picked})+'</div></section>'+
   '<section class="panel timer-panel">'+panelTitle('Session timers')+'<div class="timer"><span>Workout</span><strong id="workout-clock">00:00</strong><div class="inline">'+btn(workout.start?'Pause':workout.paused?'Resume':'Start','workout-clock',{icon:workout.start?'pause':'play',cls:'btn small'})+btn('Log time','workout-save',{cls:'btn small',disabled:!workout.start&&!workout.paused})+'</div></div><div class="timer"><label for="rest-length">Rest between sets</label><select id="rest-length"><option value="30" '+(restSeconds===30?'selected':'')+'>30 sec</option><option value="60" '+(restSeconds===60?'selected':'')+'>60 sec</option><option value="120" '+(restSeconds===120?'selected':'')+'>2 min</option></select><strong id="rest-clock">'+duration(restSeconds)+'</strong>'+btn(restEnd?'Reset':'Start rest','rest-clock',{icon:'clock',cls:'btn small'})+'</div></section></div>'+
   '<section class="panel subgrid">'+panelTitle('Favorite workouts')+(state.favorites.length?'<div class="chips">'+state.favorites.map(f=>btn(f.focus+' · '+f.time+' min','load-favorite',{value:f.focus+'/'+f.time})).join('')+'</div>':empty('Save a workout from the weekly plan to reuse it.'))+'</section>'+
   '<section class="panel subgrid">'+panelTitle('Exercise library')+'<label class="search">'+icon('search',18)+'<input id="exercise-search" type="search" placeholder="Search exercises" value="'+html(search)+'" aria-label="Search exercises"></label><div id="library" class="library">'+library()+'</div></section>';
}
function library(){
  const found=E.exercises.filter(e=>e.id!=='rest'&&(e.name+' '+e.group+' '+e.skill+' '+e.muscles).toLowerCase().includes(search.toLowerCase().trim()));
  return found.length?found.map(e=>'<button class="library-item" data-action="exercise" data-value="library/'+e.id+'">'+tile(emojis[e.skill],colors[e.skill])+'<span><b>'+e.name+'</b><small>'+e.group+' · '+e.skill+'</small></span>'+icon('chevron',15)+'</button>').join(''):empty('No exercises match this search.');
}
function chart(snap){
  const count=windowSize===7?7:windowSize===30?6:12;
  let starts=[];
  if(windowSize===365){
    const d=E.dateOf(today); d.setDate(1);
    for(let i=11;i>=0;i--){const dd=new Date(d);dd.setMonth(d.getMonth()-i);starts.push(E.localDay(dd));}
  }else for(let i=count-1;i>=0;i--)starts.push(E.addDays(today,-(windowSize===7?i:i*5+4)));
  const values=starts.map((start,i)=>{
    const end=starts[i+1]||E.addDays(today,1);
    if(chartType==='sessions')return snap.completed.filter(day=>day>=start&&day<end).length;
    if(chartType==='time')return Math.round(Object.entries(state.sessions).reduce((n,[d,s])=>n+(d>=start&&d<end?s.seconds||0:0),0)/60);
    return Object.values(snap.targets).reduce((n,row)=>n+(row.day>=start&&row.day<end?row.xp:0),0);
  });
  const max=Math.max(4,...values);
  const sum=values.reduce((a,b)=>a+b,0);
  return '<div class="chart-summary"><strong>'+fmt(sum)+'</strong><span>'+({xp:'XP earned',sessions:'workouts completed',time:'minutes logged'}[chartType])+'</span></div><div class="bars" aria-label="Progress data">'+values.map((v,i)=>{const label=E.dateLabel(starts[i],windowSize===7?{weekday:'short'}:windowSize===365?{month:'short'}:{month:'short',day:'numeric'});return '<div class="bar-col"><span class="bar" role="img" title="'+label+': '+v+'" aria-label="'+label+': '+v+'" style="--bar:'+Math.max(2,100*v/max)+'%"></span><small>'+label+'</small></div>';}).join('')+'</div>';
}
function calendar(snap){
  const first=historyMonth+'-01', d=E.dateOf(first), days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  return '<div class="calendar-grid">'+['M','T','W','T','F','S','S'].map(x=>'<span class="cal-label">'+x+'</span>').join('')+'<i></i>'.repeat((d.getDay()+6)%7)+Array.from({length:days},(_,i)=>{const day=E.addDays(first,i);return '<button data-action="history-day" data-value="'+day+'" class="'+(snap.completed.includes(day)?'logged':snap.activity[day]?'active':'')+'" aria-label="'+html(dayLong(day))+(snap.activity[day]?', logged activity':'')+'">'+(i+1)+'</button>';}).join('')+'</div>';
}
function progress(snap){
  return h('Progress','Review your sessions, personal records, and XP over time.',btn('XP history','xp',{icon:'list'}))+
    '<section class="panel">'+panelTitle('Training activity','<div class="segments">'+[[7,'Week'],[30,'Month'],[365,'Year']].map(([n,v])=>'<button type="button" data-action="range" data-value="'+n+'" aria-pressed="'+(windowSize===n)+'">'+v+'</button>').join('')+'</div>')+'<div class="filter-row">'+field('chart-type','Measure',select('chart-type',[['xp','XP'],['sessions','Workouts'],['time','Duration']],chartType))+'</div>'+chart(snap)+'</section>'+
    '<div class="dash-grid subgrid"><section class="panel">'+panelTitle('Workout history','<div class="inline">'+btn('Prev','prev-month',{cls:'text-btn'})+'<span class="muted">'+html(E.dateLabel(historyMonth+'-01',{month:'long',year:'numeric'}))+'</span>'+btn('Next','next-month',{cls:'text-btn'})+'</div>')+calendar(snap)+'</section>'+
    '<section class="panel">'+panelTitle('Personal records')+(snap.best.length?snap.best.map(record=>{const logs=Object.values(state.logs).filter(l=>l.id===record.id&&E.recordable(l)).sort((a,b)=>a.day.localeCompare(b.day));const value=l=>l.reps*l.sets||l.seconds;return '<div class="detail-line record">'+tile('trophy','orange')+'<div><strong>'+E.catalog[record.id].name+'</strong><small>First '+value(logs[0])+' · Latest '+value(logs.at(-1))+' · Best '+record.value+' '+E.catalog[record.id].unit+'</small></div></div>';}).join(''):empty('Log a session to see how your performance changes.'))+'</section></div>';
}
function character(snap){
  const choices=['Rift',...(snap.rank.level>=2?['Nova']:[]),...(snap.rank.level>=4?['Ember']:[])];
  const titles=['Novice Adventurer',...(snap.badgeDates.first?['Quest Runner']:[]),...(snap.badgeDates.recover?['Recovery Guardian']:[]),...(snap.rank.level>=10?['Veteran Adventurer']:[])];
  return h('Character','Customize your adventurer and see which skills you’ve practiced.',btn('Edit profile','profile',{icon:'user'}))+
    '<div class="dash-grid"><section class="panel persona">'+profileIcon(snap)+'<h2>'+html(state.profile.name)+'</h2><p>Level '+snap.rank.level+' · '+html(state.profile.title)+'</p><form data-form="persona" class="form"><div class="form-grid">'+field('avatar','Avatar',select('avatar',choices,state.profile.avatar))+field('title','Title',select('title',titles,state.profile.title))+'</div><p class="muted">Unlock Nova at level 2 and Ember at level 4. Titles unlock through achievements and levels.</p><button class="btn primary">Save appearance</button></form></section>'+
    '<section class="panel">'+panelTitle('Activity skills')+'<p class="muted">These scores show logged practice, with partial credit for shorter efforts.</p><div class="skill-list">'+E.skills.map(s=>'<div class="skill"><div>'+tile(emojis[s],colors[s])+'<b>'+s+'</b><span>'+snap.scores[s]+' pts</span></div><span class="skill-meter '+colors[s]+'"><i style="width:'+Math.min(100,snap.scores[s]*5)+'%"></i></span></div>').join('')+'</div></section></div>';
}
function achievements(snap){
  const amount=Object.keys(snap.badgeDates).length;
  return h('Achievements',amount+' of '+E.badgeList.length+' badges unlocked.')+
   '<div class="badge-grid">'+E.badgeList.map(([id,name,description,reward,ico])=>{const day=snap.badgeDates[id];return '<article class="panel badge '+(day?'unlocked':'')+'">'+tile(day?ico:'lock',day?'orange':'neutral')+'<div><h2>'+name+'</h2><p>'+description+'</p><small>'+html(day?'Unlocked '+E.dateLabel(day,{month:'short',day:'numeric',year:'numeric'}):'Locked')+'</small></div>'+xpPill('+'+reward)+'</article>';}).join('')+'</div>';
}
function coach(){
  return h('Fitness Coach','Get beginner-friendly guidance based on your plan and recent activity.')+
    '<section class="panel coach">'+panelTitle('Coach chat','<span class="tag">Offline guide</span>')+'<div class="messages" aria-live="polite">'+messages.map(m=>'<div class="message '+m.type+'">'+(m.type==='coach'?tile('spark','violet'):'')+'<p>'+html(m.text)+'</p></div>').join('')+(coachWaiting?'<p class="muted">Waiting for the online coach…</p>':'')+'</div><div class="chips">'+[10,20,30].map(n=>btn(n+'-minute workout','coach-preset',{value:'Plan a '+n+' minute workout'})).join('')+btn('Warm-up','coach-preset',{value:'How do I warm up?'})+btn('Recovery','coach-preset',{value:'Should I take a rest day?'})+'</div>'+(coachPlan?btn('Review suggested workout','coach-apply',{icon:'calendar',cls:'btn'}):'')+'<form class="chat-form" data-form="coach"><input required maxlength="400" name="question" aria-label="Ask the fitness coach" placeholder="Ask about form, variations, or planning"><button class="btn primary" aria-label="Send to offline guide">'+icon('send',18)+'</button>'+(onlineCoach&&navigator.onLine?'<div class="online-coach"><button class="btn" name="mode" value="online" type="submit" '+(coachWaiting?'disabled':'')+'>Ask online coach</button><small class="muted">Sends this question to OpenAI. Leave out personal details.</small></div>':'')+'</form></section>';
}
const healthQuestion=q=>/\b(pain\w*|hurt\w*|sharp|injur\w*|dizz\w*|faint\w*|chest pain)\b/i.test(q);
function respond(question){
  const q=question.toLowerCase(), snap=E.snapshot(state);
  coachPlan=null;
  if(healthQuestion(q))return 'Stop the exercise if it causes pain or dizziness. Choose rest and seek guidance from a qualified healthcare professional or a trusted adult if appropriate. If symptoms are severe or you feel unsafe, seek urgent help.';
  const exercise=E.exercises.filter(e=>e.id!=='rest').find(e=>q.includes(e.name.toLowerCase())||q.includes(({bug:'dead bug',push:'push-up',squat:'squat',reach:'reach',stretch:'stretch',march:'march',bridge:'bridge',bird:'bird dog',row:'row',hinge:'hinge'})[e.id]));
  if(exercise){
    if(/muscle|train|work/.test(q))return exercise.name+' mainly uses '+exercise.muscles.toLowerCase()+'. '+exercise.how;
    if(/easy|easier|beginner|modify/.test(q))return exercise.easy;
    if(/hard|difficult|progress/.test(q))return exercise.hard+' Try it when the current version feels comfortable and controlled.';
    return exercise.how+' '+exercise.easy;
  }
  if(/warm.?up|cool.?down/.test(q))return 'Begin with a few minutes of easy movement, such as comfortable marching or seated arm movements. Start each exercise with a smaller range. To cool down, slow your pace, breathe normally, and use gentle movements you enjoy.';
  if(/rest|recover|tired|sore|fatigu|exam/.test(q)){
    if(/workout|plan|minutes/.test(q))coachPlan={focus:'Recovery',time:10};
    return 'A recovery day is a valid quest. Pick rest or a brief, easy walk or seated mobility break. If your week is busy or you feel tired, try a shorter session later and keep your next scheduled recovery day.';
  }
  if(/10|20|30|plan|workout|routine|beginner/.test(q)){
    const time=Number(q.match(/\b(10|20|30)\b/)?.[1]||state.profile.time), focus=E.focuses.find(f=>q.includes(f.toLowerCase()))||state.profile.focus;
    coachPlan={focus,time};
    const p=E.makePlan(today,state.profile,focus,time), names=p.items.map(i=>E.catalog[i.id].name).join(', ');
    const weekly=(snap.weeks[E.weekOf(today)]||[]).length;
    return 'For your '+time+'-minute budget, start with an easy warm-up. Try '+names+'. Take comfortable breaks and end with a few easy movements. You’ve finished '+weekly+' workout'+(weekly===1?'':'s')+' this week. '+(weekly>=state.profile.goal?'Your weekly goal is met. Keep your planned recovery.':'One comfortable set is a good start if you’re short on time.');
  }
  return 'I can explain exercises from the library, suggest 10-, 20-, or 30-minute plans, and help you adjust your session. Try asking “How do I make wall push-ups easier?” or “Plan 10 minutes of core training.”';
}
function settings(){
  const s=state.settings;
  return h('Settings','Manage your profile, accessibility preferences, and local data.')+
    '<div class="settings-grid"><section class="panel">'+panelTitle('Profile and accessibility')+'<p class="muted">Your profile informs weekly planning and exercise options.</p>'+btn('Customize profile','profile',{icon:'user',cls:'btn'})+'<form class="form" data-form="settings">'+field('theme','Theme',select('theme',[['dark','Dark'],['light','Light']],s.theme))+toggle('motion','Enable animations',s.motion)+toggle('sound','Enable sound effects',s.sound)+'<button class="btn primary">Save preferences</button></form></section>'+
    '<section class="panel">'+panelTitle('Notifications')+'<p class="muted">Reminders appear while RepQuest is open. Calendar exports can carry a reminder you explicitly select.</p><form class="form" data-form="alerts">'+toggle('achievements','Achievement alerts',s.achievements)+toggle('workout','Planned workout reminders',s.workout)+toggle('recovery','Recovery reminders',s.recovery)+toggle('weekly','Weekly recap',s.weekly)+field('reminder','Reminder time','<input id="reminder" name="reminder" type="time" required value="'+html(s.reminder)+'">')+'<button class="btn primary">Save notifications</button></form></section>'+
    '<section class="panel">'+panelTitle('Local data and privacy')+'<p class="muted">This browser profile stores your workouts and settings. Export a JSON backup to move your data or merge logs on another device.</p><div class="chips">'+btn('Download backup','export',{icon:'download'})+btn('Import backup','import')+btn('Delete local data','delete',{cls:'btn danger'})+'</div><input type="file" hidden id="backup" accept=".json,application/json"></section>'+
    '<section class="panel">'+panelTitle('Install RepQuest')+'<p class="muted">Once the app has loaded online, it can open and log workouts offline. Use your browser’s install or Add to Home Screen command.</p>'+(install?btn('Install app','install',{icon:'download'}):'')+'</section></div>';
}
function toggle(name,label,checked){return '<label class="toggle"><input type="checkbox" name="'+name+'" '+(checked?'checked':'')+'><span>'+label+'</span></label>';}
function integrations(){
  return h('Integrations','Move your data or open Google apps when you choose.')+
    '<div class="settings-grid">'+service('calendar','Google Calendar','Disconnected','Export recurring custom quests with their selected reminders, then import the calendar file into Google Calendar. Workout scheduling is available separately.',btn('Export quest schedule','life-calendar',{icon:'calendar'})+btn('Schedule workouts','schedule')+btn('Open Google Calendar import','life-google'))+
    service('chart','Google Drive / Sheets','Disconnected','Download a CSV of workouts and quests, or save a full JSON backup to Drive. Import your backup from Settings.',btn('Download CSV','csv',{icon:'download'})+btn('Download backup','export'))+
    service('send','Gmail','Disconnected','Review and send a weekly progress recap or achievement summary in Gmail.',btn('Draft a recap','email',{icon:'note'}))+
    service('heart','Health & wearables','Unsupported','This build supports RepQuest JSON backups. A live wearable data source is unavailable.')+'</div>';
}
function service(ico,name,status,copy,actions=''){
  return '<section class="panel service"><div class="panel-head">'+tile(ico)+'<span class="tag">'+status+'</span></div><h2>'+name+'</h2><p class="muted">'+copy+'</p>'+(actions?'<div class="chips">'+actions+'</div>':'')+'</section>';
}
function show(type,title,content){
  if(!dialog.open)lastTrigger=document.activeElement;
  dialogType=type;
  dialog.className=type==='exercise'?'wide':'';
  dialog.innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2>'+btn('','close',{icon:'x',cls:'icon-btn',aria:'Close dialog'})+'</div>'+content+'<p id="dialog-status" class="notice" hidden></p>';
  if(!dialog.open)dialog.showModal();
}
function closeDialog(){if(dialog.open)dialog.close();}
dialog.addEventListener('close',()=>{
  dialogType='';
  if(lastTrigger?.isConnected)lastTrigger.focus();
});
const submit=(label='Save')=>'<button class="btn primary" type="submit">'+label+'</button>';
const row=(label,value)=>'<div class="table-row"><b>'+label+'</b><span>'+value+'</span></div>';
function profile(){
  const p=state.profile;
  show('profile',p.ready?'Customize your plan':'Set up your adventurer','<p class="muted">Choose a starting schedule. You can update these preferences any time.</p><form class="form" data-form="profile"><div class="form-grid">'+
    field('name','Adventurer name','<input id="name" name="name" required maxlength="30" value="'+html(p.name)+'">')+
    field('experience','Experience',select('experience',[['New','Just starting'],['Beginner','Beginner'],['Regular','Training regularly']],p.experience))+
    field('equipment','Equipment',select('equipment',['None','Resistance band','Light dumbbells'],p.equipment))+
    field('time','Time available',select('time',[[10,'10 minutes'],[20,'20 minutes'],[30,'30 minutes']],p.time))+
    field('focus','Preferred activity',select('focus',E.focuses,p.focus))+
    field('access','Accessibility preference',select('access',['Standard','Seated options','Reduced motion'],p.access))+
    field('goal','Workouts per week',select('goal',[2,3,4],p.goal))+'</div>'+submit('Save training preferences')+'</form>');
}
function generator(focus,time){
  const plan=E.planOf(state,picked);
  show('generator','Plan a workout','<p class="muted">'+html(dayLong(picked))+' · Allow time for a warm-up, comfortable breaks, and a cool-down.</p><form class="form" data-form="generator"><div class="form-grid">'+
  field('plan-focus','Training focus',select('plan-focus',E.focuses,focus||plan.focus))+
  field('plan-time','Time budget',select('plan-time',[[10,'10 minutes'],[20,'20 minutes'],[30,'30 minutes']],time||plan.time))+'</div><div id="plan-preview"></div>'+submit('Save day plan')+'</form>');
  previewPlan();
}
function previewPlan(){
  const el=$('#plan-preview');if(!el)return;
  const p=E.makePlan(picked,state.profile,$('#plan-focus').value,Number($('#plan-time').value));
  el.innerHTML='<ul class="preview-list">'+p.items.map(i=>'<li>'+E.catalog[i.id].name+'</li>').join('')+'</ul>';
}
function exerciseDialog(day,id){
  const e=E.catalog[id];if(!e)return;
  const fromLibrary=day==='library', plan=fromLibrary?null:E.planOf(state,day), item=plan?.items.find(i=>i.id===id);
  const l=state.logs[E.logKey(day,id)], logged=Object.values(state.logs).filter(n=>n.id===id&&n.status).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,6);
  const loggable=item&&day<=today, editable=item&&!E.outcome(state,day,id);
  const variations=['Easy','Standard','Challenge'];
  const substitutes=E.exercises.filter(other=>other.id!==e.id&&other.id!=='rest'&&other.id!=='row'&&other.id!=='hinge'&&(state.profile.access==='Seated options'?['march','reach','stretch'].includes(other.id):(other.group===e.group||other.skill===e.skill))&&!plan?.items.some(i=>i.id===other.id));
  const variant=label=>'<div><b>'+label+'</b><p>'+html(e[label==='Easier'?'easy':'hard'])+'</p></div>';
  const fields=loggable?'<form class="form" data-form="exercise" data-value="'+day+'/'+id+'"><div class="form-grid">'+(e.id==='rest'?'<label class="field"><span>Optional time (seconds)</span><input name="seconds" required type="number" min="0" max="3600" value="'+(l?.seconds??0)+'"></label>':e.unit==='sec'?'<label class="field"><span>Seconds</span><input name="seconds" required type="number" min="1" max="3600" value="'+(l?.seconds??e.target)+'"></label>':'<label class="field"><span>Sets</span><input name="sets" required type="number" min="1" max="20" value="'+(l?.sets??E.setsFor(state.profile,e))+'"></label><label class="field"><span>Reps per set</span><input name="reps" required type="number" min="1" max="200" value="'+(l?.reps??e.target)+'"></label>')+'</div><div class="chips"><button class="btn primary" name="status" value="2">'+(l?.status===2?'Update completion':'Complete')+'</button>'+(id==='rest'?'':'<button class="btn" name="status" value="1">Log partial</button>')+(l?.status?btn('Undo completion','undo',{value:day+'/'+id}):'')+'</div></form>':'';
  const adjusts=item&&id!=='rest'?'<form class="form changes" data-form="variant" data-value="'+day+'/'+id+'"><div class="form-grid">'+field('difficulty','Difficulty',select('difficulty',variations,item.level))+(editable&&substitutes.length?field('substitute','Substitute exercise',select('substitute',[[id,e.name],...substitutes.map(s=>[s.id,s.name])],id)):'')+'</div>'+submit('Save exercise options')+'</form>':'';
  show('exercise',e.name,'<div class="exercise-demo"><canvas id="demo-canvas" width="200" height="158" role="img" aria-label="Movement illustration for '+e.name+'"></canvas><div><span class="tag">'+e.group+' · '+e.skill+'</span><p>'+e.how+'</p><small>'+e.muscles+'</small>'+ (item&&item.level!=='Standard'?'<p><b>'+item.level+' variation</b> · '+(item.level==='Easy'?e.easy:e.hard)+'</p>':'')+'</div></div><div class="variations">'+variant('Easier')+variant('Challenge')+'</div>'+fields+adjusts+(fromLibrary?btn('Ask coach about this exercise','ask-exercise',{value:id,icon:'spark'}):'')+'<details><summary>Completion history</summary>'+(logged.length?logged.map(n=>row(E.dateLabel(n.day),n.status===1?'Partial':e.unit==='reps'?n.sets+' × '+n.reps:n.seconds+' sec')).join(''):empty('No logged completions yet.'))+'</details>');
  const draw=demo($('#demo-canvas'),e.pose);
  if(state.settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const canvas=$('#demo-canvas'), began=performance.now();
    const tick=now=>{if(canvas.isConnected&&dialog.open){draw((1-Math.cos((now-began)/470))/2);requestAnimationFrame(tick);}};
    requestAnimationFrame(tick);
  }
}
function xpHistory(){
  const snap=E.snapshot(state), entries=Object.values(state.ledger).sort((a,b)=>b.at-a.at).slice(0,100);
  show('xp','XP history','<p class="muted">'+fmt(snap.xp)+' total XP · Level '+snap.rank.level+'. Level 1 requires 100 XP to advance. The cost rises by 25 XP each level.</p>'+(entries.length?entries.map(t=>row(html(t.label+' · '+E.dateLabel(t.day)),(t.delta>0?'+':'−')+Math.abs(t.delta)+' XP')).join(''):empty('Your XP transactions will appear here.')));
}
function historyDay(day){
  const plan=E.planOf(state,day), session=state.sessions[day];
  const logs=Object.values(state.logs).filter(l=>l.day===day&&l.status);
  show('history',html(dayLong(day)),(logs.length?logs.map(l=>row(E.catalog[l.id].name,l.status===1?'Partial':E.catalog[l.id].unit==='reps'?l.sets+' × '+l.reps:l.seconds+' sec')).join(''):empty('No exercises logged on this date.'))+(session?.seconds?row('Session duration',duration(session.seconds)):'')+(state.notes[day]?.text?'<p class="note">'+html(state.notes[day].text)+'</p>':'')+btn('Open day plan','day',{value:plan.day,cls:'btn'}));
}
function note(day){
  show('note','Workout notes','<p class="muted">Record how the session felt or what you want to try next time. A saved note earns 5 XP.</p><form class="form" data-form="note" data-value="'+day+'">'+field('note','Notes','<textarea id="note" name="note" maxlength="2000" rows="5" placeholder="How did it go?">'+html(state.notes[day]?.text||'')+'</textarea>')+submit()+'</form>');
}
function download(name,text,type){
  const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportData(){download('repquest-'+today+'.json',JSON.stringify(state,null,2),'application/json');say('Backup downloaded');}
function exportCSV(){
  const headers=['Date','Type','Name','Status','Sets','Reps per set','Exercise seconds','Session seconds','XP','Category'];
  const data=[...Object.values(state.logs).filter(l=>l.status).map(l=>[l.day,'Exercise',E.catalog[l.id].name,l.status===2?'Complete':'Partial',l.sets,l.reps,l.seconds,'','','']),...Object.entries(state.sessions).map(([day,s])=>[day,'Session',state.days[day]?.focus||'','', '', '', '',s.seconds||0,'','']),...L.completed(state.life).map(r=>[r.day,'Custom quest',r.name,'Complete','','','','',r.xp,state.life.categories[r.category]?.name||'Other']),...Object.values(state.ledger).map(t=>[t.day,'XP',t.label,'','','','', '',t.delta,''])];
  const csvCell=value=>{const content=typeof value==='string'&&/^[\s]*[=+\-@\t\r]/.test(value)?"'"+value:String(value);return '"'+content.replaceAll('"','""')+'"';};
  const csv=[headers,...data].map(values=>values.map(csvCell).join(',')).join('\r\n');
  download('repquest-history-'+today+'.csv',csv,'text/csv;charset=utf-8');
  say('Quest and workout history downloaded');
}
function schedule(){
  show('schedule','Schedule workouts','<p class="muted">Preview a planned session in Google Calendar or download workout and recovery events for the next seven days. Compare with your class and exam schedule before saving.</p><form class="form" data-form="schedule"><div class="form-grid">'+field('event-day','First event date','<input id="event-day" name="day" type="date" required min="'+today+'" value="'+today+'">')+field('event-time','Start time','<input id="event-time" name="time" type="time" required value="'+html(state.settings.reminder)+'">')+'</div>'+toggle('calendar-reminder','Add a 15-minute reminder to the downloaded file',false)+'<div class="chips"><button class="btn primary" name="method" value="ics">Download week</button><button class="btn" name="method" value="google">Review in Google Calendar</button></div></form>');
}
function calendarExport(f,method){
  const first=String(f.get('day')), time=String(f.get('time')), plans=Array.from({length:7},(_,i)=>E.planOf(state,E.addDays(first,i)));
  const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const entry=p=>{
    const start=new Date(p.day+'T'+time), finish=new Date(+start+p.time*60000);
    return {start:stamp(start),end:stamp(finish),title:'RepQuest – '+p.focus};
  };
  if(method==='google'){
    const e=entry(plans[0]), url=new URL('https://calendar.google.com/calendar/render');
    for(const [key,value] of Object.entries({action:'TEMPLATE',text:e.title,dates:e.start+'/'+e.end,details:'Review your schedule before saving.'}))url.searchParams.set(key,value);
    window.open(url.href,'_blank','noopener,noreferrer');say('Opened a calendar event template');return;
  }
  const lines=plans.flatMap(p=>{const e=entry(p);return ['BEGIN:VEVENT','UID:repquest-'+p.day+'@local.repquest','DTSTAMP:'+stamp(new Date()),'DTSTART:'+e.start,'DTEND:'+e.end,'SUMMARY:'+e.title,...(f.get('calendar-reminder')?['BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:RepQuest session','END:VALARM']:[]),'END:VEVENT'];});
  download('repquest-week-'+first+'.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RepQuest//Training Plan//EN',...lines,'END:VCALENDAR',''].join('\r\n'),'text/calendar');
  say('Calendar file downloaded');
}
function email(){
  const snap=E.snapshot(state), week=E.weekOf(today), workouts=(snap.weeks[week]||[]).length;
  const badges=E.badgeList.filter(b=>snap.badgeDates[b[0]]).map(b=>b[1]);
  const custom=lifeUI.countsWeek();
  const recap='RepQuest weekly recap\n\nWorkouts this week: '+workouts+'\nCustom quests completed: '+custom.length+'\nCustom quest XP: '+custom.reduce((sum,item)=>sum+item.xp,0)+'\nCharacter level: '+snap.rank.level+'\nTotal XP: '+snap.xp;
  const achievement='RepQuest achievement recap\n\n'+(badges.length?badges.map(b=>'• '+b).join('\n'):'No achievements unlocked yet.');
  show('email','Draft a recap','<p class="muted">Review the text before opening a Gmail draft. Choose the recipient and send it yourself.</p><form class="form" data-form="email">'+field('recap-type','Recap type',select('recap-type',[['weekly','Weekly progress'],['badges','Achievements']],'weekly'))+field('email-body','Message','<textarea required maxlength="4000" id="email-body" name="body" rows="6" data-week="'+html(recap)+'" data-badges="'+html(achievement)+'">'+html(recap)+'</textarea>')+submit('Open Gmail draft')+'</form>');
}
function notifications(){
  const plan=E.planOf(state,today), lines=[];
  if(state.settings.workout&&plan.focus!=='Recovery')lines.push('Workout reminder · '+state.settings.reminder);
  if(state.settings.recovery&&plan.focus==='Recovery')lines.push('Recovery reminder · '+state.settings.reminder);
  if(state.settings.weekly){const snap=E.snapshot(state);lines.push('This week · '+(snap.weeks[E.weekOf(today)]||[]).length+' workouts completed');}
  show('notifications','Notifications',(lines.length?lines.map(line=>'<p class="notice">'+icon('bell',16)+' '+html(line)+'</p>').join(''):empty('Enable workout reminders, recovery reminders, or a weekly recap from Settings.'))+btn('Notification settings','go',{value:'settings'}));
}
const secondsWorked=()=>Math.min(86400,workout.paused+(workout.start?Math.floor((Date.now()-workout.start)/1000):0));
function updateTimers(){
  const work=$('#workout-clock'),rest=$('#rest-clock');
  if(work)work.textContent=duration(secondsWorked());
  if(rest)rest.textContent=duration(restEnd?Math.max(0,Math.ceil((restEnd-Date.now())/1000)):restSeconds);
  if(restEnd&&Date.now()>=restEnd){
    restEnd=0;if(rest)rest.textContent='00:00';
    const button=$('[data-action="rest-clock"] span');if(button)button.textContent='Start rest';
    say('Rest timer finished');sound();
  }
}
function addCoach(question){
  if(!question.trim())return;
  messages.push({type:'you',text:question.trim()},{type:'coach',text:respond(question.trim())});
  messages=messages.slice(-30);
  if(route!=='coach'){navigate('coach');return;}
  render();$('.messages')?.scrollTo({top:$('.messages').scrollHeight});$('.chat-form input').focus();
}
async function findOnlineCoach(){
  try{
    const result=await fetch('./api/coach/status',{cache:'no-store',signal:AbortSignal.timeout(3500)});
    onlineCoach=result.ok&&(await result.json()).available===true;
    if(onlineCoach&&route==='coach'&&!$('.chat-form input')?.value)render();
  }catch{onlineCoach=false;}
}
async function askOnline(question){
  question=question.trim();
  if(!question||coachWaiting)return;
  if(!onlineCoach||!navigator.onLine||healthQuestion(question)){addCoach(question);return;}
  coachPlan=null;coachWaiting=true;
  messages.push({type:'you',text:question});render();$('.messages')?.scrollTo({top:$('.messages').scrollHeight});
  try{
    const result=await fetch('./api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:AbortSignal.timeout(16500)});
    const response=await result.json();
    if(!result.ok||typeof response.answer!=='string'||!response.answer.trim())throw Error();
    messages.push({type:'coach',text:'Online coach · '+response.answer});
  }catch{messages.push({type:'coach',text:'Online coaching is unavailable. Offline guide: '+respond(question)});}
  finally{
    coachWaiting=false;messages=messages.slice(-30);
    if(route==='coach'){render();$('.messages')?.scrollTo({top:$('.messages').scrollHeight});$('.chat-form input').focus();}
  }
}
function check(day,id,force){
  if(day>today){say('Log this quest on or after its scheduled day.');return;}
  const current=E.outcome(state,day,id), next=force??(current===2?0:2);
  const e=E.catalog[id], logged=state.logs[E.logKey(day,id)];
  const counts=next===2&&current!==2&&(current===0||current===1)?{sets:E.setsFor(state.profile,e),reps:e.unit==='reps'?e.target:0,seconds:e.unit==='sec'&&id!=='rest'?e.target:0}:{};
  if(logged&&current===0&&logged.reps>0)counts.reps=logged.reps;
  change(()=>E.setExercise(state,day,id,next,counts),next?'Quest completed':'Completion undone');
}
const actions={
  ...lifeUI.actions,
  go:v=>navigate(v), menu:()=>{mobile=!mobile;render();(mobile?$('.sidebar [aria-current="page"]'):$('.mobile-menu'))?.focus();}, profile, generator:()=>generator(), xp:xpHistory, notifications,
  close:closeDialog, schedule, email, export:exportData, csv:exportCSV, import:()=>$('#backup').click(),
  delete:()=>show('delete','Delete local data?','<p class="muted">This permanently removes your quests, workouts, XP, preferences, and profile from this browser. Download a backup before deleting.</p><div class="chips">'+btn('Download backup','export')+btn('Permanently delete','confirm-delete',{cls:'btn danger'})+'</div>'),
  'confirm-delete':()=>{try{localStorage.removeItem(KEY);state=E.defaults();picked=today;closeDialog();navigate('dashboard');say('Local data deleted');}catch{say('Local data could not be deleted.');}},
  install:async()=>{if(!install)return;try{await install.prompt();await install.userChoice;}catch{}install=null;render();},
  day:v=>{picked=v;if(route==='quests'){closeDialog();render();}else navigate('quests');},
  'history-day':historyDay,'prev-week':()=>{picked=E.addDays(picked,-7);render();},'next-week':()=>{picked=E.addDays(picked,7);render();},
  'prev-month':()=>month(-1),'next-month':()=>month(1),range:v=>{windowSize=Number(v);render();},
  exercise:v=>exerciseDialog(...v.split('/')),check:v=>check(...v.split('/')),
  undo:v=>{closeDialog();check(...v.split('/'),0);},note:v=>v>today?say('Notes open on the scheduled day.'):note(v),
  favorite:v=>{
    const p=E.planOf(state,v);
    change(()=>{const index=state.favorites.findIndex(f=>sameFavorite(p,f));if(index<0)state.favorites.push({focus:p.focus,time:p.time===5?10:p.time});else state.favorites.splice(index,1);},'Favorites updated');
  },
  'load-favorite':v=>{const [focus,time]=v.split('/');generator(focus,Number(time));},
  'coach-preset':addCoach,'ask-exercise':v=>{closeDialog();addCoach('How do I do the '+E.catalog[v].name+'?');},
  'coach-apply':()=>{const plan=coachPlan;picked=today;navigate('quests');setTimeout(()=>generator(plan.focus,plan.time),50);},
  'workout-clock':()=>{if(workout.start){workout.paused=secondsWorked();workout.start=0;}else{if(!workout.paused)workout.day=picked;workout.start=Date.now();}render();},
  'workout-save':()=>{
    if(workout.day>today){say('Select today or a past date to log session time.');return;}
    const elapsed=secondsWorked();if(!elapsed){say('Start the timer before logging session time.');return;}
    change(()=>{const day=workout.day, old=state.sessions[day];state.sessions[day]={...old,seconds:Math.min(86400,(old?.seconds||0)+elapsed),updated:Date.now()};workout={start:0,paused:0,day:picked};},'Session duration saved to '+E.dateLabel(workout.day));
  },
  'rest-clock':()=>{restEnd=restEnd?0:Date.now()+restSeconds*1000;render();}
};
function month(offset){const d=E.dateOf(historyMonth+'-01');d.setMonth(d.getMonth()+offset);historyMonth=E.localDay(d).slice(0,7);render();}
document.addEventListener('click',event=>{
  if(event.target.closest('.skip')){event.preventDefault();body()?.focus();return;}
  const trigger=event.target.closest('[data-action]');if(!trigger)return;
  actions[trigger.dataset.action]?.(trigger.dataset.value);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobile&&!dialog.open)actions.menu();
});
function savePlan(focus,time){
  const old=E.planOf(state,picked);
  if(old.items.some(i=>E.outcome(state,picked,i.id))){say('This plan has logged quests. Undo their completions before replacing it.');return;}
  const otherDays=Object.values(state.days).filter(p=>p.day!==picked&&E.weekOf(p.day)===E.weekOf(picked)&&p.focus!=='Recovery');
  if(focus!=='Recovery'&&otherDays.length>=state.profile.goal){say('This week already has your planned workout target. Choose recovery or change an existing plan.');return;}
  closeDialog();change(()=>{state.days[picked]=E.makePlan(picked,state.profile,focus,time);},'Workout plan saved');
}
document.addEventListener('submit',event=>{
  const form=event.target, type=form.dataset.form;if(!type)return;
  event.preventDefault();const f=new FormData(form), val=name=>f.get(name), checked=name=>f.has(name), stamp=Date.now();
  if(lifeUI.onForm(type,form,f))return;
  if(type==='profile'){
    closeDialog();change(()=>{
      Object.assign(state.profile,{name:String(val('name')).trim()||'Adventurer',experience:val('experience'),equipment:val('equipment'),time:Number(val('time')),focus:val('focus'),access:val('access'),goal:Number(val('goal')),ready:true});
      if(val('access')==='Reduced motion')state.settings.motion=false;
    },'Training preferences saved');
  }
  if(type==='settings')change(()=>Object.assign(state.settings,{theme:val('theme'),motion:checked('motion'),sound:checked('sound')}),'Preferences saved');
  if(type==='alerts')change(()=>{Object.assign(state.settings,{achievements:checked('achievements'),workout:checked('workout'),recovery:checked('recovery'),weekly:checked('weekly'),reminder:val('reminder')});},'Notification preferences saved');
  if(type==='persona')change(()=>Object.assign(state.profile,{avatar:val('avatar'),title:val('title')}),'Appearance saved');
  if(type==='generator')savePlan(val('plan-focus'),Number(val('plan-time')));
  if(type==='exercise'){
    const [day,id]=form.dataset.value.split('/');
    const counts={sets:Number(val('sets')||1),reps:Number(val('reps')||0),seconds:Number(val('seconds')||0)};
    closeDialog();change(()=>E.setExercise(state,day,id,Number(event.submitter?.value||2),counts),'Exercise log saved');
  }
  if(type==='variant'){
    const [day,id]=form.dataset.value.split('/'), plan=E.planOf(state,day), substitute=val('substitute')||id;
    closeDialog();change(()=>{state.days[day]={...plan,items:plan.items.map(i=>i.id===id?{id:substitute,level:val('difficulty')}:i),updated:stamp};},'Exercise options saved');
  }
  if(type==='note'){
    closeDialog();change(()=>{state.notes[form.dataset.value]={text:val('note').trim(),updated:stamp};},'Workout notes saved');
  }
  if(type==='coach')event.submitter?.value==='online'?askOnline(val('question')):addCoach(val('question'));
  if(type==='schedule')calendarExport(f,event.submitter?.value);
  if(type==='email'){
    const url=new URL('https://mail.google.com/mail/u/0/');
    for(const [k,v] of Object.entries({view:'cm',fs:'1',su:val('recap-type')==='weekly'?'RepQuest weekly recap':'RepQuest achievement recap',body:val('body')}))url.searchParams.set(k,v);
    window.open(url.href,'_blank','noopener,noreferrer');say('Opened a Gmail compose template');
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='exercise-search'){search=event.target.value;$('#library').innerHTML=library();}
  if(event.target.id==='quest-xp')event.target.dataset.auto='no';
});
document.addEventListener('change',async event=>{
  const el=event.target;
  lifeUI.onChange(el);
  if(el.id==='plan-focus'||el.id==='plan-time')previewPlan();
  if(el.id==='chart-type'){chartType=el.value;render();$('#chart-type')?.focus();}
  if(el.id==='rest-length'){restSeconds=Number(el.value);restEnd=0;updateTimers();}
  if(el.id==='recap-type')$('#email-body').value=$('#email-body').dataset[el.value==='weekly'?'week':'badges'];
  if(el.id==='backup'&&el.files[0]){
    try{
      if(el.files[0].size>8*1024*1024)throw Error('Choose a backup smaller than 8 MB.');
      const incoming=E.parseBackup(await el.files[0].text());
      show('import','Import RepQuest backup','<p class="muted">Merge matching quest and workout records without duplicating XP. Your current settings stay in use when you merge. Restore replaces this device’s profile, preferences, and data.</p><div class="chips">'+btn('Merge progress','merge-confirm',{cls:'btn primary'})+btn('Restore backup','restore-review')+'</div>');
      actions['merge-confirm']=()=>{closeDialog();change(()=>E.merge(state,incoming),'Backup merged');};
      actions['restore-review']=()=>show('restore','Replace local data?','<p class="muted">Your local records and preferences will be replaced with the contents of the selected backup.</p>'+btn('Replace and restore','restore-confirm',{cls:'btn danger'}));
      actions['restore-confirm']=()=>{closeDialog();change(()=>{state=incoming;},'Backup restored');};
    }catch(error){say(error.message);}
    el.value='';
  }
});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();install=e;render();});
for(const event of ['online','offline'])addEventListener(event,render);
addEventListener('online',findOnlineCoach);
setInterval(()=>{
  updateTimers();
  const date=E.localDay();if(date!==today){if(picked===today)picked=date;render();}
  const now=new Date(),p=E.planOf(state,today),at=now.toTimeString().slice(0,5), s=state.settings;
  lifeUI.reminders(now);
  if(at<s.reminder||document.hidden)return;
  const notify=(key,message)=>{if(!alertKeys.has(key)){alertKeys.add(key);say(message);}};
  const snap=E.snapshot(state);
  if(s.workout&&p.focus!=='Recovery'&&!E.workoutDone(state,p))notify(today+'-workout','Your planned workout is available when you have time.');
  if(s.recovery&&p.focus==='Recovery'&&!E.outcome(state,today,'rest'))notify(today+'-rest','Take a comfortable recovery break today.');
  if(s.weekly&&now.getDay()===0)notify(today+'-weekly','Weekly recap · '+(snap.weeks[E.weekOf(today)]||[]).length+' workouts and '+lifeUI.countsWeek().length+' custom quests completed.');
},1000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
setRoute(location.hash.slice(1));
findOnlineCoach();
if(storageError)say('Your local data could not be read. Import a backup from Settings to recover it.');

