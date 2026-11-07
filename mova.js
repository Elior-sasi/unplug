/* HomeOn - the MOVA E30 Ultra robot vacuum, everything the MOVAhome app does:
   state, map and rooms, room cleaning, the base station, maintenance, settings, quiet hours, schedules, history.
   Talks to our server (/mova/*), which runs the open-source dreame-vacuum library against the MOVAhome cloud. */
(function(){
const MV={linked:null,d:null,map:null,mapAt:0,err:'',sel:new Set(),times:1};
window.MOVA_ST=MV;

const ST_HE={1:'שואב',2:'ממתין',3:'מושהה',4:'תקלה',5:'חוזר לעמדה',6:'בטעינה',7:'שוטף',8:'מייבש מגבים',9:'שוטף מגבים',10:'חוזר לשטוף מגבים',11:'ממפה',12:'שואב ושוטף',13:'טעון',14:'מתעדכן',15:'בא אליך',16:'איפוס עמדה',17:'חוזר להתקין מגבים',18:'חוזר להסיר מגבים',19:'בודק מים',20:'מוסיף מים',21:'שטיפה מושהית',22:'מרוקן אבק',23:'בשליטה ידנית',24:'טעינה חכמה',25:'ניקוי חוזר',27:'ניקוי נקודתי',28:'חוזר לריקון',29:'ממתין למשימה',30:'מנקה את העמדה',31:'חוזר לניקוז',32:'מנקז',33:'מנקז',34:'מרוקן',35:'מייבש שקית אבק',37:'בדרך לניקוי נוסף',38:'ניקוי נוסף',101:'ניקוי יסודי ראשון',103:'מחטא',104:'מחטא',105:'מחליף מגבים',116:'מתקין מגבים',117:'מסיר מגבים',118:'טעינה חכמה',121:'נכנס לעמדה',122:'יוצא מהעמדה'};
const ERR_HE={1:'גלגל באוויר. הנח את השואב על הרצפה',2:'חיישני המדרגות מלוכלכים או שהשואב על קצה',3:'הפגוש תקוע',5:'הפגוש תקוע',6:'גלגל באוויר',8:'מיכל האבק לא מותקן',9:'מיכל המים לא מותקן',10:'מיכל המים ריק',11:'מיכל האבק מלא',12:'המברשת הראשית תקועה',13:'מברשת הצד תקועה',14:'המאוורר תקוע',15:'הגלגל השמאלי תקוע',16:'הגלגל הימני תקוע',17:'השואב תקוע',18:'השואב תקוע',19:'לא מוצא את העמדה',20:'הסוללה חלשה',21:'בעיית טעינה',22:'הסוללה חלשה',29:'תקלה בסוללה',47:'הדרך חסומה',48:'תקלה בחיישן הלייזר',49:'פגוש הלייזר תקוע',51:'הפילטר חסום',54:'חיישן הקיר מלוכלך',57:'חיישן הקיר מלוכלך',59:'השואב באזור אסור',61:'לא מצליח להגיע ליעד',62:'לא מצליח להגיע ליעד',63:'הדרך חסומה',64:'הדרך חסומה',68:'צריך להסיר את המגבים',69:'המגבים נפלו',70:'המגבים נפלו',71:'המגבים לא מסתובבים',72:'המגבים לא מסתובבים',74:'התקנת המגבים נכשלה',75:'הסוללה נגמרה',76:'מיכל המים המלוכלכים לא מותקן',80:'השואב תקוע',81:'השואב תקוע',82:'רצפה חלקה',85:'בדוק שהמגבים מותקנים',86:'מיכל המים המלוכלכים מלא',90:'השואב תקוע',101:'מיכל האבק בעמדה מלא',102:'מכסה העמדה פתוח',103:'מכסה העמדה פתוח',104:'מיכל האבק בעמדה מלא',105:'מיכל המים הנקיים לא מותקן',106:'מיכל המים המלוכלכים לא מותקן או מלא',107:'מיכל המים הנקיים ריק',108:'מיכל המים המלוכלכים מלא',109:'מיכל המים המלוכלכים חסום',111:'המגבים לא מותקנים',112:'המגבים רטובים מדי',114:'צריך לנקות את המגבים',116:'מיכל המים הנקיים ריק',117:'העמדה לא מחוברת לחשמל',118:'מיכל המים המלוכלכים מלא',119:'צריך לנקות את משטח השטיפה',120:'אין מגבים בעמדה',121:'שקית האבק מלאה',125:'הניקוז נכשל',126:'המגבים לא זוהו',128:'תקלה בעמדה',129:'שטיפת המגבים נכשלה',1000:'החזרה לעמדה נכשלה'};
const TANK_HE={installed:'תקין',not_installed:'לא מותקן',low_water:'מעט מים',checking:'בבדיקה',not_installed_or_full:'מלא או לא מותקן',check:'צריך בדיקה',disabled:'כבוי',low_detergent:'מעט נוזל'};
const BUSY=new Set([1,5,7,9,10,11,12,15,17,18,25,27,28,30,37,38,101,103,104,105]);
const HOME=new Set([2,6,8,13,22,24,29,35,118]);
const pct=n=>'⁦'+n+'%⁩';
const say=t=>{const l=document.getElementById('live');if(l)l.textContent=t};

window.movaCardText=function(){if(MV.linked===false)return 'לא מחובר - לחיצה לחיבור';const x=MV.d&&MV.d.state;if(!x)return MV.linked?'מתחבר...':'בודק חיבור...';
  if(x.error)return 'תקלה: '+(ERR_HE[x.error]||'קוד '+x.error);
  return (ST_HE[x.state]||'מוכן')+(x.battery!=null?' · '+pct(x.battery):'')};
async function load(){try{const j=await api('/mova/state');MV.linked=true;MV.d=j;MV.err=''}
  catch(e){const m=String(e.message||e);if(/לא מחובר|פג|עדכון/.test(m)){MV.linked=false;MV.d=null}MV.err=m}
  if(typeof TAB!=='undefined'&&TAB==='devices'&&!document.querySelector('.scrim'))render();return MV}
window.movaLoad=load;
setTimeout(()=>{if(CFG.key&&META.mova!==false)load()},2200);
setInterval(()=>{if(CFG.key&&META.mova!==false&&MV.linked!==false&&document.visibilityState==='visible'&&!document.querySelector('#mvB'))load()},60000);

document.head.insertAdjacentHTML('beforeend',`<style>
#mvB{display:flex;flex-direction:column;gap:14px}
#mvB h3{font-size:1.05rem;margin:6px 4px 0;color:var(--muted,#aeb4bf);font-weight:700}
.mv-map{position:relative;border-radius:22px;overflow:hidden;background:#141416;border:1px solid var(--line)}
.mv-map img{display:block;width:100%;height:auto}
.mv-pin{position:absolute;transform:translate(-50%,-50%);min-height:44px;min-width:44px;padding:6px 12px;border-radius:999px;border:2px solid #fff6;background:#000b;color:#fff;font:inherit;font-size:.95rem;font-weight:700;white-space:nowrap;max-width:46%;overflow:hidden;text-overflow:ellipsis}
.mv-pin[aria-pressed="true"]::before,.mv-rooms button[aria-pressed="true"]::before{content:"✓ "}
.mv-pin[aria-pressed="true"]{background:#ff9a3d;color:#1a0c04;border-color:#fff}
.mv-rooms{display:flex;flex-wrap:wrap;gap:8px}
.mv-rooms button{flex:1 1 40%;min-height:50px;border-radius:16px;border:1px solid var(--line);background:#1c1c1e;color:var(--fg);font:inherit;font-weight:700;font-size:1rem}
.mv-rooms button[aria-pressed="true"]{background:#ff9a3d;color:#1a0c04;border-color:#ff9a3d}
.mv-meter{height:10px;border-radius:999px;background:#2c2c2e;overflow:hidden;margin-top:6px}
.mv-meter>i{display:block;height:100%;background:#34c759;border-radius:999px}
.mv-meter.low>i{background:#ff9a3d}.mv-meter.out>i{background:#ff453a}
.mv-err{background:#3a1512;border:1px solid #ff453a88;border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:10px;font-weight:600}
.mv-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.mv-tot div{background:#1c1c1e;border:1px solid var(--line);border-radius:16px;padding:10px 4px}
.mv-tot b{display:block;font-size:1.3rem}
#mvB select,#mvB input[type=time]{font:inherit;font-size:1rem;min-height:44px;border-radius:12px;background:#2c2c2e;color:var(--fg);border:1px solid var(--line);padding:0 10px;max-width:100%}
.mv-num{display:flex;align-items:center;gap:10px}
.mv-num button{width:48px;height:48px;border-radius:50%;border:0;background:#2c2c2e;color:var(--fg);font-size:1.5rem;font-weight:700}
.mv-num output{min-width:76px;text-align:center;font-weight:700;font-size:1.1rem}
.mv-sec[hidden]{display:none!important}
</style>`);

function hero(x){if(!x)return{t:'מתחבר...',s:esc(MV.err||'')};
  const bits=[];if(x.battery!=null)bits.push('סוללה '+pct(x.battery));
  if((x.running||x.paused)&&x.area)bits.push(x.area+' מ״ר');if((x.running||x.paused)&&x.time)bits.push(x.time+' דק׳');
  if(x.running&&x.progress)bits.push('התקדמות '+pct(x.progress));
  if(x.drying&&x.drying_left)bits.push('נשארו '+x.drying_left+' דק׳ ייבוש');
  const room=x.room&&MV.d&&MV.d.rooms.find(r=>r.id===x.room);if(x.running&&room)bits.unshift('ב'+room.name);
  return{t:esc(ST_HE[x.state]||'מוכן'),s:bits.join(' · ')}}

window.openMova=function(){
  sheet(esc(dname(MOVA)),`<div id="mvB"></div>`,(el,close)=>{
    const body=el.querySelector('#mvB');let iv,ivMap,lastSig={};
    const alive=()=>document.body.contains(body);
    const ORDER=['mvHero','mvCtl','mvRooms','mvMode','mvStation','mvCons','mvSet','mvSch','mvHist','mvMore'];
    const keyOf=el=>{if(!el||!el.attributes)return null;if(el.id)return '#'+el.id;for(const a of ['data-a','data-room','data-times','data-q','data-sw','data-sch','data-schdel','data-reset','data-num','data-sel']){const v=el.getAttribute(a);if(v!=null)return `[${a}="${v}"]`+(a==='data-q'?`[data-v="${el.getAttribute('data-v')}"]`:a==='data-num'?`[data-d="${el.getAttribute('data-d')}"]`:'')}return null};
    const sec=(id,html)=>{let s=body.querySelector('#'+id);
      if(!s){ORDER.forEach(o=>{if(!body.querySelector('#'+o)){const d=document.createElement('div');d.id=o;d.className='mv-sec';d.style.cssText='display:flex;flex-direction:column;gap:12px';d.hidden=true;body.append(d)}});s=body.querySelector('#'+id)}
      if(lastSig[id]===html)return s;
      const a=document.activeElement,inside=s.contains(a);
      if(inside&&/^(SELECT|INPUT)$/.test(a.tagName))return s; /* never yank a picker or a time field away */
      const k=inside?keyOf(a):null;
      s.innerHTML=html;lastSig[id]=html;s.hidden=!html;
      if(k){const n=s.querySelector(k);n&&n.focus({preventScroll:true})}
      return s};
    const send=async(path,payload,ok)=>{try{const j=await api(path,payload);if(j&&j.state){MV.d=Object.assign({},MV.d,j);delete MV.d.sent}ok&&toast(ok);draw()}catch(e){toast(e.message);say(e.message);refresh()}};
    const act=(a,ok,extra)=>send('/mova/act',Object.assign({a},extra||{}),ok);
    const set=(k,v,ok)=>send('/mova/set',{k,v},ok);

    function drawLogin(){lastSig={};
      body.innerHTML=`<div class="dhero"><div class="dh-art" aria-hidden="true">${devArt(MOVA,1.5)}</div><div class="dh-state">חיבור לשואב</div><div class="dh-sub">עם חשבון MOVAhome שלך, פעם אחת</div></div>
        <div class="field"><label for="mvE">אימייל של MOVAhome</label><input id="mvE" type="email" autocomplete="username" dir="ltr" style="min-width:0;flex:1;font-size:17px"></div>
        <div class="field"><label for="mvP">סיסמה</label><input id="mvP" type="password" autocomplete="current-password" dir="ltr" style="min-width:0;flex:1;font-size:17px"></div>
        <div class="err" id="mvErr" role="alert">${MV.err&&!/לא מחובר/.test(MV.err)?esc(MV.err):''}</div>
        <button class="btn pri wide" id="mvIn">התחברות</button>
        <p class="s">הסיסמה נשלחת פעם אחת לשרת של HomeOn כדי להתחבר, ולא נשמרת. אם נרשמת ל-MOVAhome עם Apple, קודם קובעים סיסמה באפליקציית MOVAhome (פרופיל ← חשבון).</p>`;
      const go=async()=>{const e=body.querySelector('#mvE').value.trim(),p=body.querySelector('#mvP').value,er=body.querySelector('#mvErr'),b=body.querySelector('#mvIn');
        if(!e||!p){er.textContent='צריך אימייל וסיסמה';return}
        b.disabled=true;b.textContent='מתחבר... (עד חצי דקה)';er.textContent='';
        try{const j=await api('/mova/login',{email:e,password:p});MV.linked=true;toast('השואב מחובר: '+(j.mova&&j.mova.name||'MOVA'));body.innerHTML='';lastSig={};await load();draw();loadMap(true)}
        catch(ex){er.textContent=ex.message;b.disabled=false;b.textContent='התחברות'}};
      body.querySelector('#mvIn').onclick=go;body.querySelector('#mvP').onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();go()}};
      drawMore(true)}

    function draw(){if(!alive())return;
      if(MV.linked===false)return drawLogin();
      if(body.querySelector('#mvE')){body.innerHTML='';lastSig={}}
      const D=MV.d,x=D&&D.state,h=hero(x);
      const busy=x&&(BUSY.has(x.state)||x.running),paused=x&&(x.paused||x.state===3),home=x&&(x.docked||HOME.has(x.state));
      /* hero */
      sec('mvHero',`<div class="dhero${busy?' on':''}"><div class="dh-art" aria-hidden="true">${devArt(MOVA,1.5)}</div>
        <div class="dh-state" role="status" aria-live="polite">${h.t}</div><div class="dh-sub">${h.s}</div></div>
        ${x&&(x.error||x.has_error)?`<div class="mv-err" role="alert"><span>${esc(ERR_HE[x.error]||('השואב מדווח על תקלה'+(x.error?' (קוד '+x.error+')':'')))}</span><button class="btn" data-a="clear">הבנתי, נקה התראה</button></div>`:''}`);
      /* main controls */
      const c=sec('mvCtl',`<button class="dpw" data-a="${busy?'pause':'start'}" aria-pressed="${!!busy}">${svg('power')}<span>${busy?'השהיה':paused?'המשך ניקוי':'ניקוי כל הבית'}</span></button>
        <div class="btns"><button class="btn" data-a="dock"${home?' disabled':''} aria-label="חזרה לעמדה">לעמדה</button><button class="btn" data-a="stop"${!busy&&!paused?' disabled':''}>עצירה</button><button class="btn" data-a="locate" aria-label="איתור השואב, משמיע צליל">איתור</button></div>`);
      /* rooms */
      drawRooms();
      /* quick modes: the three main selects */
      const sels=(D&&D.selects)||[],quick=['cleaning_mode','suction_level','water_volume','mop_pad_humidity','cleangenius'];
      const qs=sels.filter(s=>quick.includes(s.k));
      sec('mvMode',qs.length?`<h3>מצב ניקוי</h3><div class="list">${qs.map(s=>segHtml(s)).join('')}</div>`:'');
      /* station */
      if(D){const cn=D.can||{},st=[];
        if(cn.washing)st.push(`<button class="btn" data-a="wash">${x.washing?'עצירת שטיפת מגבים':'שטיפת מגבים עכשיו'}</button>`);
        if(cn.drying)st.push(`<button class="btn" data-a="dry">${x.drying?'עצירת ייבוש':'ייבוש מגבים עכשיו'}</button>`);
        if(cn.empty)st.push(`<button class="btn" data-a="empty">ריקון אבק עכשיו</button>`);
        const tanks=[['clean_tank','מיכל מים נקיים'],['dirty_tank','מיכל מים מלוכלכים'],['dust_bag','שקית אבק'],['detergent','נוזל ניקוי']].filter(([k])=>x[k]&&x[k]!=='unknown');
        sec('mvStation',st.length||tanks.length?`<h3>העמדה</h3>${st.length?`<div class="btns" style="flex-wrap:wrap">${st.join('')}</div>`:''}
          ${tanks.length?`<div class="list">${tanks.map(([k,t])=>`<div class="row"><span class="grow t">${t}</span><span class="s">${esc(TANK_HE[x[k]]||x[k].replace(/_/g,' '))}</span></div>`).join('')}</div>`:''}`:'')}
      /* maintenance */
      if(D&&D.consumables&&D.consumables.length)sec('mvCons',`<h3>תחזוקה</h3><div class="list">${D.consumables.map(c=>`<div class="row" style="flex-wrap:wrap"><span class="grow"><span class="t">${esc(c.t)}</span>
          <span class="s"> · ${c.pct<=0?'להחליף עכשיו':c.pct<=15?'להחליף בקרוב':'נשאר '+pct(c.pct)}</span>
          <div class="mv-meter${c.pct<=0?' out':c.pct<=15?' low':''}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.pct}" aria-label="${esc(c.t)}, נשאר ${c.pct} אחוז"><i style="width:${Math.max(0,Math.min(100,c.pct))}%"></i></div></span>
          ${c.reset?`<button class="btn" data-reset="${esc(c.k)}" aria-label="החלפתי את ${esc(c.t)}, איפוס">החלפתי</button>`:''}</div>`).join('')}</div>`);
      /* settings */
      if(D){const more=sels.filter(s=>!quick.includes(s.k));
        const dnd=x.dnd;
        sec('mvSet',`<h3>הגדרות</h3><div class="list">
          ${dnd?`<div class="ctl"><div class="ctl-h"><span class="t" id="mvDndL">שעות שקטות</span><button class="sw" role="switch" id="mvDnd" aria-checked="${!!dnd.on}" aria-labelledby="mvDndL"></button></div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><label>מ-<input type="time" id="mvDs" value="${esc(dnd.start||'22:00')}"></label><label>עד <input type="time" id="mvDe" value="${esc(dnd.end||'08:00')}"></label></div>
            <p class="s" style="margin:6px 0 0">בשעות האלה השואב לא יתחיל ניקוי מתוזמן ולא ישמיע הודעות.</p></div>`:''}
          ${(D.switches||[]).map(s=>`<div class="ctl"><div class="ctl-h"><span class="t" id="mvS_${s.k}">${esc(s.t)}${s.h?`<br><span class="s">${esc(s.h)}</span>`:''}</span><button class="sw" role="switch" data-sw="${s.k}" aria-checked="${!!s.on}" aria-labelledby="mvS_${s.k}"></button></div></div>`).join('')}
          ${more.map(s=>`<div class="ctl"><div class="ctl-h"><label class="t" for="mvSel_${s.k}">${esc(s.t)}</label><select id="mvSel_${s.k}" data-sel="${s.k}">${s.o.map(o=>`<option value="${esc(o.v)}"${o.v===s.cur?' selected':''}>${esc(o.t)}</option>`).join('')}</select></div></div>`).join('')}
          ${(D.numbers||[]).map(n=>`<div class="ctl"><div class="ctl-h"><span class="t" id="mvN_${n.k}">${esc(n.t)}</span>
            <div class="mv-num" role="group" aria-labelledby="mvN_${n.k}"><button data-num="${n.k}" data-d="${-n.step}" aria-label="פחות">−</button><output aria-live="polite">${n.u==='%'?pct(n.v):n.v+' '+esc(n.u)}</output><button data-num="${n.k}" data-d="${n.step}" aria-label="יותר">+</button></div></div></div>`).join('')}
        </div>`);
        /* schedules from the vacuum itself */
        const sch=D.schedules||[],DN=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
        const days=s=>{if(s.once)return 'פעם אחת';const r=String(s.days||'').padStart(7,'0');/* library order: Sun..Sat as bits? shown as given */
          const on=[...r].map((c,i)=>c==='1'?i:-1).filter(i=>i>=0);return on.length===7?'כל יום':on.map(i=>DN[i]).join(' ')};
        sec('mvSch',sch.length?`<h3>תזמונים בשואב</h3><div class="list">${sch.map(s=>`<div class="ctl"><div class="ctl-h"><span class="t" id="mvSc_${s.id}">${esc(s.time)}<br><span class="s">${esc(days(s))}</span></span>
            <button class="sw" role="switch" data-sch="${s.id}" aria-checked="${!!s.on}" aria-labelledby="mvSc_${s.id}"></button>
            <button class="icbtn" data-schdel="${s.id}" aria-label="מחיקת התזמון של ${esc(s.time)}">${svg('close')}</button></div></div>`).join('')}</div>`:'');
        /* history */
        const tt=x.totals||{},hist=D.history||[];
        sec('mvHist',(tt.count!=null||hist.length)?`<h3>היסטוריה</h3>
          ${tt.count!=null?`<div class="mv-tot"><div><b>${tt.count}</b>ניקויים</div><div><b>${tt.m2!=null?tt.m2:'-'}</b>מ״ר בסך הכול</div><div><b>${tt.minutes!=null?Math.round(tt.minutes/60):'-'}</b>שעות</div></div>`:''}
          ${hist.length?`<div class="list">${hist.slice(0,10).map(h=>{const dt=new Date(h.t*1000);return `<div class="row"><span class="grow"><span class="t">${dt.toLocaleDateString('he-IL',{weekday:'short',day:'numeric',month:'numeric'})} ${dt.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span><br><span class="s">${h.m2!=null?h.m2+' מ״ר':''}${h.min!=null?' · '+h.min+' דק׳':''}${h.done===false?' · לא הושלם':''}</span></span></div>`}).join('')}</div>`:''}`:'');}
      drawMore(false);
      wire()}

    function segHtml(s){return `<div class="ctl"><div class="ctl-h"><span class="t" id="mvQ_${s.k}">${esc(s.t)}</span></div><div class="seg" style="flex-wrap:${s.o.length>4?'wrap':'nowrap'}" role="group" aria-labelledby="mvQ_${s.k}">${s.o.map(o=>`<button data-q="${s.k}" data-v="${esc(o.v)}" style="flex:1 1 ${s.o.length>4?'30%':'0'};padding-inline:4px" aria-pressed="${o.v===s.cur}">${esc(o.t)}</button>`).join('')}</div></div>`}

    function drawRooms(){const D=MV.d;if(!D)return;const rooms=D.rooms||[];
      [...MV.sel].forEach(id=>{if(!rooms.some(r=>r.id===id))MV.sel.delete(id)});
      const m=MV.map,n=MV.sel.size;
      const names=[...MV.sel].map(id=>(rooms.find(r=>r.id===id)||{}).name).filter(Boolean);
      const pins=m&&m.rooms&&m.rooms.length?m.rooms:null;
      sec('mvRooms',rooms.length||m?`<h3>חדרים</h3>
        ${m?`<div class="mv-map"><img src="data:image/png;base64,${m.png}" alt="מפת הבית${rooms.length?' עם '+rooms.length+' חדרים':''}">${pins?pins.map(r=>`<button class="mv-pin" style="left:${r.px}%;top:${r.py}%" data-room="${r.id}" aria-pressed="${MV.sel.has(r.id)}">${esc(r.name)}</button>`).join(''):''}</div>`:''}
        ${!pins&&rooms.length?`<div class="mv-rooms" role="group" aria-label="בחירת חדרים לניקוי">${rooms.map(r=>`<button data-room="${r.id}" aria-pressed="${MV.sel.has(r.id)}">${esc(r.name)}</button>`).join('')}</div>`:''}
        ${rooms.length?`<div class="ctl"><div class="ctl-h"><span class="t" id="mvTimesL">כמה פעמים</span></div><div class="seg" role="group" aria-labelledby="mvTimesL">${[1,2,3].map(t=>`<button data-times="${t}" aria-pressed="${MV.times===t}">${t===1?'פעם אחת':t===2?'פעמיים':'3 פעמים'}</button>`).join('')}</div></div>
        <button class="btn pri wide" id="mvGoRooms"${n?'':' disabled'}>${n?'ניקוי '+(n===1?esc(names[0]):n+' חדרים'):'בחר חדרים במפה'}</button>`:`<p class="s">אין עדיין מפה. אחרי ניקוי מלא ראשון החדרים יופיעו כאן.</p>`}`:'')}

    function drawMore(loginOnly){
      sec('mvMore',`<div class="list">
        ${IN_APP?`<button class="row row-btn" id="movaPair"><span class="grow"><span class="t">זיהוי השואב בראוטר</span><br><span class="s">${META.movaMac?(MOVA_WIFI.visible?'מחובר לרשת הבית':'לא נראה ברשת כרגע'):'לא הוגדר'}</span></span>${svg('chev')}</button>`:''}
        <button class="row row-btn" id="movaRoom"><span class="grow"><span class="t">חדר</span><br><span class="s">${esc(roomOf(MOVA)||'בלי חדר')}</span></span>${svg('chev')}</button>
        ${!loginOnly&&MV.d&&MV.d.model?`<div class="row"><span class="grow"><span class="t">דגם</span><br><span class="s" dir="ltr">${esc(MV.d.model)}${MV.d.fw?' · '+esc(MV.d.fw):''}</span></span></div>`:''}
        ${!loginOnly&&MV.linked?`<button class="row row-btn" id="movaOut"><span class="grow t">ניתוק החשבון מ-HomeOn</span>${svg('close')}</button>`:''}
        <button class="row row-btn" id="movaHide"><span class="grow"><span class="t">הסתרת השואב מ-HomeOn</span><br><span class="s">לא מוחק אותו מ-MOVAhome</span></span>${svg('close')}</button></div>
        <p class="s">חיבור Wi-Fi ראשוני של שואב חדש ועדכוני תוכנה נעשים עדיין דרך MOVAhome.</p>`);
      if(loginOnly)wire()}

    let wired=false;
    function wire(){if(wired)return;wired=true;
      body.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
        if(b.dataset.a){const a=b.dataset.a,msg={start:'מתחיל לנקות',pause:'מושהה',dock:'חוזר לעמדה',stop:'נעצר',locate:'השואב משמיע צליל',clear:'ההתראה נוקתה',wash:'פקודה נשלחה',dry:'פקודה נשלחה',empty:'מרוקן אבק'}[a];
          if(a==='start'&&MV.d&&MV.d.state&&(MV.d.state.paused||MV.d.state.state===3))return act('start','ממשיך לנקות');
          return act(a,msg)}
        if(b.dataset.reset){const c=(MV.d.consumables||[]).find(c=>c.k===b.dataset.reset);if(!confirm('לאפס את מונה '+(c?c.t:'')+'? עשה את זה רק אחרי שהחלפת או ניקית אותו.'))return;return act('reset:'+b.dataset.reset,'אופס')}
        if(b.dataset.room){const id=+b.dataset.room;MV.sel.has(id)?MV.sel.delete(id):MV.sel.add(id);drawRooms();const nb=body.querySelector(`[data-room="${id}"]`);nb&&nb.focus();return}
        if(b.dataset.times){MV.times=+b.dataset.times;drawRooms();body.querySelector(`[data-times="${MV.times}"]`)?.focus();return}
        if(b.id==='mvGoRooms'){const ids=[...MV.sel];return act('rooms','מנקה '+(ids.length===1?'חדר אחד':ids.length+' חדרים'),{rooms:ids,times:MV.times})}
        if(b.dataset.q){const k=b.dataset.q,v=b.dataset.v;body.querySelectorAll(`[data-q="${k}"]`).forEach(o=>o.setAttribute('aria-pressed',o===b));return set(k,v)}
        if(b.dataset.sw){const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',on);return set(b.dataset.sw,on)}
        if(b.dataset.sch){const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',on);return set('schedule_on',{id:b.dataset.sch,on})}
        if(b.dataset.schdel){if(!confirm('למחוק את התזמון מהשואב?'))return;return set('schedule_delete',b.dataset.schdel,'התזמון נמחק')}
        if(b.dataset.num){const n=(MV.d.numbers||[]).find(n=>n.k===b.dataset.num);if(!n)return;const v=Math.max(n.min,Math.min(n.max,n.v+(+b.dataset.d)));if(v===n.v)return;n.v=v;const o=b.parentNode.querySelector('output');o.textContent=n.u==='%'?pct(v):v+' '+n.u;clearTimeout(b._t);b._t=setTimeout(()=>set(n.k,v),600);return}
        if(b.id==='mvDnd'){const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',on);return set('dnd',{on,start:body.querySelector('#mvDs').value,end:body.querySelector('#mvDe').value},on?'שעות שקטות פעילות':'שעות שקטות כבויות')}
        if(b.id==='movaPair')return openMovaWifiSetup();
        if(b.id==='movaRoom')return pickRoom(MOVA,()=>render());
        if(b.id==='movaOut'){if(!confirm('לנתק את חשבון MOVAhome מ-HomeOn?'))return;return api('/mova/logout').then(()=>{MV.linked=false;MV.d=null;MV.map=null;render();draw()}).catch(e=>toast(e.message))}
        if(b.id==='movaHide'){META.mova=false;saveMeta();close();render();toast('השואב הוסתר. מחזירים מ-⋯ ← הוספת מכשיר')}
      });
      body.addEventListener('change',e=>{const t=e.target;
        if(t.dataset.sel)return set(t.dataset.sel,t.value,'נשמר');
        if(t.id==='mvDs'||t.id==='mvDe'){const sw=body.querySelector('#mvDnd');return set('dnd',{on:sw.getAttribute('aria-checked')==='true',start:body.querySelector('#mvDs').value,end:body.querySelector('#mvDe').value},'נשמר')}
      })}

    async function refresh(){if(!alive())return;await load();if(alive())draw()}
    async function loadMap(force){if(!alive()||!MV.linked)return;
      const x=MV.d&&MV.d.state,busy=x&&(x.running||BUSY.has(x.state));
      if(!force&&!busy&&MV.map&&Date.now()-MV.mapAt<5*60000)return;
      try{const j=await api('/mova/map');MV.mapAt=Date.now();if(j.map){MV.map=j.map;if(alive())drawRooms()}}catch(e){}}
    draw();
    load().then(()=>{if(alive()){draw();loadMap(!MV.map)}});
    iv=setInterval(()=>{if(!alive())return clearInterval(iv);if(MV.linked&&document.visibilityState==='visible')refresh()},8000);
    ivMap=setInterval(()=>{if(!alive())return clearInterval(ivMap);if(document.visibilityState==='visible')loadMap(false)},20000);
  });
};
})();
