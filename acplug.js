/* HomeOn - AC on a smart plug (Breeze Plug inside HomeOn).
   The plug only cuts and restores power, so: compressor guard (3 minutes between off and on),
   cooling/heating label, a night cycle (work / rest), timer and schedules, and the power draw tells if the compressor runs. */
const ACP_GAP=3*60e3;
const isAcPlug=d=>!!d&&!d.virtual&&!AC.has(d.category)&&!!powerCode(d)&&['ac','portac'].includes(iconOf(d));
const acpGet=()=>LSj('unplug_acp',{});
function acpInfo(d){return acpGet()[d.id]||{mode:'cold'}}
function acpSave(d,v){const a=acpGet();a[d.id]=v;LSset('unplug_acp',JSON.stringify(a))}
function acpRun(d){if(d.status.cur_power==null||!isOn(d))return '';const w=watts(d);
  return w>=150?'המדחס עובד':w>=5?'מאוורר / המתנה':'המזגן במנוחה'}
function acpText(d){if(!d.online)return 'מנותק';if(!isOn(d))return 'כבוי';
  const i=acpInfo(d),r=acpRun(d);return (i.mode==='hot'?'חימום':'קירור')+(r?' · '+r:'')}
/* compressor guard: after turning off, wait 3 minutes before turning on again */
function acGuardOn(d,cmds){if(!isAcPlug(d))return true;const pc=powerCode(d),i=acpInfo(d);
  const on=cmds.find(c=>c.code===pc);if(!on)return true;
  if(on.value===false){i.offAt=Date.now();acpSave(d,i);return true}
  const left=(i.offAt||0)+ACP_GAP-Date.now();if(left<=0)return true;
  const at=new Date(Date.now()+left+60e3);at.setSeconds(0,0);
  if(confirm(`שמירה על המדחס: המזגן כבה לפני פחות מ-3 דקות. להדליק אותו לבד ב-${hm(at)}?`)){
    api('/schedules/save',{device:d.id,time:hm(at),days:[at.getDay()],cmds:[{code:pc,value:true}],label:'טיימר',enabled:true,once:true})
      .then(()=>{loadSched().then(()=>refreshOpen(d));toast('יידלק ב-'+hm(at))}).catch(e=>toast(e.message))}
  return false}
async function acpCycle(d,hours,onM,offM){const pc=powerCode(d);
  for(const s of SCHED.filter(s=>s.device===d.id&&s.label==='מחזור לילה'))await api('/schedules/delete',{id:s.id}).catch(()=>{});
  if(!hours){await loadSched();return}
  const end=Date.now()+hours*3600e3;let t=Date.now()+onM*60e3,on=false;const jobs=[];
  while(t<end){const at=new Date(t);jobs.push({at,v:on});t+=(on?onM:offM)*60e3;on=!on}
  jobs.push({at:new Date(end),v:false});
  for(const j of jobs)await api('/schedules/save',{device:d.id,time:hm(j.at),days:[j.at.getDay()],cmds:[{code:pc,value:j.v}],label:'מחזור לילה',enabled:true,once:true});
  if(!isOn(d))await send(d,[{code:pc,value:true}]);
  await loadSched()}
