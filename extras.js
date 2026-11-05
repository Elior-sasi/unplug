/* Unplug extras: device groups, quick actions (long-press), Shabbat mode, drag-to-reorder.
   Loaded after the main script; uses its globals (META, DEVS, api, send, sheet, svg, toast, render...). */
'use strict';
META.groups=META.groups||[];META.order=META.order||{};
let REORDER=false;

/* ---------- timer (shared by quick actions) ---------- */
async function quickTimer(d,m,notify){
  const pc=powerCode(d);if(!pc)return;const on=isOn(d),at=new Date(Date.now()+m*60000);
  const old=SCHED.find(s=>s.device===d.id&&s.once&&s.label==='טיימר');
  if(old)await api('/schedules/delete',{id:old.id}).catch(()=>{});
  await api('/schedules/save',{device:d.id,time:hm(at),days:[at.getDay()],cmds:[{code:pc,value:!on}],label:'טיימר',enabled:true,once:true});
  if(notify&&LS('unplug_push')){const f=new Date(at);f.setSeconds(25,0);api('/push/at',{at:f.getTime()/1000,title:`${dname(d)} ${on?'כבה':'נדלק'}`,body:'הטיימר הסתיים'}).catch(()=>{})}
  await loadSched();toast(`${dname(d)} ${on?'ייכבה':'יידלק'} ב-${hm(at)}`);
}

/* ---------- groups ---------- */
const groupDevs=g=>g.devs.map(id=>DEVS.find(d=>d.id===id)).filter(d=>d&&powerCode(d));
function groupsHtml(){
  const gs=META.groups.filter(g=>groupDevs(g).length);
  if(!gs.length)return '';
  return `<section class="roomSec" aria-labelledby="gH"><div class="roomH"><h2 class="roomT" id="gH">קבוצות</h2><button class="roomOff" id="gAdd" aria-label="קבוצה חדשה">${svg('plus',2.4)}</button></div>
   <div class="grpRow" role="list">${gs.map(g=>{const ds=groupDevs(g),on=ds.filter(d=>d.online&&isOn(d)).length,any=on>0;
     return `<div class="grp${any?' is-on':''}" role="listitem"><button class="grpOpen" data-gopen="${g.id}" aria-label="${esc(g.name)}, ${on} מתוך ${ds.length} פועלים. עריכת קבוצה"></button>
      <div class="grpIc" aria-hidden="true">${ds.slice(0,3).map(d=>`<span>${devArt(d)}</span>`).join('')}</div>
      <div class="grpT" aria-hidden="true"><b>${esc(g.name)}</b><span>${on?on+' מתוך '+ds.length+' פועלים':'הכול כבוי'}</span></div>
      <button class="pw" role="switch" aria-checked="${any}" data-gpw="${g.id}" aria-label="${esc(g.name)} פועלת">${svg('power',2.6)}</button></div>`}).join('')}</div></section>`;
}
function bindGroups(v){
  v.querySelector('#gAdd')&&(v.querySelector('#gAdd').onclick=()=>editGroup(null));
  v.querySelectorAll('[data-gopen]').forEach(b=>b.onclick=()=>editGroup(META.groups.find(g=>g.id===b.dataset.gopen)));
  v.querySelectorAll('[data-gpw]').forEach(b=>b.onclick=async()=>{const g=META.groups.find(x=>x.id===b.dataset.gpw),ds=groupDevs(g).filter(d=>d.online),to=!ds.some(isOn);
    b.setAttribute('aria-checked',to);for(const d of ds)if(isOn(d)!==to)await send(d,[{code:powerCode(d),value:to}]);addLog('קבוצה',g.name+': '+(to?'הדלקה':'כיבוי'));toast(`${g.name} - ${to?'דלוק':'כבוי'}`)});
}
function editGroup(g){
  const isNew=!g;g=g?JSON.parse(JSON.stringify(g)):{id:'g'+Date.now().toString(36),name:'',devs:[]};
  const sel=new Set(g.devs),cands=DEVS.filter(powerCode);
  const sug=[['כל האורות',d=>['bulb','lamp','ceiling','led'].includes(iconOf(d))],['כל המזגנים',d=>iconOf(d)==='ac'],['כל השקעים',d=>['plug','strip','switch','charger'].includes(iconOf(d))]].filter(([,f])=>cands.some(f));
  sheet(isNew?'קבוצה חדשה':'עריכת קבוצה',`<div class="field"><label for="gN">שם הקבוצה</label><input id="gN" value="${esc(g.name)}" placeholder="כל האורות"></div>
    ${isNew&&sug.length?`<div class="seg" role="group" aria-label="הצעות">${sug.map(([n],i)=>`<button data-sg="${i}">${n}</button>`).join('')}</div>`:''}
    <div class="sec-h" style="margin:6px 4px 0"><h2>מכשירים בקבוצה</h2></div>
    <div class="list" id="gL">${cands.map(d=>`<label class="row"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}<br><span class="s">${esc(roomOf(d)||'בלי חדר')}</span></span><input type="checkbox" data-gd="${esc(d.id)}" ${sel.has(d.id)?'checked':''} style="width:28px;height:28px;accent-color:var(--gold)"></label>`).join('')}</div>
    <div class="err" id="gE" role="alert"></div>
    <div class="btns">${isNew?'':`<button class="btn bad" id="gDel">${svg('trash')}מחיקה</button>`}<button class="btn pri" id="gS">שמירה</button></div>`,(el,close)=>{
    el.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>{const[n,f]=sug[+b.dataset.sg];el.querySelector('#gN').value=n;el.querySelectorAll('[data-gd]').forEach(x=>x.checked=f(DEVS.find(d=>d.id===x.dataset.gd)))});
    el.querySelector('#gS').onclick=()=>{g.name=el.querySelector('#gN').value.trim();g.devs=[...el.querySelectorAll('[data-gd]:checked')].map(x=>x.dataset.gd);
      if(!g.name)return el.querySelector('#gE').textContent='תן שם לקבוצה';if(g.devs.length<2)return el.querySelector('#gE').textContent='בחר לפחות 2 מכשירים';
      const i=META.groups.findIndex(x=>x.id===g.id);i<0?META.groups.push(g):META.groups[i]=g;saveMeta();close();render();toast('נשמר')};
    el.querySelector('#gDel')&&(el.querySelector('#gDel').onclick=()=>{if(!confirm('למחוק את הקבוצה? המכשירים עצמם לא נמחקים.'))return;META.groups=META.groups.filter(x=>x.id!==g.id);saveMeta();close();render()});
  });
}

