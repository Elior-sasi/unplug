/* HomeOn - Google TV remote. Works in the installed app (native, home WiFi). */
const GTV={id:'gtv',name:'Google TV',category:'gtv',online:true,virtual:true,status:{},functions:[],statusRange:[]};
const tvCall=(cmd,x)=>nativeCall(Object.assign({action:'tv',cmd},x||{})).then(r=>JSON.parse(r));
const TVK={power:26,home:3,back:4,up:19,down:20,left:21,right:22,ok:23,volup:24,voldown:25,mute:164,play:85,settings:176,input:178,menu:82};
const TVAPPS=[['YouTube','https://www.youtube.com'],['Netflix','https://www.netflix.com/title'],['Disney+','https://www.disneyplus.com'],['Prime Video','https://app.primevideo.com'],['Spotify','spotify://'],['Apple TV','https://tv.apple.com']];
const tvErr=e=>{const m=String(e&&e.message||e);toast(/badCode/.test(m)?'הקוד לא נכון - נסה שוב':/noTV|notPaired/.test(m)?'הטלוויזיה לא מחוברת - צריך לצמד שוב':/timeout/.test(m)?'הטלוויזיה לא עונה - צריך להיות ב-WiFi של הבית והיא צריכה להיות במצב המתנה':'לא הצליח: '+m)};

function tvKey(k){if(navigator.vibrate)navigator.vibrate(8);try{nativeCall({action:'haptic'})}catch(e){}return tvCall('key',{k:TVK[k]}).catch(tvErr)}

const APPN={'com.google.android.youtube.tv':'YouTube','com.netflix.ninja':'Netflix','com.disney.disneyplus':'Disney+','com.amazon.amazonvideo.livingroom':'Prime Video','com.spotify.tv.android':'Spotify','com.apple.atve.androidtv.appletv':'Apple TV','com.google.android.apps.tv.launcherx':'מסך הבית','com.google.android.tvlauncher':'מסך הבית'};
let TVS={};let tvEl=null;
window.tvEvent=e=>{if(e.keyboard){const k=tvEl&&tvEl.querySelector('#tvT');if(k){k.focus();toast('הטלוויזיה מחכה להקלדה')}return}
  if(e.heard!=null){const h=tvEl&&tvEl.querySelector('#tvHeard');if(h)h.textContent=e.heard;return}
  Object.assign(TVS,e);tvDrawState()};
function tvDrawState(){if(!tvEl)return;const st=tvEl.querySelector('#tvSt');if(!st)return;
  const parts=[TVS.on==null?'':TVS.on?'דולקת':'כבויה',TVS.app?(APPN[TVS.app]||TVS.app.split('.').slice(-1)[0]):'',TVS.muted?'מושתקת':TVS.volume!=null&&TVS.volumeMax?'עוצמה '+TVS.volume+'/'+TVS.volumeMax:'',TVS.sleepAt?'נכבית ב-'+hm(new Date(TVS.sleepAt*1000)):''].filter(Boolean);
  st.textContent=parts.join(' · ')||'מתחבר...';
  const bar=tvEl.querySelector('#tvVol');if(bar){bar.hidden=!(TVS.volume!=null&&TVS.volumeMax);if(!bar.hidden)bar.style.setProperty('--v',(TVS.volume/TVS.volumeMax*100)+'%')}
  const p=tvEl.querySelector('[data-tk=power]');if(p&&TVS.on!=null)p.setAttribute('aria-pressed',TVS.on)}

