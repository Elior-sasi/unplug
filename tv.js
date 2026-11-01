/* HomeOn - Google TV remote. Works in the installed app (native, home WiFi). */
const GTV={id:'gtv',name:'Google TV',category:'gtv',online:true,virtual:true,status:{},functions:[],statusRange:[]};
const tvCall=(cmd,x)=>nativeCall(Object.assign({action:'tv',cmd},x||{})).then(r=>JSON.parse(r));
const TVK={power:26,home:3,back:4,up:19,down:20,left:21,right:22,ok:23,volup:24,voldown:25,mute:164,play:85,settings:176,input:178,menu:82};
const TVAPPS=[['YouTube','https://www.youtube.com'],['Netflix','https://www.netflix.com/title'],['Disney+','https://www.disneyplus.com'],['Prime Video','https://app.primevideo.com'],['Spotify','spotify://'],['Apple TV','https://tv.apple.com']];
const tvErr=e=>{const m=String(e&&e.message||e);toast(/badCode/.test(m)?'הקוד לא נכון - נסה שוב':/noTV|notPaired/.test(m)?'הטלוויזיה לא מחוברת - צריך לצמד שוב':/timeout/.test(m)?'הטלוויזיה לא עונה - צריך להיות ב-WiFi של הבית והיא צריכה להיות במצב המתנה':'לא הצליח: '+m)};

function tvKey(k){if(navigator.vibrate)navigator.vibrate(8);try{nativeCall({action:'haptic'})}catch(e){}return tvCall('key',{k:TVK[k]}).catch(tvErr)}

function openTV(){
  if(!META.tv)return tvSetup();
  const b=(k,label,icon,cls='')=>`<button class="tvb ${cls}" data-tk="${k}" aria-label="${label}">${icon}</button>`;
  const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  sheet(esc(META.tv.name||'Google TV'),`<div class="tvwrap">
    <div class="tvrow">${b('power','הדלקה או כיבוי',ic('<path d="M12 3v8"/><path d="M6.4 7.5a8 8 0 1 0 11.2 0"/>'),'pw')}${b('input','מקור קלט',ic('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'))}${b('settings','הגדרות',ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'))}</div>
    <div class="dpad" role="group" aria-label="חיצים">
      ${b('up','למעלה',ic('<path d="m6 15 6-6 6 6"/>'),'u')}${b('left','שמאלה',ic('<path d="m15 6-6 6 6 6"/>'),'l')}${b('ok','אישור','<b>OK</b>','c')}${b('right','ימינה',ic('<path d="m9 6 6 6-6 6"/>'),'r')}${b('down','למטה',ic('<path d="m6 9 6 6 6-6"/>'),'d')}
    </div>
    <div class="tvrow">${b('back','חזרה',ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>'))}${b('home','מסך הבית',ic('<path d="M3 11l9-7 9 7v9H3z"/>'))}${b('play','הפעלה או השהיה',ic('<path d="M7 5v14l11-7z"/>'))}</div>
    <div class="tvrow">${b('voldown','הנמכת קול',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 12h4"/>'))}${b('mute','השתקה',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 4 6M21 9l-4 6"/>'))}${b('volup','הגברת קול',ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 12h4M19 10v4"/>'))}</div>
    <div class="sec-h"><h2>אפליקציות</h2></div>
    <div class="tvapps">${TVAPPS.map(([n,u],i)=>`<button class="btn" data-ta="${i}">${esc(n)}</button>`).join('')}</div>
    <div class="list"><button class="row row-btn" id="tvR"><span class="grow"><span class="t">חדר</span><br><span class="s">${esc(roomOf(GTV)||'בלי חדר')}</span></span>${svg('chev')}</button>
      <button class="row row-btn" id="tvF"><span class="grow"><span class="t" style="color:#ff8f8f">ניתוק הטלוויזיה</span></span></button></div></div>`,(el,close)=>{
    el.querySelectorAll('[data-tk]').forEach(x=>x.onclick=()=>tvKey(x.dataset.tk));
    el.querySelectorAll('[data-ta]').forEach(x=>x.onclick=()=>tvCall('app',{url:TVAPPS[+x.dataset.ta][1]}).catch(tvErr));
    el.querySelector('#tvR').onclick=()=>pickRoom(GTV,()=>render());
    el.querySelector('#tvF').onclick=async()=>{if(!confirm('לנתק את הטלוויזיה מ-HomeOn?'))return;try{await tvCall('forget')}catch(e){}delete META.tv;saveMeta();close();render()};
    tvCall('state').then(s=>{const p=el.querySelector('[data-tk=power]');if(p&&s.on!=null)p.setAttribute('aria-pressed',s.on)}).catch(()=>{});
  });
}

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
</style>`);