/* ---------- quick actions: long-press a tile ---------- */
function quickActions(d){
  const pc=powerCode(d),t=SCHED.find(s=>s.device===d.id&&s.once&&s.label==='טיימר'),on=isOn(d);
  sheet(esc(dname(d)),`${pc?`<button class="btn pri wide" id="qaP">${svg('power')}${on?'כיבוי':'הדלקה'}</button>`:''}
    ${pc?`<div class="ctl" style="padding:0"><div class="ctl-h"><span class="t" id="qaL">${t?`${t.cmds?.[0]?.value?'יידלק':'ייכבה'} ב-${esc(t.time)}`:on?'לכבות בעוד':'להדליק בעוד'}</span>${t?'<button class="btn bad" id="qaX">ביטול טיימר</button>':''}</div>
      ${t?'':`<div class="seg" role="group" aria-labelledby="qaL">${[15,30,60,120].map(m=>`<button data-qm="${m}">${m<60?m+' דק׳':m/60+' שע׳'}</button>`).join('')}</div>`}</div>`:''}
    <div class="list">
      <button class="row row-btn" id="qaR"><span class="grow"><span class="t">חדר</span><br><span class="s">${esc(roomOf(d)||'בלי חדר')}</span></span>${svg('chev')}</button>
      <button class="row row-btn" id="qaF" role="switch" aria-checked="${!!META.fav[d.id]}"><span class="grow t">${META.fav[d.id]?'הסרה ממועדפים':'הוספה למועדפים'}</span>${svg('star')}</button>
      <button class="row row-btn" id="qaO"><span class="grow t">עריכת המסך</span>${svg('list')}</button>
      <button class="row row-btn" id="qaD"><span class="grow t">כל ההגדרות של המכשיר</span>${svg('chev')}</button>
    </div>`,(el,close)=>{
    el.querySelector('#qaP')&&(el.querySelector('#qaP').onclick=()=>{close();if(!d.online)return toast('המכשיר מנותק');send(d,[{code:pc,value:!isOn(d)}])});
    el.querySelectorAll('[data-qm]').forEach(b=>b.onclick=async()=>{close();try{await quickTimer(d,+b.dataset.qm,true)}catch(e){toast(e.message)}});
    el.querySelector('#qaX')&&(el.querySelector('#qaX').onclick=async()=>{close();try{await api('/schedules/delete',{id:t.id});await loadSched();toast('הטיימר בוטל')}catch(e){toast(e.message)}});
    el.querySelector('#qaR').onclick=()=>pickRoom(d,render);
    el.querySelector('#qaF').onclick=()=>{META.fav[d.id]?delete META.fav[d.id]:META.fav[d.id]=true;saveMeta();close();render()};
    el.querySelector('#qaO').onclick=()=>{close();setReorder(true)};
    el.querySelector('#qaD').onclick=()=>{close();openDevice(d)};
  });
}
function bindLongPress(v){
  v.querySelectorAll('.card').forEach(c=>{let t=0,x0=0,y0=0,fired=false;const o=c.querySelector('.open');
    o.addEventListener('pointerdown',e=>{if(REORDER)return;fired=false;x0=e.clientX;y0=e.clientY;t=setTimeout(()=>{fired=true;try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}setReorder(true)},480)});
    o.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-x0,e.clientY-y0)>10)clearTimeout(t)});
    ['pointerup','pointercancel','pointerleave'].forEach(n=>o.addEventListener(n,()=>clearTimeout(t)));
    o.addEventListener('click',e=>{if(fired||REORDER){e.stopImmediatePropagation();e.preventDefault();fired=false}},true);
    o.addEventListener('contextmenu',e=>e.preventDefault());
  });
}

