/* HomeOn - energy use & cost, offline alerts, if-then automations (run on the server every 2 minutes). */
let HOME=null;
const metered=()=>DEVS.filter(d=>!d.virtual&&d.status&&d.status.cur_power!=null);
const scaleOf=(d,code)=>{const f=readOf(d,code);return +(f&&f.values&&f.values.scale)||0};
async function homeLoad(){try{HOME=(await api('/home')).home||{};return true}catch(e){HOME=null;return false}}
async function homeSave(){try{await api('/home/save',{home:HOME});return true}catch(e){toast(e.message);return false}}
const serverMissing=()=>sheet('צריך עדכון שרת',`<p>האפשרות הזו רצה בשרת, וצריך לעדכן אותו פעם אחת מהמחשב.</p><p>כשתהיה ליד המחשב, תכתוב לי "ליד המחשב".</p>`);
const shekel=n=>n<10?n.toFixed(2)+' ₪':Math.round(n)+' ₪';
const kwh=wh=>wh<1000?Math.round(wh)+' וואט-שעה':(wh/1000).toFixed(wh<10000?2:1)+' קוט״ש';

/* ---------- energy ---------- */
async function openEnergy(){
  if(!await homeLoad())return serverMissing();
  const en=HOME.energy=HOME.energy||{on:false,price:0.6352,devs:[]};
  const sync=()=>{en.devs=metered().map(d=>({id:d.id,name:dname(d),scale:scaleOf(d,'cur_power')}))};
  let days={};if(en.on){try{days=(await api('/energy',{days:31})).days||{}}catch(e){}}
  const today=new Date(),key=d=>d.toISOString().slice(0,10),ds=[...Array(31)].map((_,i)=>{const x=new Date(today);x.setDate(x.getDate()-i);return key(new Date(x.getTime()-x.getTimezoneOffset()*6e4))});
  const sum=(n,id)=>ds.slice(0,n).reduce((t,k)=>t+(id?(days[k]||{})[id]||0:Object.values(days[k]||{}).reduce((a,b)=>a+b,0)),0);
  const price=+en.price||0.6352,cost=wh=>wh/1000*price;
  const per=metered().map(d=>({d,day:sum(1,d.id),week:sum(7,d.id),month:sum(31,d.id)})).sort((a,b)=>b.month-a.month);
  const bars=ds.slice(0,14).reverse().map(k=>({k,v:Object.values(days[k]||{}).reduce((a,b)=>a+b,0)})),mx=Math.max(1,...bars.map(b=>b.v));
  sheet('צריכת חשמל',`${!metered().length?`<div class="empty"><b>אין שקעים שמודדים צריכה</b>צריכה נמדדת רק בשקעים חכמים עם מד הספק.</div>`:`
    <div class="list"><div class="ctl"><div class="ctl-h"><span class="t" id="enL">מדידה ושמירה של הצריכה</span><button class="sw" id="enOn" role="switch" aria-checked="${!!en.on}" aria-labelledby="enL"></button></div>
      <p class="s" style="margin:4px 2px 0">השרת רושם כל 2 דקות כמה כל שקע צורך, גם כשהאפליקציה סגורה.</p></div></div>
    ${en.on?`<div class="readouts">${[['היום',1],['השבוע',7],['30 יום',31]].map(([t,n])=>`<div class="ro"><div class="k">${t}</div><div class="n">${shekel(cost(sum(n)))}</div><div class="s">${kwh(sum(n))}</div></div>`).join('')}</div>
      <div class="sec-h"><h2>14 ימים אחרונים</h2></div>
      <div class="list"><div class="ctl"><div role="img" aria-label="גרף צריכה יומית ל-14 ימים" style="display:flex;align-items:flex-end;gap:4px;height:120px;direction:ltr">
        ${bars.map(b=>`<div title="${b.k}" style="flex:1;height:${Math.max(3,b.v/mx*100)}%;background:${b.k===ds[0]?'#3d8bff':'#ff9a3d'};border-radius:6px 6px 2px 2px;opacity:${b.v?1:.25}"></div>`).join('')}</div>
        <div class="ctl-h" style="min-height:0"><span class="s">היום</span><span class="s">לפני שבועיים</span></div></div></div>
      <div class="sec-h"><h2>לפי מכשיר</h2></div>
      <div class="list">${per.map(x=>`<button class="row row-btn" data-en="${esc(x.d.id)}"><span class="mini">${devArt(x.d)}</span><span class="grow"><span class="t">${esc(dname(x.d))}</span><br><span class="s">היום ${shekel(cost(x.day))} · 30 יום ${shekel(cost(x.month))} (${kwh(x.month)})</span></span>${svg('chev')}</button>`).join('')}</div>
      <div class="list"><div class="field"><label for="enP">מחיר לקוט״ש (₪)</label><input id="enP" type="number" inputmode="decimal" step="0.01" min="0" value="${price}"></div>
      <p class="s" style="margin:0 16px 12px">ברירת המחדל: התעריף הביתי של חברת החשמל מיולי 2026, 63.52 אגורות כולל מע״מ.</p></div>
      ${!Object.keys(days).length?`<p class="s">הנתונים יתחילו להצטבר מעכשיו.</p>`:''}`:''}`}`,(el,close)=>{
    const on=el.querySelector('#enOn');if(on)on.onclick=async()=>{en.on=!en.on;sync();if(await homeSave()){close();openEnergy()}};
    const p=el.querySelector('#enP');if(p)p.onchange=async()=>{const v=+p.value;if(!(v>0&&v<10))return toast('מחיר לא תקין');en.price=v;sync();await homeSave();close();openEnergy()};
    el.querySelectorAll('[data-en]').forEach(b=>b.onclick=()=>{const d=DEVS.find(x=>x.id===b.dataset.en);if(d)openDevice(d)});
  });
}

