/* HomeOn - what only the installed app can do:
   Siri for every device and scene, real home-screen widget, washer countdown on the lock screen,
   and leaving / coming home detected by the iPhone itself. In Safari nothing here changes. */
if(IN_APP){
/* ---------- hand devices, scenes and the widget choice to the app (Siri + widget) ---------- */
let nsSig='',nsT=0;
function nativeSync(){clearTimeout(nsT);nsT=setTimeout(()=>{if(!CFG.key)return;
  const devices=DEVS.filter(d=>!d.virtual&&powerCode(d)).map(d=>({id:d.id,name:dname(d),pcode:powerCode(d),room:roomOf(d)||'',on:isOn(d),online:d.online!==false}));
  const scenes=SCENES.map((sc,i)=>({id:sc.id||('s'+i+'_'+sc.name),name:sc.name,acts:sc.acts.map(a=>({device:a.device,cmds:[a.cmd]}))}));
  const widget=LSj('unplug_widget',null)||[];
  const msg={action:'config',api:CFG.api,key:CFG.key,devices,scenes,widget};
  const sig=JSON.stringify(msg);if(sig===nsSig)return;nsSig=sig;nativeCall(msg).catch(()=>{nsSig=''})},1200)}
const _render=render;render=function(){const r=_render.apply(this,arguments);nativeSync();washLive();return r};

/* ---------- washer countdown on the lock screen ---------- */
const WL={};
function washLive(){if(typeof isWasher!=='function')return;
  for(const d of DEVS.filter(isWasher)){let s;try{s=wNow(d)}catch(e){continue}
    const prev=WL[d.id];
    if(s.running&&s.left!=null){const end=Date.now()+s.left*60e3;
      if(!prev||Math.abs(prev.end-end)>90e3||prev.phase!==s.phase){WL[d.id]={end,phase:s.phase};nativeCall({action:'activity',id:d.id,name:dname(d),end,phase:s.phase||'מכבסת'}).catch(()=>{})}}
    else if(prev){delete WL[d.id];nativeCall({action:'activity',cmd:'end',id:d.id,done:!!s.end}).catch(()=>{})}}}
setInterval(()=>{if(document.visibilityState==='visible')washLive()},30000);

/* ---------- Siri: plain sentences, no links ---------- */
const _openSiri=openSiri;
openSiri=function(){nativeSync();
  const ds=DEVS.filter(d=>!d.virtual&&powerCode(d)),ex=ds[0]?dname(ds[0]):'המזגן',sc=SCENES[0]&&SCENES[0].name;
  sheet('Siri',`<p>אומרים לסירי, בלי להגדיר כלום:</p>
    <div class="list">
      <div class="row"><span class="grow t"><b>תדליק את ${esc(ex)} ב-HomeOn</b></span></div>
      <div class="row"><span class="grow t"><b>תכבה את ${esc(ex)} ב-HomeOn</b></span></div>
      ${sc?`<div class="row"><span class="grow t"><b>תפעיל ${esc(sc)} ב-HomeOn</b></span></div>`:''}
      <div class="row"><span class="grow t"><b>תדליק את הדוד ב-HomeOn</b></span></div>
      <div class="row"><span class="grow t"><b>תפתח נטפליקס בטלוויזיה ב-HomeOn</b></span></div></div>
    <p>עובד עם כל המכשירים${SCENES.length?' והסצנות':''} שלך, בשמות שמופיעים באפליקציה. בפעם הראשונה סירי ישאל אם לאשר.</p>
    <p class="s">כל הפקודות נמצאות גם באפליקציית <b>קיצורים</b>, תחת HomeOn, ואפשר לשים אותן בכפתור הפעולה או במרכז הבקרה.</p>
    <div class="list"><button class="row row-btn" id="siOld"><span class="grow"><span class="t">קישורים לקיצורים</span><br><span class="s">לשימוש מתקדם</span></span>${svg('chev')}</button></div>`,(el)=>{
    el.querySelector('#siOld').onclick=()=>_openSiri()});
};

/* ---------- widget: native, pick up to 12 devices ---------- */
openWidget=function(){
  let pick=LSj('unplug_widget',null)||DEVS.filter(d=>!d.virtual&&powerCode(d)&&META.fav[d.id]).map(d=>d.id).slice(0,6);
  const draw=el=>{const list=DEVS.filter(d=>!d.virtual&&powerCode(d));
    el.querySelector('#wgL').innerHTML=list.map(d=>{const k=pick.indexOf(d.id);return `<button class="row row-btn" role="checkbox" aria-checked="${k>=0}" data-wg="${esc(d.id)}"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span><span aria-hidden="true" style="font-size:1.1rem;font-weight:700;color:#6fa8ff">${k>=0?k+1:''}</span></button>`}).join('');
    el.querySelectorAll('[data-wg]').forEach(b=>b.onclick=()=>{const id=b.dataset.wg;if(pick.includes(id))pick=pick.filter(x=>x!==id);else{if(pick.length>=12)return toast('עד 12 מכשירים');pick.push(id)}
      LSset('unplug_widget',JSON.stringify(pick));nativeSync();draw(el)})};
  sheet('ווידג׳ט למסך הבית',`<p>כפתורי הדלקה וכיבוי במסך הבית. לחיצה מדליקה או מכבה, בלי לפתוח את האפליקציה.</p>
    <div class="sec-h"><h2>אילו מכשירים, לפי הסדר</h2></div><div class="list" id="wgL"></div>
    <p class="s">קטן מציג 4, בינוני 6, גדול 12. בלי בחירה יופיעו המכשירים הראשונים.</p>
    <div class="sec-h"><h2>הוספה למסך הבית</h2></div>
    <ol style="line-height:1.7;padding-inline-start:22px;margin:0">
      <li>לחיצה ארוכה על מקום ריק במסך הבית ← <b>עריכה</b> ← <b>הוספת וידג׳ט</b></li>
      <li>לחפש <b>HomeOn</b> ← <b>מכשירים</b> ← לבחור גודל</li></ol>`,(el)=>draw(el));
};

/* ---------- leaving / coming home, by the iPhone itself ---------- */
openPresence=async function(){
  let tok;try{tok=(await api('/token')).token}catch(e){return toast(e.message)}
  const P=LSj('unplug_presence',{leave:null,arrive:[]});const ds=DEVS.filter(powerCode);
  if(!P.leave)P.leave=ds.map(d=>d.id);
  const link=items=>items.length?`${CFG.api.replace(/\/$/,'')}/act?k=${encodeURIComponent(tok)}&m=${b64url(items)}`:'';
  const leaveL=()=>link(P.leave.map(id=>DEVS.find(d=>d.id===id)).filter(Boolean).map(d=>({d:d.id,c:[{code:powerCode(d),value:false}]})));
  const arriveL=()=>link(P.arrive.map(a=>({d:a.d,c:a.c})));
  const save=()=>{LSset('unplug_presence',JSON.stringify(P));nativeCall({action:'geo',cmd:'links',leave:leaveL(),arrive:arriveL()}).catch(()=>{})};
  let G={};try{G=JSON.parse(await nativeCall({action:'geo',cmd:'state'}))}catch(e){}
  const authT={always:'',inuse:'המיקום מאושר רק בזמן שימוש. כדי שזה יעבוד כשהאפליקציה סגורה, צריך "תמיד".',denied:'המיקום חסום. צריך לאשר בהגדרות.',none:''};
  sheet('יצאתי / חזרתי',`<p>האייפון מזהה לבד כשאתה יוצא מהבית או מגיע אליו, גם כשהאפליקציה סגורה.</p>
    <div class="list" id="gSt"></div>
    <div class="sec-h" style="margin:6px 4px 0"><h2>כשאני יוצא - לכבות</h2></div><div class="list" id="plL"></div>
    <div class="sec-h" style="margin:6px 4px 0"><h2>כשאני חוזר</h2></div><div class="list" id="paL"></div>
    <button class="btn wide" id="paA">${svg('plus')}הוספת פעולה</button>
    <p class="s">כל פעם שזה קורה תקבל הודעה קצרה מה בוצע.</p>`,(el,close)=>{
    const drawSt=()=>{const on=!!G.on,warn=authT[G.auth]||'';
      el.querySelector('#gSt').innerHTML=`<div class="ctl"><div class="ctl-h"><span class="t" id="gOnL">פעיל</span><button class="sw" id="gOn" role="switch" aria-checked="${on}" aria-labelledby="gOnL"></button></div></div>
        <button class="row row-btn" id="gHere"><span class="grow"><span class="t">${G.hasHome?'הבית מסומן':'לסמן איפה הבית'}</span><br><span class="s">${G.hasHome?'לחיצה כשאתה בבית מעדכנת את המיקום':'לוחצים כשאתה בבית'}</span></span>${svg('chev')}</button>
        <div class="ctl"><div class="ctl-h"><span class="t" id="gRL">כמה רחוק נחשב "יצאתי"</span></div><div class="seg" role="group" aria-labelledby="gRL">${[150,300,500].map(r=>`<button data-gr="${r}" aria-pressed="${Math.round(G.radius||150)===r}">${r} מ׳</button>`).join('')}</div></div>
        ${warn?`<button class="row row-btn" id="gSet"><span class="grow"><span class="t">${esc(warn)}</span><br><span class="s">פתיחת ההגדרות ← מיקום ← תמיד</span></span>${svg('chev')}</button>`:''}
        ${G.last?`<div class="row"><span class="s">אחרון: ${esc(G.last)}</span></div>`:''}`;
      el.querySelector('#gHere').onclick=async()=>{toast('מאתר מיקום...');try{G=JSON.parse(await nativeCall({action:'geo',cmd:'here'}));
        if(G.lat!=null&&typeof homeLoad==='function'&&await homeLoad()){HOME.loc={lat:G.lat,lon:G.lon,name:'בית'};homeSave()}toast('הבית סומן');drawSt()}catch(e){toast(e.message||'לא הצלחתי')}};
      el.querySelector('#gOn').onclick=async()=>{try{G=JSON.parse(await nativeCall(G.on?{action:'geo',cmd:'disable'}:{action:'geo',cmd:'enable',leave:leaveL(),arrive:arriveL(),radius:G.radius||150}));toast(G.on?'פעיל':'כבוי');drawSt()}catch(e){toast(e.message||'לא הצלחתי')}};
      el.querySelectorAll('[data-gr]').forEach(b=>b.onclick=async()=>{G.radius=+b.dataset.gr;if(G.on){try{G=JSON.parse(await nativeCall({action:'geo',cmd:'enable',leave:leaveL(),arrive:arriveL(),radius:G.radius}))}catch(e){}}drawSt()});
      const st=el.querySelector('#gSet');if(st)st.onclick=()=>nativeCall({action:'geo',cmd:'settings'})};
    const drawL=()=>{
      el.querySelector('#plL').innerHTML=ds.map(d=>`<label class="row"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span><input type="checkbox" data-pl="${esc(d.id)}" ${P.leave.includes(d.id)?'checked':''} style="width:28px;height:28px;accent-color:#3d8bff"></label>`).join('');
      el.querySelector('#paL').innerHTML=P.arrive.length?P.arrive.map((a,i)=>{const d=DEVS.find(x=>x.id===a.d);return `<div class="row"><span class="mini">${d?devArt(d):''}</span><span class="grow"><span class="t">${esc(d?dname(d):'מכשיר')}</span><br><span class="s">${esc(cmdsText({device:a.d,cmds:a.c}))}</span></span><button class="icbtn" data-pad="${i}" aria-label="הסרה">${svg('trash')}</button></div>`}).join(''):'<div class="row"><span class="s">עוד אין פעולות. למשל: להדליק את המזגן</span></div>';
      el.querySelectorAll('[data-pl]').forEach(b=>b.onchange=()=>{P.leave=[...el.querySelectorAll('[data-pl]:checked')].map(x=>x.dataset.pl);save()});
      el.querySelectorAll('[data-pad]').forEach(b=>b.onclick=()=>{P.arrive.splice(+b.dataset.pad,1);save();drawL()})};
    drawSt();drawL();
    el.querySelector('#paA').onclick=()=>pickDevice('מה להפעיל כשאני חוזר?',d=>{const ed=actionEditor(d);
      sheet(esc(dname(d)),ed.html+`<button class="btn pri wide" id="aOk">הוספה</button>`,(e2,c2)=>{const g=ed.bind(e2);e2.querySelector('#aOk').onclick=()=>{const c=g();if(!c)return;P.arrive.push({d:d.id,c:[c]});save();c2();drawL()}})});
  });
};
nativeSync();
}
