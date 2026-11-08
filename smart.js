/* HomeOn smart features: free-Hebrew commands, house guard, leave/arrive automations.
   Loaded after the main script and extras.js; uses their globals. */
'use strict';

/* ======================= free-Hebrew commands ======================= */
const NUMW={'אחת':1,'אחד':1,'שתיים':2,'שניים':2,'שתי':2,'שני':2,'שלוש':3,'שלושה':3,'ארבע':4,'ארבעה':4,'חמש':5,'חמישה':5,'שש':6,'שישה':6,'שבע':7,'שבעה':7,'שמונה':8,'תשע':9,'תשעה':9,'עשר':10,'עשרה':10,'רבע':15,'עשרים':20,'שלושים':30,'ארבעים':40,'חמישים':50};
const normTxt=t=>' '+String(t).toLowerCase().replace(/[״"׳'.,!?]/g,' ').replace(/\s+/g,' ').trim()+' ';
function parseDelay(t){
  // "בעוד חצי שעה" / "בעוד שעה" / "בעוד 20 דקות" / "בעוד שעתיים" / "בעוד רבע שעה"
  let m=t.match(/בעוד (\S+)?\s*(דקות|דק|דקה|שעות|שעה|שעתיים|חצי שעה|רבע שעה)/);
  if(t.includes('בעוד חצי שעה'))return 30;if(t.includes('בעוד רבע שעה'))return 15;if(t.includes('בעוד שעתיים'))return 120;
  if(t.includes('בעוד שעה וחצי'))return 90;if(/בעוד שעה /.test(t))return 60;
  if(m){const n=+m[1]||NUMW[m[1]]||1;return /שע/.test(m[2])?n*60:n}
  return 0;
}
function parseAt(t){
  // "ב-22:30" / "בשעה 7" / "בשעה 7 וחצי" / "ב 23"
  let m=t.match(/(?:בשעה|ב-?|ב )\s?(\d{1,2})(?::(\d{2}))?( וחצי| ורבע)?/);
  if(!m||(!/בשעה/.test(t)&&!m[2]))return null;
  let h=+m[1],mi=m[2]?+m[2]:m[3]===' וחצי'?30:m[3]===' ורבע'?15:0;if(h>23||mi>59)return null;
  const d=new Date();d.setHours(h,mi,0,0);if(d<=new Date()){if(h<12&&!m[2]){d.setHours(h+12)}if(d<=new Date())d.setDate(d.getDate()+1)}return d;
}
function devWords(d){return [dname(d),d.name||'',catOf(d)[0],(REALN[iconOf(d)]||'')].join(' ').toLowerCase()}
function parseCommand(raw){
  const t=normTxt(raw),out={actions:[],when:null,text:raw};
  const on=/ (תדליק|הדלק|להדליק|תפעיל|הפעל|להפעיל|דלוק|תפתח|פתח) /.test(t),off=/ (תכבה|כבה|לכבות|תסגור|סגור|כבוי|תנתק) /.test(t);
  const temp=(t.match(/(\d{2})\s*(מעלות|°)?/)||[])[1],tnum=temp&&+temp>=16&&+temp<=31?+temp:null;
  const modeW=[[/קירור|לקרר|קר /,'cold'],[/חימום|לחמם|חם /,'hot'],[/ייבוש/,'wet'],[/אוורור|מאוורר בלבד/,'wind'],[/אוטו/,'auto']].find(([r])=>r.test(t));
  const delay=parseDelay(t),at=parseAt(t);
  out.when=delay?new Date(Date.now()+delay*60000):at;
  // which devices: by room, by name, by kind word, or everything
  const all=(window.DEVS_ALL||DEVS).concat(META.ember===false?[]:[EMBER]),home=all.filter(inHome),rooms=roomsOf(META.home);
  let targets=[];
  const room=rooms.find(r=>t.includes(' '+r.toLowerCase()+' ')||t.includes('ב'+r.toLowerCase()+' '));
  const named=home.filter(d=>{const n=dname(d).toLowerCase();return n.length>1&&t.includes(n)});
  if(named.length)targets=named;
  else{
    const kinds=[[/מזגן|מזגנים|מיזוג/,['ac','portac']],[/אור|אורות|מנורה|מנורות|תאורה|נורה|נורות|לד/,['bulb','lamp','ceiling','led','walllight','gardenlight']],[/טוסטר/,['toaster']],[/קומקום/,['kettle']],[/מאוורר/,['fan','ceilfan','towerfan']],[/דוד/,['boiler']],[/תריס|וילון/,['curtain']],[/שקע|שקעים|תקע|פלאג/,['plug','strip','adapter']]];
    const k=kinds.find(([r])=>r.test(t));
    let pool=room?home.filter(d=>roomOf(d)===room):home;
    if(k)targets=pool.filter(d=>k[1].includes(iconOf(d))||k[0].test(devWords(d)));
    else if(/ הכול | הכל | כל /.test(t)||room)targets=pool;
  }
  targets=targets.filter(d=>powerCode(d)||d.virtual);
  for(const d of targets){
    if(d.virtual){if(!on&&!off)continue;out.actions.push({d,ember:off?'off':'on?m=30',label:off?'כיבוי':'הדלקה ל-30 דק׳'});continue}
    const cmds=[],pc=powerCode(d),fn=c=>(d.functions||[]).find(f=>f.code===c);
    if(off)cmds.push({code:pc,value:false});
    else{
      if(on||tnum||modeW)cmds.push({code:pc,value:true});
      if(tnum&&fn('temp_set')){const f=fn('temp_set'),sc=+(f.values&&f.values.scale)||0;cmds.push({code:'temp_set',value:tnum*10**sc})}
      if(modeW&&fn('mode')&&(fn('mode').values.range||[]).includes(modeW[1]))cmds.push({code:'mode',value:modeW[1]});
    }
    if(cmds.length)out.actions.push({d,cmds,label:cmdsText({device:d.id,cmds})});
  }
  return out;
}
async function runCommand(p){
  let ok=0,bad=0;
  for(const a of p.actions){
    try{
      if(a.ember){emberGo(a.ember);ok++;continue}
      if(p.when){const t=p.when;
        await api('/schedules/save',{device:a.d.id,time:hm(t),days:[t.getDay()],cmds:a.cmds,label:'פקודה: '+p.text.slice(0,40),enabled:true,once:true});ok++}
      else{await send(a.d,a.cmds);ok++}
    }catch(e){bad++}
  }
  if(p.when)loadSched().catch(()=>{});
  addLog('פקודה',p.text);
  toast(bad?`בוצעו ${ok}, נכשלו ${bad}`:p.when?`נקבע ל-${hm(p.when)}`:'בוצע');
}
function bindCmdBar(v){
  const f=v.querySelector('#qF');if(!f)return;const i=f.querySelector('#q');
  const go=txt=>{const p=parseCommand(txt);if(p.actions.length){i.blur();previewCommand(txt)}else i.blur()};
  f.onsubmit=e=>{e.preventDefault();const txt=i.value.trim();if(txt)go(txt)};
  const b=v.querySelector('#qDo');if(b)b.onclick=()=>previewCommand(i.value.trim());
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition,mic=f.querySelector('#cmdMic');
  if(!SR){mic.onclick=()=>{i.focus();toast('אפשר להכתיב עם המיקרופון שבמקלדת')};return}
  mic.onclick=()=>{try{const r=new SR();r.lang='he-IL';r.interimResults=false;r.maxAlternatives=1;mic.classList.add('rec');mic.setAttribute('aria-label','מקשיב...');
    r.onresult=e=>{const txt=e.results[0][0].transcript;Q=txt;render();if(parseCommand(txt).actions.length)previewCommand(txt)};
    r.onend=()=>{const m=document.getElementById('cmdMic');if(m){m.classList.remove('rec');m.setAttribute('aria-label','הכתבה קולית')}};r.onerror=()=>toast('לא שמעתי, נסה שוב');r.start()}catch(e){i.focus()}};
}
function previewCommand(txt){
  const p=parseCommand(txt);
  if(!p.actions.length){sheet('לא הבנתי',`<p>"${esc(txt)}"</p><p>נסה למשל:</p><ul class="cmdEx"><li>תדליק את המזגן על 23</li><li>תכבה הכול במטבח</li><li>בעוד שעה תכבה את הטוסטר</li><li>בשעה 22:30 תכבה את האורות</li><li>תדליק את הדוד</li></ul>`);return}
  sheet(p.when?`ב-${hm(p.when)}`:'לבצע?',`<p>"${esc(txt)}"</p><div class="list">${p.actions.map(a=>`<div class="row"><span class="mini">${devArt(a.d)}</span><span class="grow"><span class="t">${esc(dname(a.d))}</span><br><span class="s">${esc(a.label)}</span></span></div>`).join('')}</div>
    <div class="btns"><button class="btn" data-x2>ביטול</button><button class="btn pri" id="cmdGo">${p.when?'קבע':'בצע'}</button></div>`,(el,close)=>{
    el.querySelector('[data-x2]').onclick=close;el.querySelector('#cmdGo').onclick=()=>{close();runCommand(p);Q='';render()};
    el.querySelector('#cmdGo').focus()});
}

/* ======================= house guard ======================= */
let GUARD=null;
async function loadGuard(){try{GUARD=(await api('/guard')).guard||{rules:[]};return true}catch(e){GUARD=null;return false}}
function guardText(r){return r.kind==='on_long'?`התראה אם דלוק יותר מ-${r.minutes<60?r.minutes+' דק׳':r.minutes/60+' שע׳'}`:'התראה כשמסיים (לפי צריכת חשמל)'}
async function openGuard(){
  const ok=await loadGuard();
  if(!ok){sheet('שומר בית',`<p>שומר הבית רץ בשרת, וצריך לעדכן את השרת פעם אחת מהמחשב.</p><p>בפעם הבאה שתהיה ליד המחשב, תכתוב לי "ליד המחשב".</p>`);return}
  const draw=el=>{el.querySelector('#gdL').innerHTML=GUARD.rules.length?GUARD.rules.map((r,i)=>{const d=DEVS.find(x=>x.id===r.device);
    return `<div class="row"><span class="mini">${d?devArt(d):''}</span><span class="grow"><span class="t">${esc(d?dname(d):r.name||'מכשיר')}</span><br><span class="s">${esc(guardText(r))}</span></span>
      <button class="sw" role="switch" data-gr="${i}" aria-checked="${r.enabled!==false}" aria-label="פעיל"></button><button class="icbtn" data-gdel="${i}" aria-label="מחיקה">${svg('trash')}</button></div>`}).join(''):'<div class="row"><span class="s">עוד אין כללים</span></div>';
    el.querySelectorAll('[data-gr]').forEach(b=>b.onclick=async()=>{const r=GUARD.rules[+b.dataset.gr];r.enabled=r.enabled===false;await saveGuard();draw(el)});
    el.querySelectorAll('[data-gdel]').forEach(b=>b.onclick=async()=>{GUARD.rules.splice(+b.dataset.gdel,1);await saveGuard();draw(el)})};
  sheet('שומר בית',`<p>מקבלים התראה לטלפון כשמשהו נשאר דלוק יותר מדי, או כשמכונה סיימה לעבוד.${LS('unplug_push')?'':' <b>צריך להפעיל התראות בהגדרות.</b>'}</p>
    <div class="list" id="gdL"></div><button class="btn pri wide" id="gdA">${svg('plus')}כלל חדש</button>
    <button class="btn wide" id="gdS">הצעות מוכנות</button>`,(el,close)=>{
    draw(el);
    el.querySelector('#gdA').onclick=()=>pickDevice('איזה מכשיר לשמור?',d=>newGuardRule(d));
    el.querySelector('#gdS').onclick=async()=>{const add=[];for(const d of DEVS){const k=iconOf(d);if(!powerCode(d)||GUARD.rules.some(r=>r.device===d.id))continue;
        if(['toaster','kettle','heater','fanheater','blanket','oven','toasteroven','airfryer','coffee'].includes(k))add.push(ruleFor(d,'on_long',k==='toaster'?10:k==='blanket'?120:30));
        else if(['washer','dryer','dish'].includes(k)&&d.status.cur_power!=null)add.push(ruleFor(d,'done',10));
        else if(['ac','portac'].includes(k))add.push(ruleFor(d,'on_long',300))}
      if(!add.length)return toast('אין הצעות חדשות');GUARD.rules.push(...add);await saveGuard();draw(el);toast(`נוספו ${add.length} כללים`)};
  });
}
function ruleFor(d,kind,minutes){const f=(d.statusRange||[]).concat(d.functions||[]).find(x=>x.code==='cur_power');
  return {id:Math.random().toString(36).slice(2,8),device:d.id,kind,minutes,name:dname(d),pcode:powerCode(d)||'',scale:+(f&&f.values&&f.values.scale)||0,enabled:true}}
function newGuardRule(d){
  const hasW=d.status&&d.status.cur_power!=null;
  sheet(esc(dname(d)),`<div class="list"><div class="ctl"><div class="ctl-h"><span class="t" id="gkL">מתי להתריע?</span></div>
    <div class="seg" role="group" aria-labelledby="gkL"><button data-gk="on_long" aria-pressed="true">נשאר דלוק</button>${hasW?'<button data-gk="done" aria-pressed="false">סיים לעבוד</button>':''}</div></div>
    <div class="ctl" id="gmB"><div class="ctl-h"><span class="t" id="gmL">אחרי כמה זמן דלוק?</span></div>
    <div class="seg" role="group" aria-labelledby="gmL">${[10,20,30,60,120,240].map(m=>`<button data-gm="${m}" aria-pressed="${m===30}">${m<60?m+' דק׳':m/60+' שע׳'}</button>`).join('')}</div></div></div>
    <button class="btn pri wide" id="gkS">שמירה</button>`,(el,close)=>{
    let kind='on_long',min=30;
    el.querySelectorAll('[data-gk]').forEach(b=>b.onclick=()=>{kind=b.dataset.gk;el.querySelectorAll('[data-gk]').forEach(x=>x.setAttribute('aria-pressed',x===b));el.querySelector('#gmB').hidden=kind==='done';if(kind==='done')min=10});
    el.querySelectorAll('[data-gm]').forEach(b=>b.onclick=()=>{min=+b.dataset.gm;el.querySelectorAll('[data-gm]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    el.querySelector('#gkS').onclick=async()=>{GUARD.rules.push(ruleFor(d,kind,min));await saveGuard();close();openGuard();toast('נשמר')};
  });
}
async function saveGuard(){try{await api('/guard/save',{rules:GUARD.rules})}catch(e){toast(e.message)}}

/* ======================= leave / arrive ======================= */
async function openPresence(){
  let tok;try{tok=(await api('/token')).token}catch(e){return toast(e.message)}
  const P=LSj('unplug_presence',{leave:null,arrive:[]});
  const ds=DEVS.filter(powerCode);
  if(!P.leave)P.leave=ds.map(d=>d.id);
  const link=items=>`${CFG.api.replace(/\/$/,'')}/act?k=${encodeURIComponent(tok)}&m=${b64url(items)}`;
  const leaveItems=()=>P.leave.map(id=>DEVS.find(d=>d.id===id)).filter(Boolean).map(d=>({d:d.id,c:[{code:powerCode(d),value:false}]}));
  const arriveItems=()=>P.arrive.map(a=>({d:a.d,c:a.c}));
  const render2=el=>{
    el.querySelector('#plL').innerHTML=ds.map(d=>`<label class="row"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span><input type="checkbox" data-pl="${esc(d.id)}" ${P.leave.includes(d.id)?'checked':''} style="width:28px;height:28px;accent-color:var(--gold)"></label>`).join('');
    el.querySelector('#paL').innerHTML=P.arrive.length?P.arrive.map((a,i)=>{const d=DEVS.find(x=>x.id===a.d);return `<div class="row"><span class="mini">${d?devArt(d):''}</span><span class="grow"><span class="t">${esc(d?dname(d):'מכשיר')}</span><br><span class="s">${esc(cmdsText({device:a.d,cmds:a.c}))}</span></span><button class="icbtn" data-pad="${i}" aria-label="הסרה">${svg('trash')}</button></div>`}).join(''):'<div class="row"><span class="s">עוד אין פעולות</span></div>';
    el.querySelectorAll('[data-pl]').forEach(b=>b.onchange=()=>{P.leave=[...el.querySelectorAll('[data-pl]:checked')].map(x=>x.dataset.pl);LSset('unplug_presence',JSON.stringify(P))});
    el.querySelectorAll('[data-pad]').forEach(b=>b.onclick=()=>{P.arrive.splice(+b.dataset.pad,1);LSset('unplug_presence',JSON.stringify(P));render2(el)});
  };
  sheet('יצאתי / חזרתי',`<p>האייפון מזהה כשאתה יוצא מהבית או מגיע אליו, ומפעיל את HomeOn לבד. מגדירים פעם אחת באפליקציית <b>קיצורים</b>.</p>
    <div class="sec-h" style="margin:6px 4px 0"><h2>כשאני יוצא - לכבות</h2></div><div class="list" id="plL"></div>
    <button class="btn wide" id="plC">${svg('save')}העתקת קישור "יצאתי"</button>
    <div class="sec-h" style="margin:6px 4px 0"><h2>כשאני חוזר</h2></div><div class="list" id="paL"></div>
    <button class="btn wide" id="paA">${svg('plus')}הוספת פעולה</button><button class="btn wide" id="paC">${svg('save')}העתקת קישור "חזרתי"</button>
    <div class="list"><button class="row row-btn" id="pHow"><span class="grow"><span class="t">איך מחברים לאייפון?</span><br><span class="s">4 צעדים, פעם אחת</span></span>${svg('chev')}</button></div>`,(el)=>{
    render2(el);
    const copy=(items,what)=>{if(!items.length)return toast('אין פעולות');navigator.clipboard?.writeText(link(items)).then(()=>toast(`הקישור "${what}" הועתק`),()=>toast('ההעתקה לא הצליחה'))};
    el.querySelector('#plC').onclick=()=>copy(leaveItems(),'יצאתי');
    el.querySelector('#paC').onclick=()=>copy(arriveItems(),'חזרתי');
    el.querySelector('#paA').onclick=()=>pickDevice('מה להפעיל כשאני חוזר?',d=>{const ed=actionEditor(d);
      sheet(esc(dname(d)),ed.html+`<button class="btn pri wide" id="aOk">הוספה</button>`,(e2,c2)=>{const g=ed.bind(e2);e2.querySelector('#aOk').onclick=()=>{const c=g();if(!c)return;P.arrive.push({d:d.id,c:[c]});LSset('unplug_presence',JSON.stringify(P));c2();openPresence()}})});
    el.querySelector('#pHow').onclick=()=>sheet('חיבור לאייפון',`<ol>
      <li>פתח את <b>קיצורים</b> ← <b>אוטומציה</b> ← <b>+</b> ← <b>יציאה</b>, ובחר את מיקום הבית</li>
      <li>סמן <b>הפעל מיד</b> ← <b>הבא</b> ← <b>אוטומציה ריקה חדשה</b></li>
      <li>הוסף פעולה <b>קבל תוכן של URL</b>, והדבק את הקישור "יצאתי"</li>
      <li>אותו דבר עם <b>הגעה</b> והקישור "חזרתי"</li></ol>
      <p style="font-size:.9rem">הקישורים פרטיים - מי שיש לו אותם יכול להפעיל את המכשירים.</p>`);
  });
}
