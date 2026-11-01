/* HomeOn - automatic backup to the Google account (same Firebase project as TAB: tab-fd9b6).
   Sign in with Google once; every change is saved to users/{uid}/meta/homeon, and restored on a new install. */
const GB_CFG={apiKey:"AIzaSyAFIw46Gr7EF4-yH1alwr3LFElnjKDP16U",authDomain:"tab-fd9b6.firebaseapp.com",projectId:"tab-fd9b6",storageBucket:"tab-fd9b6.firebasestorage.app",messagingSenderId:"144362226746",appId:"1:144362226746:web:9eea68403c3a6613c9e103"};
const GB={ready:null,user:null,t:0,last:+(LS('unplug_gb_at')||0)};
function gbLoad(){if(GB.ready)return GB.ready;
  const add=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.append(s)});
  const b='https://www.gstatic.com/firebasejs/10.12.5/';
  GB.ready=add(b+'firebase-app-compat.js').then(()=>Promise.all([add(b+'firebase-auth-compat.js'),add(b+'firebase-firestore-compat.js')])).then(()=>{
    const app=firebase.apps.find(a=>a.name==='homeon')||firebase.initializeApp(GB_CFG,'homeon');
    GB.auth=app.auth();GB.db=app.firestore();
    return new Promise(ok=>{const off=GB.auth.onAuthStateChanged(u=>{GB.user=u&&!u.isAnonymous?u:null;off();ok()})})}).catch(e=>{GB.ready=null;throw e});
  return GB.ready}
const gbDoc=()=>GB.db.collection('users').doc(GB.user.uid).collection('meta').doc('homeon');
function gbData(){return {app:'HomeOn',v:1,meta:META,scenes:SCENES.map(({schedIds,...x})=>x),wash:LSj('unplug_wash',{}),acp:LSj('unplug_acp',{}),
  shabbat:LSj('unplug_shabbat',null),presence:LSj('unplug_presence',null),widget:LSj('unplug_widget',null)}}
function gbApply(o){if(!o||!o.meta)return false;Object.assign(META,{names:{},rooms:{},roomList:[],fav:{}},o.meta);LSset('unplug_meta',JSON.stringify(META));
  SCENES=o.scenes||[];if(typeof saveScenes==='function')saveScenes();
  for(const[k,ls]of[['wash','unplug_wash'],['acp','unplug_acp'],['shabbat','unplug_shabbat'],['presence','unplug_presence'],['widget','unplug_widget']])if(o[k]!=null)LSset(ls,JSON.stringify(o[k]));
  return true}
async function gbSave(){if(!GB.user)return;try{await gbDoc().set({data:JSON.stringify(gbData()),updatedAt:Date.now(),device:navigator.userAgent.slice(0,80)});GB.last=Date.now();LSset('unplug_gb_at',String(GB.last))}catch(e){}}
function gbQueue(){if(!LS('unplug_gb_on'))return;clearTimeout(GB.t);GB.t=setTimeout(()=>gbLoad().then(()=>gbSave()).catch(()=>{}),2500)}
async function gbSignIn(){await gbLoad();const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  const r=await GB.auth.signInWithPopup(p);GB.user=r.user;LSset('unplug_gb_on','1');
  const snap=await gbDoc().get();
  if(snap.exists){const o=JSON.parse(snap.data().data||'null');const localEmpty=!Object.keys(META.names||{}).length&&!Object.keys(META.icons||{}).length;
    if(localEmpty||confirm('נמצא גיבוי בחשבון Google. לשחזר ממנו? (ההגדרות הנוכחיות יוחלפו)')){gbApply(o);render();toast('שוחזר מהגיבוי ב-Google');return}}
  await gbSave();toast('מחובר. הגיבוי פועל')}
