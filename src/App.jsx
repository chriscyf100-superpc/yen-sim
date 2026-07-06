import { useState, useRef, useMemo, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────
const USERS = [
  { id:"mgr", name:"Manager",       role:"manager",     ini:"MG", clr:"#292524" },
  { id:"sp1", name:"Yen Lai",       role:"salesperson", ini:"YL", clr:"#B45309" },
  { id:"sp2", name:"Lo Li Chun",    role:"salesperson", ini:"LC", clr:"#7C3AED" },
  { id:"sp3", name:"Tong Chew Yee", role:"salesperson", ini:"CY", clr:"#059669" },
  { id:"sp4", name:"Tan Yen Yee",   role:"salesperson", ini:"YY", clr:"#2563EB" },
  { id:"sp5", name:"Tan Pui Yi",    role:"salesperson", ini:"PY", clr:"#DC2626" },
];
const CUSTOMERS = [
  "Ahmed Trading","SH Huat","Cantor Bhd","Sepang Hardware","Loy Heong",
  "Langat Jaya","MPE Sdn Bhd","Lambang Kini","Broga Trading","THL Sdn Bhd",
  "Hong Yet Hardware","Maju Jaya","Zhen Shn","Genesis Sdn Bhd",
];
const SPECIES = ["Dark Hardwood","Yellow Meranti","Meranti","Dark Red Meranti","Balau","Chengal","Kempas"];
// LENGTHS kept for AI prompt reference only — UI uses free-form input
const LENGTHS = Array.from({length:93},(_,i)=>`${i+8}ft`); // 8–100ft, any value
const COLS    = ["New","Confirmed","Delivered","Paid"];
const SC = {
  New:       {c:"#2563EB",bg:"#EFF6FF",bd:"#BFDBFE",lt:"#DBEAFE",dark:"#1D4ED8"},
  Confirmed: {c:"#D97706",bg:"#FFFBEB",bd:"#FDE68A",lt:"#FEF3C7",dark:"#B45309"},
  Delivered: {c:"#7C3AED",bg:"#F5F3FF",bd:"#DDD6FE",lt:"#EDE9FE",dark:"#6D28D9"},
  Paid:      {c:"#059669",bg:"#ECFDF5",bd:"#A7F3D0",lt:"#D1FAE5",dark:"#047857"},
};
const VOICE_LANGS = [
  {code:"zh-HK",label:"廣東話",sub:"Cantonese"},
  {code:"zh-CN",label:"普通话",sub:"Mandarin"},
  {code:"ms-MY",label:"Melayu",sub:"Bahasa Malaysia"},
  {code:"en-MY",label:"English",sub:"Malaysian"},
];
const VOICE_DEMOS = {
  "zh-HK":"我要訂Balau兩乘四，一百條十呎，五十條十二呎，客人係Ahmed Trading",
  "zh-CN":"我要订购Dark Hardwood两乘四，一百根十英尺，客户是Ahmed Trading",
  "ms-MY":"Saya nak order Balau 2x4, seratus keping sepuluh kaki, untuk Ahmed Trading",
  "en-MY":"Order for Ahmed Trading: Balau 2x4, 100 pieces at 10ft, 50 pieces at 12ft",
};

// ─────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────
const mkItems = (delivered, ...items) => items.map(i=>({...i,delivered}));
const seed = () => [
  { id:"YST-0001",customer:"Ahmed Trading",   salesperson:"Yen Lai",      source:"text",  status:"Paid",      createdAt:"2026-06-20T09:15:00",rawInput:"DkN H2 AB 100/8 50/10",  ocrText:null,notes:"",
    items:mkItems(true, {species:"Dark Hardwood",size:"H2 AB",lengths:[{l:"8ft",q:100},{l:"10ft",q:50}],notes:""})},
  { id:"YST-0002",customer:"MPE Sdn Bhd",     salesperson:"Lo Li Chun",   source:"photo", status:"Paid",      createdAt:"2026-06-21T10:30:00",rawInput:"[Photo]",ocrText:"MPE\nmrt 2x4 1pcs 12ft\nDH 1x8 50/8 10/10",notes:"",
    items:mkItems(true, {species:"Meranti",size:"2×4",lengths:[{l:"12ft",q:1}],notes:""},{species:"Dark Hardwood",size:"1×8",lengths:[{l:"8ft",q:50},{l:"10ft",q:10}],notes:"Grade 9"})},
  { id:"YST-0003",customer:"SH Huat",         salesperson:"Tong Chew Yee",source:"text",  status:"Paid",      createdAt:"2026-06-22T11:00:00",rawInput:"DH 5/8x8 50/8 20/10",    ocrText:null,notes:"",
    items:mkItems(true, {species:"Dark Hardwood",size:"5/8×8",lengths:[{l:"8ft",q:50},{l:"10ft",q:20}],notes:""})},
  { id:"YST-0004",customer:"Loy Heong",       salesperson:"Lo Li Chun",   source:"photo", status:"Confirmed", createdAt:"2026-06-24T09:30:00",rawInput:"[Photo]",ocrText:"Loy Heong\nDRM 1-5/8×1-5/8 (A) 80/8 100/10 80/12 50/14\nDRM 5/8×6 (B) 100/10",notes:"Bahau",
    items:[
      {species:"Dark Red Meranti",size:"1-5/8×1-5/8 A",lengths:[{l:"8ft",q:80},{l:"10ft",q:100},{l:"12ft",q:80},{l:"14ft",q:50}],notes:"",delivered:true},
      {species:"Dark Red Meranti",size:"5/8×6 B",       lengths:[{l:"10ft",q:100}],notes:"",delivered:false},
    ]},
  { id:"YST-0005",customer:"Hong Yet Hardware",salesperson:"Tan Yen Yee", source:"text",  status:"Confirmed", createdAt:"2026-06-25T08:00:00",rawInput:"Chengal 2x4 B 4/8 21/9 31/10\nBalau 1x2 50/10",ocrText:null,notes:"",
    items:mkItems(false, {species:"Chengal",size:"2×4 B",lengths:[{l:"8ft",q:4},{l:"9ft",q:21},{l:"10ft",q:31}],notes:""},{species:"Balau",size:"1×2",lengths:[{l:"10ft",q:50}],notes:""})},
  { id:"YST-0006",customer:"Cantor Bhd",      salesperson:"Tan Pui Yi",   source:"voice", status:"Confirmed", createdAt:"2026-06-26T08:45:00",rawInput:"Balau 2x4 80pcs 30ft, DH 1x8 20/10, Ym 2x3 100/12",ocrText:null,notes:"",
    items:[
      {species:"Balau",         size:"2×4",lengths:[{l:"30ft",q:80}], notes:"",delivered:true},
      {species:"Dark Hardwood", size:"1×8",lengths:[{l:"10ft",q:20}],notes:"",delivered:false},
      {species:"Yellow Meranti",size:"2×3",lengths:[{l:"12ft",q:100}],notes:"",delivered:false},
    ]},
  { id:"YST-0007",customer:"Langat Jaya",     salesperson:"Yen Lai",      source:"text",  status:"Delivered", createdAt:"2026-06-28T13:00:00",rawInput:"Mrt 1x2 AB 100/8 200/10",ocrText:null,notes:"",
    items:mkItems(true, {species:"Meranti",size:"1×2 AB",lengths:[{l:"8ft",q:100},{l:"10ft",q:200}],notes:""})},
  { id:"YST-0008",customer:"THL Sdn Bhd",     salesperson:"Tong Chew Yee",source:"photo", status:"Delivered", createdAt:"2026-06-29T10:00:00",rawInput:"[Photo]",ocrText:"THL\nKm 1x2 B 8ft-1 10ft-1\nYm 1x2 A 10-3 12-2",notes:"",
    items:mkItems(true, {species:"Kempas",size:"1×2 B",lengths:[{l:"8ft",q:1},{l:"10ft",q:1}],notes:""},{species:"Yellow Meranti",size:"1×2 A",lengths:[{l:"10ft",q:3},{l:"12ft",q:2}],notes:""})},
  { id:"YST-0009",customer:"Sepang Hardware", salesperson:"Tan Yen Yee",  source:"text",  status:"New",       createdAt:"2026-07-01T10:00:00",rawInput:"Ym 1x2 A 10-3 12-2\nKm 2x3 A 50/10",ocrText:null,notes:"",
    items:mkItems(false, {species:"Yellow Meranti",size:"1×2 A",lengths:[{l:"10ft",q:3},{l:"12ft",q:2}],notes:""},{species:"Kempas",size:"2×3 A",lengths:[{l:"10ft",q:50}],notes:""})},
  { id:"YST-0010",customer:"Maju Jaya",       salesperson:"Tong Chew Yee",source:"voice", status:"New",       createdAt:"2026-07-02T08:30:00",rawInput:"我要梅兰地 1×2 AB 一百条八呎 两百条十呎，黑木 2×4 五十条十呎",ocrText:null,notes:"",
    items:mkItems(false, {species:"Meranti",size:"1×2 AB",lengths:[{l:"8ft",q:100},{l:"10ft",q:200}],notes:""},{species:"Dark Hardwood",size:"2×4",lengths:[{l:"10ft",q:50}],notes:""})},
  { id:"YST-0011",customer:"Broga Trading",   salesperson:"Yen Lai",      source:"text",  status:"New",       createdAt:"2026-07-03T07:00:00",rawInput:"DH 2x3 6\" 100/10",         ocrText:null,notes:"",
    items:mkItems(false, {species:"Dark Hardwood",size:"2×3 6\"",lengths:[{l:"10ft",q:100}],notes:""})},
];

const seedLog = () => [
  {id:"l1", orderId:"YST-0001",type:"created",actor:"Yen Lai",      ts:"2026-06-20T09:15:00",details:"New order · Ahmed Trading",                    read:true},
  {id:"l2", orderId:"YST-0001",type:"moved",  actor:"Manager",      ts:"2026-06-25T14:00:00",details:"New → Confirmed → Delivered → Paid",            read:true},
  {id:"l3", orderId:"YST-0004",type:"created",actor:"Lo Li Chun",   ts:"2026-06-24T09:30:00",details:"New order (photo) · Loy Heong",                 read:true},
  {id:"l4", orderId:"YST-0004",type:"moved",  actor:"Manager",      ts:"2026-06-24T11:00:00",details:"New → Confirmed",                               read:true},
  {id:"l5", orderId:"YST-0005",type:"created",actor:"Tan Yen Yee",  ts:"2026-06-25T08:00:00",details:"New order · Hong Yet Hardware",                 read:true},
  {id:"l6", orderId:"YST-0005",type:"moved",  actor:"Manager",      ts:"2026-06-25T10:00:00",details:"New → Confirmed",                               read:true},
  {id:"l7", orderId:"YST-0006",type:"created",actor:"Tan Pui Yi",   ts:"2026-06-26T08:45:00",details:"New order (voice) · Cantor Bhd",                read:true},
  {id:"l8", orderId:"YST-0006",type:"moved",  actor:"Manager",      ts:"2026-06-26T10:00:00",details:"New → Confirmed",                               read:true},
  {id:"l9", orderId:"YST-0009",type:"created",actor:"Tan Yen Yee",  ts:"2026-07-01T10:00:00",details:"New order · Sepang Hardware",                   read:false},
  {id:"l10",orderId:"YST-0010",type:"created",actor:"Tong Chew Yee",ts:"2026-07-02T08:30:00",details:"New order (voice 普通话) · Maju Jaya",           read:false},
  {id:"l11",orderId:"YST-0011",type:"created",actor:"Yen Lai",      ts:"2026-07-03T07:00:00",details:"New order · Broga Trading",                     read:false},
];

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
const uClr  = n => USERS.find(u=>u.name===n)?.clr||"#78716C";
const uIni  = n => USERS.find(u=>u.name===n)?.ini||n?.slice(0,2).toUpperCase()||"??";
const nowIso  = () => new Date().toISOString();
const genOrd  = arr => `YST-${String(arr.length+1).padStart(4,"0")}`;
const genLog  = arr => `l${arr.length+1}`;
const iqty    = it => (it.lengths||[]).reduce((s,l)=>s+l.q,0);
const daysAgo = iso => Math.floor((Date.now()-new Date(iso))/864e5);
const isOD    = o => !["Delivered","Paid"].includes(o.status) && daysAgo(o.createdAt)>=3;
const copy    = o => JSON.parse(JSON.stringify(o));

function fmtDt(iso){
  const d=new Date(iso);
  return d.toLocaleDateString("en-MY",{day:"2-digit",month:"short",year:"numeric"})+" "+
         d.toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit"});
}
function fmtShort(iso){return new Date(iso).toLocaleDateString("en-MY",{day:"2-digit",month:"short"});}
function fmtAgo(iso){
  const m=Math.floor((Date.now()-new Date(iso))/60000);
  if(m<1)return"just now"; if(m<60)return`${m}m ago`;
  const h=Math.floor(m/60); if(h<24)return`${h}h ago`;
  return`${Math.floor(h/24)}d ago`;
}
function fmtBytes(b){if(b<1024)return`${b}B`;if(b<1048576)return`${(b/1024).toFixed(0)}KB`;return`${(b/1048576).toFixed(1)}MB`;}

async function compressImage(file, maxWidth=1200, quality=0.75){
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const ratio=Math.min(maxWidth/img.width,1);
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(img.width*ratio);
      canvas.height=Math.round(img.height*ratio);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{
        const fr=new FileReader();
        fr.onload=()=>resolve({b64:fr.result.split(",")[1],size:blob.size,origSize:file.size,dataUrl:fr.result});
        fr.readAsDataURL(blob);
      },"image/jpeg",quality);
      URL.revokeObjectURL(url);
    };
    img.src=url;
  });
}

