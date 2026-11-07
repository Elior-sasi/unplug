/* HomeOn - "what's running now" strip on the home screen, and the home-screen widget (Scriptable) setup. */
function liveItems(){
  const out=[],name=id=>{const d=DEVS.find(x=>x.id===id);return d?dname(d):'מכשיר'};
  for(const s of SCHED.filter(s=>s.once&&s.label==='טיימר'&&s.enabled!==false)){const on=s.cmds?.[0]?.value===true;
    out.push({id:s.device,ic:'clock',kind:'timer',scheduleId:s.id,t:`${name(s.device)} ${on?'יידלק':'ייכבה'} ב-${s.time}`})}
  const cyc={};for(const s of SCHED.filter(s=>s.label==='מחזור לילה'))(cyc[s.device]=cyc[s.device]||[]).push(s.time);
  for(const id in cyc){const t=cyc[id].sort();out.push({id,ic:'moon',kind:'night',t:`${name(id)}: מחזור לילה עד ${t[t.length-1]}`})}
  if(typeof isWasher==='function')for(const d of DEVS.filter(isWasher)){const s=wNow(d);
    if(s.running)out.push({id:d.id,ic:'washer',kind:'washer',t:s.left!=null?`${dname(d)} מסיימת ב-${hm(new Date(Date.now()+s.left*60e3))}`:`${dname(d)} עובדת`});
    else if(s.end&&Date.now()-s.end<3*3600e3)out.push({id:d.id,ic:'washer',t:`${dname(d)} סיימה ב-${hm(new Date(s.end))}`})}
  return out}
function liveStripHtml(){const it=liveItems();if(!it.length)return '';
  return `<div class="live" role="list" aria-label="פועל עכשיו">${it.map(x=>`<button class="livePill" role="listitem" data-live="${esc(x.id)}" data-kind="${x.kind||''}" data-schedule="${esc(x.scheduleId??'')}">${x.ic==='washer'?'🫧':x.ic==='moon'?'🌙':'⏱'}<span>${esc(x.t)}</span></button>`).join('')}</div>`}
async function cancelNightCycle(id,el,close){
  const err=el.querySelector('#nightCancelError'),btn=el.querySelector('#nightCancelButton');
  btn.disabled=true;err.textContent='';
  try{
    const targets=SCHED.filter(s=>String(s.device)===String(id)&&s.label==='מחזור לילה');
    if(!targets.length){close();render();return}
    for(const s of targets){if(s.id==null)throw new Error('לתזמון אין מזהה שרת');await api('/schedules/delete',{id:s.id})}
    const updated=await loadSched();
    if(updated.some(s=>String(s.device)===String(id)&&s.label==='מחזור לילה'))throw new Error('חלק מהתזמונים עדיין קיימים בשרת');
    close();render();toast('מחזור הלילה בוטל');
  }catch(e){err.textContent='לא ניתן לאמת ביטול מלא: '+e.message+' — בדוק את התזמונים לפני ניסיון נוסף';try{await loadSched();render()}catch(_){}}
  finally{btn.disabled=false}
}
function openNightCycle(id){
  const d=DEVS.find(x=>String(x.id)===String(id));
  const targets=SCHED.filter(s=>String(s.device)===String(id)&&s.label==='מחזור לילה');
  if(!targets.length)return toast('לא נמצא מחזור לילה פעיל');
  sheet('מחזור לילה',`<p>${esc(d?dname(d):'מכשיר')}</p><p>מחזור הלילה כולל ${targets.length} פעולות מתוזמנות. ביטול יסיר רק את פעולות מחזור הלילה של המכשיר הזה.</p><div class="err" id="nightCancelError" role="alert"></div><div class="btns"><button class="btn bad" id="nightCancelButton">ביטול מחזור לילה</button></div>`,(el,close)=>{el.querySelector('#nightCancelButton').onclick=()=>cancelNightCycle(id,el,close)});
}
function openTimerCancel(id){
  const timer=SCHED.find(s=>String(s.id)===String(id)&&s.once&&s.label==='טיימר');
  if(!timer)return toast('הטיימר כבר אינו פעיל');
  sheet('ביטול טיימר',`<p>הטיימר מתוכנן לשעה ${esc(timer.time)}.</p><div class="err" id="timerErr" role="alert"></div><div class="btns"><button class="btn bad" id="timerCancel">ביטול הטיימר</button></div>`,(el,close)=>{
    el.querySelector('#timerCancel').onclick=async()=>{
      const btn=el.querySelector('#timerCancel');btn.disabled=true;
      try{
        await api('/schedules/delete',{id:timer.id});
        await loadSched();
        if(SCHED.some(s=>String(s.id)===String(timer.id)))throw new Error('הטיימר עדיין מופיע בשרת');
        close();render();toast('הטיימר בוטל');
      }catch(e){el.querySelector('#timerErr').textContent='הביטול לא אומת: '+e.message}
      finally{btn.disabled=false}
    };
  });
}
function bindLive(v){v.querySelectorAll('[data-live]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.live,kind=b.dataset.kind;
  if(kind==='timer')return openTimerCancel(b.dataset.schedule);
  if(kind==='night')return openNightCycle(id);
  const d=DEVS.find(x=>String(x.id)===String(id));if(d)openDevice(d)
})}
document.head.insertAdjacentHTML('beforeend',`<style>
.live{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -16px 12px;padding:0 16px}.live::-webkit-scrollbar{display:none}
.livePill{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 14px;border-radius:999px;background:#2c2c2e;color:#fff;font:inherit;font-size:.95rem;font-weight:600;border:1px solid #3d8bff55;white-space:nowrap}
.livePill span{color:#b7d3ff}
</style>`);