function openTV(){
  if(!META.tv)return tvSetup();
  const pad=LS('unplug_tvpad')==='1';
  const b=(k,label,icon,cls='')=>`<button class="tvb ${cls}" data-tk="${k}" aria-label="${label}">${icon}</button>`;
  const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const night=META.tvNight||{app:1,scene:''};
  sheet(esc(META.tv.name||'Google TV'),`<div class="tvwrap">
    <div class="tvstate" role="status"><span id="tvSt">מתחבר...</span><div class="tvvol" id="tvVol" hidden aria-hidden="true"><i></i></div></div>
    <div class="tvrow">${b('power','הדלקה או כיבוי',ic('<path d="M12 3v8"/><path d="M6.4 7.5a8 8 0 1 0 11.2 0"/>'),'pw')}${b('input','מקור קלט',ic('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'))}${b('settings','הגדרות',ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'))}</div>
    <div class="seg tvmode" role="group" aria-label="סוג שליטה"><button data-pad="0" aria-pressed="${!pad}">מקשים</button><button data-pad="1" aria-pressed="${pad}">משטח מגע</button></div>
    ${pad?`<div class="tvpad" id="tvPad" role="application" aria-label="משטח מגע: החלקה לכיוונים, נגיעה לאישור"><span>החלקה לכיוון · נגיעה לאישור</span></div>`
    :`<div class="dpad" role="group" aria-label="חיצים">${b('up','למעלה',ic('<path d="m6 15 6-6 6 6"/>'),'u')}${b('left','שמאלה',ic('<path d="m15 6-6 6 6 6"/>'),'l')}${b('ok','אישור','<b>OK</b>','c')}${b('right','ימינה',ic('<path d="m9 6 6 6-6 6"/>'),'r')}${b('down','למטה',ic('<path d="m6 9 6 6 6-6"/>'),'d')}</div>`}
    <div class="tvrow">${b('back','חזרה',ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>'))}${b('home','מסך הבית',ic('<path d="M3 11l9-7 9 7v9H3z"/>'))}${b('play','הפעלה או השהיה',ic('<path d="M7 5v14l11-7z"/>'))}</div>
    <div class="tvrow">${b('voldown','הנמכת קול',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 12h4"/>'))}${b('mute','השתקה',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 4 6M21 9l-4 6"/>'))}${b('volup','הגברת קול',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 12h4M19 10v4"/>'))}</div>
    <p class="s" style="margin:-4px 2px 0;text-align:center">גם כפתורי הווליום של האייפון שולטים בטלוויזיה כשהשלט פתוח</p>
    <div class="tvtype"><label class="sr" for="tvT">הקלדה לטלוויזיה</label><input id="tvT" placeholder="הקלדה לטלוויזיה (חיפוש, סיסמה)" autocomplete="off" enterkeyhint="search">
      <button class="tvb mic" id="tvMic" aria-label="חיפוש קולי - לחיצה להתחלה ולסיום">${ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>')}</button></div>
    <p class="s" id="tvHeard" aria-live="polite" style="margin:-6px 4px 0;min-height:1.2em"></p>
    <div class="sec-h"><h2>אפליקציות</h2></div>
    <div class="tvapps">${TVAPPS.map(([n,u],i)=>`<button class="btn" data-ta="${i}">${esc(n)}</button>`).join('')}</div>
    <button class="btn pri wide" id="tvNight">🍿 ערב סרט</button>
    <div class="sec-h"><h2>עוד</h2></div>
    <div class="list">
      <div class="ctl"><div class="ctl-h"><span class="t" id="tvLvL">שלט במסך הנעילה וב-Dynamic Island</span><button class="sw" id="tvLive" role="switch" aria-checked="${LS('unplug_tvlive')==='1'}" aria-labelledby="tvLvL"></button></div></div>
      <div class="ctl"><div class="ctl-h"><span class="t" id="tvSlL">טיימר שינה</span></div><div class="seg" role="group" aria-labelledby="tvSlL">${[[30,'30 דק׳'],[60,'שעה'],[90,'שעה וחצי'],[0,'בלי']].map(([m,t])=>`<button data-sl="${m}">${t}</button>`).join('')}</div>
        <p class="s" style="margin:6px 2px 0">עובד כש-HomeOn פתוחה או ברקע, והטלפון ב-WiFi של הבית.</p></div>
      <button class="row row-btn" id="tvNS"><span class="grow"><span class="t">הגדרת ערב סרט</span><br><span class="s">${esc(TVAPPS[night.app]?TVAPPS[night.app][0]:'')}${night.scene?' + סצנה: '+esc(night.scene):''}</span></span>${svg('chev')}</button>
      <button class="row row-btn" id="tvR"><span class="grow"><span class="t">חדר</span><br><span class="s">${esc(roomOf(GTV)||'בלי חדר')}</span></span>${svg('chev')}</button>
      <button class="row row-btn" id="tvF"><span class="grow"><span class="t" style="color:#ff8f8f">ניתוק הטלוויזיה</span></span></button></div>
    <p class="s">Siri: "תדליק את הטלוויזיה ב-HomeOn" או "תפתח את נטפליקס בטלוויזיה ב-HomeOn". במרכז הבקרה: עריכה ← הוספת פקד ← HomeOn.</p></div>`,(el,close)=>{
    tvEl=el;tvDrawState();
    tvCall('volkeys',{on:true}).catch(()=>{});
    const obs=new MutationObserver(()=>{if(!document.body.contains(el)){obs.disconnect();if(tvEl===el){tvEl=null;tvCall('volkeys',{on:false}).catch(()=>{})}}});obs.observe(document.body,{childList:true,subtree:true});
    el.querySelectorAll('[data-tk]').forEach(x=>x.onclick=()=>tvKey(x.dataset.tk));
    el.querySelectorAll('[data-ta]').forEach(x=>x.onclick=()=>tvCall('app',{url:TVAPPS[+x.dataset.ta][1]}).catch(tvErr));
    el.querySelectorAll('[data-pad]').forEach(x=>x.onclick=()=>{LSset('unplug_tvpad',x.dataset.pad);close();openTV()});
    const padEl=el.querySelector('#tvPad');if(padEl)bindPad(padEl);
    const t=el.querySelector('#tvT');let tt;t.oninput=()=>{clearTimeout(tt);tt=setTimeout(()=>tvCall('text',{text:t.value}).catch(tvErr),250)};
    t.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();tvCall('text',{text:t.value}).then(()=>tvCall('key',{k:66})).catch(tvErr);t.blur()}};
    const mic=el.querySelector('#tvMic');let listening=false;
    mic.onclick=async()=>{try{if(!listening){await tvCall('listen');listening=true;mic.classList.add('on');el.querySelector('#tvHeard').textContent='מקשיב...'}
      else{listening=false;mic.classList.remove('on');const r=await tvCall('listenStop');if(r.text){t.value=r.text;el.querySelector('#tvHeard').textContent='"'+r.text+'"';await tvCall('text',{text:r.text})}else el.querySelector('#tvHeard').textContent='לא נשמע כלום'}}catch(e){listening=false;mic.classList.remove('on');toast('אין גישה למיקרופון או לזיהוי דיבור')}};
    const lv=el.querySelector('#tvLive');lv.onclick=async()=>{const on=lv.getAttribute('aria-checked')!=='true';try{const r=await tvCall('live',{on,name:META.tv.name||'Google TV'});lv.setAttribute('aria-checked',!!r.live);LSset('unplug_tvlive',r.live?'1':'0');if(on&&!r.live)toast('צריך לאפשר פעילויות חיות בהגדרות ← HomeOn')}catch(e){tvErr(e)}};
    el.querySelectorAll('[data-sl]').forEach(x=>x.onclick=async()=>{try{const r=await tvCall('sleep',{min:+x.dataset.sl});Object.assign(TVS,r);delete TVS.sleepAt;if(r.sleepAt)TVS.sleepAt=r.sleepAt;tvDrawState();toast(+x.dataset.sl?'הטלוויזיה תיכבה ב-'+hm(new Date(Date.now()+x.dataset.sl*60e3)):'טיימר השינה בוטל')}catch(e){tvErr(e)}});
    el.querySelector('#tvNight').onclick=()=>tvMovieNight();
    el.querySelector('#tvNS').onclick=()=>tvNightSetup();
    el.querySelector('#tvR').onclick=()=>pickRoom(GTV,()=>render());
    el.querySelector('#tvF').onclick=async()=>{if(!confirm('לנתק את הטלוויזיה מ-HomeOn?'))return;try{await tvCall('forget')}catch(e){}delete META.tv;saveMeta();close();render()};
    tvCall('state').then(s=>{Object.assign(TVS,s);tvDrawState()}).catch(()=>{const st=el.querySelector('#tvSt');if(st)st.textContent='לא מחוברת - צריך להיות ב-WiFi של הבית'});
  });
}

