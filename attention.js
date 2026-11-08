/* "מה דורש טיפול" - one place for everything that needs a hand: vacuum parts and tanks, the toothbrush head,
   devices that dropped off the network, the water heater link. A short line on the devices screen opens the list. */
(function(){
document.head.insertAdjacentHTML('beforeend',`<style>
.attn{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;margin:0 0 12px;padding:8px 14px;border-radius:20px;background:#2a1d10;border:1px solid #ff9a3d55;color:var(--ink,#fff);text-align:start;font:inherit}
.attn .ai{width:36px;height:36px;border-radius:50%;background:#ff9a3d;color:#1f0e00;display:grid;place-items:center;flex:none;font-weight:800;font-size:1.05rem}
.attn .ag{flex:1;min-width:0}.attn .at{display:block;font-weight:700}.attn .as{display:block;font-size:.88rem;color:#d9c3ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.attn svg{width:20px;height:20px;transform:scaleX(-1);opacity:.7}
.attn-row .ab{font-size:.8rem;font-weight:700;border-radius:999px;padding:2px 10px;background:#3a2a1a;color:#ffc48a;white-space:nowrap}
</style>`);

const TANK={low_water:'מעט מים',not_installed:'לא מותקן',not_installed_or_full:'מלא או לא מותקן',check:'צריך בדיקה',low_detergent:'מעט נוזל ניקוי'};
window.attentionItems=function(){const out=[];
  /* the vacuum */
  try{const d=window.MOVA_ST&&MOVA_ST.d,x=d&&d.state,nm='שואב';
    if(META.mova!==false&&x){
      if(x.error||x.has_error)out.push({k:'mova-err',t:nm+': תקלה',s:'פותחים את השואב לפרטים',b:'דחוף',go:()=>openMova()});
      for(const [key,label] of [['clean_tank','מיכל המים הנקיים'],['dirty_tank','מיכל המים המלוכלכים'],['dust_bag','שקית האבק'],['detergent','נוזל הניקוי']]){
        const v=x[key];if(v&&TANK[v])out.push({k:'mova-'+key,t:nm+': '+label,s:TANK[v],go:()=>openMova()})}
      for(const c of d.consumables||[])if(c.pct<=15)out.push({k:'mova-c-'+c.k,t:nm+': '+c.t,s:c.pct<=0?'להחליף עכשיו':'נשארו '+c.pct+' אחוז - להחליף בקרוב',b:c.pct<=0?'עכשיו':'בקרוב',go:()=>openMova()});
    }}catch(e){}
  /* the toothbrush head */
  try{if(typeof brushDue==='function'&&META.oralb!==false){const due=brushDue();if(due){const days=Math.ceil((due-Date.now())/864e5);
    if(days<=14)out.push({k:'brush',t:'מברשת שיניים: ראש חדש',s:days<=0?'הגיע הזמן להחליף':'בעוד '+(days===1?'יום אחד':days+' ימים'),b:days<=0?'עכשיו':'בקרוב',go:()=>openToothbrush()})}}}catch(e){}
  /* the water heater, only inside the installed app where it can be reached */
  try{if(typeof IN_APP!=='undefined'&&IN_APP&&META.ember!==false&&typeof HEATER_LINK!=='undefined'&&HEATER_LINK.checked&&!HEATER_LINK.connected)
    out.push({k:'ember',t:'הדוד לא מחובר',s:'לחיבור מחדש של Switcher',go:()=>openEmber()})}catch(e){}
  /* devices that dropped off */
  try{const off=(typeof homeDevices==='function'?homeDevices():DEVS).filter(d=>d.online===false&&!(META.hidden||{})[d.id]&&!d.virtual);
    if(off.length===1)out.push({k:'off',t:dname(off[0])+' מנותק',s:'בודקים שהוא בחשמל ובWi-Fi',go:()=>openDevice(off[0])});
    else if(off.length>1)out.push({k:'off',t:off.length+' מכשירים מנותקים',s:off.map(d=>dname(d)).slice(0,3).join(', '),go:()=>{ROOM='off';render()}});}catch(e){}
  const dis=LSj('unplug_attn_off',{});return out.filter(x=>!dis[x.k]||dis[x.k]<Date.now())};

window.attentionHtml=function(){const it=attentionItems();if(!it.length)return '';
  return `<button class="attn" id="attnBtn" aria-label="${it.length===1?'דבר אחד דורש טיפול':it.length+' דברים דורשים טיפול'}: ${esc(it.map(x=>x.t).join(', '))}"><span class="ai" aria-hidden="true">${it.length}</span><span class="ag" aria-hidden="true"><span class="at">${it.length===1?'דבר אחד דורש טיפול':it.length+' דברים דורשים טיפול'}</span><span class="as">${esc(it[0].t+' - '+it[0].s)}</span></span>${svg('chev')}</button>`};

window.openAttention=function(){
  sheet('דורש טיפול',`<div class="list" id="atL"></div><p class="s" style="margin:10px 4px 0">"לא עכשיו" מסתיר פריט לשבוע.</p>`,(el,close)=>{
    const draw=()=>{const it=attentionItems(),L=el.querySelector('#atL');
      if(!it.length){L.innerHTML=`<div class="row"><span class="grow t">הכול תקין</span></div>`;return}
      L.innerHTML=it.map((x,i)=>`<div class="row attn-row"><button class="row-btn grow" data-ai="${i}" style="text-align:start;display:block;min-width:0"><span class="t">${esc(x.t)}</span><br><span class="s">${esc(x.s)}</span></button>${x.b?`<span class="ab">${esc(x.b)}</span>`:''}<button class="btn" data-snooze="${i}" style="min-height:44px;padding:0 12px" aria-label="לא עכשיו - ${esc(x.t)}">לא עכשיו</button></div>`).join('');
      L.querySelectorAll('[data-ai]').forEach(b=>b.onclick=()=>{const x=it[+b.dataset.ai];close();setTimeout(()=>x.go(),60)});
      L.querySelectorAll('[data-snooze]').forEach(b=>b.onclick=()=>{const x=it[+b.dataset.snooze],dis=LSj('unplug_attn_off',{});dis[x.k]=Date.now()+7*864e5;LSset('unplug_attn_off',JSON.stringify(dis));draw();render();toast('הוסתר לשבוע')})};
    draw()})};
document.addEventListener('click',e=>{if(e.target.closest('#attnBtn'))openAttention()});
})();