/* Rename any card, including virtual devices (Switcher, router, MOVA).
   Use an in-page dialog instead of prompt() so iOS WebView keyboard works reliably. */
function renameCard(d){
  const original=d.name||'מכשיר';
  sheet('שינוי שם',`<p>השם החדש יופיע ב־Unplug בלבד. שם המכשיר באפליקציה המקורית לא ישתנה.</p>
    <div class="field"><label for="cardName">שם המכשיר</label><input id="cardName" type="text" dir="auto" autocomplete="off" maxlength="60" value="${esc(dname(d))}" placeholder="שם המכשיר" style="min-width:0;flex:1;font-size:18px"></div>
    <div class="err" id="nameError" role="alert"></div>
    <div class="btns"><button class="btn" id="nameCancel">ביטול</button><button class="btn pri" id="nameSave">שמור שם</button></div>
    ${META.names[d.id]?`<button class="btn wide" id="nameReset">החזרת השם המקורי: ${esc(original)}</button>`:''}`,(el,close)=>{
    const input=el.querySelector('#cardName');
    const save=()=>{
      const name=input.value.trim();
      if(!name){el.querySelector('#nameError').textContent='יש להזין שם למכשיר';input.focus();return}
      if(name===original)delete META.names[d.id];
      else META.names[d.id]=name;
      saveMeta();close();render();toast('השם עודכן: '+dname(d));
    };
    el.querySelector('#nameCancel').onclick=close;
    el.querySelector('#nameSave').onclick=save;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save()}});
    const reset=el.querySelector('#nameReset');
    if(reset)reset.onclick=()=>{delete META.names[d.id];saveMeta();close();render();toast('השם המקורי הוחזר')};
    input.focus();input.select();
  });
}
function editCardDetails(d){
  sheet('עריכת '+esc(dname(d)),`<p>מה תרצה לשנות בכרטיס?</p>
    <div class="list">
      <button class="row row-btn" id="cardEditName"><span class="grow"><span class="t">שינוי שם</span><br><span class="s">${esc(dname(d))}</span></span>${svg('edit')}</button>
      <button class="row row-btn" id="cardEditIcon"><span class="grow"><span class="t">שינוי סמליל</span><br><span class="s">בחירת תמונת מוצר או סמליל</span></span>${svg('chev')}</button>
    </div>`,el=>{
      el.querySelector('#cardEditName').onclick=()=>renameCard(d);
      el.querySelector('#cardEditIcon').onclick=()=>pickIcon(d,()=>render());
    });
}
/* ---------- reorder (drag, plus arrow buttons for VoiceOver) ---------- */
function setReorder(on){REORDER=on;document.body.classList.toggle('reordering',on);const eb=document.getElementById('editBtn');eb&&eb.setAttribute('aria-pressed',on);render();}
function saveOrderFrom(grid){[...grid.querySelectorAll('.card')].forEach((c,i)=>META.order[c.dataset.id]=i+(+grid.dataset.base||0));saveMeta()}
function bindReorder(v){
  if(!REORDER)return;
  META.size=META.size||{};META.hidden=META.hidden||{};
  
  v.insertAdjacentHTML('beforeend',`<button class="btn wide addCard" id="addCard">${svg('plus')}הוספת כרטיס${Object.keys(META.hidden).length?' ('+Object.keys(META.hidden).length+' מוסתרים)':''}</button>`);
  
  v.querySelector('#addCard').onclick=()=>{const hs=DEVS.filter(d=>META.hidden[d.id]);if(!hs.length)return toast('כל המכשירים כבר מוצגים');
    sheet('הוספת כרטיס',`<div class="list">${hs.map(d=>`<button class="row row-btn" data-unh="${esc(d.id)}"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span>${svg('plus')}</button>`).join('')}</div>`,(el,cl)=>el.querySelectorAll('[data-unh]').forEach(b=>b.onclick=()=>{delete META.hidden[b.dataset.unh];saveMeta();cl();render()}))};
  v.querySelectorAll('.grid').forEach((grid,gi)=>{grid.dataset.base=gi*100;
    grid.querySelectorAll('.card').forEach(c=>{
      const id=c.dataset.id,nm=esc(c.querySelector('.nm').textContent),wide=META.size[id]==='w';
      if(META.hidden[id])c.classList.add('hiddenCard');
      c.insertAdjacentHTML('beforeend',`<div class="editActions" role="group" aria-label="פעולות עריכה עבור ${nm}"><button class="edCorner edFav" data-fav aria-pressed="${!!META.fav[id]}" aria-label="מועדף - ${nm}">${svg('star',2.4)}</button><button class="edCorner edDel" data-hide aria-label="${META.hidden[id]?'הצגת':'הסתרת'} ${nm}">${svg(META.hidden[id]?'plus':'close',2.6)}</button><button class="edCorner edSize" data-size aria-label="${wide?'כרטיס מרובע':'כרטיס מלבני'} - ${nm}">${svg(wide?'close':'plus',2.6)}</button><button class="edCorner edIcon" data-icon aria-label="עריכת שם וסמליל - ${nm}" title="עריכת שם וסמליל">${svg('edit',2.4)}</button></div>`);
      c.querySelector('[data-fav]').onclick=e=>{e.stopPropagation();META.fav[id]?delete META.fav[id]:META.fav[id]=true;saveMeta();render()};
      c.querySelector('[data-hide]').onclick=e=>{e.stopPropagation();META.hidden[id]?delete META.hidden[id]:META.hidden[id]=true;saveMeta();render()};
      c.querySelector('[data-size]').onclick=e=>{e.stopPropagation();wide?delete META.size[id]:META.size[id]='w';saveMeta();render()};
      c.querySelector('[data-icon]').onclick=e=>{e.stopPropagation();const d=window.DEVS_ALL.find(x=>x.id===id)||[typeof EMBER!=='undefined'?EMBER:null,typeof ROUTER!=='undefined'?ROUTER:null,typeof MOVA!=='undefined'?MOVA:null,typeof ORALB!=='undefined'?ORALB:null,typeof GTV!=='undefined'?GTV:null].find(x=>x&&x.id===id);if(!d)return toast('המכשיר לא נמצא');editCardDetails(d)};
      c.querySelector('[data-size]').innerHTML=wide?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
      c.insertAdjacentHTML('beforeend',`<div class="reBtns"><button data-mv="-1" aria-label="הזזת ${esc(c.querySelector('.nm').textContent)} קדימה">${svg('chev',2.4)}</button><button data-mv="1" aria-label="הזזת ${esc(c.querySelector('.nm').textContent)} אחורה">${svg('chev',2.4)}</button></div>`);
      c.querySelectorAll('[data-mv]').forEach(b=>b.onclick=e=>{e.stopPropagation();const sib=+b.dataset.mv<0?c.previousElementSibling:c.nextElementSibling;if(!sib)return;+b.dataset.mv<0?grid.insertBefore(c,sib):grid.insertBefore(sib,c);saveOrderFrom(grid);b.focus()});
      const o=c.querySelector('.open');
      o.addEventListener('pointerdown',e=>startDrag(e,c,grid,o));
    });
  });
}