// ─────────────────────────────────────────────────
// AI — multilingual parse
// ─────────────────────────────────────────────────
const SYS_MULTI = `You are an order parser for Yen Sim Trading Sdn Bhd, a timber company in Malaysia.
Input may be in English, Mandarin (普通话), Cantonese (廣東話), or Bahasa Melayu. Parse any language.

SPECIES (detect from English, Chinese, or Malay):
- Dark Hardwood: DH, DkN, 黑木, 黑硬木, kayu keras hitam
- Yellow Meranti: Ym, 黄梅兰地, meranti kuning
- Meranti: Mrt, 梅兰地, meranti
- Dark Red Meranti: DRM, 暗红梅兰地, meranti merah tua
- Balau: 巴劳, balau
- Chengal: 青格兰, chengal
- Kempas: Km, 坎帕斯, kempas

QTY/LENGTH (detect from English, Chinese, or Malay):
- Pieces: 条/块/支/根/pcs/keping
- Feet: 英尺/呎/尺/kaki/ft; e.g. 十呎=10ft, sepuluh kaki=10ft
- "100/10" or "100/10'" = 100pcs @ 10ft
- "一百条十呎" = 100pcs @ 10ft
- "100 keping 10 kaki" = 100pcs @ 10ft
- "4/16 10/18 8/22" = 4@16ft 10@18ft 8@22ft
- Any length is valid including odd numbers: 11ft, 13ft, 15ft, 17ft, 19ft, 21ft, 25ft etc.

SIZE: 2x4, 1x2, 5/8x8 etc; grades A/B/AB/CA/CB after size
Ignore greetings, names, pleasantries in any language.
Always output in English JSON only.
Return ONLY valid JSON: {"customer":null,"items":[{"species":"","size":"","lengths":[{"l":"10ft","q":0}],"notes":""}],"notes":"","confidence":"high|medium|low"}`;

const SYS_PHOTO = `You are an OCR + order parser for Yen Sim Trading Sdn Bhd.
${SYS_MULTI.split("\n").slice(1).join("\n")}
Return ONLY valid JSON: {"ocrText":"verbatim transcript","customer":null,"items":[{"species":"","size":"","lengths":[{"l":"10ft","q":0}],"notes":""}],"notes":"","confidence":"high|medium|low"}`;

// Calls go to Vercel serverless functions — API key stays server-side, never in browser
const aiText = async (text) => {
  const r = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || data.detail?.error?.message || `Parse failed: ${r.status}`);
  return data;
};