function openAcPlug(d){
  sheet(esc(dname(d)),`<div id="apB" style="display:flex;flex-direction:column;gap:14px"></div>`,(el)=>{
    const body=el.querySelector('#apB');
    OPEN={id:d.id,draw:dd=>{d=dd;draw()}};
    function draw(){const pc=powerCode(d),on=isOn(d),i=acpInfo(d),run=acpRun(d),hot=i.mode==='hot';
      const cyc=SCHED.filter(s=>s.device===d.id&&s.label==='מחזור לילה').sort((a,b)=>a.time.localeCompare(b.time));
      const left=Math.max(0,(i.offAt||0)+ACP_GAP-Date.now());
      const mySched=SCHED.filter(s=>s.device===d.id&&s.label!=='מחזור לילה'&&!(s.once&&s.label==='טיימר'));
      body.innerHTML=`${!d.online?`<div class="empty" role="alert"><b>השקע מנותק</b>בדוק שהוא מחובר לחשמל ול-WiFi.</div>`:''}
        <button class="big-pw" id="apPw" role="switch" aria-checked="${on}" aria-label="${esc(dname(d))} פועל">${devArt(d,1.5)}</button>
        <div class="state-line" role="status">${on?(hot?'חימום':'קירור'):'כבוי'}${run?' · '+run:''}${!on&&left?` · אפשר להדליק בעוד ${Math.ceil(left/60e3)} דק׳`:''}</div>
        <div class="list"><div class="ctl"><div class="ctl-h"><span class="t" id="apML">מצב במזגן</span></div>
          <div class="seg" role="group" aria-labelledby="apML"><button data-am="cold" aria-pressed="${!hot}">❄︎ קירור</button><button data-am="hot" aria-pressed="${hot}">☀︎ חימום</button></div>
          <p class="s" style="margin:6px 2px 0">השקע רק מדליק ומכבה. את המצב בוחרים בשלט של המזגן, וכאן הוא נשמר לתצוגה.</p></div></div>
        <div class="sec-h"><h2>טיימר</h2></div><div class="list" id="apT"></div>
        <div class="sec-h"><h2>מחזור לילה</h2></div>
        <div class="list">${cyc.length?`<div class="row"><span class="grow"><span class="t">פעיל עד ${esc(cyc[cyc.length-1].time)}</span><br><span class="s">${cyc.length} החלפות · עובד ונח לסירוגין</span></span><button class="btn bad" id="apCx">ביטול</button></div>`
          :`<div class="ctl"><p class="s" style="margin:0 2px 8px">המזגן עובד ונח לסירוגין, כדי שלא יהיה קר מדי בלילה.</p>
            <div class="ctl-h"><span class="t" id="apC1">כמה זמן</span></div><div class="seg" role="group" aria-labelledby="apC1">${[4,6,8].map(h=>`<button data-ch="${h}" aria-pressed="${h===6}">${h} שע׳</button>`).join('')}</div>
            <div class="ctl-h"><span class="t" id="apC2">עובד / נח</span></div><div class="seg" role="group" aria-labelledby="apC2">${[[40,20],[45,15],[30,30],[60,30]].map(([a,b],k)=>`<button data-cr="${a}-${b}" aria-pressed="${k===0}">${a}/${b} דק׳</button>`).join('')}</div>
            <button class="btn pri wide" id="apCs" style="margin-top:8px">הפעלת מחזור לילה</button></div>`}</div>
        <div class="sec-h"><h2>תזמונים</h2><button class="btn" id="apAdd">${svg('plus')}הוספה</button></div>
        <div class="list">${mySched.length?mySched.map(s=>schedRow(s,false)).join(''):`<div class="row"><span class="s">אין תזמונים</span></div>`}</div>
        <div class="list"><button class="row row-btn" id="apGen"><span class="grow"><span class="t">הגדרות השקע</span><br><span class="s">אחרי הפסקת חשמל, נעילה, שם, חדר וסמליל</span></span>${svg('chev')}</button></div>
        <p class="s" style="font-size:.9rem">שמירה על המדחס: אחרי כיבוי, HomeOn לא ידליק את המזגן לפני שעברו 3 דקות, ויציע להדליק אותו לבד.</p>`;
      body.querySelector('#apPw').onclick=()=>{if(!d.online)return toast('השקע מנותק');send(d,[{code:pc,value:!isOn(d)}])};
      body.querySelectorAll('[data-am]').forEach(b=>b.onclick=()=>{const x=acpInfo(d);x.mode=b.dataset.am;acpSave(d,x);draw();render()});
      drawTimer(d,body.querySelector('#apT'),pc);
      let H=6,R=[40,20];
      body.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{H=+b.dataset.ch;body.querySelectorAll('[data-ch]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
      body.querySelectorAll('[data-cr]').forEach(b=>b.onclick=()=>{R=b.dataset.cr.split('-').map(Number);body.querySelectorAll('[data-cr]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
      const cs=body.querySelector('#apCs');if(cs)cs.onclick=async()=>{cs.disabled=true;try{await acpCycle(d,H,R[0],R[1]);toast('מחזור לילה הופעל');draw()}catch(e){toast(e.message);cs.disabled=false}};
      const cx=body.querySelector('#apCx');if(cx)cx.onclick=async()=>{try{await acpCycle(d,0);toast('המחזור בוטל');draw()}catch(e){toast(e.message)}};
      body.querySelector('#apAdd').onclick=()=>openSchedEdit(null,d);
      bindSchedRows(body);
      body.querySelector('#apGen').onclick=()=>openDevice(d,true);
    }
    draw();
  });
}