/* ---------- home-screen widget (Scriptable) ---------- */
async function openWidget(){
  let tok;try{tok=(await api('/token')).token}catch(e){return toast(e.message)}
  const P=LSj('unplug_widget',null);
  let pick=P||DEVS.filter(d=>!d.virtual&&powerCode(d)&&META.fav[d.id]).map(d=>d.id).slice(0,4);
  if(!pick.length)pick=DEVS.filter(d=>!d.virtual&&powerCode(d)).map(d=>d.id).slice(0,4);
  const code=()=>{const devs=pick.map(id=>DEVS.find(d=>d.id===id)).filter(Boolean).map(d=>({i:d.id,n:dname(d),c:powerCode(d)}));
    return `// HomeOn widget - ${new Date().toLocaleDateString('he-IL')}
const API=${JSON.stringify(CFG.api)},K=${JSON.stringify(tok)};
const DEV=${JSON.stringify(devs)};
const fm=FileManager.local(),p=fm.joinPath(fm.documentsDirectory(),"homeon-widget.js");
try{const r=new Request("https://elior-sasi.github.io/unplug/widget.js?t="+Date.now());fm.writeString(p,await r.loadString())}catch(e){}
await eval("(async()=>{"+fm.readString(p)+"})()");`};
  const draw=el=>{const list=DEVS.filter(d=>!d.virtual&&powerCode(d));
    el.querySelector('#wgL').innerHTML=list.map(d=>`<button class="row row-btn" role="checkbox" aria-checked="${pick.includes(d.id)}" data-wg="${esc(d.id)}"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span><span aria-hidden="true" style="font-size:1.3rem">${pick.includes(d.id)?'✓':''}</span></button>`).join('');
    el.querySelectorAll('[data-wg]').forEach(b=>b.onclick=()=>{const id=b.dataset.wg;if(pick.includes(id))pick=pick.filter(x=>x!==id);else{if(pick.length>=4)return toast('עד 4 מכשירים');pick.push(id)}LSset('unplug_widget',JSON.stringify(pick));draw(el)})};
  sheet('ווידג׳ט למסך הבית',`<p>כפתורי הדלקה וכיבוי למסך הבית, בלי לפתוח את HomeOn. הווידג׳ט עובד דרך האפליקציה החינמית Scriptable.</p>
    <div class="sec-h"><h2>אילו מכשירים (עד 4)</h2></div><div class="list" id="wgL"></div>
    <button class="btn pri wide" id="wgC">העתקת קוד הווידג׳ט</button>
    <div class="sec-h"><h2>הגדרה, פעם אחת</h2></div>
    <ol style="line-height:1.7;padding-inline-start:22px;margin:0">
      <li><a href="https://apps.apple.com/app/scriptable/id1405459188" style="color:var(--gold)">להתקין את Scriptable מה-App Store</a></li>
      <li>לפתוח את Scriptable, ללחוץ + ולהדביק את הקוד</li>
      <li>לקרוא לסקריפט HomeOn (לחיצה על השם למעלה)</li>
      <li>במסך הבית: לחיצה ארוכה ← עריכה ← הוספת ווידג׳ט ← Scriptable ← בינוני</li>
      <li>לחיצה ארוכה על הווידג׳ט ← עריכה ← Script: לבחור HomeOn</li>
    </ol>
    <p class="s">לחיצה על מכשיר בווידג׳ט מדליקה או מכבה אותו. האייפון פותח לרגע את Scriptable ומבצע.</p>`,(el)=>{
    draw(el);
    el.querySelector('#wgC').onclick=async()=>{if(!pick.length)return toast('בחר לפחות מכשיר אחד');try{await navigator.clipboard.writeText(code());toast('הקוד הועתק')}catch(e){prompt('העתק את הקוד:',code())}};
  });
}
