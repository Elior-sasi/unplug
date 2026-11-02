/* Unplug - washing machine (Spin inside Unplug).
   The machine sits on a Smart Life plug with power metering. Running / done comes from the power draw,
   the finish time from the chosen program, and it learns real durations from past runs.
   Alerts (done, stopped midway, unload reminder) run on the server through the house guard. */
const WPROG=[['cotton','כותנה',74],['mixed','מעורב',59],['eco','אקו 40-60',198],['cold20','20 מעלות',58],['q30','מהיר 30׳',30],['q15','מהיר 15׳',15],
  ['sport','ספורט',95],['duvet','שמיכת פוך',108],['down','פלומה',74],['wool','צמר',50],['steril','סטריליזציה',131],['drum','ניקוי תוף',72],
  ['rinse','שטיפה + סחיטה',13],['spin','סחיטה',8],['smart','Smart',70]];
const isWasher=d=>!!d&&!d.virtual&&iconOf(d)==='washer'&&d.status&&d.status.cur_power!=null;
let WST={};               /* server guard state by rule id */
let WRULES=[];            /* server guard rules */
let WOK=null;             /* server supports the guard (null = not checked yet) */
const W=()=>LSj('unplug_wash',{});
const Wset=v=>LSset('unplug_wash',JSON.stringify(v));
function wInfo(d){const a=W();return a[d.id]||(a[d.id]={prog:'cotton',runs:[]})}
function wSave(d,info){const a=W();a[d.id]=info;Wset(a)}
const wProg=k=>WPROG.find(p=>p[0]===k)||WPROG[0];
function wMinutes(d,k){const info=wInfo(d),runs=(info.runs||[]).filter(r=>r.p===k).map(r=>r.m).slice(-5).sort((a,b)=>a-b);
  return runs.length?runs[runs.length>>1]:wProg(k)[2]}
function wRule(d){return WRULES.find(r=>r.device===d.id&&r.kind==='done')}
async function wLoad(){try{const j=await api('/guard');WRULES=(j.guard&&j.guard.rules)||[];WST=j.state||{};WOK=true;wLearn()}catch(e){WOK=false}}
/* a run the server saw from start to end becomes a learned duration */
function wLearn(){for(const r of WRULES){const g=WST[r.id];const d=DEVS.find(x=>x.id===r.device);if(!d||!g||!g.end||!g.began)continue;
  const info=wInfo(d);if(info.lastLearn===g.began)continue;const m=Math.round((g.end-g.began)/60);
  info.lastLearn=g.began;if(m>=6&&m<=300){info.runs=(info.runs||[]).concat({p:info.prog,m,at:g.began*1000}).slice(-30)}wSave(d,info)}}
/* where the machine is now */
function wNow(d){
  const w=watts(d),info=wInfo(d),r=wRule(d),g=r&&WST[r.id]||{},on=isOn(d);
  /* run start: from the server, else from what this phone saw */
  let start=g.run?g.run*1000:null;
  if(w>=8){if(!start){if(!info.seen||Date.now()-info.seenLast>15*60e3)info.seen=Date.now();info.seenLast=Date.now();wSave(d,info);start=info.seen}}
  else if(info.seen&&!g.run){info.seen=null;wSave(d,info)}
  const running=w>=8||!!(g.run&&!g.end);
  const total=wMinutes(d,info.prog);
  let left=null,phase='';
  if(running&&start){const el=(Date.now()-start)/60e3;left=Math.max(1,Math.round(total-el));
    if(w>=1000)phase='מחממת מים';else if(w>=250){phase='סוחטת';left=Math.min(left,12)}else phase='מכבסת';}
  return {w,on,running,start,left,total,phase,end:g.end?g.end*1000:null,prog:wProg(info.prog)};
}
function washText(d){if(!d.online)return 'מנותק';const s=wNow(d);
  if(!s.on)return 'השקע כבוי';
  if(s.running)return s.left!=null?`${s.phase} · עוד כ-${s.left} דק׳`:'עובדת';
  if(s.end&&Date.now()-s.end<4*3600e3)return 'סיימה ב-'+hm(new Date(s.end));
  return 'מוכנה'}
/* never cut the plug while it washes */
function washGuardOff(d,cmds){if(!isWasher(d))return true;const pc=powerCode(d);
  if(!cmds.some(c=>c.code===pc&&c.value===false))return true;
  if(watts(d)<8)return true;
  return confirm('המכונה באמצע תוכנית. כיבוי השקע יעצור אותה, ואם היא מחממת או סוחטת הדלת עלולה להינעל עם מים. לכבות בכל זאת?')}
