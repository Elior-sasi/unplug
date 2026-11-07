// HomeOn widget body - loaded by the loader script in Scriptable (API, K, DEV come from the loader)
const q=args.queryParameters||{};
const b64=s=>Data.fromString(s).toBase64String().replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
if(q.d&&q.c){
  const v=q.v==="1";let msg;
  try{const r=new Request(API+"/act?k="+encodeURIComponent(K)+"&d="+encodeURIComponent(q.d)+"&c="+b64(JSON.stringify([{code:q.c,value:v}])));r.timeoutInterval=20;msg=await r.loadString()}catch(e){msg="אין חיבור"}
  const a=new Alert();a.title=(q.n||"מכשיר")+(v?" נדלק":" כבה");a.message=msg==="בוצע"?"":msg;a.addAction("סגירה");
  await a.presentAlert();Script.complete();
}else{
  const st=[];
  for(const d of DEV){let s=null;try{const r=new Request(API+"/state?k="+encodeURIComponent(K)+"&d="+encodeURIComponent(d.i));r.timeoutInterval=15;s=await r.loadJSON();if(!s.ok)s=null}catch(e){}
    const on=s?s.status[d.c]===true:null;st.push({...d,on})}
  const fam=config.widgetFamily||"medium";
  const w=new ListWidget();w.backgroundColor=new Color("#0d1018");w.setPadding(10,10,10,10);w.refreshAfterDate=new Date(Date.now()+5*60*1000);
  const show=fam==="small"?st.slice(0,1):fam==="large"?st:st.slice(0,4);
  const tile=(row,d)=>{const t=row.addStack();t.layoutVertically();t.setPadding(10,12,10,12);t.cornerRadius=18;
    t.backgroundColor=d.on?new Color("#12284a"):new Color("#1c1c1e");if(d.on){t.borderColor=new Color("#3d8bff",.6);t.borderWidth=1.5}
    t.url="scriptable:///run/"+encodeURIComponent(Script.name())+"?d="+encodeURIComponent(d.i)+"&c="+encodeURIComponent(d.c)+"&v="+(d.on?"0":"1")+"&n="+encodeURIComponent(d.n);
    const top=t.addStack();top.layoutHorizontally();
    const ic=top.addImage(SFSymbol.named("power").image);ic.imageSize=new Size(18,18);ic.tintColor=d.on?new Color("#3d8bff"):new Color("#8e8e93");
    top.addSpacer();t.addSpacer();
    const n=t.addText(d.n);n.font=Font.boldSystemFont(14);n.textColor=Color.white();n.lineLimit=1;n.minimumScaleFactor=.7;n.rightAlignText();
    const s=t.addText(d.on==null?"לא ידוע":d.on?"פועל":"כבוי");s.font=Font.mediumSystemFont(12);s.textColor=d.on?new Color("#9cc2ff"):new Color("#ffffff99");s.rightAlignText();
    return t};
  if(fam==="small"){if(show[0]){const r=w.addStack();tile(r,show[0]);w.url=null}else w.addText("אין מכשירים")}
  else{for(let i=0;i<show.length;i+=2){const r=w.addStack();r.layoutHorizontally();r.spacing=8;
      tile(r,show[i]);if(show[i+1])tile(r,show[i+1]);else r.addSpacer();if(i+2<show.length)w.addSpacer(8)}}
  if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
  Script.complete();
}
