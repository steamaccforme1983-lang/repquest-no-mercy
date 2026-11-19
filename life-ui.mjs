import * as L from './life.mjs';

export function createLifeUI(ui){
  const {state,today,show,close,render,change,say,html,btn,field,select,panelTitle,empty,xpPill,xpGauge,icon,tile,h,dayLong,download}=ui;
  const life=()=>state().life;
  let selected='', filterCategory='', filterStatus='all', sortBy='manual', dragId='';
  const submit=label=>'<button class="btn primary" type="submit">'+html(label)+'</button>';
  const action=(label,name,value,opts={})=>btn(label,'life-'+name,{value,...opts});
  const categoryName=id=>life().categories[id]?.name||'Other';
  const categories=()=>Object.values(life().categories).map(c=>[c.id,c.name]);
  const symbol=(glyph,fallback='flag')=>glyph?'<span class="quest-emoji" aria-hidden="true">'+html(glyph)+'</span>':tile(fallback);
  const box=(label,on,name,value,disabled=false)=>'<button type="button" class="checkbox status-'+(on?2:0)+'" role="checkbox" aria-checked="'+on+'" aria-label="'+html(label)+'" data-action="life-'+name+'" data-value="'+html(value)+'" '+(disabled?'disabled':'')+'>'+(on?icon('check',14):'')+'</button>';
  const recap=(label,value)=>'<div class="quest-kpi"><strong>'+value+'</strong><span>'+label+'</span></div>';
  const dayForBoard=()=>selected||today();

  function row(q,day,index,length,reorder){
    const event=L.getEvent(life(),q,day), done=event?.done===true;
    const current=L.streak(life(),q,day), chars=event?.checked||[];
    const id=q.id+'/'+day, disabled=day>today();
    const subRows=q.subtasks.map(task=>'<li>'+box((chars.includes(task.id)?'Undo milestone ':'Complete milestone ')+task.title,chars.includes(task.id),'sub',id+'/'+task.id,disabled)+'<span>'+html(task.title)+'</span></li>').join('');
    return '<article class="life-row '+(done?'life-done':'')+'" data-quest-row="'+html(q.id)+'" data-life-section="'+q.section+'">'+
      '<div class="life-row-top">'+box((done?'Undo ':'Complete ')+q.name,done,'check',id,disabled)+symbol(q.icon,q.section==='main'?'target':'flag')+
      '<div class="life-title"><strong>'+html(q.name)+'</strong><small>'+html(categoryName(q.category))+' · '+L.repeats[q.repeat]+' · '+q.difficulty+(q.time?' · '+html(q.time):'')+(current?' · '+current+' streak':'')+'</small></div>'+
      xpPill('+'+(done?event.xp:q.xp))+
      '<details class="life-menu"><summary aria-label="Options for '+html(q.name)+'">⋯</summary><div>'+
      action('Edit / reschedule','edit',q.id)+action('Duplicate','duplicate',q.id)+action('Archive','archive',q.id)+action('Delete','delete',q.id,{cls:'btn danger'})+
      (reorder?action('Move up','move',q.id+'/up/'+day,{disabled:index===0})+action('Move down','move',q.id+'/down/'+day,{disabled:index===length-1}):'')+'</div></details>'+
      (reorder?'<span class="drag-handle" data-life-drag="'+html(q.id)+'" draggable="true" title="Drag to reorder. Keyboard controls are in Options." aria-hidden="true">⠿</span>':'')+'</div>'+
      (q.description?'<p class="life-description">'+html(q.description)+'</p>':'')+
      (subRows?'<details class="life-subtasks"><summary>Milestones '+q.subtasks.filter(t=>chars.includes(t.id)).length+' / '+q.subtasks.length+'</summary><ul>'+subRows+'</ul></details>':'')+'</article>';
  }
  function activeQuests(day,detail){
    const due=new Set(L.dueOn(life(),day).map(q=>q.id));
    let quests=L.ordered(life()).filter(q=>due.has(q.id));
    if(!detail)return quests;
    quests=quests.filter(q=>(!filterCategory||q.category===filterCategory)&&(filterStatus==='all'||(filterStatus==='done')===Boolean(L.getEvent(life(),q,day)?.done)));
    if(sortBy==='time')quests.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
    if(sortBy==='reward')quests.sort((a,b)=>b.xp-a.xp);
    if(sortBy==='name')quests.sort((a,b)=>a.name.localeCompare(b.name));
    return quests;
  }
  function board(detail=false){
    const day=detail?dayForBoard():today(), status=L.dailyStatus(life(),day);
    const quests=activeQuests(day,detail), all=Object.values(life().quests).some(q=>q.status==='active');
    const tools=detail?
      '<div class="life-tools">'+
      field('life-board-date','Board date','<input type="date" id="life-board-date" value="'+day+'">')+
      field('life-board-category','Category',select('life-board-category',[['','All categories'],...categories()],filterCategory))+
      field('life-board-status','Status',select('life-board-status',[['all','All quests'],['open','To do'],['done','Completed']],filterStatus))+
      field('life-board-sort','Sort',select('life-board-sort',[['manual','My order'],['time','Scheduled time'],['reward','Highest XP'],['name','Name']],sortBy))+'</div>':'';
    return '<section class="panel life-board">'+panelTitle(detail?html(dayLong(day)):'Quest Board',detail?action('Today','today','',{cls:'text-btn'}):btn('View full board','go',{value:'life',cls:'text-btn'}))+
      '<div class="life-progress"><div><strong>Daily completion</strong><span>'+status.done+' / '+status.total+' daily quests</span></div><progress max="100" value="'+status.percent+'" aria-label="Daily quest completion">'+status.percent+'%</progress><b>'+status.percent+'%</b></div>'+tools+
      (!all?'<div class="life-empty">'+tile('flag')+'<div><strong>Your board is ready</strong><p>Start with a routine, a side project, or one small step toward a larger goal.</p></div>'+action('Add your first quest','add','',{cls:'btn primary',icon:'plus'})+'</div>':'')+
      Object.entries(L.sections).map(([key,label])=>{
        const entries=quests.filter(q=>q.section===key);
        return '<section class="life-lane"><div class="life-lane-heading"><h3>'+label+'</h3><span>'+entries.length+'</span>'+action('','add',key,{cls:'icon-btn',icon:'plus',aria:'Add to '+label})+'</div>'+
          (entries.length?entries.map((q,i)=>row(q,day,i,entries.length,!detail||sortBy==='manual')).join(''):empty('No '+key+' quests scheduled.'))+'</section>';
      }).join('')+'</section>';
  }
  const countsWeek=()=>L.completed(life()).filter(r=>r.day>=L.monday(today())&&r.day<=today());
  function history(){
    const rows=L.completed(life()), end=today(), start=L.offsetDay(end,-6);
    return '<section class="panel subgrid">'+panelTitle('Quest history')+
      '<div class="life-week">'+Array.from({length:7},(_,i)=>L.offsetDay(start,i)).map(day=>{
        const n=rows.filter(r=>r.day===day).length;
        const label=new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'});
        return action(label+' · '+n,'date',day,{cls:'btn small',aria:dayLong(day)+', '+n+' custom quests completed'});
      }).join('')+'</div>'+
      (rows.length?'<details class="life-history" open><summary>Completed quests · '+rows.length+'</summary><ul>'+
      rows.map(r=>'<li><span><b>'+html(r.name)+'</b><small>'+html(dayLong(r.day))+' · '+html(categoryName(r.category))+'</small></span>'+xpPill('+'+r.xp)+action('Undo','undo',r.id+'/'+r.period,{cls:'text-btn'})+'</li>').join('')+'</ul></details>':empty('Your completed quests will appear here.'))+'</section>';
  }
  function categoryPanel(){
    const totals=L.categoryStats(life());
    return '<section class="panel subgrid">'+panelTitle('Category skills',action('Add category','category','',{icon:'plus',cls:'text-btn'}))+
      '<div class="life-categories">'+totals.map(c=>'<div><strong>'+html(c.name)+'</strong><span>Level '+c.level+' · '+c.xp+' XP · '+c.count+' done</span><progress max="100" value="'+(c.xp%100)+'" aria-label="'+html(c.name)+' progress to next category level"></progress></div>').join('')+'</div></section>';
  }
  function rewardPanel(snap){
    const rewards=L.unlocks(life(),snap.rank.level);
    return '<section class="panel subgrid">'+panelTitle('Custom rewards',action('Add reward','reward','',{icon:'plus',cls:'text-btn'}))+
      (rewards.length?'<div class="life-rewards">'+rewards.map(r=>'<article class="detail-line">'+symbol(r.icon,'trophy')+'<div><strong>'+html(r.name)+'</strong><small>'+html(r.category?categoryName(r.category)+' level ':'Player level ')+r.level+' · '+(r.unlocked?'Unlocked':'Locked')+'</small></div>'+
      action(life().prefs.cosmetic===r.id?'Unequip':'Equip','equip',r.id,{disabled:!r.unlocked&&life().prefs.cosmetic!==r.id})+
      action('','reward-delete',r.id,{icon:'x',cls:'icon-btn',aria:'Remove reward '+r.name})+'</article>').join('')+'</div>':empty('Set a level goal to unlock a personal reward or cosmetic badge.'))+'</section>';
  }
  const cosmetic=snap=>L.unlocks(life(),snap.rank.level).find(r=>r.id===life().prefs.cosmetic&&r.unlocked);
  function archivePanel(){
    const quests=L.ordered(life()).filter(q=>q.status!=='deleted');
    return '<section class="panel subgrid"><details class="life-manage"><summary>Manage quests · '+quests.length+'</summary>'+
      (quests.length?'<div class="life-history"><ul>'+quests.map(q=>'<li><span><b>'+html(q.name)+'</b><small>'+L.repeats[q.repeat]+' · '+(q.status==='archived'?'Archived':html(dayLong(q.start)))+'</small></span><div class="chips">'+
      action('Edit','edit',q.id,{cls:'text-btn'})+action('Duplicate','duplicate',q.id,{cls:'text-btn'})+
      (q.status==='archived'?action('Restore','restore',q.id,{cls:'text-btn'}):action('Archive','archive',q.id,{cls:'text-btn'}))+
      action('Delete','delete',q.id,{cls:'text-btn'})+'</div></li>').join('')+'</ul></div>':empty('Create a quest to manage it here.'))+'</details></section>';
  }
  function page(snap){
    const weekly=countsWeek();
    return h('Life Quests','Plan routines, side projects, and the goals that matter to you.',action('Add Quest','add','',{cls:'btn primary',icon:'plus'}))+
      '<div class="life-page-grid"><div>'+board(true)+history()+archivePanel()+'</div><aside>'+
      '<section class="panel life-overview">'+panelTitle('Player level '+snap.rank.level)+xpGauge(snap)+'</section>'+
      '<section class="panel subgrid">'+panelTitle('This week')+'<div class="life-kpis">'+recap('Quest completions',weekly.length)+recap('Custom quest XP',weekly.reduce((n,r)=>n+r.xp,0))+'</div>'+
      action(life().prefs.streaks?'Hide streaks':'Show streaks','streaks','',{cls:'text-btn',icon:'fire'})+'</section>'+categoryPanel()+rewardPanel(snap)+'</aside></div>';
  }
  const input=(name,type,value,extra='')=>'<input id="'+name+'" name="'+name+'" type="'+type+'" value="'+html(value??'')+'" '+extra+'>';
  function editor(id,forcedSection,copy=false){
    const old=id?life().quests[id]:null;
    const q=old||{name:'',icon:'',description:'',category:'preset-6',section:forcedSection||'daily',difficulty:'Easy',
      xp:10,start:document.querySelector('.life-tools')?dayForBoard():today(),time:'',repeat:forcedSection&&forcedSection!=='daily'?'once':'daily',reminder:'',subtasks:[]};
    const name=copy?q.name+' copy':q.name;
    const steps=q.subtasks.map(t=>t.title).join('\n');
    show('life-editor',copy?'Duplicate quest':old?'Edit quest':'Add Quest',
      '<form class="form life-form" data-form="life-quest" data-value="'+html(old&&!copy?id:'')+'">'+
      '<div class="life-name-fields">'+field('quest-name','Quest name',input('quest-name','text',name,'required maxlength="80" placeholder="Brush teeth" autofocus'))+
      field('quest-icon','Emoji or icon',input('quest-icon','text',q.icon,'maxlength="16" placeholder="🪥"'))+'</div>'+
      '<div class="form-grid">'+field('quest-section','Board section',select('quest-section',Object.entries(L.sections),q.section))+
      field('quest-category','Category',select('quest-category',[...categories(),['new','Create a category…']],q.category))+
      field('quest-repeat','Repeat',select('quest-repeat',[['daily','Repeat Daily'],['weekly','Repeat Weekly'],['monthly','Repeat Monthly'],['once','One time']],q.repeat))+
      field('quest-start','Start date',input('quest-start','date',copy?today():q.start,'required'))+
      field('quest-difficulty','Difficulty',select('quest-difficulty',Object.keys(L.difficulties),q.difficulty))+
      field('quest-xp','XP reward',input('quest-xp','number',q.xp,'required min="0" max="100" '+(old?'data-auto="no"':'')))+
      field('quest-time','Scheduled time (optional)',input('quest-time','time',q.time))+
      field('quest-reminder','Reminder',select('quest-reminder',[['','Off'],[0,'At scheduled time'],[5,'5 minutes before'],[15,'15 minutes before'],[30,'30 minutes before'],[60,'1 hour before']],q.reminder??''))+'</div>'+
      '<div id="life-new-category" hidden>'+field('quest-category-name','New category name',input('quest-category-name','text','','maxlength="40"'))+'</div>'+
      '<details class="life-form-extra" '+(q.description||steps?'open':'')+'><summary>Description and milestones</summary>'+
      field('quest-description','Description','<textarea id="quest-description" name="quest-description" rows="2" maxlength="800">'+html(q.description)+'</textarea>')+
      field('quest-subtasks','Subtasks or milestones (one per line)','<textarea id="quest-subtasks" name="quest-subtasks" rows="3" maxlength="3000">'+html(steps)+'</textarea>')+'</details>'+
      '<p class="muted">Each scheduled completion earns XP once. Custom quests award up to '+L.DAILY_XP_LIMIT+' XP per day. Reminders appear while RepQuest is open.</p>'+
      submit(old&&!copy?'Save changes':'Save quest')+'</form>');
  }
  function categoryDialog(){
    show('life-category','Add category','<form class="form" data-form="life-category">'+field('new-category','Category name',input('new-category','text','','required maxlength="40" autofocus'))+submit('Save category')+'</form>');
  }
  function rewardDialog(){
    show('life-reward','Add custom reward','<p class="muted">Choose a reward to unlock when you reach a player or category level.</p><form class="form" data-form="life-reward">'+
      field('reward-name','Reward name',input('reward-name','text','','required maxlength="60" autofocus'))+
      '<div class="form-grid">'+field('reward-icon','Cosmetic emoji or icon',input('reward-icon','text','','maxlength="16" placeholder="✨"'))+
      field('reward-level','Unlock level',input('reward-level','number',2,'required min="2" max="100"'))+'</div>'+
      field('reward-category','Progress type',select('reward-category',[['','Overall player level'],...categories()],''))+submit('Save reward')+'</form>');
  }
  function newCategory(name){
    const trimmed=name.trim().slice(0,40);
    if(!trimmed)throw Error('Enter a category name.');
    return Object.values(life().categories).find(c=>c.name.toLowerCase()===trimmed.toLowerCase())||
      {id:crypto.randomUUID(),name:trimmed,updated:Date.now()};
  }
  function onForm(type,form,f){
    if(!type.startsWith('life-'))return false;
    const val=key=>String(f.get(key)??'');
    try{
      const data=life();
      if(type==='life-quest'){
        const old=data.quests[form.dataset.value];
        const known=new Map((old?.subtasks||[]).map(t=>[t.title,t.id]));
        const names=[...new Set(val('quest-subtasks').split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
        const cat=val('quest-category')==='new'?newCategory(val('quest-category-name')):data.categories[val('quest-category')];
        if(val('quest-reminder')&&!val('quest-time'))throw Error('Choose a scheduled time to enable a reminder.');
        const q=L.cleanQuest({name:val('quest-name'),icon:val('quest-icon'),description:val('quest-description'),
          section:val('quest-section'),category:cat?.id,difficulty:val('quest-difficulty'),xp:val('quest-xp'),
          repeat:val('quest-repeat'),start:val('quest-start'),time:val('quest-time'),reminder:val('quest-reminder'),
          subtasks:names.map(title=>({title,id:known.get(title)}))},old);
        close();
        change(()=>{if(cat)data.categories[cat.id]=cat;data.quests[q.id]=q;},old?'Quest updated':'Quest added');
        if(q.start>today())say('Quest added for '+dayLong(q.start)+'. See Manage quests to reschedule it.');
      }
      if(type==='life-category'){
        const cat=newCategory(val('new-category'));
        close();change(()=>{data.categories[cat.id]=cat;},'Category saved');
      }
      if(type==='life-reward'){
        const name=val('reward-name').trim();
        if(!name)throw Error('Enter a reward name.');
        const id=crypto.randomUUID();
        const reward={id,name,icon:val('reward-icon'),level:Number(val('reward-level')),category:val('reward-category'),updated:Date.now()};
        close();change(()=>{data.rewards[id]=reward;},'Reward saved');
      }
    }catch(error){say(error.message);}
    return true;
  }
  function onChange(el){
    const field=el.id;
    if(field==='quest-category'&&el.closest('.life-form')){
      const area=document.querySelector('#life-new-category');
      area.hidden=el.value!=='new';
      area.querySelector('input').required=!area.hidden;
      if(!area.hidden)area.querySelector('input').focus();
    }
    if(field==='quest-difficulty'){
      const reward=document.getElementById('quest-xp');
      if(reward.dataset.auto!=='no')reward.value=L.difficulties[el.value];
    }
    if(!field.startsWith('life-board-'))return;
    if(field==='life-board-date')selected=L.validDay(el.value)?el.value:'';
    if(field==='life-board-category')filterCategory=el.value;
    if(field==='life-board-status')filterStatus=el.value;
    if(field==='life-board-sort')sortBy=el.value;
    render();document.getElementById(field)?.focus();
  }
  function lifecycle(id,status,message){
    const q=life().quests[id];
    if(q)change(()=>{life().quests[id]={...q,status,updated:Date.now()};},message);
  }
  function deleteDialog(id){
    const q=life().quests[id];
    if(q)show('life-delete','Delete quest?', '<p class="muted">'+html(q.name)+' will be removed from the board. Past completions and earned XP stay in your history.</p><div class="chips">'+btn('Cancel','close')+action('Delete quest','confirm-delete',id,{cls:'btn danger'})+'</div>');
  }
  const actions={
    'life-add':section=>editor(null,section),
    'life-edit':id=>editor(id),
    'life-duplicate':id=>editor(id,undefined,true),
    'life-archive':id=>lifecycle(id,'archived','Quest archived'),
    'life-restore':id=>lifecycle(id,'active','Quest restored'),
    'life-delete':deleteDialog,
    'life-confirm-delete':id=>{close();lifecycle(id,'deleted','Quest deleted');},
    'life-category':categoryDialog,
    'life-reward':rewardDialog,
    'life-today':()=>{selected='';render();},
    'life-date':day=>{selected=day;render();},
    'life-streaks':()=>change(()=>{life().prefs={...life().prefs,streaks:!life().prefs.streaks,updated:Date.now()};},'Streak display updated'),
    'life-check':value=>{
      const [id,day]=value.split('/'), q=life().quests[id];
      if(!q)return;
      const done=!L.getEvent(life(),q,day)?.done;
      try{
        let result;
        change(()=>{result=L.setQuestCompletion(life(),id,day,done,today());},done?'Quest completed':'Completion undone');
        if(done&&result.xp<q.xp&&q.xp>0)say('Quest completed · '+result.xp+' XP credited within today’s custom quest limit.');
      }catch(error){say(error.message);}
    },
    'life-undo':key=>{
      const event=life().events[key];
      if(event?.done)change(()=>{life().events[key]={...event,done:false,updated:Date.now()};},'Completion undone');
    },
    'life-sub':value=>{
      const [id,day,sub]=value.split('/'), q=life().quests[id];
      if(!q)return;
      const on=!L.getEvent(life(),q,day)?.checked.includes(sub);
      try{change(()=>L.setSubtask(life(),id,day,sub,on,today()),on?'Milestone checked':'Milestone unchecked');}
      catch(error){say(error.message);}
    },
    'life-move':value=>{
      const [id,direction,day]=value.split('/'), q=life().quests[id];
      const visibility=!!document.querySelector('.life-tools');
      const rows=activeQuests(day,visibility).filter(item=>item.section===q?.section);
      const index=rows.findIndex(item=>item.id===id), target=rows[index+(direction==='up'?-1:1)];
      if(target)change(()=>L.reorder(life(),id,target.id),'Quest moved');
    },
    'life-equip':id=>change(()=>{life().prefs={...life().prefs,cosmetic:life().prefs.cosmetic===id?'':id,updated:Date.now()};},'Cosmetic updated'),
    'life-reward-delete':id=>change(()=>{const reward=life().rewards[id];if(reward)life().rewards[id]={...reward,deleted:true,updated:Date.now()};},'Reward removed'),
    'life-calendar':()=>calendarExport(),
    'life-google':()=>window.open('https://calendar.google.com/calendar/u/0/r/settings/export','_blank','noopener,noreferrer')
  };
  const safeIcs=text=>String(text).replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(',','\\,').replaceAll(';','\\;');
  function calendarExport(){
    const quests=Object.values(life().quests).filter(q=>q.status==='active'&&!(q.repeat==='once'&&L.getEvent(life(),q,today())?.done));
    if(!quests.length){say('Add a custom quest before exporting your calendar.');return;}
    const dt=day=>day.replaceAll('-','');
    const stamp=new Date().toISOString().replace(/[-:]|\.\d{3}/g,'');
    const events=quests.flatMap(q=>{
      const start=q.start;
      const rules={daily:'FREQ=DAILY',weekly:'FREQ=WEEKLY',monthly:'FREQ=MONTHLY',once:''};
      const monthDay=Number(start.slice(8)), allowed=Array.from({length:monthDay-27},(_,i)=>28+i).join(',');
      const rule=rules[q.repeat]+(q.repeat==='monthly'?(monthDay>28?';BYMONTHDAY='+allowed+';BYSETPOS=-1':';BYMONTHDAY='+monthDay):'');
      return ['BEGIN:VEVENT','UID:'+q.id+'@repquest.local','DTSTAMP:'+stamp,
        q.time?'DTSTART:'+dt(start)+'T'+q.time.replace(':','')+'00':'DTSTART;VALUE=DATE:'+dt(start),
        ...(q.time?['DURATION:PT15M']:[]),...(rule?['RRULE:'+rule]:[]),
        'SUMMARY:'+safeIcs(q.name),'DESCRIPTION:'+safeIcs(q.description),
        ...(q.reminder!==null&&q.time?['BEGIN:VALARM','TRIGGER:'+(q.reminder?'-PT'+q.reminder+'M':'PT0M'),'ACTION:DISPLAY','DESCRIPTION:Quest reminder','END:VALARM']:[]),'END:VEVENT'];
    });
    const encoder=new TextEncoder();
    const fold=line=>{
      let chunk='', bytes=0, result='';
      for(const character of line){
        const size=encoder.encode(character).length;
        if(bytes+size>75){result+=chunk+'\r\n';chunk=' ';bytes=1;}
        chunk+=character;bytes+=size;
      }
      return result+chunk;
    };
    download('repquest-custom-schedule.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RepQuest//Life Quests//EN',...events,'END:VCALENDAR',''].map(fold).join('\r\n'),'text/calendar;charset=utf-8');
    say('Calendar downloaded. Import it into your preferred calendar.');
  }
  const notified=new Set();
  function reminders(now){
    if(document.hidden||!Object.values(life().quests).some(q=>q.status==='active'&&q.reminder!==null))return;
    const day=L.localDate(now);
    for(const slot of [day,L.offsetDay(day,1)]){
      for(const q of L.dueOn(life(),slot)){
        if(q.reminder===null||!q.time||L.getEvent(life(),q,slot)?.done)continue;
        if(q.repeat==='once'&&q.start!==slot)continue;
        const starts=+new Date(slot+'T'+q.time), due=starts-q.reminder*60_000;
        const key=q.id+'/'+slot;
        if(!notified.has(key)&&+now>=due&&+now<starts+60_000){
          notified.add(key);say(q.name+' · '+(q.reminder?'Scheduled at '+q.time:'Ready when you are.'));
        }
      }
    }
  }
  document.addEventListener('dragstart',event=>{
    const handle=event.target.closest('[data-life-drag]');
    if(!handle)return;
    dragId=handle.dataset.lifeDrag;event.dataTransfer.setData('text/plain',dragId);event.dataTransfer.effectAllowed='move';
  });
  document.addEventListener('dragover',event=>{
    const row=event.target.closest('[data-quest-row]');
    if(row&&dragId&&life().quests[dragId]?.section===row.dataset.lifeSection)event.preventDefault();
  });
  document.addEventListener('drop',event=>{
    const row=event.target.closest('[data-quest-row]');
    if(!row||!dragId||life().quests[dragId]?.section!==row.dataset.lifeSection)return;
    event.preventDefault();
    const id=dragId;dragId='';
    if(id!==row.dataset.questRow)change(()=>L.reorder(life(),id,row.dataset.questRow),'Quest moved');
  });
  document.addEventListener('dragend',()=>{dragId='';});
  return {board,page,actions,onForm,onChange,reminders,categoryPanel,rewardPanel,cosmetic,countsWeek};
}
