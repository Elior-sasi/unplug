/* Oral-B iO2 care companion for HomeOn.
 * The toothbrush itself has no control link in this app. All power commands
 * target a user-selected Tuya smart plug, never the brush.
 */
'use strict';
const ORALB_CHARGE_HOURS = 24;
const ORALB_HEAD_INTERVAL_MONTHS = 3;
const ORALB_TAG = 'Oral-B iO2 — סיום טעינה';

function brushSettings(){
  if (!META.brush || typeof META.brush !== 'object') {
    META.brush = { headDate:'', plugId:'', charge:null, rechargeReminder:true };
  }
  return META.brush;
}
function brushDateText(dt){
  return dt.toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'});
}
function brushLocalDate(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return null;
  const v=iso.split('-').map(Number);
  const dt=new Date(v[0],v[1]-1,v[2],9,0,0,0);
  return dt.getFullYear()===v[0]&&dt.getMonth()===v[1]-1&&dt.getDate()===v[2]?dt:null;
}
function brushMonthOffset(iso,months){
  const dt=brushLocalDate(iso);
  if(!dt)return null;
  const y=dt.getFullYear(),month=dt.getMonth()+months;
  const first=new Date(y,month,1,9,0,0,0);
  const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  first.setDate(Math.min(dt.getDate(),last));
  return first;
}
function brushDue(){
  return brushMonthOffset(brushSettings().headDate, ORALB_HEAD_INTERVAL_MONTHS);
}
function brushPlugOptions(){
  const allowed=new Set(['cz','pc','kg','tdq']);
  return DEVS.filter(d=>allowed.has(d.category)&&!!powerCode(d));
}
async function brushNotify(id,at,title,body){
  if(!IN_APP || typeof nativeCall!=='function')return {ok:false,reason:'not-native'};
  try{
    const raw=await nativeCall({action:'notify',id,at,title,body});
    const result=typeof raw==='string'?JSON.parse(raw):raw;
    return {ok:result&&result.ok===true,reason:result&&result.ok===true?'':'permission'};
  }catch(e){return {ok:false,reason:'unavailable'}}
}
async function brushCancelNotice(id){
  if(!IN_APP || typeof nativeCall!=='function')return;
  try{await nativeCall({action:'notify',id,cmd:'cancel'})}catch(e){}
}
async function brushHeadReminders(){
  const s=brushSettings();
  const changed=brushLocalDate(s.headDate);
  for(let i=1;i<=4;i++)await brushCancelNotice('oralb-head-'+i);
  if(!changed)return {ok:false,reason:'missing-date'};
  if(!IN_APP)return {ok:false,reason:'not-native'};
  let success=0;
  for(let i=1;i<=4;i++){
    const due=brushMonthOffset(s.headDate,i*ORALB_HEAD_INTERVAL_MONTHS);
    if(!due||due.getTime()<=Date.now())continue;
    const result=await brushNotify('oralb-head-'+i,due.getTime(),'הגיע הזמן להחליף ראש מברשת','Oral-B iO2 · מומלץ להחליף ראש כל 3 חודשים, או מוקדם יותר אם הסיבים נשחקים.');
    if(result.ok)success++;
  }
  return {ok:success>0,reason:success>0?'':'permission'};
}
async function brushRechargeReminder(startMs){
  const s=brushSettings();
  await brushCancelNotice('oralb-recharge');
  if(!s.rechargeReminder)return {ok:false,reason:'disabled'};
  // 14 days after the 24-hour full-charge period, at 09:00 local time.
  const due=new Date(startMs+ORALB_CHARGE_HOURS*3600000);
  due.setDate(due.getDate()+14);
  due.setHours(9,0,0,0);
  return brushNotify('oralb-recharge',due.getTime(),'בדוק אם צריך לטעון את המברשת','Oral-B iO2 · הסוללה מחזיקה בדרך כלל כשבועיים. אם החיווי נמוך, אפשר לטעון.');
}
function brushDueStatus(){
  const due=brushDue();
  if(!due)return 'ממתין לתאריך החלפת ראש';
  const days=Math.ceil((due.getTime()-Date.now())/86400000);
  if(days<0)return 'הגיע המועד להחלפת ראש';
  if(days===0)return 'מומלץ להחליף ראש היום';
  return 'החלפת ראש בעוד '+days+' ימים';
}
function brushChargeRemaining(ms){
  const secs=Math.ceil((ms-Date.now())/1000);
  if(secs<=0)return 'מועד הכיבוי המתוזמן הגיע — בדוק את מצב השקע';
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60);
  return h+' שעות ו־'+String(m).padStart(2,'0')+' דקות';
}
function brushCardStatus(){
  const s=brushSettings();
  if(s.charge&&s.charge.offAt>Date.now())return 'טעינה מתוזמנת · '+Math.ceil((s.charge.offAt-Date.now())/3600000)+' שעות נותרו';
  return brushDueStatus();
}
function brushError(el,msg){
  const out=el.querySelector('#brushError');
  if(out)out.textContent=msg||'';
}
function brushRenderDialog(el,close){
  const s=brushSettings();
  const plugs=brushPlugOptions();
  const due=brushDue();
  const charged=s.charge&&Number.isFinite(+s.charge.offAt)?s.charge:null;
  const chargeActive=!!(charged&&+charged.offAt>Date.now());
  const chosen=plugs.find(d=>d.id===s.plugId);
  const today=new Date();
  const todayISO=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  const main=el.querySelector('#brushBody');
  main.innerHTML=[
    '<div class="dhero"><div class="dh-art" aria-hidden="true">'+devArt(ORALB)+'</div><div class="dh-state">Oral-B iO2</div><div class="dh-sub">מעקב טעינה והחלפת ראש</div></div>',
    '<div class="sec-h"><h2>טעינת המברשת</h2></div>',
    '<div class="readouts"><div class="ro"><div class="k">משך טעינה מלאה מסוללה ריקה</div><div class="n">24 שעות</div></div><div class="ro"><div class="k">זמן שימוש אופייני</div><div class="n">כשבועיים</div></div></div>',
    '<p class="s">זה טיימר לפי זמן, לא מדידת סוללה. טעינה מלאה עשויה להימשך פחות כשהסוללה לא ריקה.</p>',
    '<div class="field"><label for="brushPlug">השקע החכם של המטען</label><select id="brushPlug" style="max-width:100%;min-width:0;flex:1"><option value="">בחר שקע</option>'+
        plugs.map(d=>'<option value="'+esc(d.id)+'"'+(d.id===s.plugId?' selected':'')+'>'+esc(dname(d))+'</option>').join('')+'</select></div>',
    !plugs.length?'<p class="s">עדיין אין שקע Smart Life מתאים. חבר שקע חכם לחשבון ואז חזור למסך הזה.</p>':'',
    chargeActive?'<div class="list"><div class="row"><span class="grow"><span class="t">טיימר טעינה פועל</span><br><span class="s" id="brushCountdown">'+brushChargeRemaining(+charged.offAt)+'</span></span></div>'+
      '<div class="row"><span class="grow"><span class="t">כיבוי מתוזמן</span><br><span class="s">'+brushDateText(new Date(+charged.offAt))+' · '+new Date(+charged.offAt).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})+'</span></span></div></div>':
      charged?'<div class="empty"><b>מחזור הטעינה האחרון הסתיים לפי הטיימר</b>בדוק אם השקע אכן כבוי. לא קיימת מדידת סוללה מהמכשיר.</div>':'',
    '<button class="btn pri wide" id="brushStart" '+(!chosen||chargeActive?'disabled':'')+'>'+svg('bolt')+'הפעל טעינה ל־24 שעות וכיבוי אוטומטי</button>',
    chargeActive?'<button class="btn wide" id="brushStop">כבה את השקע וסיים טעינה עכשיו</button>':'',
    '<label class="row" style="padding:12px"><span class="grow"><span class="t">תזכורת לבדוק טעינה כעבור כשבועיים</span><br><span class="s">לפי זמן בלבד, לא אחוז סוללה</span></span><input type="checkbox" id="brushRecharge" '+(s.rechargeReminder?'checked':'')+'></label>',
    '<div class="sec-h"><h2>החלפת ראש מברשת</h2></div>',
    '<p class="s">Oral-B ממליצה להחליף ראש בכל 3 חודשים, או קודם אם הסיבים התבלו.</p>',
    '<div class="field"><label for="brushHeadDate">התאריך שבו התחלת להשתמש בראש הנוכחי</label><input id="brushHeadDate" type="date" dir="ltr" max="'+todayISO+'" value="'+esc(s.headDate||'')+'" style="min-width:0;max-width:100%;flex:1;font-size:17px"></div>',
    due?'<div class="readouts"><div class="ro"><div class="k">מועד ההחלפה הבא</div><div class="n">'+brushDateText(due)+'</div></div><div class="ro"><div class="k">מצב</div><div class="n">'+brushDueStatus()+'</div></div></div>':'',
    '<button class="btn pri wide" id="brushSaveHead">'+svg('bell')+'שמור תאריך והפעל תזכורת אוטומטית</button>',
    s.headDate?'<button class="btn wide" id="brushReplaced">החלפתי ראש היום — התחל ספירה חדשה</button>':'',
    '<p class="s" id="brushReminderStatus">'+(IN_APP?'באפליקציית האייפון ניתן לתזמן התראות מקומיות גם כשהאפליקציה סגורה, אחרי אישור התראות.':'בדפדפן אפשר לראות את המועד כאן; התראות רקע דורשות את אפליקציית HomeOn לאייפון.')+'</p>',
    '<div class="err" id="brushError" role="alert"></div>',
    '<div class="list"><button class="row row-btn" id="brushRoom"><span class="grow"><span class="t">חדר</span><br><span class="s">'+esc(roomOf(ORALB)||'בלי חדר')+'</span></span>'+svg('chev')+'</button></div>'
  ].join('');
  main.querySelector('#brushPlug').onchange=e=>{s.plugId=e.target.value;saveMeta();brushRenderDialog(el,close);render()};
  main.querySelector('#brushRecharge').onchange=async e=>{
    s.rechargeReminder=e.target.checked;saveMeta();
    if(!s.rechargeReminder)await brushCancelNotice('oralb-recharge');
    else if(s.charge?.startedAt)await brushRechargeReminder(s.charge.startedAt);
  };
  main.querySelector('#brushSaveHead').onclick=async()=>{
    const v=main.querySelector('#brushHeadDate').value;
    const dt=brushLocalDate(v);
    if(!dt||dt.getTime()>Date.now()+86400000)return brushError(el,'בחר תאריך תקין בעבר או היום.');
    s.headDate=v;saveMeta();
    const n=await brushHeadReminders();
    brushRenderDialog(el,close);render();
    const info=el.querySelector('#brushReminderStatus');
    if(info)info.textContent=n.ok?'התזכורת האוטומטית נשמרה באייפון ל־3 חודשים ולמועדים הבאים.':
      IN_APP?'התאריך נשמר, אך לא אושרו התראות. יש לאפשר התראות ל־HomeOn בהגדרות האייפון.':
      'התאריך נשמר; תזכורת תופיע בממשק. להתראת רקע יש לפתוח ב־HomeOn לאייפון.';
  };
  const replaced=main.querySelector('#brushReplaced');
  if(replaced)replaced.onclick=async()=>{
    s.headDate=todayISO;saveMeta();
    const n=await brushHeadReminders();
    brushRenderDialog(el,close);render();
    toast(n.ok?'תאריך הראש עודכן ותזכורת חדשה נקבעה':'תאריך הראש עודכן');
  };
  main.querySelector('#brushRoom').onclick=()=>pickRoom(ORALB,()=>{brushRenderDialog(el,close);render()});
  const start=main.querySelector('#brushStart');
  start.onclick=async()=>{
    const plug=plugs.find(x=>x.id===s.plugId);
    const code=plug&&powerCode(plug);
    if(!plug||!code)return brushError(el,'בחר שקע חכם מתאים.');
    start.disabled=true;start.textContent='שומר כיבוי מתוזמן...';brushError(el,'');
    const startedAt=Date.now();
    const offAt=new Date(startedAt+ORALB_CHARGE_HOURS*3600000);
    const time=String(offAt.getHours()).padStart(2,'0')+':'+String(offAt.getMinutes()).padStart(2,'0');
    let scheduleId=null;
    try{
      // Set the server-side OFF schedule before energizing the plug.
      const saved=await api('/schedules/save',{
        device:plug.id,time,days:[offAt.getDay()],cmds:[{code,value:false}],
        label:ORALB_TAG,enabled:true,once:true
      });
      scheduleId=saved.id||saved.schedule?.id||saved.data?.id||null;
      if(!scheduleId){
        const all=await api('/schedules');
        const match=(all.schedules||[]).filter(x=>x.device===plug.id&&x.once&&x.label===ORALB_TAG&&x.time===time).at(-1);
        scheduleId=match?.id||null;
      }
      if(!scheduleId)throw Error('תזמון הכיבוי לא אומת. השקע לא הופעל.');
      try{await api('/command',{id:plug.id,commands:[{code,value:true}]})}
      catch(e){
        try{await api('/schedules/delete',{id:scheduleId})}catch(_){}
        throw Error('לא הצלחתי להפעיל את השקע: '+e.message);
      }
      s.charge={plugId:plug.id,code,scheduleId,startedAt,offAt:offAt.getTime()};
      saveMeta();
      await loadSched();
      const notify=await brushNotify('oralb-charge',offAt.getTime(),'טעינת Oral-B iO2 הסתיימה','זמן הטעינה המתוזמן הסתיים. בדוק שהשקע כבוי.');
      if(s.rechargeReminder)await brushRechargeReminder(startedAt);
      brushRenderDialog(el,close);render();
      toast('השקע הופעל ונשמר כיבוי מתוזמן בעוד 24 שעות'+(!notify.ok&&IN_APP?' · ללא התראה באייפון':''));
    }catch(e){
      brushError(el,e.message||'לא ניתן להתחיל טעינה');
      start.disabled=false;start.textContent='נסה שוב להפעיל טעינה';
    }
  };
  const stop=main.querySelector('#brushStop');
  if(stop)stop.onclick=async()=>{
    stop.disabled=true;stop.textContent='מכבה את השקע...';brushError(el,'');
    const charge=s.charge,plug=DEVS.find(d=>d.id===charge.plugId);
    if(!plug){brushError(el,'השקע אינו זמין. פתח את Smart Life וכבה אותו משם.');stop.disabled=false;stop.textContent='נסה שוב';return}
    try{
      await api('/command',{id:plug.id,commands:[{code:charge.code,value:false}]});
      let cancelFailed=false;
      if(charge.scheduleId){
        try{await api('/schedules/delete',{id:charge.scheduleId})}catch(e){cancelFailed=true}
      }
      s.charge=null;saveMeta();
      await brushCancelNotice('oralb-charge');
      brushRenderDialog(el,close);render();
      toast(cancelFailed?'השקע כובה, אבל מחיקת התזמון נכשלה':'השקע כובה והטיימר בוטל');
    }catch(e){
      brushError(el,'לא ניתן לאמת כיבוי השקע: '+(e.message||e));
      stop.disabled=false;stop.textContent='נסה שוב לכבות';
    }
  };
  const countdown=main.querySelector('#brushCountdown');
  if(countdown){
    const t=setInterval(()=>{
      if(!document.body.contains(countdown)){clearInterval(t);return}
      countdown.textContent=brushChargeRemaining(+charged.offAt);
    },30000);
  }
}
function openToothbrush(){
  sheet(esc(dname(ORALB)),'<div id="brushBody" style="display:flex;flex-direction:column;gap:14px"></div>',(el,close)=>{
    brushRenderDialog(el,close);
    // Re-arm persisted reminders when returning to an installed iPhone app,
    // including after a reinstall or when the date was originally set in Safari.
    if(IN_APP&&brushSettings().headDate){
      brushHeadReminders().then(result=>{
        const txt=el.querySelector('#brushReminderStatus');
        if(txt&&document.body.contains(txt)){
          txt.textContent=result.ok?'תזכורות החלפת הראש פעילות באייפון.':
            'התאריך שמור, אבל אין הרשאה להתראות. בדוק את הגדרות ההתראות של HomeOn.';
        }
      }).catch(()=>{});
    }
  });
}