/* touchpad: swipe = arrows (keeps stepping while you hold far), tap = OK */
function bindPad(p){let x0,y0,t0,moved=false,last=0;
  const step=k=>{tvKey(k);moved=true};
  p.addEventListener('pointerdown',e=>{x0=e.clientX;y0=e.clientY;t0=Date.now();moved=false;p.setPointerCapture(e.pointerId)});
  p.addEventListener('pointermove',e=>{if(x0==null)return;const dx=e.clientX-x0,dy=e.clientY-y0;if(Math.max(Math.abs(dx),Math.abs(dy))<34||Date.now()-last<140)return;
    last=Date.now();step(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));x0=e.clientX;y0=e.clientY});
  p.addEventListener('pointerup',()=>{if(!moved&&Date.now()-t0<400)tvKey('ok');x0=null});
  p.addEventListener('keydown',e=>{const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'ok'}[e.key];if(m){e.preventDefault();tvKey(m)}});p.tabIndex=0}

/* movie night: TV on, the chosen app, and a HomeOn scene (lights, AC...) */
async function tvMovieNight(){const n=META.tvNight||{app:1,scene:''};
  try{const s=await tvCall('state');if(s.on===false){await tvKey('power');await new Promise(r=>setTimeout(r,5000))}
    await tvCall('app',{url:TVAPPS[n.app][1]});
    const sc=SCENES.find(x=>x.name===n.scene);if(sc)await runScene(sc);
    toast('🍿 ערב סרט')}catch(e){tvErr(e)}}