const aiPhoto = async (b64, mt) => {
  const r = await fetch("/api/parse-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: b64, mimeType: mt }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || data.detail?.error?.message || `Image parse failed: ${r.status}`);
  return data;
};

// ─────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────
const D = {
  bg:"#F7F4F0", card:"#FFFFFF", border:"#E8E3DC",
  text:"#1A1714", muted:"#78716C", faint:"#A8A29E",
  primary:"#B45309", primaryLt:"#FEF3C7",
  radius:14, radiusSm:10, nav:60,
  lbl:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.8,color:"#78716C",display:"block",marginBottom:5},
  inp:{width:"100%",padding:"13px 14px",border:"1.5px solid #E8E3DC",borderRadius:10,fontSize:15,outline:"none",background:"#fff",color:"#1A1714",boxSizing:"border-box"},
  sel:{width:"100%",padding:"13px 14px",border:"1.5px solid #E8E3DC",borderRadius:10,fontSize:15,outline:"none",background:"#fff",color:"#1A1714",boxSizing:"border-box",cursor:"pointer"},
  pill:{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:999,fontSize:12,fontWeight:600},
  btnPrimary:{width:"100%",padding:"15px",border:"none",borderRadius:12,background:"#B45309",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"},
  btnSecondary:{padding:"11px 18px",border:"1.5px solid #E8E3DC",borderRadius:12,background:"#fff",color:"#57534E",fontWeight:600,fontSize:14,cursor:"pointer"},
};

// ─────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────
function Ava({name,sz=36}){return <div style={{width:sz,height:sz,borderRadius:"50%",background:uClr(name),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:sz>30?13:10,flexShrink:0}}>{uIni(name)}</div>;}
function SBadge({status}){const c=SC[status]||SC.New;return <span style={{...D.pill,background:c.lt,color:c.c,border:`1px solid ${c.bd}`}}><span style={{width:7,height:7,borderRadius:"50%",background:c.c,display:"inline-block",marginRight:5}}/>{status}</span>;}
function SrcBadge({source}){
  const m={text:{icon:"💬",c:"#166534",bg:"#F0FDF4"},photo:{icon:"📷",c:"#1E40AF",bg:"#EFF6FF"},voice:{icon:"🎤",c:"#6D28D9",bg:"#F5F3FF"}};
  const s=m[source]||m.text;
  return <span style={{...D.pill,background:s.bg,color:s.c,fontSize:11}}>{s.icon}</span>;
}

// ─────────────────────────────────────────────────
// EDITABLE ITEMS FORM
// ─────────────────────────────────────────────────
function EditItems({items,onChange}){
  const up   = (i,k,v) => onChange(items.map((it,x)=>x===i?{...it,[k]:v}:it));
  const upL  = (i,j,k,v) => onChange(items.map((it,x)=>x!==i?it:{...it,lengths:it.lengths.map((l,y)=>y===j?{...l,[k]:v}:l)}));
  const addL = i => onChange(items.map((it,x)=>x!==i?it:{...it,lengths:[...it.lengths,{l:"10ft",q:0}]}));
  const rmL  = (i,j) => onChange(items.map((it,x)=>x!==i?it:{...it,lengths:it.lengths.filter((_,y)=>y!==j)}));
  const addI = () => onChange([...items,{species:"Dark Hardwood",size:"",lengths:[{l:"10ft",q:0}],notes:"",delivered:false}]);
  const rmI  = i => onChange(items.filter((_,x)=>x!==i));

  return(
    <div>
      {items.map((it,i)=>(
        <div key={i} style={{border:"1.5px solid #E8E3DC",borderRadius:D.radius,padding:"14px",marginBottom:12,background:"#FAFAF9",position:"relative"}}>
          {items.length>1&&<button onClick={()=>rmI(i)} style={{position:"absolute",top:10,right:10,background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,color:"#DC2626",fontSize:12,fontWeight:700,cursor:"pointer",padding:"3px 9px"}}>Remove</button>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12,paddingRight:items.length>1?70:0}}>
            <div><span style={D.lbl}>Species</span><select value={it.species} onChange={e=>up(i,"species",e.target.value)} style={D.sel}>{SPECIES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><span style={D.lbl}>Size</span><input value={it.size} onChange={e=>up(i,"size",e.target.value)} placeholder="2×4, 1×2…" style={D.inp}/></div>
          </div>
          <span style={D.lbl}>Quantity × Length</span>
          {it.lengths.map((ln,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <input type="number" min={0} value={ln.q} onChange={e=>upL(i,j,"q",parseInt(e.target.value)||0)} style={{...D.inp,width:72,flexShrink:0,textAlign:"center",fontWeight:700,fontSize:16}}/>
              <span style={{fontSize:13,color:D.muted,flexShrink:0}}>pcs ×</span>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                <input
                  type="number" min={1} max={999}
                  value={ln.l.replace("ft","")||""}
                  onChange={e=>{const v=e.target.value;upL(i,j,"l",v?`${v}ft`:"");}}
                  placeholder="e.g. 11"
                  style={{...D.inp,flex:1,textAlign:"center",fontWeight:700,fontSize:16,padding:"13px 8px"}}
                />
                <span style={{fontSize:15,fontWeight:700,color:D.muted,flexShrink:0}}>ft</span>
              </div>
              {it.lengths.length>1&&<button onClick={()=>rmL(i,j)} style={{background:"none",border:"none",color:"#DC2626",fontSize:20,cursor:"pointer",flexShrink:0,padding:"0 4px"}}>×</button>}
            </div>
          ))}
          <button onClick={()=>addL(i)} style={{...D.btnSecondary,padding:"8px 14px",fontSize:13,marginBottom:10}}>+ Length</button>
          <div style={{marginTop:4}}><span style={D.lbl}>Notes <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(opt)</span></span><input value={it.notes||""} onChange={e=>up(i,"notes",e.target.value)} placeholder="Grade, special cut…" style={D.inp}/></div>
        </div>
      ))}
      <button onClick={addI} style={{...D.btnSecondary,width:"100%",borderStyle:"dashed",color:"#B45309",borderColor:"#B45309",fontWeight:700,fontSize:14,padding:"13px"}}>+ Add Wood Item</button>
    </div>
  );
}

// ─────────────────────────────────────────────────
// VOICE RECORDER
// ─────────────────────────────────────────────────
function VoiceRecorder({onTranscript}){
  const [lang,setLang]=useState("zh-HK");
  const [rec,setRec]=useState(false);
  const [transcript,setTranscript]=useState("");
  const [error,setError]=useState("");
  const recRef=useRef(null);
  const hasSpeech=typeof window!=="undefined"&&("SpeechRecognition" in window||"webkitSpeechRecognition" in window);

  function start(){
    if(!hasSpeech){setError("Voice not supported on this browser. Tap a demo sample below.");return;}
    setError(""); setTranscript("");
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const r=new SR(); r.lang=lang; r.continuous=true; r.interimResults=true;
    r.onresult=e=>{let f="";for(let i=0;i<e.results.length;i++)if(e.results[i].isFinal)f+=e.results[i][0].transcript;setTranscript(f);};
    r.onerror=e=>setError(`Error: ${e.error}. Try a demo sample below.`);
    r.start(); recRef.current=r; setRec(true);
  }
  function stop(){recRef.current?.stop();setRec(false);}

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Language selector */}
      <div>
        <span style={D.lbl}>Language / 语言 / Bahasa</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {VOICE_LANGS.map(l=>(
            <button key={l.code} onClick={()=>setLang(l.code)}
              style={{padding:"12px 10px",border:`2px solid ${lang===l.code?"#B45309":"#E8E3DC"}`,borderRadius:12,background:lang===l.code?"#FEF3C7":"#fff",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:lang===l.code?"#B45309":"#1A1714"}}>{l.label}</div>
              <div style={{fontSize:11,color:D.muted}}>{l.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Record button */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <button onClick={rec?stop:start}
          style={{width:96,height:96,borderRadius:"50%",border:"none",cursor:"pointer",
            background:rec?"#DC2626":"#B45309",color:"#fff",fontSize:36,
            boxShadow:rec?"0 0 0 8px rgba(220,38,38,0.2)":"0 4px 20px rgba(180,83,9,0.3)",
            transition:"all .2s"}}>
          {rec?"⏹":"🎤"}
        </button>
        <p style={{fontSize:13,color:rec?"#DC2626":D.muted,fontWeight:rec?700:400,margin:0}}>
          {rec?"Recording… tap to stop":"Tap to start recording"}
        </p>
      </div>

      {/* Live transcript */}
      {transcript&&(
        <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:12,padding:"14px"}}>
          <span style={D.lbl}>Transcribed</span>
          <p style={{fontSize:15,color:"#166534",margin:0,lineHeight:1.6}}>{transcript}</p>
          <button onClick={()=>onTranscript(transcript)} style={{...D.btnPrimary,marginTop:12,background:"#059669"}}>
            ✓ Parse this order →
          </button>
        </div>
      )}

      {/* Error + demo samples */}
      {error&&<p style={{fontSize:13,color:"#DC2626",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"10px 13px",margin:0}}>{error}</p>}
      <div>
        <span style={D.lbl}>Try a demo sample</span>
        {VOICE_LANGS.map(l=>(
          <button key={l.code} onClick={()=>setTranscript(VOICE_DEMOS[l.code])}
            style={{display:"block",width:"100%",textAlign:"left",background:"#F8F5F0",border:"1px solid #E8E3DC",borderRadius:10,padding:"10px 13px",marginBottom:7,cursor:"pointer",fontSize:13,color:D.text,lineHeight:1.5}}>
            <span style={{fontWeight:700,color:D.primary}}>{l.label}: </span>{VOICE_DEMOS[l.code].slice(0,60)}…
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// CUSTOMER TRACKING VIEW (full-screen overlay)
// ─────────────────────────────────────────────────
function CustomerTracking({order,onClose}){
  const idx=COLS.indexOf(order.status);
  const [copied,setCopied]=useState(false);
  const fakeUrl=`https://track.yensim.com/${order.id.toLowerCase()}`;

  function copyLink(){
    navigator.clipboard?.writeText(fakeUrl).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  const messages={
    New:"Your order has been received and is being processed.",
    Confirmed:"Your order is confirmed and is being prepared for dispatch.",
    Delivered:"Your order has been dispatched. Please check your delivery.",
    Paid:"Order complete. Thank you for your business!",
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"#fff",overflow:"auto",display:"flex",flexDirection:"column"}}>
      {/* Preview banner */}
      <div style={{background:"#7C3AED",padding:"8px 16px",textAlign:"center"}}>
        <span style={{color:"#fff",fontSize:12,fontWeight:700}}>👁 Customer View Preview — This is what your customer sees</span>
      </div>

      {/* Customer header */}
      <div style={{background:"linear-gradient(135deg,#B45309 0%,#92400E 100%)",padding:"24px 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🪵</div>
          <div><div style={{color:"#fff",fontWeight:800,fontSize:17}}>Yen Sim Trading Sdn Bhd</div><div style={{color:"rgba(255,255,255,0.75)",fontSize:12}}>Timber Supplier · Kuala Lumpur</div></div>
        </div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{color:"rgba(255,255,255,0.75)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3}}>Order Reference</div>
          <div style={{color:"#fff",fontSize:22,fontWeight:800,fontFamily:"monospace"}}>{order.id}</div>
        </div>
      </div>

      <div style={{flex:1,padding:"20px 16px",display:"flex",flexDirection:"column",gap:20}}>
        {/* Status */}
        <div style={{background:SC[order.status].bg,border:`1.5px solid ${SC[order.status].bd}`,borderRadius:D.radius,padding:"16px"}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:SC[order.status].c,marginBottom:6}}>Order Status</div>
          <div style={{fontSize:20,fontWeight:800,color:SC[order.status].c,marginBottom:6}}>{order.status}</div>
          <div style={{fontSize:14,color:SC[order.status].dark,lineHeight:1.5}}>{messages[order.status]}</div>
        </div>

        {/* Timeline */}
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:D.muted,marginBottom:12}}>Delivery Timeline</div>
          <div style={{display:"flex",alignItems:"center"}}>
            {COLS.map((s,i)=>{const done=i<=idx;const c=SC[s];return(
              <div key={s} style={{display:"flex",alignItems:"center",flex:i<3?1:"none"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:done?c.c:"#E8E3DC",color:done?"#fff":"#A8A29E",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{i<idx?"✓":i+1}</div>
                  <span style={{fontSize:10,fontWeight:600,color:done?c.c:"#A8A29E",whiteSpace:"nowrap"}}>{s}</span>
                </div>
                {i<3&&<div style={{flex:1,height:3,margin:"0 4px 16px",borderRadius:999,background:i<idx?c.c:"#E8E3DC"}}/>}
              </div>
            );})}
          </div>
        </div>

        {/* Order items (simplified for customer) */}
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:D.muted,marginBottom:10}}>Order Details</div>
          <div style={{background:D.card,border:"1px solid #E8E3DC",borderRadius:D.radius,overflow:"hidden"}}>
            {order.items.map((it,i)=>(
              <div key={i} style={{padding:"13px 16px",borderBottom:i<order.items.length-1?"1px solid #F5F5F2":"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:D.text}}>{it.species}</div>
                  <div style={{fontSize:13,color:D.muted}}>{it.size} · {it.lengths.map(l=>`${l.q}×${l.l}`).join(", ")}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:D.text}}>{iqty(it)} pcs</div>
                  {it.delivered&&<div style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ Dispatched</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order date */}
        <div style={{fontSize:13,color:D.muted,textAlign:"center"}}>Order placed: {fmtDt(order.createdAt)}</div>

        {/* Contact */}
        <div style={{background:"#F8F5F0",border:"1px solid #E8E3DC",borderRadius:D.radius,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:D.muted,marginBottom:8}}>Need Help?</div>
          <div style={{fontSize:14,color:D.text,lineHeight:1.7}}>
            📞 WhatsApp us at <strong>+60 12-345 6789</strong><br/>
            📧 orders@yensim.com.my<br/>
            Quote your order ref: <strong style={{color:"#B45309"}}>{order.id}</strong>
          </div>
        </div>

        {/* Copy link */}
        <div style={{background:"#1C1917",borderRadius:D.radius,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:2}}>Share tracking link with customer</div>
            <code style={{fontSize:12,color:"#FEF3C7",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{fakeUrl}</code>
          </div>
          <button onClick={copyLink} style={{background:copied?"#059669":"#B45309",color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {copied?"✓ Copied!":"Copy Link"}
          </button>
        </div>
      </div>

      {/* Close */}
      <div style={{padding:"12px 16px 24px",borderTop:"1px solid #E8E3DC"}}>
        <button onClick={onClose} style={{...D.btnPrimary,background:"#292524"}}>← Back to Order</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ORDER DETAIL BOTTOM SHEET
// ─────────────────────────────────────────────────
function OrderSheet({order,onClose,onMove,onTick,onEdit,isManager,canEdit}){
  const [mode,setMode]=useState("view");
  const [editItems,setEditItems]=useState([]);
  const [editNotes,setEditNotes]=useState("");
  const [editCustomer,setEditCustomer]=useState("");
  const [showTracking,setShowTracking]=useState(false);

  if(!order) return null;
  const idx=COLS.indexOf(order.status);
  const next=COLS[idx+1];
  const done=order.items.filter(i=>i.delivered).length;
  const allDone=done===order.items.length;

  function startEdit(){setEditItems(copy(order.items));setEditNotes(order.notes||"");setEditCustomer(order.customer);setMode("edit");}
  function saveEdit(){onEdit(order.id,editItems,editCustomer,editNotes);setMode("view");onClose();}

  return(
    <>
      {showTracking&&<CustomerTracking order={order} onClose={()=>setShowTracking(false)}/>}
      <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.5)"}} onClick={onClose}/>
      <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:400,background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
        {/* Handle */}
        <div style={{width:40,height:4,borderRadius:999,background:"#E8E3DC",margin:"10px auto 0"}}/>

        {/* Header */}
        <div style={{padding:"14px 18px 12px",borderBottom:"1px solid #E8E3DC",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:4}}>
              <code style={{fontSize:11,fontWeight:700,color:"#B45309"}}>{order.id}</code>
              <SrcBadge source={order.source}/>
              <SBadge status={order.status}/>
              {isOD(order)&&<span style={{...D.pill,background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",fontSize:11}}>⚠ {daysAgo(order.createdAt)}d</span>}
              {mode==="edit"&&<span style={{...D.pill,background:"#FEF3C7",color:"#92400E",fontSize:11}}>✏️ Editing</span>}
            </div>
            {mode==="view"
              ?<div style={{fontWeight:800,fontSize:18,color:D.text}}>{order.customer}</div>
              :<select value={editCustomer} onChange={e=>setEditCustomer(e.target.value)} style={{...D.sel,fontWeight:700,fontSize:16}}>{CUSTOMERS.map(c=><option key={c}>{c}</option>)}</select>
            }
            <div style={{fontSize:12,color:D.muted,marginTop:3,display:"flex",alignItems:"center",gap:5}}><Ava name={order.salesperson} sz={14}/>{order.salesperson} · {fmtShort(order.createdAt)}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {mode==="view"&&canEdit&&<button onClick={startEdit} style={{...D.btnSecondary,padding:"7px 12px",fontSize:12,color:"#B45309",borderColor:"#FDE68A"}}>✏️ Edit</button>}
            {mode==="edit"&&<><button onClick={()=>setMode("view")} style={{...D.btnSecondary,padding:"7px 10px",fontSize:12}}>Cancel</button><button onClick={saveEdit} style={{...D.btnSecondary,padding:"7px 12px",fontSize:12,background:"#059669",color:"#fff",border:"none"}}>Save</button></>}
            <button onClick={onClose} style={{width:34,height:34,borderRadius:"50%",background:"#F5F5F4",border:"none",fontSize:18,cursor:"pointer",color:D.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>

        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:16}}>
          {/* Items */}
          {mode==="view"?(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={D.lbl}>Order Items</span>
                {order.items.length>1&&isManager&&<span style={{fontSize:12,color:D.muted}}>{done}/{order.items.length} dispatched</span>}
              </div>
              {order.items.length>1&&<div style={{height:4,borderRadius:999,background:"#E8E3DC",marginBottom:10,overflow:"hidden"}}><div style={{height:4,borderRadius:999,background:allDone?"#059669":"#B45309",width:`${(done/order.items.length)*100}%`,transition:"width .3s"}}/></div>}
              {order.items.map((it,i)=>(
                <div key={i} style={{background:it.delivered?"#F0FDF4":"#F8F5F0",border:`1px solid ${it.delivered?"#BBF7D0":"#E8E3DC"}`,borderRadius:12,padding:"12px 13px",marginBottom:8,display:"flex",alignItems:"flex-start",gap:10}}>
                  {isManager&&<button onClick={()=>onTick(order.id,i)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${it.delivered?"#059669":"#D6D3CE"}`,background:it.delivered?"#059669":"#fff",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2,padding:0}}>{it.delivered&&<span style={{color:"#fff",fontSize:13}}>✓</span>}</button>}
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:5,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:14,color:it.delivered?"#166534":D.text,textDecoration:it.delivered?"line-through":"none"}}>{it.species}</span>
                      <code style={{background:"#E8E3DC",color:"#57534E",padding:"1px 7px",borderRadius:5,fontSize:12}}>{it.size}</code>
                      {it.delivered&&<span style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ Dispatched</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {it.lengths?.map((ln,j)=><span key={j} style={{fontFamily:"monospace",fontSize:12,fontWeight:700,background:"#fff",border:"1px solid #D6D3CE",borderRadius:7,padding:"2px 9px",color:D.text}}>{ln.q}×{ln.l}</span>)}
                      <span style={{fontSize:11,color:D.faint,alignSelf:"center"}}>({iqty(it)} pcs)</span>
                    </div>
                  </div>
                </div>
              ))}
              {isManager&&allDone&&order.status==="Confirmed"&&(
                <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                  <span style={{fontSize:13,color:"#166534",fontWeight:600}}>✓ All dispatched</span>
                  <button onClick={()=>{onMove(order.id,"Delivered");onClose();}} style={{background:"#059669",color:"#fff",border:"none",borderRadius:9,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Mark Delivered</button>
                </div>
              )}
            </div>
          ):(
            <div>
              <span style={D.lbl}>Edit Order Items</span>
              <EditItems items={editItems} onChange={setEditItems}/>
              <div style={{marginTop:12}}><span style={D.lbl}>Notes</span><input value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Special instructions…" style={D.inp}/></div>
            </div>
          )}

          {/* Raw input */}
          {mode==="view"&&order.rawInput&&order.rawInput!=="[Photo]"&&(
            <div><span style={D.lbl}>Original Message</span><pre style={{fontFamily:"monospace",fontSize:13,background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"11px 13px",whiteSpace:"pre-wrap",color:"#166534",margin:0,lineHeight:1.7}}>{order.rawInput}</pre></div>
          )}
          {mode==="view"&&order.ocrText&&(
            <div><span style={D.lbl}>OCR — Handwriting Read</span><pre style={{fontFamily:"monospace",fontSize:12,background:"#F8F5F0",border:"1px solid #E8E3DC",borderRadius:10,padding:"10px 13px",whiteSpace:"pre-wrap",color:"#57534E",margin:0,lineHeight:1.7}}>{order.ocrText}</pre></div>
          )}
          {mode==="view"&&order.notes&&<div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:10,padding:"10px 13px",fontSize:14,color:"#92400E"}}>📝 {order.notes}</div>}

          {/* Actions */}
          {mode==="view"&&(
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {isManager&&next&&!(allDone&&order.status==="Confirmed")&&(
                <button onClick={()=>{onMove(order.id,next);onClose();}} style={{...D.btnPrimary,background:SC[next].dark}}>Move to {next} →</button>
              )}
              <button onClick={()=>setShowTracking(true)} style={{...D.btnSecondary,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"13px"}}>
                📤 Share Tracking Link with Customer
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// ORDER CARD (mobile, full-width)
// ─────────────────────────────────────────────────
function OrderCard({order,onOpen}){
  const done=order.items.filter(i=>i.delivered).length;
  const total=order.items.length;
  const overdue=isOD(order);
  return(
    <div onClick={()=>onOpen(order.id)}
      style={{background:"#fff",borderRadius:D.radius,marginBottom:10,cursor:"pointer",overflow:"hidden",
        border:`1px solid ${overdue?"#FECACA":"#E8E3DC"}`,
        boxShadow:overdue?"0 0 0 2px #FCA5A5":"0 1px 3px rgba(0,0,0,0.05)",
        display:"flex"}}>
      {/* Status strip */}
      <div style={{width:5,background:SC[order.status].c,flexShrink:0,borderRadius:"14px 0 0 14px"}}/>
      <div style={{flex:1,padding:"14px 14px 13px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:7}}>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            <code style={{fontSize:11,fontWeight:700,color:"#B45309"}}>{order.id}</code>
            <SrcBadge source={order.source}/>
            {overdue&&<span style={{fontSize:10,fontWeight:700,color:"#DC2626"}}>⚠ {daysAgo(order.createdAt)}d</span>}
          </div>
          <Ava name={order.salesperson} sz={26}/>
        </div>
        <div style={{fontWeight:800,fontSize:16,color:D.text,marginBottom:5}}>{order.customer}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
          {order.items.slice(0,3).map((it,i)=>(
            <span key={i} style={{background:it.delivered?"#F0FDF4":"#F8F5F0",color:it.delivered?"#166534":"#57534E",fontSize:12,padding:"3px 9px",borderRadius:20,border:`1px solid ${it.delivered?"#BBF7D0":"#E8E3DC"}`,fontWeight:500,textDecoration:it.delivered?"line-through":"none"}}>
              {it.species.split(" ").pop()} {it.size}
            </span>
          ))}
          {order.items.length>3&&<span style={{fontSize:12,color:D.faint}}>+{order.items.length-3} more</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <SBadge status={order.status}/>
            {total>1&&<span style={{fontSize:12,color:D.muted}}>{done}/{total} dispatched</span>}
          </div>
          <span style={{fontSize:12,color:D.faint}}>{fmtShort(order.createdAt)}</span>
        </div>
        {total>1&&done>0&&done<total&&(
          <div style={{marginTop:8,height:3,borderRadius:999,background:"#E8E3DC",overflow:"hidden"}}><div style={{height:3,borderRadius:999,background:"#B45309",width:`${(done/total)*100}%`}}/></div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// MANAGER — ORDER BOARD
// ─────────────────────────────────────────────────
function ManagerBoard({orders,onMove,onTick,onEdit}){
  const [filter,setFilter]=useState("All");
  const [sel,setSel]=useState(null);
  const counts=useMemo(()=>{const c={All:orders.length,New:0,Confirmed:0,Delivered:0,Paid:0};orders.forEach(o=>c[o.status]++);return c;},[orders]);
  const shown=useMemo(()=>[...orders].filter(o=>filter==="All"||o.status===filter).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)),[orders,filter]);
  const selOrder=orders.find(o=>o.id===sel);

  return(
    <div>
      {/* Filter pills */}
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:8,marginBottom:4}}>
        {["All",...COLS].map(s=>{const active=filter===s;const c=s!=="All"?SC[s]:null;return(
          <button key={s} onClick={()=>setFilter(s)}
            style={{padding:"8px 14px",border:`1.5px solid ${active&&c?c.c:"#E8E3DC"}`,borderRadius:999,
              background:active&&c?c.lt:"#fff",color:active&&c?c.c:D.muted,
              fontSize:13,fontWeight:active?700:500,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {s}{counts[s]>0&&s!=="All"?` · ${counts[s]}`:""}
          </button>
        );})}
      </div>
      {shown.length===0&&<div style={{textAlign:"center",padding:"48px 20px",color:D.faint,fontSize:15}}>No orders in this status</div>}
      {shown.map(o=><OrderCard key={o.id} order={o} onOpen={id=>setSel(id)}/>)}
      {sel&&selOrder&&(
        <OrderSheet order={selOrder} onClose={()=>setSel(null)} onMove={onMove} onTick={onTick} onEdit={onEdit} isManager={true} canEdit={true}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MANAGER — ALERTS
// ─────────────────────────────────────────────────
function ManagerAlerts({orders,log,onMarkRead}){
  const unread=log.filter(e=>!e.read&&e.actor!=="Manager").sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const overdue=orders.filter(isOD).sort((a,b)=>daysAgo(b.createdAt)-daysAgo(a.createdAt));
  useEffect(()=>{if(unread.length)onMarkRead(unread.map(e=>e.id));},[]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {unread.length===0&&overdue.length===0&&(
        <div style={{textAlign:"center",padding:"60px 20px",color:D.muted}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <div style={{fontSize:16,fontWeight:600,color:D.text}}>All clear</div>
          <div style={{fontSize:14,marginTop:4}}>No unread updates or overdue orders</div>
        </div>
      )}

      {unread.length>0&&(
        <div>
          <span style={D.lbl}>New Activity ({unread.length})</span>
          {unread.map(e=>{const o=orders.find(x=>x.id===e.orderId);return(
            <div key={e.id} style={{background:D.card,border:"1px solid #E8E3DC",borderRadius:D.radius,padding:"14px 16px",marginBottom:9,display:"flex",gap:12,alignItems:"flex-start"}}>
              <Ava name={e.actor} sz={36}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:14,color:D.text}}>{e.actor}</span>
                  <code style={{fontSize:11,color:"#B45309",fontWeight:700}}>{e.orderId}</code>
                </div>
                <div style={{fontSize:13,color:"#57534E",marginBottom:2}}>{e.details}</div>
                {o&&<div style={{fontSize:12,color:D.muted}}>{o.customer}</div>}
                <div style={{fontSize:11,color:D.faint,marginTop:3}}>{fmtAgo(e.ts)}</div>
              </div>
            </div>
          );})}
        </div>
      )}

      {overdue.length>0&&(
        <div>
          <span style={D.lbl}>⚠ Overdue Orders ({overdue.length})</span>
          {overdue.map(o=>(
            <div key={o.id} style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:D.radius,padding:"14px 16px",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <code style={{fontSize:11,fontWeight:700,color:"#B45309"}}>{o.id}</code>
                  <SBadge status={o.status}/>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{daysAgo(o.createdAt)}d overdue</span>
              </div>
              <div style={{fontWeight:700,fontSize:15,color:D.text,marginBottom:3}}>{o.customer}</div>
              <div style={{fontSize:12,color:"#991B1B",display:"flex",alignItems:"center",gap:5}}><Ava name={o.salesperson} sz={16}/>{o.salesperson} · {o.items.filter(i=>i.delivered).length}/{o.items.length} dispatched</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MANAGER — STATS (card-based, no tables)
// ─────────────────────────────────────────────────
function ManagerStats({orders}){
  const speciesStats=useMemo(()=>{
    const m={};
    orders.forEach(o=>o.items.forEach(it=>{
      if(!m[it.species])m[it.species]={orders:new Set(),qty:0,deliv:0,pend:0};
      m[it.species].orders.add(o.id);
      const q=iqty(it); m[it.species].qty+=q;
      if(it.delivered)m[it.species].deliv+=q; else m[it.species].pend+=q;
    }));
    return Object.entries(m).map(([sp,d])=>({sp,ords:d.orders.size,qty:d.qty,deliv:d.deliv,pend:d.pend})).sort((a,b)=>b.qty-a.qty);
  },[orders]);
  const grand=speciesStats.reduce((s,r)=>s+r.qty,0);
  const counts={New:0,Confirmed:0,Delivered:0,Paid:0};
  orders.forEach(o=>counts[o.status]++);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Status 2×2 */}
      <div>
        <span style={D.lbl}>Pipeline</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          {COLS.map(s=>{const c=SC[s];return(
            <div key={s} style={{background:c.lt,border:`1px solid ${c.bd}`,borderRadius:D.radius,padding:"14px 15px"}}>
              <div style={{fontSize:32,fontWeight:800,color:c.c,lineHeight:1}}>{counts[s]}</div>
              <div style={{fontSize:13,fontWeight:600,color:D.muted,marginTop:3}}>{s}</div>
            </div>
          );})}
        </div>
      </div>

      {/* Species cards */}
      <div>
        <span style={D.lbl}>Wood Species — {grand.toLocaleString()} pcs total</span>
        {speciesStats.map((r,i)=>{
          const pct=grand>0?Math.round(r.qty/grand*100):0;
          const dp=r.qty>0?Math.round(r.deliv/r.qty*100):0;
          return(
            <div key={r.sp} style={{background:D.card,border:"1px solid #E8E3DC",borderRadius:D.radius,padding:"14px 15px",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:9}}>
                <div><div style={{fontWeight:700,fontSize:15,color:D.text}}>{r.sp}</div><div style={{fontSize:12,color:D.muted}}>{r.ords} orders</div></div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:800,color:D.text}}>{r.qty.toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:D.muted}}> pcs</span></div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{height:8,borderRadius:999,background:"#E8E3DC",overflow:"hidden",marginBottom:7}}>
                <div style={{height:8,borderRadius:999,background:"#B45309",width:`${pct}%`}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"#059669",fontWeight:600}}>✓ {r.deliv.toLocaleString()} delivered ({dp}%)</span>
                <span style={{color:r.pend>0?"#D97706":D.faint,fontWeight:600}}>{r.pend.toLocaleString()} pending</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sources */}
      <div>
        <span style={D.lbl}>Order Sources</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
          {[{k:"text",icon:"💬",label:"Text"},{k:"photo",icon:"📷",label:"Photo"},{k:"voice",icon:"🎤",label:"Voice"}].map(s=>{
            const cnt=orders.filter(o=>o.source===s.k).length;
            return <div key={s.k} style={{background:D.card,border:"1px solid #E8E3DC",borderRadius:D.radius,padding:"13px",textAlign:"center"}}><div style={{fontSize:24,marginBottom:4}}>{s.icon}</div><div style={{fontSize:22,fontWeight:800,color:D.text}}>{cnt}</div><div style={{fontSize:11,color:D.muted}}>{s.label}</div></div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// SALESPERSON — NEW ORDER  (text / photo / voice)
// ─────────────────────────────────────────────────
function SPNewOrder({user,orders,onAdd}){
  const [method,setMethod]=useState(null); // null|text|photo|voice
  const [msgText,setMsgText]=useState("");
  const [customer,setCustomer]=useState("");
  const [phase,setPhase]=useState("idle"); // idle|parsing|editing
  const [editItems,setEditItems]=useState([]);
  const [editNotes,setEditNotes]=useState("");
  const [aiConf,setAiConf]=useState(null);
  const [ocrText,setOcrText]=useState(null);
  const [photoUrl,setPhotoUrl]=useState(null);
  const [comprInfo,setComprInfo]=useState(null);
  const [photoB64,setPhotoB64]=useState(null);
  const [done,setDone]=useState(false);
  const [errMsg,setErrMsg]=useState(null);
  const fileRef=useRef(null);

  async function parse(text,src){
    setPhase("parsing"); setErrMsg(null);
    try{const r=await aiText(text);setEditItems((r.items||[]).map(i=>({...i,delivered:false})));setEditNotes(r.notes||"");setAiConf(r.confidence);if(r.customer&&!customer)setCustomer(r.customer||"");setPhase("editing");}
    catch(e){console.error("Text parse error:",e);setErrMsg(e.message||"Failed to parse text order");setPhase("idle");}
  }

  async function handlePhoto(f){
    if(!f?.type.startsWith("image/")) return;
    setPhase("parsing"); setErrMsg(null);
    try{
      const ci=await compressImage(f);
      setPhotoUrl(ci.dataUrl); setPhotoB64(ci.b64);
      setComprInfo({orig:ci.origSize,comp:ci.size,pct:Math.round((1-ci.size/ci.origSize)*100)});
      const r=await aiPhoto(ci.b64,"image/jpeg");
      setOcrText(r.ocrText||null);
      setEditItems((r.items||[]).map(i=>({...i,delivered:false})));
      setEditNotes(r.notes||""); setAiConf(r.confidence);
      if(r.customer&&!customer)setCustomer(r.customer||"");
      setPhase("editing");
    }catch(e){console.error("Photo parse error:",e);setErrMsg(e.message||"Failed to parse photo order");setPhase("idle");}
  }

  function submit(){
    if(!editItems.length||!customer) return;
    const ord={id:genOrd(orders),customer,salesperson:user.name,source:method,status:"New",createdAt:nowIso(),rawInput:method==="photo"?"[Photo]":msgText,ocrText:ocrText||null,notes:editNotes,items:editItems};
    onAdd(ord);
    setDone(true); setMethod(null); setMsgText(""); setCustomer(""); setEditItems([]); setEditNotes(""); setPhotoUrl(null); setPhotoB64(null); setOcrText(null); setAiConf(null); setComprInfo(null); setPhase("idle");
    setTimeout(()=>setDone(false),3000);
  }

  if(done) return(
    <div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:56,marginBottom:14}}>✅</div>
      <div style={{fontSize:18,fontWeight:700,color:"#059669",marginBottom:6}}>Order Submitted!</div>
      <div style={{fontSize:14,color:D.muted}}>The manager will see it on the board.</div>
    </div>
  );

  if(!method) return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{textAlign:"center",padding:"24px 20px 16px"}}>
        <div style={{fontSize:40,marginBottom:8}}>🪵</div>
        <div style={{fontSize:18,fontWeight:700,color:D.text}}>New Order</div>
        <div style={{fontSize:14,color:D.muted,marginTop:4}}>Choose how to enter your order</div>
      </div>
      {[
        {id:"text", icon:"💬", title:"Type Order",     sub:"WhatsApp shorthand, any language"},
        {id:"photo",icon:"📷", title:"Upload Photo",   sub:"Handwritten notes — auto compressed & OCR"},
        {id:"voice",icon:"🎤", title:"Voice Message",  sub:"廣東話, 普通话, Melayu, English"},
      ].map(m=>(
        <button key={m.id} onClick={()=>setMethod(m.id)}
          style={{display:"flex",alignItems:"center",gap:16,padding:"18px 16px",border:"1.5px solid #E8E3DC",borderRadius:D.radius,background:"#fff",cursor:"pointer",textAlign:"left",width:"100%"}}>
          <div style={{width:52,height:52,borderRadius:14,background:"#FEF3C7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{m.icon}</div>
          <div><div style={{fontWeight:700,fontSize:16,color:D.text}}>{m.title}</div><div style={{fontSize:13,color:D.muted,marginTop:2}}>{m.sub}</div></div>
          <div style={{marginLeft:"auto",color:"#D6D3CE",fontSize:22}}>›</div>
        </button>
      ))}
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Back button */}
      <button onClick={()=>{setMethod(null);setPhase("idle");setEditItems([]);setOcrText(null);setPhotoUrl(null);setComprInfo(null);setErrMsg(null);}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:D.muted,fontSize:14,padding:0,fontWeight:600}}>
        ← Back
      </button>

      {/* Error banner */}
      {errMsg&&(
        <div style={{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:12,padding:"13px 15px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
            <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"#DC2626",marginBottom:2}}>Parsing failed</div>
              <div style={{fontSize:13,color:"#991B1B",lineHeight:1.5,wordBreak:"break-word"}}>{errMsg}</div>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      {phase==="idle"&&(
        <>
          {method==="text"&&(
            <div>
              <span style={D.lbl}>Order Message <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:D.faint}}>— any language</span></span>
              <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} rows={5}
                placeholder={"DH 2x4 100/10 Balau 1x2 50/8\n黑木二乘四 一百条十呎\nBalau 2x4 seratus keping sepuluh kaki"}
                style={{...D.inp,resize:"none",fontFamily:"monospace",lineHeight:1.8,fontSize:14}}/>
              <button onClick={()=>parse(msgText,"text")} disabled={!msgText.trim()} style={{...D.btnPrimary,marginTop:10,opacity:!msgText.trim()?.4:1}}>Parse with AI →</button>
            </div>
          )}
          {method==="photo"&&(
            <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed #D6D3CE",borderRadius:D.radius,padding:"40px 20px",textAlign:"center",cursor:"pointer",background:"#fff",minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
              <div style={{fontSize:48}}>📷</div>
              <div style={{fontWeight:700,fontSize:16,color:D.text}}>Tap to attach photo</div>
              <div style={{fontSize:13,color:D.muted}}>Photo will be auto-compressed before upload</div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handlePhoto(e.target.files?.[0])}/>
            </div>
          )}
          {method==="voice"&&<VoiceRecorder onTranscript={t=>{setMsgText(t);parse(t,"voice");}}/>}
        </>
      )}

      {/* Parsing spinner */}
      {phase==="parsing"&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12,animation:"none"}}>🤖</div>
          <div style={{fontSize:15,fontWeight:600,color:D.text,marginBottom:4}}>
            {method==="photo"?"Compressing photo & reading handwriting…":"Parsing order…"}
          </div>
          {comprInfo&&<div style={{fontSize:13,color:"#059669",fontWeight:500,marginTop:6}}>📦 {fmtBytes(comprInfo.orig)} → {fmtBytes(comprInfo.comp)} ({comprInfo.pct}% smaller)</div>}
          <div style={{fontSize:13,color:D.muted,marginTop:4}}>Claude is extracting the timber details</div>
        </div>
      )}

      {/* Editable form after parse */}
      {phase==="editing"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:"#92400E"}}>✏️ Review & Edit Before Submitting</div><div style={{fontSize:11,color:"#A16207",marginTop:1}}>AI pre-filled this — change anything</div></div>
            {aiConf&&<span style={{...D.pill,background:aiConf==="high"?"#F0FDF4":aiConf==="medium"?"#FFFBEB":"#FEF2F2",color:aiConf==="high"?"#166534":aiConf==="medium"?"#92400E":"#991B1B",fontSize:11}}>⚡{aiConf}</span>}
          </div>

          {/* Photo compression info */}
          {comprInfo&&method==="photo"&&(
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 13px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>✅</span>
              <span style={{fontSize:12,color:"#166534",fontWeight:500}}>Photo compressed: <strong>{fmtBytes(comprInfo.orig)}</strong> → <strong>{fmtBytes(comprInfo.comp)}</strong> ({comprInfo.pct}% smaller)</span>
            </div>
          )}

          {/* OCR output */}
          {ocrText&&<div><span style={D.lbl}>OCR — What AI read from your photo</span><pre style={{fontFamily:"monospace",fontSize:13,background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 13px",whiteSpace:"pre-wrap",color:"#166534",margin:0,lineHeight:1.7}}>{ocrText}</pre></div>}

          {/* Transcript (voice) */}
          {method==="voice"&&msgText&&<div><span style={D.lbl}>Voice Transcript</span><div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:10,padding:"10px 13px",fontSize:14,color:"#5B21B6",lineHeight:1.6}}>{msgText}</div></div>}

          {/* Customer */}
          <div>
            <span style={D.lbl}>Customer</span>
            <select value={customer} onChange={e=>setCustomer(e.target.value)} style={D.sel}>
              <option value="">Select customer…</option>
              {CUSTOMERS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Editable items */}
          <div>
            <span style={D.lbl}>Wood Items</span>
            <EditItems items={editItems} onChange={setEditItems}/>
          </div>

          {/* Notes */}
          <div><span style={D.lbl}>Notes <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></span><input value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Special instructions…" style={D.inp}/></div>

          <button onClick={submit} disabled={!customer||!editItems.length} style={{...D.btnPrimary,opacity:!customer||!editItems.length?.4:1}}>
            Submit Order to Manager →
          </button>
          {!customer&&<p style={{textAlign:"center",fontSize:13,color:"#D97706",margin:0}}>↑ Select a customer to continue</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// SALESPERSON — MY ORDERS
// ─────────────────────────────────────────────────
function SPMyOrders({user,orders,onEdit}){
  const [filter,setFilter]=useState("All");
  const [sel,setSel]=useState(null);
  const mine=[...orders].filter(o=>o.salesperson===user.name).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const shown=mine.filter(o=>filter==="All"||o.status===filter);
  const selOrder=orders.find(o=>o.id===sel);

  return(
    <div>
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:8,marginBottom:4}}>
        {["All",...COLS].map(s=>{const active=filter===s;const c=s!=="All"?SC[s]:null;return(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"8px 14px",border:`1.5px solid ${active&&c?c.c:"#E8E3DC"}`,borderRadius:999,background:active&&c?c.lt:"#fff",color:active&&c?c.c:D.muted,fontSize:13,fontWeight:active?700:500,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>{s}</button>
        );})}
      </div>
      {shown.length===0&&<div style={{textAlign:"center",padding:"48px 20px",color:D.faint,fontSize:15}}>{mine.length===0?"No orders yet. Use New Order to submit.":"No orders in this status."}</div>}
      {shown.map(o=>{
        const canEdit=o.status==="New";
        return(
          <div key={o.id} onClick={()=>setSel(o.id)} style={{background:"#fff",border:`1px solid ${canEdit?"#FDE68A":"#E8E3DC"}`,borderRadius:D.radius,marginBottom:10,cursor:"pointer",overflow:"hidden",display:"flex"}}>
            <div style={{width:5,background:SC[o.status].c,flexShrink:0,borderRadius:"14px 0 0 14px"}}/>
            <div style={{flex:1,padding:"13px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <code style={{fontSize:11,fontWeight:700,color:"#B45309"}}>{o.id}</code>
                <SrcBadge source={o.source}/>
                {canEdit&&<span style={{...D.pill,background:"#FEF3C7",color:"#B45309",fontSize:10}}>✏️ Editable</span>}
                <SBadge status={o.status}/>
              </div>
              <div style={{fontWeight:700,fontSize:16,color:D.text,marginBottom:4}}>{o.customer}</div>
              <div style={{fontSize:12,color:D.muted}}>{fmtShort(o.createdAt)} · {o.items.length} item{o.items.length!==1?"s":""} · {o.items.filter(i=>i.delivered).length}/{o.items.length} dispatched</div>
            </div>
          </div>
        );
      })}
      {sel&&selOrder&&(
        <OrderSheet order={selOrder} onClose={()=>setSel(null)} onMove={()=>{}} onTick={()=>{}}
          onEdit={(id,items,customer,notes)=>{onEdit(id,items,customer,notes,user.name);setSel(null);}}
          isManager={false} canEdit={selOrder.status==="New"&&selOrder.salesperson===user.name}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────
function BottomNav({tabs,active,onChange,badge}){
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #E8E3DC",display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
      {tabs.map(t=>{
        const on=active===t.id;
        const bc=badge&&badge[t.id]||0;
        return(
          <button key={t.id} onClick={()=>onChange(t.id)}
            style={{flex:1,padding:"10px 4px 8px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
            <div style={{position:"relative"}}>
              <span style={{fontSize:22}}>{t.icon}</span>
              {bc>0&&<span style={{position:"absolute",top:-4,right:-8,background:"#DC2626",color:"#fff",borderRadius:999,fontSize:9,fontWeight:700,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{bc}</span>}
            </div>
            <span style={{fontSize:10,fontWeight:on?700:500,color:on?"#B45309":D.muted,letterSpacing:0.2}}>{t.label}</span>
            {on&&<div style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:"#B45309",borderRadius:"0 0 2px 2px"}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────
function Login({onLogin}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#FEF3C7 0%,#F7F4F0 50%,#E8E3DC 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:18,background:"#B45309",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 12px",boxShadow:"0 6px 24px rgba(180,83,9,0.3)"}}>🪵</div>
          <div style={{fontSize:22,fontWeight:800,color:D.text}}>Yen Sim Trading</div>
          <div style={{fontSize:14,color:D.muted,marginTop:3}}>Sdn Bhd · Sales Order System</div>
        </div>
        <div style={{background:"#fff",borderRadius:18,padding:"20px 16px",border:"1px solid #E8E3DC",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
          <span style={D.lbl}>Sign in as</span>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {USERS.map(u=>(
              <button key={u.id} onClick={()=>onLogin(u)} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 15px",border:"1.5px solid #E8E3DC",borderRadius:13,background:"#FAFAF9",cursor:"pointer",textAlign:"left",minHeight:62}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:u.clr,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>{u.ini}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:D.text}}>{u.name}</div><div style={{fontSize:12,color:D.muted,textTransform:"capitalize"}}>{u.role}</div></div>
                <span style={{color:"#D6D3CE",fontSize:20}}>›</span>
              </button>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:12,fontSize:12,color:D.faint}}>Demo · no password required</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [orders,setOrders]=useState(seed);
  const [log,setLog]=useState(seedLog);
  const [tab,setTab]=useState(null);

  const addLog = useCallback(e=>setLog(p=>[...p,{id:genLog(p),...e}]),[]);

  function login(u){setUser(u);setTab(u.role==="manager"?"board":"new");}

  function addOrder(o){
    setOrders(p=>[o,...p]);
    addLog({orderId:o.id,type:"created",actor:o.salesperson,ts:nowIso(),details:`New order (${o.source}) · ${o.customer}`,read:false});
  }
  function moveOrder(id,status){
    const o=orders.find(x=>x.id===id);
    setOrders(p=>p.map(x=>x.id===id?{...x,status}:x));
    addLog({orderId:id,type:"moved",actor:user.name,ts:nowIso(),details:`${o?.status} → ${status}`,read:true});
  }
  function tickItem(ordId,idx){
    const o=orders.find(x=>x.id===ordId);
    const it=o?.items[idx];
    const nd=!it?.delivered;
    setOrders(p=>p.map(x=>x.id!==ordId?x:{...x,items:x.items.map((it2,i)=>i===idx?{...it2,delivered:nd}:it2)}));
    addLog({orderId:ordId,type:"ticked",actor:user.name,ts:nowIso(),details:`${nd?"✓":"↩"} ${it?.species} ${it?.size}`,read:true});
  }
  function editOrder(id,items,customer,notes,actor){
    setOrders(p=>p.map(x=>x.id===id?{...x,items,customer,notes}:x));
    addLog({orderId:id,type:"edited",actor,ts:nowIso(),details:`Order edited by ${actor}`,read:actor!=="Manager"});
  }
  function markRead(ids){setLog(p=>p.map(e=>ids.includes(e.id)?{...e,read:true}:e));}

  const unreadCnt=useMemo(()=>log.filter(e=>!e.read&&e.actor!=="Manager").length,[log]);
  const overdueCnt=useMemo(()=>orders.filter(isOD).length,[orders]);
  const alertCnt=unreadCnt+overdueCnt;
  const newCnt=orders.filter(o=>o.status==="New").length;

  if(!user) return <Login onLogin={login}/>;

  const MGR_TABS=[{id:"board",icon:"📋",label:"Orders"},{id:"alerts",icon:"🔔",label:"Alerts"},{id:"stats",icon:"📊",label:"Stats"}];
  const SP_TABS=[{id:"new",icon:"➕",label:"New Order"},{id:"mine",icon:"📦",label:"My Orders"}];
  const TABS=user.role==="manager"?MGR_TABS:SP_TABS;
  const badge=user.role==="manager"?{board:newCnt,alerts:alertCnt}:{};

  return(
    <div style={{minHeight:"100vh",background:D.bg,paddingBottom:D.nav+16}}>
      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid #E8E3DC",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:50}}>
        <span style={{fontSize:18}}>🪵</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14,color:D.text,lineHeight:1.1}}>Yen Sim Trading</div>
          <div style={{fontSize:11,color:D.muted}}>{user.role==="manager"?"Manager":"Salesperson"} · {user.name}</div>
        </div>
        <Ava name={user.name} sz={32}/>
        <button onClick={()=>setUser(null)} style={{fontSize:12,padding:"5px 11px",border:"1px solid #E8E3DC",borderRadius:20,background:"#FAFAF9",color:D.muted,cursor:"pointer"}}>Out</button>
      </div>

      {/* Page title */}
      <div style={{padding:"16px 16px 4px"}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:800,color:D.text}}>
          {tab==="board"&&"Orders"}
          {tab==="alerts"&&"Alerts"}
          {tab==="stats"&&"Stats"}
          {tab==="new"&&"New Order"}
          {tab==="mine"&&"My Orders"}
        </h2>
      </div>

      {/* Content */}
      <div style={{padding:"8px 16px 0"}}>
        {tab==="board" &&<ManagerBoard  orders={orders} onMove={moveOrder} onTick={tickItem} onEdit={editOrder}/>}
        {tab==="alerts"&&<ManagerAlerts orders={orders} log={log} onMarkRead={markRead}/>}
        {tab==="stats" &&<ManagerStats  orders={orders}/>}
        {tab==="new"   &&<SPNewOrder    user={user} orders={orders} onAdd={addOrder}/>}
        {tab==="mine"  &&<SPMyOrders    user={user} orders={orders} onEdit={editOrder}/>}
      </div>

      <BottomNav tabs={TABS} active={tab} onChange={setTab} badge={badge}/>
    </div>
  );
}