/* smooth drag: the card follows the finger, a placeholder keeps its spot, neighbours slide (FLIP) */
function flip(grid,mutate){
  const items=[...grid.children],before=new Map(items.map(el=>[el,el.getBoundingClientRect()]));
  mutate();
  for(const el of items){const a=before.get(el),b=el.getBoundingClientRect();if(!a||el.classList.contains('dragging'))continue;
    const dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)continue;
    el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;el.offsetWidth;
    el.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';el.style.transform=''}
}
function startDrag(e,c,grid,o){
  if(e.target.closest('.edCorner,.reBtns')||e.button>0)return;
  e.preventDefault();
  const r=c.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
  const ph=document.createElement('div');ph.className='card dragPh'+(c.classList.contains('wide')?' wide':'');
  // Preserve the card's actual grid span without forcing a tall empty row.
  // The grid owns row sizing; a fixed placeholder height caused large gaps on iOS.
  ph.style.minHeight='0';ph.style.height=c.classList.contains('wide')?'124px':'auto';
  ph.style.aspectRatio=c.classList.contains('wide')?'auto':'1 / 1';
  grid.insertBefore(ph,c);
  Object.assign(c.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:60,transition:'none',pointerEvents:'none'});
  c.classList.add('dragging');document.body.appendChild(c);
  try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}
  let lx=e.clientX,ly=e.clientY,raf=0,scrollV=0,last=0;
  const place=()=>{raf=0;
    c.style.left=(lx-dx)+'px';c.style.top=(ly-dy)+'px';
    const now=performance.now();if(now-last<70)return;last=now;
    const sibs=[...grid.querySelectorAll('.card:not(.dragPh)')];
    if(!sibs.length)return;
    // Allow moving above the first card or below the last even when the pointer
    // is outside their bounds. This is essential for wide two-column cards.
    const first=sibs[0].getBoundingClientRect();
    const last=sibs[sibs.length-1].getBoundingClientRect();
    let ref;
    if(ly<first.top+first.height/2){ref=sibs[0]}
    else if(ly>last.bottom){ref=null}
    else{
      let best=null,bd=Infinity;
      for(const el of sibs){const b=el.getBoundingClientRect();
        const cy=b.top+b.height/2,cx=b.left+b.width/2;
        const d=Math.abs(ly-cy)*2+Math.abs(lx-cx)*0.35;
        if(d<bd){bd=d;best=el}
      }
      const b=best.getBoundingClientRect();
      const rtl=getComputedStyle(grid).direction==='rtl';
      const after=ly>b.top+b.height*.65 ||
        (ly>=b.top+b.height*.35 && (rtl?lx<b.left+b.width/2:lx>b.left+b.width/2));
      ref=after?best.nextElementSibling:best;
    }
    if(ref===ph||ref===ph.nextElementSibling)return;
    flip(grid,()=>grid.insertBefore(ph,ref));
  };
  const tick=()=>{if(scrollV){document.querySelector('.app').scrollBy(0,scrollV);if(!raf)raf=requestAnimationFrame(place)}if(c.isConnected&&c.classList.contains('dragging'))requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
  const move=ev=>{lx=ev.clientX;ly=ev.clientY;scrollV=ly<90?-10:ly>innerHeight-130?10:0;if(!raf)raf=requestAnimationFrame(place)};
  const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);scrollV=0;
    const pr=ph.getBoundingClientRect();c.style.transition='left .18s ease,top .18s ease';c.style.left=pr.left+'px';c.style.top=pr.top+'px';
    setTimeout(()=>{grid.insertBefore(c,ph);ph.remove();c.classList.remove('dragging');c.removeAttribute('style');saveOrderFrom(grid)},180)};
  addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