function tvNightSetup(){const n=META.tvNight||{app:1,scene:''};
  sheet('ערב סרט',`<div class="list"><div class="field"><label for="tnA">אפליקציה</label><select id="tnA">${TVAPPS.map(([x],i)=>`<option value="${i}"${i===n.app?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
    <div class="field"><label for="tnS">סצנה מ-HomeOn (אורות, מזגן...)</label><select id="tnS"><option value="">בלי</option>${SCENES.map(x=>`<option${x.name===n.scene?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div></div>
    <p class="s">${SCENES.length?'':'עוד אין סצנות. יוצרים בלשונית סצנות, למשל: לעמעם את האור ולהדליק את המזגן על 23.'}</p>
    <button class="btn pri wide" id="tnOk">שמירה</button>`,(el,close)=>el.querySelector('#tnOk').onclick=()=>{META.tvNight={app:+el.querySelector('#tnA').value,scene:el.querySelector('#tnS').value};saveMeta();close();toast('נשמר');openTV()})}

async function tvSetup(){
  if(!IN_APP)return sheet('Google TV','<p>השלט ל-Google TV עובד באפליקציית HomeOn המותקנת, כשהטלפון ב-WiFi של הבית.</p>');
  const close=sheet('הוספת Google TV',`<p>מחפש טלוויזיות ב-WiFi של הבית...</p><div class="list" id="tvL"></div>
    <div class="field"><label for="tvIP">או כתובת IP של הטלוויזיה</label><input id="tvIP" inputmode="decimal" placeholder="192.168.31.20"></div><button class="btn wide" id="tvIPb">התחברות לכתובת</button>`,(el)=>{
    const pick=(name,host)=>tvPair(name,host);
    el.querySelector('#tvIPb').onclick=()=>{const h=el.querySelector('#tvIP').value.trim();if(!/^\d+\.\d+\.\d+\.\d+$/.test(h))return toast('כתובת לא תקינה');pick('Google TV',h)};
    tvCall('discover').then(r=>{const L=el.querySelector('#tvL');if(!L)return;
      L.innerHTML=r.tvs&&r.tvs.length?r.tvs.map(t=>`<button class="row row-btn" data-th="${esc(t.host)}" data-tn="${esc(t.name)}"><span class="grow"><span class="t">${esc(t.name)}</span><br><span class="s">${esc(t.host)}</span></span>${svg('chev')}</button>`).join(''):'<div class="row"><span class="s">לא נמצאה טלוויזיה. בדוק שהיא דולקת ושהטלפון ב-WiFi של הבית.</span></div>';
      L.querySelectorAll('[data-th]').forEach(x=>x.onclick=()=>pick(x.dataset.tn,x.dataset.th));
      el.querySelector('p').textContent=r.tvs&&r.tvs.length?'בחר את הטלוויזיה:':'החיפוש הסתיים.'}).catch(tvErr);
  });
}

async function tvPair(name,host){
  try{await tvCall('pair',{host})}catch(e){return tvErr(e)}
  sheet('קוד מהטלוויזיה',`<p>על המסך של הטלוויזיה מופיע עכשיו קוד של 6 תווים. הקלד אותו:</p>
    <div class="field"><label for="tvC">קוד</label><input id="tvC" maxlength="6" autocapitalize="characters" autocomplete="one-time-code" style="font-size:1.6rem;letter-spacing:.3em;text-align:center;direction:ltr"></div>
    <button class="btn pri wide" id="tvS">חיבור</button>`,(el,close)=>{
    const i=el.querySelector('#tvC');setTimeout(()=>i.focus(),300);
    el.querySelector('#tvS').onclick=async()=>{const c=i.value.trim();if(c.length!==6)return toast('6 תווים');
      try{await tvCall('code',{code:c});META.tv={name,host};delete META.gtvHidden;saveMeta();close();render();toast('הטלוויזיה מחוברת');openTV()}catch(e){tvErr(e)}};
  });
}

document.head.insertAdjacentHTML('beforeend',`<style>
.tvwrap{display:flex;flex-direction:column;gap:14px;align-items:stretch}
.tvrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tvb{min-height:60px;border-radius:20px;background:#2c2c2e;color:#fff;display:grid;place-items:center;border:0;font:inherit}
.tvb svg{width:26px;height:26px}.tvb:active{transform:scale(.95);background:#3a3a3c}
.tvb.pw{color:#ff8f8f}.tvb.pw[aria-pressed="true"]{background:#3d8bff;color:#fff}
.dpad{display:grid;grid-template-columns:repeat(3,76px);grid-template-rows:repeat(3,76px);gap:8px;justify-content:center;direction:ltr}
.dpad .u{grid-column:2;grid-row:1}.dpad .l{grid-column:1;grid-row:2}.dpad .c{grid-column:2;grid-row:2;border-radius:50%;background:#3a3a3c;font-size:1.1rem}.dpad .r{grid-column:3;grid-row:2}.dpad .d{grid-column:2;grid-row:3}
.dpad .tvb{min-height:0;border-radius:24px}
.tvapps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tvapps .btn{min-height:48px}
.tvstate{text-align:center;color:#ffd2a8;font-weight:600;min-height:1.4em}.tvvol{height:6px;border-radius:3px;background:#3a3a3c;margin:8px auto 0;max-width:200px;overflow:hidden}.tvvol i{display:block;height:100%;width:var(--v,0%);background:#3d8bff}
.tvmode{max-width:340px;width:100%;margin:0 auto}.tvmode button{white-space:nowrap}
.tvpad{height:250px;border-radius:28px;background:radial-gradient(circle at 50% 40%,#3a3a3c,#232325);display:grid;place-items:end center;padding-bottom:14px;color:#8e8e93;font-size:.85rem;touch-action:none;user-select:none;-webkit-user-select:none}
.tvtype{display:flex;gap:8px;align-items:center}.tvtype input{flex:1;min-height:52px;border-radius:16px;border:0;background:#2c2c2e;color:#fff;padding:0 14px;font:inherit;font-size:1rem}
.tvb.mic{width:52px;min-height:52px;flex:none;border-radius:50%}.tvb.mic.on{background:#ff453a;animation:micp 1s infinite alternate}@keyframes micp{to{transform:scale(1.08)}}
@media (prefers-reduced-motion:reduce){.tvb.mic.on{animation:none}}
</style>`);