/* ---------- offline alerts ---------- */
async function openOffline(){
  if(!await homeLoad())return serverMissing();
  const off=HOME.offline=HOME.offline||{on:false,devs:[]};
  let pick=new Set(off.devs.length?off.devs.map(d=>d.id):DEVS.filter(d=>!d.virtual).map(d=>d.id));
  const draw=el=>{el.querySelector('#ofL').innerHTML=DEVS.filter(d=>!d.virtual).map(d=>`<button class="row row-btn" role="checkbox" aria-checked="${pick.has(d.id)}" data-of="${esc(d.id)}"><span class="mini">${devArt(d)}</span><span class="grow t">${esc(dname(d))}</span><span aria-hidden="true" style="font-size:1.3rem">${pick.has(d.id)?'✓':''}</span></button>`).join('');
    el.querySelectorAll('[data-of]').forEach(b=>b.onclick=()=>{pick.has(b.dataset.of)?pick.delete(b.dataset.of):pick.add(b.dataset.of);draw(el)})};
  sheet('התראה על ניתוק',`<div class="list"><div class="ctl"><div class="ctl-h"><span class="t" id="ofT">התראה כשמכשיר מתנתק וכשהוא חוזר</span><button class="sw" id="ofOn" role="switch" aria-checked="${!!off.on}" aria-labelledby="ofT"></button></div>
    <p class="s" style="margin:4px 2px 0">מכשיר שמנותק יותר מ-6 דקות שולח התראה, למשל בהפסקת חשמל או נפילת WiFi. כשהוא חוזר מגיעה התראה נוספת.${LS('unplug_push')?'':' <b>צריך להפעיל התראות לטלפון בהגדרות.</b>'}</p></div></div>
    <div class="sec-h"><h2>אילו מכשירים</h2></div><div class="list" id="ofL"></div><button class="btn pri wide" id="ofS">שמירה</button>`,(el,close)=>{
    draw(el);const sw=el.querySelector('#ofOn');sw.onclick=()=>sw.setAttribute('aria-checked',sw.getAttribute('aria-checked')!=='true');
    el.querySelector('#ofS').onclick=async()=>{off.on=sw.getAttribute('aria-checked')==='true';off.devs=DEVS.filter(d=>pick.has(d.id)).map(d=>({id:d.id,name:dname(d)}));if(await homeSave()){close();toast('נשמר')}};
  });
}