/* ---------- Shabbat mode ---------- */
const CITIES={jer:['ירושלים',31.778,35.235,40],ta:['תל אביב',32.085,34.782,21],hai:['חיפה',32.794,34.99,30],bs:['באר שבע',31.252,34.791,21],pt:['פתח תקווה',32.087,34.887,21],ash:['אשדוד',31.804,34.655,21]};
function sunAlt(date,lat,lng){ // solar altitude in degrees (NOAA-style approximation)
  const rad=Math.PI/180,d=date/864e5-10957.5,g=(357.529+.98560028*d)*rad,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*rad,e=(23.439-36e-8*d)*rad;
  const dec=Math.asin(Math.sin(e)*Math.sin(L)),ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),gmst=(18.697374558+24.06570982441908*d)%24;
  const ha=((gmst*15+lng)*rad-ra);return Math.asin(Math.sin(lat*rad)*Math.sin(dec)+Math.cos(lat*rad)*Math.cos(dec)*Math.cos(ha))/rad;
}
function crossTime(day,lat,lng,alt){ // first minute after 14:00 when the sun drops below alt
  const t=new Date(day);t.setHours(14,0,0,0);for(let i=0;i<480;i++){const x=new Date(t.getTime()+i*60000);if(sunAlt(x,lat,lng)<alt)return x}return null;
}
function nextShabbat(city){
  const [,lat,lng,candle]=CITIES[city]||CITIES.ta,now=new Date(),fri=new Date(now);fri.setHours(12,0,0,0);
  fri.setDate(fri.getDate()+((5-fri.getDay()+7)%7));
  const sat=new Date(fri);sat.setDate(fri.getDate()+1);
  let inT=new Date(crossTime(fri,lat,lng,-.833).getTime()-candle*60000),outT=crossTime(sat,lat,lng,-8.5);
  if(outT<now){fri.setDate(fri.getDate()+7);sat.setDate(sat.getDate()+7);inT=new Date(crossTime(fri,lat,lng,-.833).getTime()-candle*60000);outT=crossTime(sat,lat,lng,-8.5)}
  return {inT,outT};
}
const SHB=()=>LSj('unplug_shabbat',{on:false,city:'ta',acts:[],ids:[],week:''});
const fmtDay=t=>t.toLocaleDateString('he-IL',{weekday:'long'})+' '+hm(t);
async function syncShabbat(force){
  const c=SHB();if(!CFG.key||c.server)return;const {inT,outT}=nextShabbat(c.city),wk=inT.toISOString().slice(0,10);
  if(!force&&c.week===wk&&c.on)return;
  for(const id of c.ids||[])await api('/schedules/delete',{id}).catch(()=>{});
  c.ids=[];
  if(c.on){for(const a of c.acts){const d=DEVS.find(x=>x.id===a.device),pc=d&&powerCode(d);if(!pc)continue;
      const base=a.when==='in'?inT:outT,t=new Date(base.getTime()+(+a.off||0)*60000);
      if(t<new Date())continue;
      try{const j=await api('/schedules/save',{device:d.id,time:hm(t),days:[t.getDay()],cmds:[{code:pc,value:a.to==='on'}],label:'שבת',enabled:true,once:true});c.ids.push(j.id)}catch(e){}}}
  c.week=c.on?wk:'';LSset('unplug_shabbat',JSON.stringify(c));loadSched();
}
function shTimes(city){const {inT,outT}=nextShabbat(city);return `<div class="k">השבת הקרובה ב${esc((CITIES[city]||CITIES.ta)[0])}</div><div class="n" style="font-size:1.1rem">כניסה ${esc(fmtDay(inT))}<br>יציאה ${esc(fmtDay(outT))}</div>`}
function openShabbat(){
  const c=SHB(),{inT,outT}=nextShabbat(c.city),cands=DEVS.filter(powerCode);
  const actRow=(a,i)=>{const d=DEVS.find(x=>x.id===a.device);return `<div class="row"><span class="grow"><span class="t">${esc(d?dname(d):'מכשיר שהוסר')}: ${a.to==='on'?'הדלקה':'כיבוי'}</span><br><span class="s">${a.when==='in'?'בכניסת שבת':'ביציאת שבת'}${+a.off?` · ${Math.abs(a.off)} דק׳ ${a.off<0?'לפני':'אחרי'}`:''}</span></span><button class="icbtn" data-rmA="${i}" aria-label="הסרת פעולה">${svg('trash')}</button></div>`};
  sheet('מצב שבת',`<div class="ro" id="shT">${shTimes(c.city)}</div>
    <div class="list"><div class="ctl"><div class="ctl-h"><span class="t" id="shOnL">מצב שבת פעיל</span><button class="sw" id="shOn" role="switch" aria-checked="${!!c.on}" aria-labelledby="shOnL"></button></div></div></div>
    <div class="field"><label for="shC">עיר (לזמני השבת)</label><select id="shC">${Object.entries(CITIES).map(([k,[n]])=>`<option value="${k}"${k===c.city?' selected':''}>${n}</option>`).join('')}</select></div>
    <div class="sec-h" style="margin:4px 4px 0"><h2>מה קורה בשבת</h2></div>
    <div class="list" id="shL">${c.acts.length?c.acts.map(actRow).join(''):'<div class="row"><span class="s">עוד אין פעולות. למשל: להדליק את המזגן 10 דק׳ לפני כניסת שבת</span></div>'}</div>
    <div class="list"><div class="ctl">
      <div class="field"><label for="shD">מכשיר</label><select id="shD">${cands.map(d=>`<option value="${esc(d.id)}">${esc(dname(d))}</option>`).join('')}</select></div>
      <div class="seg" role="group" aria-label="מה לעשות"><button data-to="on" aria-pressed="true">הדלקה</button><button data-to="off" aria-pressed="false">כיבוי</button></div>
      <div class="seg" role="group" aria-label="מתי"><button data-wh="in" aria-pressed="true">בכניסת שבת</button><button data-wh="out" aria-pressed="false">ביציאת שבת</button></div>
      <div class="field"><label for="shO">הפרש בדקות (מינוס = לפני)</label><input id="shO" type="number" inputmode="numeric" value="0" style="direction:ltr;text-align:center"></div>
      <button class="btn wide" id="shA">${svg('plus')}הוספת פעולה</button></div></div>
    <p style="font-size:.92rem">כולל חגים. השרת מחשב את הזמנים לפי העיר ומפעיל לבד כל שבוע, גם כשהטלפון כבוי. לא צריך לפתוח את האפליקציה.</p>
    <button class="btn pri wide" id="shS">שמירה</button>`,(el,close)=>{
    let to='on',wh='in';
    el.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{to=b.dataset.to;el.querySelectorAll('[data-to]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    el.querySelectorAll('[data-wh]').forEach(b=>b.onclick=()=>{wh=b.dataset.wh;el.querySelectorAll('[data-wh]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    const drawL=()=>{el.querySelector('#shL').innerHTML=c.acts.length?c.acts.map(actRow).join(''):'<div class="row"><span class="s">עוד אין פעולות</span></div>';el.querySelectorAll('[data-rmA]').forEach(b=>b.onclick=()=>{c.acts.splice(+b.dataset.rma,1);drawL();doSave(false)})};drawL();
    el.querySelector('#shA').onclick=()=>{const dv=el.querySelector('#shD').value;if(!dv)return;c.acts.push({device:dv,to,when:wh,off:Math.round(+el.querySelector('#shO').value||0)});drawL();doSave(false)};
    /* saved at once when the switch or the city changes, and with the button */
    const doSave=async(closeAfter)=>{c.on=el.querySelector('#shOn').getAttribute('aria-checked')==='true';c.city=el.querySelector('#shC').value;
      const b=el.querySelector('#shS');b.disabled=true;const bt=b.textContent;b.textContent='שומר...';
      const done=()=>{b.disabled=false;b.textContent=bt;render();if(closeAfter)close();toast(c.on?(c.acts.length?'מצב שבת פעיל':'מצב שבת פעיל. עכשיו מוסיפים פעולות'):'מצב שבת כבוי')};
      /* the server runs Shabbat and holidays (Hebcal); the old way was one-off schedules from the phone */
      if(typeof homeLoad==='function'&&await homeLoad()){const [,lat,lng,candle]=CITIES[c.city]||CITIES.ta;
        HOME.shabbat={on:c.on,lat,lon:lng,candle,city:c.city,acts:c.acts.map(a=>{const d=DEVS.find(x=>x.id===a.device);return {...a,pcode:(d&&powerCode(d))||'switch'}})};
        if(await homeSave()&&await homeLoad()&&HOME.shabbat){for(const id of c.ids||[])await api('/schedules/delete',{id}).catch(()=>{});c.ids=[];c.server=true;c.week='';LSset('unplug_shabbat',JSON.stringify(c));loadSched();return done()}}
      c.server=false;LSset('unplug_shabbat',JSON.stringify(c));await syncShabbat(true);done()};
    el.querySelector('#shOn').onclick=()=>{const b=el.querySelector('#shOn');b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true');doSave(false)};
    el.querySelector('#shC').onchange=()=>{el.querySelector('#shT').innerHTML=shTimes(el.querySelector('#shC').value);doSave(false)};
    el.querySelector('#shS').onclick=()=>doSave(true);
  });
}
