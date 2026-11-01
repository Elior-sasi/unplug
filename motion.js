/* Unplug - swipe gestures: sideways on the home screen switches room, pull a sheet down to close it. */
(function(){
  const calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* rooms: in RTL, a finger moving right goes to the next room (the one on the left) */
  let sx=null,sy=0,st=0;
  document.addEventListener('touchstart',e=>{
    const t=e.target;sx=null;
    if(TAB!=='devices'||document.querySelector('.scrim,.breeze')||(typeof REORDER!=='undefined'&&REORDER))return;
    if(!t.closest||!t.closest('.app')||t.closest('.chips,input,select,textarea,.cmdBar,.grp-row,.quick,[role="slider"]'))return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now()},{passive:true});
  document.addEventListener('touchend',e=>{
    if(sx==null)return;const p=e.changedTouches[0],dx=p.clientX-sx,dy=p.clientY-sy;sx=null;
    if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*.6||Date.now()-st>700)return;
    const keys=[...document.querySelectorAll('.chips .chip[data-room]')].map(b=>b.dataset.room);
    const i=keys.indexOf(ROOM),n=i+(dx>0?1:-1);if(i<0||n<0||n>=keys.length)return;
    ROOM=keys[n];render();
    const g=document.querySelector('.app .grid');if(g&&!calm())g.classList.add(dx>0?'slideN':'slideP');
    const c=document.querySelector(`.chips .chip[data-room="${CSS.escape(ROOM)}"]`);
    if(c){c.scrollIntoView({inline:'center',block:'nearest',behavior:calm()?'auto':'smooth'});
      const sr=document.getElementById('srLive')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'srLive',className:'sr'});
      sr.setAttribute('aria-live','polite');sr.textContent=c.textContent}
  },{passive:true});
  /* sheets: drag down from the top to close, like Unbox */
  let sh=null,y0=0,dy=0;
  document.addEventListener('touchstart',e=>{const s=e.target.closest&&e.target.closest('.sheet');sh=null;
    if(!s||s.scrollTop>0||e.target.closest('input[type=range],.hue,select,textarea'))return;sh=s;y0=e.touches[0].clientY;dy=0},{passive:true});
  document.addEventListener('touchmove',e=>{if(!sh)return;dy=Math.max(0,e.touches[0].clientY-y0);
    if(dy>6&&sh.scrollTop<=0){sh.classList.add('dragging');sh.style.transform=`translateY(${dy}px)`}},{passive:true});
  const end=()=>{if(!sh)return;const s=sh;sh=null;s.classList.remove('dragging');
    if(dy>90){const x=s.querySelector('[data-x]');s.style.transition='transform .18s ease-in';s.style.transform=`translateY(${s.offsetHeight}px)`;setTimeout(()=>x&&x.click(),calm()?0:170)}
    else if(dy){s.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';s.style.transform='';setTimeout(()=>s.style.transition='',240)}dy=0};
  document.addEventListener('touchend',end);document.addEventListener('touchcancel',end);
})();