/* ---------- if-then automations ---------- */
const TEMPC=['temp_current','va_temperature','temp_indoor','cur_temp'];
function condOpts(d){const o=[];const pc=powerCode(d);
  const tc=TEMPC.find(c=>d.status[c]!=null);if(tc){o.push({k:'temp_above',t:'הטמפרטורה עולה מעל',code:tc,scale:scaleOf(d,tc),val:true},{k:'temp_below',t:'הטמפרטורה יורדת מתחת',code:tc,scale:scaleOf(d,tc),val:true})}
  if(pc)o.push({k:'turns_on',t:'נדלק',code:pc},{k:'turns_off',t:'נכבה',code:pc});
  if(d.status.cur_power!=null)o.push({k:'power_below',t:'הצריכה יורדת מתחת (וואט)',code:'cur_power',scale:scaleOf(d,'cur_power'),val:true},{k:'power_above',t:'הצריכה עולה מעל (וואט)',code:'cur_power',scale:scaleOf(d,'cur_power'),val:true});
  return o}
function autoText(a){const dc=DEVS.find(d=>d.id===a.if.device),dt=DEVS.find(d=>d.id===a.then.device);
  const c=(condOpts(dc||{status:{}}).find(o=>o.k===a.if.kind)||{t:a.if.kind}).t;const on=a.then.cmds[0]&&a.then.cmds[0].value===true;
  return `אם ${dc?dname(dc):'מכשיר'} ${c}${['temp_above','temp_below'].includes(a.if.kind)?' '+a.if.value+'°':a.if.kind.startsWith('power')?' '+a.if.value:''} ← ${on?'להדליק':'לכבות'} את ${dt?dname(dt):'מכשיר'}`}
