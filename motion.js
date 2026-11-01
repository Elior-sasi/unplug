/* Unplug - swipe gestures: sideways on the home screen switches room, pull a sheet down to close it. */
(function(){
  const calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* rooms: the page follows the finger sideways, release to move to the next room.
     In RTL the next room is on the left, so a finger moving right brings it in. */
  let sx=null,sy=0,lx=0,ly=0,axis=null,parts=[];
  const room=()=>{const keys=[...document.querySelectorAll('.chips .chip[data-room]')].map(b=>b.dataset.room);return {keys,i:keys.indexOf(ROOM)}};
  const setX=(x,anim)=>parts.forEach(p=>{p.style.transition=anim?'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s':'none';p.style.transform=x?`translateX(${x}px)`:'';p.style.opacity=x?String(Math.max(.35,1-Math.abs(x)/500)):''});
  document.addEventListener('touchstart',e=>{
    const t=e.target;sx=null;axis=null;parts=[];
    if(e.touches.length>1||TAB!=='devices'||document.querySelector('.scrim,.breeze')||(typeof REORDER!=='undefined'&&REORDER))return;
    if(!t.closest||!t.closest('.app')||t.closest('header,.chips,input,select,textarea,.cmdBar,form,.search,[role="slider"]'))return;
    sx=lx=e.touches[0].clientX;sy=ly=e.touches[0].clientY},{passive:true});
  document.addEventListener('touchmove',e=>{
    if(sx==null)return;lx=e.touches[0].clientX;ly=e.touches[0].clientY;const dx=lx-sx,dy=ly-sy;
    if(!axis){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
      if(axis==='x'){const ch=document.querySelector('#view .chips');parts=ch?[...document.querySelectorAll('#view .chips ~ *')]:[]}}
    if(axis!=='x')return;
    const {keys,i}=room(),edge=(dx>0&&i>=keys.length-1)||(dx<0&&i<=0);
    if(!calm())setX(edge?dx*.25:dx)},{passive:true});
  const finish=()=>{
    if(sx==null)return;const dx=lx-sx;sx=null;if(axis!=='x'){axis=null;return}axis=null;
    const {keys,i}=room(),n=i+(dx>0?1:-1),go=Math.abs(dx)>55&&i>=0&&n>=0&&n<keys.length;
    if(!go){setX(0,true);setTimeout(()=>setX(0),240);return}
    const w=innerWidth;if(!calm())setX(dx>0?w:-w,true);
    setTimeout(()=>{ROOM=keys[n];render();
      parts=[...document.querySelectorAll('#view .chips ~ *')];
      if(!calm()){setX(dx>0?-w*.35:w*.35);requestAnimationFrame(()=>requestAnimationFrame(()=>{setX(0,true);setTimeout(()=>setX(0),240)}))}
      const c=document.querySelector(`.chips .chip[data-room="${CSS.escape(ROOM)}"]`);
      if(c){c.scrollIntoView({inline:'center',block:'nearest',behavior:calm()?'auto':'smooth'});
        const sr=document.getElementById('srLive')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'srLive',className:'sr'});
        sr.setAttribute('aria-live','polite');sr.textContent=c.textContent}
    },calm()?0:170)};
  document.addEventListener('touchend',finish,{passive:true});document.addEventListener('touchcancel',finish,{passive:true});
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