async function wEnsureRule(d,info){if(WOK===false)return;
  if(WOK===null)await wLoad();if(!WOK)return;
  let r=wRule(d);const exp=wMinutes(d,info.prog);
  if(r&&r.expect===exp&&r.remind===(info.remind!==false)&&r.enabled===(info.alerts!==false))return;
  const all=WRULES.slice();
  if(!r){r=ruleFor(d,'done',5);all.push(r)}
  r.expect=exp;r.remind=info.remind!==false;r.enabled=info.alerts!==false;r.name=dname(d);
  try{await api('/guard/save',{rules:all});WRULES=all}catch(e){}
}
function openWasher(d){
  const close=sheet(esc(dname(d)),`<div id="wB" style="display:flex;flex-direction:column;gap:14px"></div>`,(el,close)=>{
    const body=el.querySelector('#wB');let iv;
    OPEN={id:d.id,draw:dd=>{d=dd;draw()}};
    function draw(){const s=wNow(d),info=wInfo(d),pc=powerCode(d);
      const big=s.running?(s.left!=null?`<div class="n" style="font-size:2.6rem;font-weight:700">${hm(new Date(Date.now()+s.left*60e3))}</div><div class="s">מסתיימת בערך · עוד ${s.left} דק׳</div>`:`<div class="n" style="font-size:2rem;font-weight:700">עובדת</div>`)
        :s.end&&Date.now()-s.end<4*3600e3?`<div class="n" style="font-size:2rem;font-weight:700">סיימה ב-${hm(new Date(s.end))}</div><div class="s">${Date.now()-s.end<30*60e3?'אפשר לפרוק':'הכביסה מחכה'}</div>`
        :`<div class="n" style="font-size:2rem;font-weight:700">${s.on?'מוכנה':'השקע כבוי'}</div><div class="s">${s.on?'מתחילים במכונה, ו-HomeOn יזהה לבד':'צריך להדליק את השקע כדי שהמכונה תעבוד'}</div>`;
      const runs=(info.runs||[]).slice(-4).reverse();
      body.innerHTML=`<div class="dhero${s.running?' on':''}"><div class="dh-art" aria-hidden="true">${devArt(d,1.5)}</div>
        <div role="status" style="text-align:center">${big}${s.running&&s.phase?`<div class="s" style="margin-top:4px">${esc(s.phase)} · ${Math.round(s.w)} וואט</div>`:''}</div></div>
        ${!s.on&&pc?`<button class="dpw" id="wOn" aria-pressed="false">${svg('power')}<span>הדלקת השקע</span></button>`:''}
        <div class="sec-h"><h2 id="wPL">התוכנית במכונה</h2></div>
        <div class="list"><div class="ctl"><div class="seg" role="group" aria-labelledby="wPL" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:4px">
          ${WPROG.map(([k,n])=>`<button data-wp="${k}" aria-pressed="${info.prog===k}" class="wpB"><span>${esc(n)}</span><span class="s" style="font-size:.8em">${wMinutes(d,k)} דק׳</span></button>`).join('')}</div>
          <p class="s" style="margin:6px 2px 0">נשמרת התוכנית האחרונה. הזמנים מתעדכנים לבד לפי הכביסות שלך.</p></div></div>
        <div class="sec-h"><h2>התראות</h2></div>
        <div class="list">${WOK===false?`<div class="row"><span class="grow"><span class="t">ההתראות צריכות עדכון שרת</span><br><span class="s">כשתהיה ליד המחשב, תכתוב לי "ליד המחשב"</span></span></div>`:`
          <div class="ctl"><div class="ctl-h"><span class="t" id="wA1">כשמסיימת, או עוצרת באמצע</span><button class="sw" id="wAl" role="switch" aria-checked="${info.alerts!==false}" aria-labelledby="wA1"></button></div></div>
          <div class="ctl"><div class="ctl-h"><span class="t" id="wA2">תזכורת לפרוק אחרי חצי שעה</span><button class="sw" id="wRm" role="switch" aria-checked="${info.remind!==false}" aria-labelledby="wA2"></button></div></div>`}
          ${LS('unplug_push')?'':`<div class="row"><span class="s">צריך להפעיל התראות לטלפון בהגדרות.</span></div>`}</div>
        ${runs.length?`<div class="sec-h"><h2>כביסות אחרונות</h2></div><div class="list">${runs.map(r=>`<div class="row"><span class="grow"><span class="t">${esc(wProg(r.p)[1])}</span><br><span class="s">${new Date(r.at).toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'numeric'})} · ${r.m} דק׳</span></span></div>`).join('')}</div>`:''}
        <div class="list"><button class="row row-btn" id="wGen"><span class="grow"><span class="t">הגדרות השקע</span><br><span class="s">טיימר, תזמונים, שם, חדר וסמליל</span></span>${svg('chev')}</button></div>
        <p class="s" style="font-size:.9rem">אל תכבה את השקע באמצע חימום או סחיטה. HomeOn ישאל לפני כיבוי כשהמכונה עובדת.</p>`;
      body.querySelectorAll('[data-wp]').forEach(b=>b.onclick=()=>{const i=wInfo(d);i.prog=b.dataset.wp;wSave(d,i);draw();render();wEnsureRule(d,i)});
      const on=body.querySelector('#wOn');if(on)on.onclick=()=>send(d,[{code:pc,value:true}]);
      const al=body.querySelector('#wAl');if(al)al.onclick=()=>{const i=wInfo(d);i.alerts=i.alerts===false;wSave(d,i);draw();wEnsureRule(d,i)};
      const rm=body.querySelector('#wRm');if(rm)rm.onclick=()=>{const i=wInfo(d);i.remind=i.remind===false;wSave(d,i);draw();wEnsureRule(d,i)};
      body.querySelector('#wGen').onclick=()=>openDevice(d,true);
    }
    draw();
    (async()=>{await wLoad();draw();await wEnsureRule(d,wInfo(d))})();
    iv=setInterval(()=>{if(!document.body.contains(body))return clearInterval(iv);refreshOne(d.id);wLoad().then(()=>document.body.contains(body)&&draw())},20000);
  });
  return close;
}
document.head.insertAdjacentHTML('beforeend','<style>.wpB{display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:2px;min-height:56px;line-height:1.15;padding:6px 4px}.wpB .s{display:block;opacity:.8}</style>');
/* keep card status fresh while a washer exists */
setTimeout(()=>{if(DEVS.some(isWasher))wLoad().then(render)},2500);
setInterval(()=>{if(document.visibilityState==='visible'&&DEVS.some(isWasher))wLoad().then(render)},60000);