async function openAutos(){
  if(!await homeLoad())return serverMissing();
  HOME.autos=HOME.autos||[];
  sheet('אוטומציות',`<p>"אם... אז..." שרץ בשרת, גם כשהטלפון כבוי. נבדק כל 2 דקות.</p>
    <div class="list">${HOME.autos.length?HOME.autos.map((a,i)=>`<div class="row"><span class="grow"><span class="t">${esc(a.name||'אוטומציה')}</span><br><span class="s">${esc(autoText(a))}</span></span>
      <button class="sw" role="switch" data-ae="${i}" aria-checked="${a.enabled!==false}" aria-label="פעילה: ${esc(a.name||'')}"></button><button class="icbtn" data-ad="${i}" aria-label="מחיקה">${svg('trash')}</button></div>`).join(''):'<div class="row"><span class="s">עוד אין אוטומציות</span></div>'}</div>
    <button class="btn pri wide" id="auA">${svg('plus')}אוטומציה חדשה</button>
    <div class="sec-h"><h2>רעיונות</h2></div><div class="list">
      <button class="row row-btn" data-ai="hot"><span class="grow"><span class="t">חם בבית ← להדליק מזגן שני</span></span>${svg('plus')}</button>
      <button class="row row-btn" data-ai="wash"><span class="grow"><span class="t">מכונת הכביסה סיימה ← לכבות את השקע</span></span>${svg('plus')}</button></div>`,(el,close)=>{
    el.querySelectorAll('[data-ae]').forEach(b=>b.onclick=async()=>{const a=HOME.autos[+b.dataset.ae];a.enabled=a.enabled===false;b.setAttribute('aria-checked',a.enabled);await homeSave()});
    el.querySelectorAll('[data-ad]').forEach(b=>b.onclick=async()=>{if(!confirm('למחוק את האוטומציה?'))return;HOME.autos.splice(+b.dataset.ad,1);await homeSave();close();openAutos()});
    el.querySelector('#auA').onclick=()=>autoEdit({});
    el.querySelectorAll('[data-ai]').forEach(b=>b.onclick=()=>{
      if(b.dataset.ai==='hot'){const ac=DEVS.find(d=>TEMPC.some(c=>d.status[c]!=null)),p=DEVS.find(d=>typeof isAcPlug==='function'&&isAcPlug(d));autoEdit({name:'חם בבית',ifD:ac&&ac.id,kind:'temp_above',value:27,thenD:p&&p.id,on:true,notify:true})}
      else{const w=DEVS.find(d=>typeof isWasher==='function'&&isWasher(d));autoEdit({name:'כביסה הסתיימה',ifD:w&&w.id,kind:'power_below',value:3,thenD:w&&w.id,on:false,notify:false})}});
  });
}
function autoEdit(p){
  const devs=DEVS.filter(d=>!d.virtual);const st={ifD:p.ifD||(devs[0]&&devs[0].id),kind:p.kind,value:p.value??27,thenD:p.thenD||(devs.find(d=>powerCode(d))||{}).id,on:p.on!==false,notify:!!p.notify,name:p.name||''};
  const opt=(id,sel)=>devs.map(d=>`<option value="${esc(d.id)}"${d.id===sel?' selected':''}>${esc(dname(d))}${roomOf(d)?' · '+esc(roomOf(d)):''}</option>`).join('');
  sheet('אוטומציה חדשה',`<div class="list">
    <div class="field"><label for="aN">שם</label><input id="aN" value="${esc(st.name)}" placeholder="למשל: חם בבית"></div>
    <div class="field"><label for="aI">אם המכשיר</label><select id="aI">${opt('aI',st.ifD)}</select></div>
    <div class="field"><label for="aK">מה קורה</label><select id="aK"></select></div>
    <div class="field" id="aVb"><label for="aV">ערך</label><input id="aV" type="number" inputmode="decimal" value="${st.value}"></div>
    <div class="field"><label for="aO">אז</label><select id="aO"><option value="1"${st.on?' selected':''}>להדליק</option><option value="0"${st.on?'':' selected'}>לכבות</option></select></div>
    <div class="field"><label for="aT">את המכשיר</label><select id="aT">${devs.filter(d=>powerCode(d)).map(d=>`<option value="${esc(d.id)}"${d.id===st.thenD?' selected':''}>${esc(dname(d))}</option>`).join('')}</select></div>
    <div class="ctl"><div class="ctl-h"><span class="t" id="aNt">התראה לטלפון כשזה קורה</span><button class="sw" id="aNo" role="switch" aria-checked="${st.notify}" aria-labelledby="aNt"></button></div></div></div>
    <p class="s" id="aPv" role="status"></p><button class="btn pri wide" id="aS">שמירה</button>`,(el,close)=>{
    const $$=s=>el.querySelector(s);
    const fillK=()=>{const d=DEVS.find(x=>x.id===$$('#aI').value);const o=condOpts(d);$$('#aK').innerHTML=o.length?o.map(x=>`<option value="${x.k}"${x.k===st.kind?' selected':''}>${esc(x.t)}</option>`).join(''):'<option value="">אין למכשיר הזה מה למדוד</option>';fillV()};
    const fillV=()=>{const d=DEVS.find(x=>x.id===$$('#aI').value),o=condOpts(d).find(x=>x.k===$$('#aK').value);$$('#aVb').hidden=!(o&&o.val);prev()};
    const build=()=>{const d=DEVS.find(x=>x.id===$$('#aI').value),o=condOpts(d).find(x=>x.k===$$('#aK').value),t=DEVS.find(x=>x.id===$$('#aT').value);if(!o||!t)return null;
      return {id:Math.random().toString(36).slice(2,8),name:$$('#aN').value.trim()||'אוטומציה',enabled:true,notify:$$('#aNo').getAttribute('aria-checked')==='true',cool:10,
        if:{device:d.id,kind:o.k,code:o.code,scale:o.scale||0,value:o.val?+$$('#aV').value:0},then:{device:t.id,cmds:[{code:powerCode(t),value:$$('#aO').value==='1'}]}}};
    const prev=()=>{const a=build();$$('#aPv').textContent=a?autoText(a):'';if(a)a.text=autoText(a)};
    $$('#aI').onchange=fillK;$$('#aK').onchange=fillV;['#aV','#aO','#aT','#aN'].forEach(s=>$$(s).oninput=$$(s).onchange=prev);
    $$('#aNo').onclick=()=>{const b=$$('#aNo');b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true')};
    fillK();
    $$('#aS').onclick=async()=>{const a=build();if(!a)return toast('בחר תנאי ומכשיר');a.text=autoText(a);HOME.autos.push(a);if(await homeSave()){close();openAutos();toast('נשמר')}};
  });
}