/* restore on a fresh install: if already signed in and this phone has nothing yet */
setTimeout(()=>{if(!LS('unplug_gb_on')||(typeof IN_APP!=='undefined'&&IN_APP))return;gbLoad().then(async()=>{if(!GB.user)return;
  if(!Object.keys(META.names||{}).length&&!Object.keys(META.icons||{}).length){const s=await gbDoc().get();if(s.exists&&gbApply(JSON.parse(s.data().data||'null'))){render();toast('ההגדרות שוחזרו מ-Google')}}
  else gbSave()}).catch(()=>{})},3000);
function gbRowHtml(){if(typeof IN_APP!=='undefined'&&IN_APP)return `<div class="sec-h"><h2>גיבוי בחשבון Google</h2></div><div class="list"><div class="row"><span class="grow"><span class="t">מנוהל מגרסת ה-Safari</span><br><span class="s">גוגל לא מאפשרת להתחבר מתוך אפליקציה מותקנת בלי חשבון מפתח. השמות, החדרים והסמלילים נשמרים בשרת בכל מקרה.</span></span></div></div>`;const on=!!LS('unplug_gb_on');
  return `<div class="sec-h"><h2>גיבוי בחשבון Google</h2></div><div class="list" id="gbBox">
    ${on?`<div class="row"><span class="grow"><span class="t">הגיבוי פועל</span><br><span class="s" id="gbWho">${GB.user?esc(GB.user.email||''):'מחובר'}${GB.last?' · נשמר '+esc(new Date(GB.last).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})):''}</span></span></div>
      <button class="row row-btn" id="gbNow"><span class="grow t">גיבוי עכשיו</span>${svg('save')}</button>
      <button class="row row-btn" id="gbRe"><span class="grow t">שחזור מהגיבוי</span>${svg('chev')}</button>
      <button class="row row-btn" id="gbOut"><span class="grow t" style="color:#ff8f8f">ניתוק מ-Google</span></button>`
    :`<button class="row row-btn" id="gbIn"><span class="grow"><span class="t">התחברות עם Google</span><br><span class="s">כל שינוי נשמר לבד, ומשוחזר בטלפון חדש</span></span>${svg('chev')}</button>`}</div>`}
function gbBind(el,redraw){const q=s=>el.querySelector(s);
  q('#gbIn')&&(q('#gbIn').onclick=async()=>{try{await gbSignIn();redraw()}catch(e){const c=(e&&e.code)||'';if(/popup-closed|cancelled/.test(c))return;toast(c==='auth/popup-blocked'?'הדפדפן חסם את חלון ההתחברות - נסה שוב':e instanceof Event||/network/.test(c)?'אין חיבור לגוגל. בדוק אינטרנט ונסה שוב':'ההתחברות נכשלה ('+(c||e.message||'שגיאה')+')')}});
  q('#gbNow')&&(q('#gbNow').onclick=async()=>{try{await gbLoad();if(!GB.user)return toast('צריך להתחבר שוב');await gbSave();toast('נשמר בגוגל');redraw()}catch(e){toast('לא נשמר')}});
  q('#gbRe')&&(q('#gbRe').onclick=async()=>{try{await gbLoad();if(!GB.user)return toast('צריך להתחבר שוב');const s=await gbDoc().get();if(!s.exists)return toast('אין עדיין גיבוי');
    if(!confirm('לשחזר מהגיבוי? ההגדרות הנוכחיות יוחלפו.'))return;gbApply(JSON.parse(s.data().data));render();toast('שוחזר')}catch(e){toast('השחזור נכשל')}});
  q('#gbOut')&&(q('#gbOut').onclick=async()=>{if(!confirm('לנתק את הגיבוי מחשבון Google?'))return;try{await gbLoad();await GB.auth.signOut()}catch(e){}GB.user=null;LSset('unplug_gb_on',null);redraw()});
  if(LS('unplug_gb_on')&&!GB.user)gbLoad().then(()=>{const w=q('#gbWho');if(w&&GB.user)w.textContent=GB.user.email+(GB.last?' · נשמר '+new Date(GB.last).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}):'')}).catch(()=>{})}
