/* HomeOn - automatic backup on the HomeOn server, kept per Smart Life account.
   Every change is saved by itself; after a reinstall and a new QR login everything comes back. No Google needed. */
const GB={t:0,last:+(LS('unplug_sb_at')||0),ok:null};
function gbData(){return {app:'HomeOn',v:1,meta:META,scenes:SCENES.map(({schedIds,...x})=>x),wash:LSj('unplug_wash',{}),acp:LSj('unplug_acp',{}),
  shabbat:LSj('unplug_shabbat',null),presence:LSj('unplug_presence',null),widget:LSj('unplug_widget',null)}}
function gbApply(o){if(!o||!o.meta)return false;Object.assign(META,{names:{},rooms:{},roomList:[],fav:{}},o.meta);LSset('unplug_meta',JSON.stringify(META));
  SCENES=o.scenes||[];LSset('unplug_scenes',JSON.stringify(SCENES));
  for(const[k,ls]of[['wash','unplug_wash'],['acp','unplug_acp'],['shabbat','unplug_shabbat'],['presence','unplug_presence'],['widget','unplug_widget']])if(o[k]!=null)LSset(ls,JSON.stringify(o[k]));
  if(CFG.key)api('/meta/save',{meta:META}).catch(()=>{});
  return true}
async function gbSave(){const j=await api('/backup/save',{data:JSON.stringify(gbData()),device:navigator.userAgent.slice(0,80)});
  GB.last=j.updatedAt||Date.now();GB.ok=true;LSset('unplug_sb_at',String(GB.last));return true}
async function gbGet(){const j=await api('/backup');GB.ok=true;return j.backup}
const gbLocalEmpty=()=>!Object.keys(META.names||{}).length&&!Object.keys(META.icons||{}).length;
function gbQueue(){if(!CFG.key)return;clearTimeout(GB.t);GB.t=setTimeout(()=>gbSave().catch(()=>{}),2500)}
/* on start: a fresh install gets everything back; otherwise keep the backup up to date */
setTimeout(async()=>{if(!CFG.key)return;try{const b=await gbGet();
  if(b&&gbLocalEmpty()){if(gbApply(JSON.parse(b.data||'null'))){GB.last=b.updatedAt;LSset('unplug_sb_at',String(b.updatedAt));render();toast('ההגדרות שוחזרו מהגיבוי')}}
  else if(!b||Number(b.updatedAt||0)<=GB.last)await gbSave(); /* never overwrite a newer backup from another phone just by opening the app */
}catch(e){GB.ok=false}},3000);
const gbWhen=t=>new Date(t).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
function gbRowHtml(){
  return `<div class="sec-h"><h2>גיבוי אוטומטי</h2></div><div class="list" id="gbBox">
    <div class="row"><span class="grow"><span class="t">${GB.ok===false?'הגיבוי לא זמין כרגע':'הגיבוי פועל'}</span><br><span class="s">${GB.ok===false?'אין חיבור לשרת. ננסה שוב בפתיחה הבאה':'נשמר לבד בחשבון ה-Smart Life שלך'+(GB.last?' · '+esc(gbWhen(GB.last)):'')}</span></span></div>
    <button class="row row-btn" id="gbNow"><span class="grow t">גיבוי עכשיו</span>${svg('save')}</button>
    <button class="row row-btn" id="gbRe"><span class="grow t">שחזור מהגיבוי</span>${svg('chev')}</button></div>`}
function gbBind(el,redraw){const q=s=>el.querySelector(s);
  q('#gbNow').onclick=async()=>{try{await gbSave();toast('נשמר');redraw()}catch(e){GB.ok=false;toast('לא נשמר - אין חיבור לשרת')}};
  q('#gbRe').onclick=async()=>{try{const b=await gbGet();if(!b)return toast('אין עדיין גיבוי');
    if(!confirm(`לשחזר מהגיבוי מ-${gbWhen(b.updatedAt)}? ההגדרות הנוכחיות יוחלפו.`))return;gbApply(JSON.parse(b.data));GB.last=b.updatedAt;LSset('unplug_sb_at',String(b.updatedAt));render();toast('שוחזר');redraw()}catch(e){toast('השחזור נכשל')}}}
