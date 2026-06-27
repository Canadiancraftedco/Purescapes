import { useState, useEffect, useRef } from "react";
// ── Config ──────────────────────────────────────────────────────────────────
const SUPA = "https://vrdcpahwapmuyulsfvst.supabase.co";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZGNwYWh3YXBtdXl1bHNmdnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNDg5OTUsImV4cCI6MjA5NzkyNDk5NX0.1yBzScypgCevsckso4u7nU9UBWjYHXYm3MLsdKhRY4A";

async function db(path, opt = {}) {
  const r = await fetch(`${SUPA}/rest/v1${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(opt.headers||{}) },
    ...opt,
  });
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}

// AI proxy — routes through Cloudflare Worker to fix CORS in all environments
const AI_PROXY = "https://purescapes-ai.canadiancraftedco.workers.dev";

async function ai(messages, system = "") {
  const endpoints = [AI_PROXY, "https://api.anthropic.com/v1/messages"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages }),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const text = d.content?.find(c => c.type === "text")?.text;
      if (text) return text;
    } catch { /* try next */ }
  }
  return "AI unavailable in preview. Deploy the Cloudflare Worker (cloudflare-worker.js) and it works live on your site.";
}

// ── Seed data (shown instantly; Supabase refresh on top) ─────────────────────
const SEED_TENDERS=[
  {id:"1",title:"Roadside Vegetation Management & Grass Cutting 2026",municipality:"Town of Collingwood",category:"landscaping",description:"Annual contract for roadside grass cutting along municipal road allowances. Includes ditch trimming and vegetation control at intersections. 4–6 cuts per season.",scope_of_work:"Seasonal grass cutting along approx 68km of municipal road allowances. Ditch trimming and vegetation control at 12 intersections. Contractor supplies all equipment and operators.",estimated_value_low:44000,estimated_value_high:62000,closing_date:"2026-07-18T14:00:00+00:00",status:"open",ai_fit_score:92,ai_recommended_bid:47500,ai_strategy_notes:"Bid at $47,500. BrightLawn won 2024 at $44,750 — they'll likely bid again. Emphasize local crew and no mobilization delays. 3–4 bidders. High win probability.",requires_bonding:false,distance_km:29,tender_number:"T-2026-038"},
  {id:"2",title:"Cemetery Grounds Maintenance 2026–2028 (Multi-Year)",municipality:"Municipality of Meaford",category:"maintenance",description:"Multi-year seasonal maintenance contract for St. Vincent and Meaford Municipal Cemetery. Weekly mowing, edging, trimming, hedge maintenance May through October.",scope_of_work:"Two cemetery sites. Weekly mowing (May 1–Oct 31), edging of all markers weekly, pathway and hedge trimming, seasonal plantings at 4 feature areas. 2-year base term + 1 year option.",estimated_value_low:58000,estimated_value_high:72000,closing_date:"2026-08-08T14:00:00+00:00",status:"open",ai_fit_score:91,ai_recommended_bid:62000,ai_strategy_notes:"Exceptional fit — home municipality, 2km from yard. Multi-year contract = recurring revenue. Valley Green won 2024 at $31,200/yr. Bid $62K for 2-year term. Very high win probability.",requires_bonding:false,distance_km:2,tender_number:"M-2026-015"},
  {id:"3",title:"Annual Ditch Cleaning & Culvert Maintenance Program 2026",municipality:"The Corporation of Grey County",category:"excavation",description:"Annual maintenance of rural ditching along multiple County Roads. Includes culvert inspection, cleaning, and replacement at identified locations.",scope_of_work:"Ditch cleaning and re-grading along County Roads 7, 13 and 19. Culvert replacement at up to 8 locations (450mm–750mm diameter). Erosion repair and seed restoration.",estimated_value_low:85000,estimated_value_high:105000,closing_date:"2026-07-25T14:00:00+00:00",status:"open",ai_fit_score:88,ai_recommended_bid:89000,ai_strategy_notes:"Core excavation work in home territory. Bray won 2024 at $88,400. Target $89,000 and differentiate on culvert experience and local equipment availability. 3–5 bidders.",requires_bonding:false,distance_km:15,tender_number:"RFT-TS-2026-12"},
  {id:"4",title:"Road Allowance Brushing & Mowing — Annual Contract 2026",municipality:"Township of Georgian Bluffs",category:"maintenance",description:"Annual contract for road allowance brushing, mowing, and vegetation control on township roads. Shoulder maintenance included.",scope_of_work:"Brushing and mowing of road allowances on approx 180km of township roads. 2 cuts minimum per season. Spot brushing at sightline locations.",estimated_value_low:32000,estimated_value_high:45000,closing_date:"2026-07-30T14:00:00+00:00",status:"open",ai_fit_score:84,ai_recommended_bid:37000,ai_strategy_notes:"Adjacent to Meaford, tractor and mowing equipment is a perfect match. Small contract but builds Georgian Bluffs relationship. Bid $37,000. 3 likely bidders. Good win probability.",requires_bonding:false,distance_km:18,tender_number:"GB-2026-009"},
  {id:"5",title:"Shoreline Erosion Control & Armour Stone Placement 2026",municipality:"Municipality of Meaford",category:"construction",description:"Supply and installation of armour stone along eroding municipal shoreline. Geotextile fabric, machine excavation of failed slope, finish grading and seed restoration.",scope_of_work:"240 linear metres. Supply and place 2–4 tonne armour stone (~380 tonnes). Non-woven geotextile behind stone. Machine excavation, finish grade, topsoil and seed restoration.",estimated_value_low:68000,estimated_value_high:85000,closing_date:"2026-08-22T14:00:00+00:00",status:"open",ai_fit_score:79,ai_recommended_bid:71500,ai_strategy_notes:"Home territory advantage. Supply yard gives material sourcing edge. Emphasize local supervision and warranty responsiveness. 3–4 bidders expected.",requires_bonding:false,distance_km:3,tender_number:"M-2026-019"},
  {id:"6",title:"Municipal Parks Landscape Restoration — Kelso Beach Phase 1",municipality:"City of Owen Sound",category:"landscaping",description:"Landscape restoration of Kelso Beach Park. Topsoil grading, native seeding, tree planting, natural stone retaining features, and accessible pathway improvements.",scope_of_work:"0.8 acres. Topsoil supply and rough grade (220 tonnes), native seed mix, 18 specimen trees, 2 limestone retaining wall sections (30LM each), granular pathway 180LM.",estimated_value_low:95000,estimated_value_high:125000,closing_date:"2026-08-15T14:00:00+00:00",status:"open",ai_fit_score:73,ai_recommended_bid:105000,ai_strategy_notes:"Competitive — Owen Sound attracts larger landscapers. Granite Ridge likely bidding. Target $105K, emphasize natural stone expertise and plant warranty. 5–6 bidders.",requires_bonding:true,distance_km:42,tender_number:"OS-2026-T-22"},
  {id:"7",title:"Site Grading & Stormwater Management — Industrial Park Expansion",municipality:"Town of the Blue Mountains",category:"excavation",description:"Site preparation for new industrial park lot development. Bulk earthworks, stormwater management infrastructure, sub-base preparation. Approximately 2.8 acres.",scope_of_work:"Cut/fill earthworks (est. 4,200 m³), 160LM of 300mm storm sewer, 5 catch basins, swale grading, erosion controls, sub-base prep. Performance bond required.",estimated_value_low:145000,estimated_value_high:195000,closing_date:"2026-09-05T14:00:00+00:00",status:"open",ai_fit_score:66,ai_recommended_bid:168000,ai_strategy_notes:"Larger scope — confirm crew availability before committing. Miller Paving is likely frontrunner. If bidding, target $168K and include bond cost. 3 bidders.",requires_bonding:true,distance_km:35,tender_number:"TBM-2026-T-08"},
  {id:"8",title:"Watermain & Service Connection Excavation — Mosley St Phase 2",municipality:"Town of Wasaga Beach",category:"excavation",description:"Excavation and backfill for watermain extension and residential service connections on Mosley Street corridor.",scope_of_work:"320LM of watermain trench (600mm wide x 1.8m deep avg), 22 service connection stubs, granular bedding, compaction, surface restoration.",estimated_value_low:88000,estimated_value_high:115000,closing_date:"2026-09-12T14:00:00+00:00",status:"open",ai_fit_score:61,ai_recommended_bid:95000,ai_strategy_notes:"Moderate fit — utility excavation is doable but confined trench work needs experienced operator. Confirm TSSA locates process. 4–5 bidders.",requires_bonding:false,distance_km:55,tender_number:"WB-2026-ENG-14"},
];

const SEED_AWARDS=[
  {id:"a1",tender_title:"Annual Ditch Maintenance Program 2024",municipality:"Grey County",category:"excavation",winner_name:"Bray Contracting Inc.",award_amount:88400,awarded_date:"2024-03-15",num_bidders:4},
  {id:"a2",tender_title:"Cemetery Grounds Maintenance 2024",municipality:"Municipality of Meaford",category:"maintenance",winner_name:"Valley Green Services",award_amount:31200,awarded_date:"2024-04-01",num_bidders:3},
  {id:"a3",tender_title:"Roadside Mowing Zone B 2024",municipality:"Town of Collingwood",category:"landscaping",winner_name:"BrightLawn Commercial",award_amount:44750,awarded_date:"2024-04-10",num_bidders:5},
  {id:"a4",tender_title:"Harrison Park Restoration Phase 1",municipality:"City of Owen Sound",category:"landscaping",winner_name:"Granite Ridge Landscaping",award_amount:122800,awarded_date:"2024-05-20",num_bidders:6},
  {id:"a5",tender_title:"Site Prep — Thornbury Community Centre",municipality:"Town of the Blue Mountains",category:"excavation",winner_name:"Miller Paving Ltd.",award_amount:198000,awarded_date:"2023-08-12",num_bidders:3},
  {id:"a6",tender_title:"Urban Tree Planting Program 2024",municipality:"Town of Wasaga Beach",category:"landscaping",winner_name:"EcoRoots Inc.",award_amount:26400,awarded_date:"2024-03-28",num_bidders:7},
  {id:"a7",tender_title:"Stormwater Ditch Repair 2023",municipality:"Township of Clearview",category:"construction",winner_name:"Bray Contracting Inc.",award_amount:71500,awarded_date:"2023-07-05",num_bidders:4},
  {id:"a8",tender_title:"Parks Maintenance Contract 2024",municipality:"Town of Midland",category:"maintenance",winner_name:"GreenSpace Contractors",award_amount:54200,awarded_date:"2024-02-29",num_bidders:5},
  {id:"a9",tender_title:"Georgian Bluffs Road Maintenance",municipality:"Township of Georgian Bluffs",category:"construction",winner_name:"Owen Sound Excavating",award_amount:95600,awarded_date:"2024-04-18",num_bidders:3},
  {id:"a10",tender_title:"Annual Grass Cutting Services 2024",municipality:"Town of Wasaga Beach",category:"landscaping",winner_name:"ClipMaster Property Services",award_amount:38900,awarded_date:"2024-03-15",num_bidders:8},
  {id:"a11",tender_title:"Harbourview Park Landscaping",municipality:"Municipality of Meaford",category:"landscaping",winner_name:"Granite Ridge Landscaping",award_amount:44100,awarded_date:"2023-06-10",num_bidders:5},
  {id:"a12",tender_title:"Penetanguishene Shoreline Repair",municipality:"Town of Penetanguishene",category:"construction",winner_name:"Lakeside Civil Works",award_amount:67800,awarded_date:"2023-09-22",num_bidders:4},
];

const SEED_SOURCES=[
  {id:"s1",name:"Grey County Tenders",url:"https://www.grey.ca/government/budget-finances-purchasing/bids-tenders-contracts",type:"scrape",region:"Grey County",active:true,scrape_interval_hours:4},
  {id:"s2",name:"Biddingo Ontario",url:"https://www.biddingo.com",type:"scrape",region:"Ontario",active:true,scrape_interval_hours:4},
  {id:"s3",name:"Bids & Tenders Ontario",url:"https://www.bidsandtenders.ca",type:"scrape",region:"Ontario",active:true,scrape_interval_hours:4},
  {id:"s4",name:"MERX Ontario",url:"https://www.merx.com",type:"scrape",region:"Ontario",active:true,scrape_interval_hours:4},
  {id:"s5",name:"Municipality of Meaford",url:"https://www.meaford.ca/tenders",type:"scrape",region:"Meaford",active:true,scrape_interval_hours:4},
  {id:"s6",name:"Town of Collingwood",url:"https://www.collingwood.ca/tenders",type:"scrape",region:"Collingwood",active:true,scrape_interval_hours:4},
  {id:"s7",name:"City of Owen Sound",url:"https://www.owensound.ca/tenders",type:"scrape",region:"Owen Sound",active:true,scrape_interval_hours:4},
  {id:"s8",name:"Town of the Blue Mountains",url:"https://www.thebluemountains.ca/bids",type:"scrape",region:"Blue Mountains",active:true,scrape_interval_hours:4},
  {id:"s9",name:"Township of Clearview",url:"https://www.clearview.ca/tenders",type:"scrape",region:"Clearview",active:true,scrape_interval_hours:4},
  {id:"s10",name:"Town of Wasaga Beach",url:"https://www.wasagabeach.com/tenders",type:"scrape",region:"Wasaga Beach",active:true,scrape_interval_hours:4},
  {id:"s11",name:"Town of Midland",url:"https://www.midland.ca/tenders",type:"scrape",region:"Midland",active:true,scrape_interval_hours:4},
  {id:"s12",name:"CanadaBuys Federal",url:"https://canadabuys.canada.ca",type:"scrape",region:"Federal",active:true,scrape_interval_hours:8},
];

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#0c0f08", surf:"#141810", surf2:"#0e1109",
  sage:"#7a9e6b", mist:"#c8d8bc", stone:"#8a8278",
  lime:"#d4cec4", gold:"#c4a44a", white:"#fafaf8",
  border:"rgba(122,158,107,0.15)", borderHi:"rgba(122,158,107,0.35)",
};
const F = {
  serif: { fontFamily:"'Cormorant Garamond',Georgia,serif" },
  mono:  { fontFamily:"'Space Grotesk','Courier New',monospace" },
  sans:  { fontFamily:"'DM Sans','Helvetica Neue',sans-serif" },
};

// ── Primitives ───────────────────────────────────────────────────────────────
const Row = ({children,gap=12,wrap,center,between,style={}}) => (
  <div style={{display:"flex",gap,flexWrap:wrap?"wrap":"nowrap",alignItems:center?"center":"flex-start",justifyContent:between?"space-between":"flex-start",...style}}>
    {children}
  </div>
);

const Col = ({children,gap=12,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap,...style}}>{children}</div>
);

const Grid = ({children,cols="1fr 1fr",gap=14,style={}}) => (
  <div style={{display:"grid",gridTemplateColumns:cols,gap,...style}}>{children}</div>
);

function Tag({children,color=T.stone}) {
  return (
    <span style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",
      padding:"3px 9px",border:`1px solid ${color}50`,color,display:"inline-block"}}>
      {children}
    </span>
  );
}

function Btn({children,onClick,v="primary",sm,full,disabled,style={}}) {
  const base = {...F.mono,fontSize:sm?9:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
    border:"none",cursor:disabled?"not-allowed":"pointer",transition:"opacity 0.15s",
    padding:sm?"7px 13px":"12px 24px",width:full?"100%":"auto",opacity:disabled?0.5:1,...style};
  const vars = {
    primary:{background:T.sage,color:T.bg},
    ghost:{background:"transparent",color:T.stone,border:`1px solid ${T.border}`},
    gold:{background:T.gold,color:T.bg},
    danger:{background:"rgba(224,112,112,0.12)",color:"#e07070",border:"1px solid rgba(224,112,112,0.25)"},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...vars[v]}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.8"}}
    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}

const inputSt = {
  width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,
  color:T.lime,padding:"11px 14px",...F.sans,fontSize:13,outline:"none",
  boxSizing:"border-box",resize:"vertical",
};

function Field({label,value,onChange,placeholder,type="text",rows,children}) {
  return (
    <div style={{marginBottom:14}}>
      {label && <label style={{...F.mono,fontSize:9,fontWeight:700,letterSpacing:"0.16em",
        textTransform:"uppercase",color:T.stone,display:"block",marginBottom:6}}>{label}</label>}
      {children || (rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={inputSt}/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputSt}/>
      )}
    </div>
  );
}

function Card({children,style={}}) {
  return <div style={{background:T.surf,border:`1px solid ${T.border}`,padding:22,...style}}>{children}</div>;
}

function SectionTitle({title,sub,action}) {
  return (
    <Row between center wrap style={{marginBottom:26,gap:16}}>
      <div>
        <h2 style={{...F.serif,fontSize:34,fontWeight:300,color:T.white,margin:0}}>{title}</h2>
        {sub && <p style={{...F.sans,fontSize:13,color:T.stone,marginTop:4}}>{sub}</p>}
      </div>
      {action}
    </Row>
  );
}

function LiveDot({active=true}) {
  return <span style={{width:6,height:6,borderRadius:"50%",background:active?T.sage:T.stone,
    display:"inline-block",animation:active?"pulse 2s infinite":"none"}}/>;
}

function Score({score}) {
  const c = score>=80?T.sage:score>=60?T.gold:T.stone;
  return (
    <div style={{textAlign:"center",minWidth:54}}>
      <div style={{...F.serif,fontSize:36,fontWeight:300,color:c,lineHeight:1}}>{score}</div>
      <div style={{...F.mono,fontSize:7,letterSpacing:"0.14em",textTransform:"uppercase",color:T.stone,marginTop:1}}>AI Fit</div>
    </div>
  );
}

function Pill({label,color=T.stone}) {
  return <span style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",
    padding:"3px 9px",border:`1px solid ${color}40`,color,display:"inline-block"}}>{label}</span>;
}

// ── Grass Canvas ──────────────────────────────────────────────────────────────
function Grass({h=200}) {
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv) return;
    const cx=cv.getContext("2d");
    let af,t=0,bl=[];
    function init(){
      cv.width=cv.offsetWidth; cv.height=h;
      const W=cv.width;
      bl=Array.from({length:Math.floor(W/4)},()=>({
        x:Math.random()*W, h:50+Math.random()*h*.7,
        ph:Math.random()*Math.PI*2, sp:.3+Math.random()*.7,
        am:10+Math.random()*22, th:.5+Math.random()*1.4,
        hu:95+Math.floor(Math.random()*30), li:10+Math.floor(Math.random()*18),
      }));
    }
    function draw(){
      const W=cv.width,H=cv.height;
      cx.clearRect(0,0,W,H);
      const g=cx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,"#0d1a08"); g.addColorStop(1,"#1a2410");
      cx.fillStyle=g; cx.fillRect(0,0,W,H);
      bl.forEach(b=>{
        const w=Math.sin(t*b.sp+b.ph)*b.am+Math.sin(t*.25+b.ph*.7)*b.am*.35;
        cx.beginPath(); cx.moveTo(b.x,H);
        let px=b.x,py=H;
        for(let s=1;s<=7;s++){
          const tt=s/7,c=w*tt*tt,nx=b.x+c,ny=H-b.h*tt;
          cx.quadraticCurveTo((px+nx)/2,(py+ny)/2,nx,ny);
          px=nx; py=ny;
        }
        cx.strokeStyle=`hsla(${b.hu},28%,${b.li}%,.88)`; cx.lineWidth=b.th; cx.stroke();
      });
      t+=.011; af=requestAnimationFrame(draw);
    }
    init(); draw();
    const ro=new ResizeObserver(init); ro.observe(cv);
    return()=>{cancelAnimationFrame(af);ro.disconnect();};
  },[h]);
  return <canvas ref={ref} style={{width:"100%",height:h,display:"block"}}/>;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);

  function attempt() {
    setBusy(true); setErr("");
    setTimeout(()=>{
      if(u.trim().toLowerCase()==="pure" && p==="scapes") { onLogin(); }
      else { setErr("Invalid credentials. Hint: pure / scapes"); setBusy(false); }
    },400);
  }

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400&family=Space+Grotesk:wght@400;600&display=swap');`}</style>
      <Grass h={200}/>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:T.surf,border:`1px solid ${T.border}`,padding:"44px 40px",width:"100%",maxWidth:380}}>
          <div style={{...F.serif,fontSize:24,fontWeight:300,color:T.mist,letterSpacing:"0.1em",marginBottom:4}}>
            PURE<span style={{color:T.sage}}>scapes</span>
          </div>
          <div style={{...F.mono,fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:T.stone,marginBottom:32}}>
            Procurement Intelligence
          </div>
          {err && <div style={{...F.sans,fontSize:12,color:"#e07070",marginBottom:14,padding:"9px 12px",background:"rgba(224,112,112,0.08)",border:"1px solid rgba(224,112,112,0.2)"}}>{err}</div>}
          <Field label="Username" value={u} onChange={setU} placeholder="pure"/>
          <Field label="Password" value={p} onChange={v=>{setP(v);}} type="password" placeholder="scapes">
            <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="scapes" style={inputSt}/>
          </Field>
          <button onClick={attempt} disabled={busy}
            style={{width:"100%",background:busy?"rgba(122,158,107,0.5)":T.sage,color:T.bg,border:"none",
              padding:"14px",...F.mono,fontSize:11,fontWeight:700,letterSpacing:"0.12em",
              textTransform:"uppercase",cursor:busy?"not-allowed":"pointer",marginTop:4}}>
            {busy?"Checking…":"Access Dashboard"}
          </button>
          <div style={{...F.sans,fontSize:11,color:T.stone,marginTop:20,textAlign:"center"}}>
            Login: <strong style={{color:T.sage}}>pure</strong> / <strong style={{color:T.sage}}>scapes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAVS=[
  {id:"overview",ic:"◈",lb:"Overview"},
  {id:"tenders", ic:"📋",lb:"Live Tenders"},
  {id:"ai",      ic:"✦", lb:"AI Assistant"},
  {id:"proposal",ic:"📄",lb:"Proposal Builder"},
  {id:"winners", ic:"🏆",lb:"Past Winners"},
  {id:"bids",    ic:"📁",lb:"Our Bids"},
  {id:"sources", ic:"🔗",lb:"Sources"},
  {id:"settings",ic:"⚙", lb:"Settings"},
];

function Sidebar({active,go,logout}) {
  return (
    <div style={{position:"fixed",left:0,top:0,bottom:0,width:210,background:T.surf2,
      borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",zIndex:50,overflowY:"auto"}}>
      <div style={{padding:"22px 22px 18px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{...F.serif,fontSize:20,fontWeight:300,color:T.mist,letterSpacing:"0.1em"}}>
          PURE<span style={{color:T.sage}}>scapes</span>
        </div>
        <div style={{...F.mono,fontSize:8,letterSpacing:"0.18em",textTransform:"uppercase",color:T.stone,marginTop:3}}>Procurement Engine</div>
        <Row center gap={6} style={{marginTop:10}}>
          <LiveDot/> <span style={{...F.mono,fontSize:8,color:T.stone,letterSpacing:"0.06em"}}>LIVE · 12 Sources</span>
        </Row>
      </div>
      <nav style={{flex:1,padding:"10px 0"}}>
        {NAVS.map(n=>(
          <div key={n.id} onClick={()=>go(n.id)} style={{
            display:"flex",alignItems:"center",gap:10,padding:"11px 22px",cursor:"pointer",
            ...F.mono,fontSize:11,letterSpacing:"0.05em",
            color:active===n.id?T.sage:T.stone,
            borderLeft:`2px solid ${active===n.id?T.sage:"transparent"}`,
            background:active===n.id?"rgba(122,158,107,0.07)":"transparent",
            transition:"all 0.15s",
          }}>
            <span style={{fontSize:13,width:16,textAlign:"center"}}>{n.ic}</span> {n.lb}
          </div>
        ))}
      </nav>
      <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`}}>
        <div style={{...F.sans,fontSize:11,color:T.stone,marginBottom:10}}>PUREscapes Admin</div>
        <button onClick={logout} style={{...F.mono,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
          color:T.stone,background:"none",border:`1px solid ${T.border}`,padding:"7px 14px",cursor:"pointer",width:"100%"}}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({tenders,awards,bids,go,setProposalPrefill,setChatPrefill}) {
  const open=tenders.filter(t=>t.status==="open");
  const top3=[...open].sort((a,b)=>b.ai_fit_score-a.ai_fit_score).slice(0,3);
  const urgent=open.filter(t=>t.closing_date&&(new Date(t.closing_date)-new Date())/86400000<=7);
  const stats=[
    {lb:"Open Tenders",val:open.length,sub:`${open.filter(t=>t.ai_fit_score>=80).length} high fit (80+)`,c:T.sage},
    {lb:"Closing ≤7 Days",val:urgent.length,sub:"Act now",c:urgent.length>0?"#e07070":T.stone},
    {lb:"Bids Recorded",val:bids.length,sub:`${bids.filter(b=>b.status==="won").length} won`,c:T.gold},
    {lb:"Award Records",val:awards.length,sub:"Competitor data",c:T.mist},
  ];
  return (
    <Col gap={20}>
      <div>
        <h2 style={{...F.serif,fontSize:34,fontWeight:300,color:T.white}}>Good morning.</h2>
        <p style={{...F.sans,fontSize:13,color:T.stone,marginTop:4}}>{open.length} active opportunities within 100km of Meaford.</p>
      </div>
      <Grid cols="repeat(4,1fr)" gap={10}>
        {stats.map(s=>(
          <Card key={s.lb} style={{padding:"18px 20px"}}>
            <div style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:T.stone,marginBottom:10}}>{s.lb}</div>
            <div style={{...F.serif,fontSize:40,fontWeight:300,color:s.c,lineHeight:1}}>{s.val}</div>
            <div style={{...F.sans,fontSize:11,color:T.stone,marginTop:5}}>{s.sub}</div>
          </Card>
        ))}
      </Grid>
      <Grid cols="1fr 1fr" gap={14}>
        <Card>
          <div style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:T.stone,marginBottom:16}}>Top Opportunities</div>
          <Col gap={0}>
            {top3.map((t,i)=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                paddingBottom:12,marginBottom:i<2?12:0,borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                <div style={{flex:1,minWidth:0,marginRight:12}}>
                  <div style={{...F.sans,fontSize:13,color:T.lime,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{...F.mono,fontSize:9,color:T.stone,marginTop:3}}>
                    {t.municipality} · {t.closing_date?new Date(t.closing_date).toLocaleDateString("en-CA",{month:"short",day:"numeric"}):"TBD"}
                  </div>
                </div>
                <Row center gap={10}>
                  <Score score={t.ai_fit_score}/>
                  <Btn sm v="ghost" onClick={()=>{
                    setProposalPrefill({title:t.title,muni:t.municipality,
                      val:t.estimated_value_high?`$${(t.estimated_value_low||0).toLocaleString()}–$${t.estimated_value_high.toLocaleString()}`:"",
                      scope:t.scope_of_work||t.description||""});
                    go("proposal");
                  }}>→</Btn>
                </Row>
              </div>
            ))}
          </Col>
          <div style={{marginTop:14}}><Btn v="ghost" sm full onClick={()=>go("tenders")}>View All Tenders</Btn></div>
        </Card>
        <Card>
          <div style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:T.stone,marginBottom:14}}>Sources Being Monitored</div>
          {["Grey County Tenders","Biddingo Ontario","Bids & Tenders ON","MERX Ontario","Municipality of Meaford","Town of Collingwood","City of Owen Sound","The Blue Mountains","Township of Clearview","Town of Wasaga Beach","Town of Midland","Penetanguishene"].map((s,i)=>(
            <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              paddingBottom:8,marginBottom:8,borderBottom:i<11?`1px solid ${T.border}`:"none"}}>
              <span style={{...F.sans,fontSize:12,color:T.lime}}>{s}</span>
              <Row center gap={5}><LiveDot/><span style={{...F.mono,fontSize:7,color:T.sage,letterSpacing:"0.1em"}}>LIVE</span></Row>
            </div>
          ))}
        </Card>
      </Grid>
    </Col>
  );
}

// ── Live Tenders ──────────────────────────────────────────────────────────────
function Tenders({tenders,go,setProposalPrefill,setChatPrefill}) {
  const [cat,setCat]=useState("all");
  const [q,setQ]=useState("");
  const CATS=["all","excavation","landscaping","maintenance","construction","high"];
  const list=tenders
    .filter(t=>t.status==="open")
    .filter(t=>cat==="all"?true:cat==="high"?t.ai_fit_score>=80:t.category===cat)
    .filter(t=>!q||t.title.toLowerCase().includes(q.toLowerCase())||t.municipality.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=>b.ai_fit_score-a.ai_fit_score);

  function prefillProposal(t){
    setProposalPrefill({
      title:t.title,muni:t.municipality,
      val:t.estimated_value_high?`$${(t.estimated_value_low||0).toLocaleString()}–$${t.estimated_value_high.toLocaleString()}`:"",
      deadline:t.closing_date?new Date(t.closing_date).toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"})+" at 2:00 PM":"",
      scope:t.scope_of_work||t.description||"",
    });
    go("proposal");
  }
  function prefillChat(t){
    setChatPrefill(`Analyze this tender for PUREscapes and tell me: should we bid, what's our competitive position, and what's a winning price?\n\nTitle: ${t.title}\nMunicipality: ${t.municipality}\nValue: ${t.estimated_value_high?`$${(t.estimated_value_low||0).toLocaleString()}–$${t.estimated_value_high.toLocaleString()}`:""}\nScope: ${t.description||""}`);
    go("ai");
  }

  return (
    <Col gap={16}>
      <SectionTitle title="Live Tenders" sub={`${list.length} active · 100km radius of Meaford · sorted by AI fit score`}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by title or municipality..."
        style={{...inputSt,width:"100%"}}/>
      <Row wrap gap={7}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            ...F.mono,fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
            padding:"7px 12px",border:`1px solid ${cat===c?T.sage:T.border}`,
            color:cat===c?T.sage:T.stone,background:cat===c?"rgba(122,158,107,0.08)":"transparent",cursor:"pointer"}}>
            {c==="high"?"High Fit (80+)":c[0].toUpperCase()+c.slice(1)}
          </button>
        ))}
      </Row>
      <Col gap={10}>
        {list.map(t=>{
          const days=t.closing_date?Math.ceil((new Date(t.closing_date)-new Date())/86400000):null;
          const lc=t.ai_fit_score>=80?T.sage:t.ai_fit_score>=60?T.gold:"rgba(138,130,120,0.3)";
          return (
            <div key={t.id} style={{background:T.surf,borderLeft:`3px solid ${lc}`,border:`1px solid ${T.border}`,
              borderLeft:`3px solid ${lc}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,padding:"18px 22px",alignItems:"start"}}>
                <Col gap={8}>
                  <div style={{...F.serif,fontSize:20,fontWeight:400,color:T.mist}}>{t.title}</div>
                  <Row wrap gap={7}>
                    {[t.municipality,t.category,
                      t.estimated_value_high?`$${((t.estimated_value_low||0)/1000).toFixed(0)}K–$${(t.estimated_value_high/1000).toFixed(0)}K`:null,
                      t.requires_bonding?"Bonding Req.":null,
                      t.distance_km?`${t.distance_km}km away`:null,
                    ].filter(Boolean).map(tag=><Pill key={tag} label={tag}/>)}
                  </Row>
                  <p style={{...F.sans,fontSize:13,color:T.stone,lineHeight:1.6,margin:0}}>{t.description}</p>
                  {t.ai_strategy_notes&&(
                    <div style={{padding:"9px 13px",background:"rgba(122,158,107,0.05)",borderLeft:`2px solid ${T.sage}`}}>
                      <div style={{...F.mono,fontSize:7,color:T.sage,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:3}}>AI Strategy</div>
                      <div style={{...F.sans,fontSize:12,color:T.lime,lineHeight:1.5}}>{t.ai_strategy_notes}</div>
                    </div>
                  )}
                </Col>
                <Col center gap={10} style={{alignItems:"center",minWidth:110}}>
                  <Score score={t.ai_fit_score}/>
                  {t.ai_recommended_bid&&(
                    <div style={{textAlign:"center"}}>
                      <div style={{...F.mono,fontSize:7,color:T.stone,letterSpacing:"0.1em",textTransform:"uppercase"}}>Rec. Bid</div>
                      <div style={{...F.serif,fontSize:20,color:T.gold}}>${t.ai_recommended_bid.toLocaleString()}</div>
                    </div>
                  )}
                  <Btn sm onClick={()=>prefillProposal(t)}>Build Proposal</Btn>
                  <Btn sm v="ghost" onClick={()=>prefillChat(t)}>Ask AI</Btn>
                  <div style={{...F.mono,fontSize:8,color:days!==null&&days<=7?"#e07070":T.stone,
                    letterSpacing:"0.06em",textAlign:"center"}}>
                    {days!==null&&days<=7?"⚠ ":""}{t.closing_date?`Closes ${new Date(t.closing_date).toLocaleDateString("en-CA",{month:"short",day:"numeric"})} · ${days}d`:"TBD"}
                  </div>
                </Col>
              </div>
            </div>
          );
        })}
        {list.length===0&&<Card style={{textAlign:"center",padding:40}}>
          <div style={{...F.serif,fontSize:22,color:T.mist}}>No tenders match this filter.</div>
        </Card>}
      </Col>
    </Col>
  );
}

// ── AI Assistant ──────────────────────────────────────────────────────────────
const AI_SYS=`You are the AI procurement assistant for PUREscapes Ltd., a hardscaping, excavation and landscaping contractor in Meaford, Ontario.
Services: Excavation, grading, site prep, ditch maintenance, armour stone, retaining walls, interlock, landscaping, garden maintenance, snow removal.
Equipment: Excavator, Skid Steer, Tractor, Dump Truck, Tow-Behind Mower. Team: 6 people, 2 active crews.
Rate card: Labour $85/hr, Operator $105/hr, Excavator $165/hr, Tractor $95/hr, Dump Truck $115/hr, Mobilization $350 flat, 18% markup, Bonding 2.5%.
Competitors: Bray Contracting (won Grey County ditch at $88,400), Valley Green (Meaford cemetery at $31,200), BrightLawn Commercial (Collingwood grass $44,750), Granite Ridge Landscaping (Owen Sound parks), Miller Paving (Blue Mountains site work), EcoRoots Inc. (Wasaga Beach tree planting).
Region: Grey County, Simcoe County, Owen Sound, Collingwood, Blue Mountains, Clearview, Wasaga Beach, Midland, Meaford, Penetanguishene — within 100km of Meaford.
Be specific, practical, use real numbers. Reference competitor data and past awards when relevant.`;

function AIPanel({prefill,setPrefill}) {
  const [msgs,setMsgs]=useState([{r:"ai",t:"Hello! I'm your PUREscapes procurement assistant.\n\nI can help you:\n• Score and prioritize open tenders\n• Benchmark bid amounts against past regional awards\n• Draft proposal sections and cover letters\n• Calculate quotes using your rate card\n• Analyze competitor positioning\n\nWhat would you like to work on?"}]);
  const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false);
  const ref=useRef();

  useEffect(()=>{if(prefill){setInp(prefill);setPrefill("");}}, [prefill]);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[msgs,busy]);

  async function send(){
    const text=inp.trim(); if(!text||busy) return;
    setInp("");
    const next=[...msgs,{r:"user",t:text}];
    setMsgs(next); setBusy(true);
    try{
      const reply=await ai(next.map(m=>({role:m.r==="ai"?"assistant":"user",content:m.t})),AI_SYS);
      setMsgs([...next,{r:"ai",t:reply}]);
    }catch{
      setMsgs([...next,{r:"ai",t:"Connection issue — please try again."}]);
    }
    setBusy(false);
  }

  const quick=["What are my top 3 priority tenders right now?","What should I bid for the Grey County ditch maintenance?","Who are my main competitors and their typical price ranges?","Calculate a quote for 240m of armour stone shoreline work.","Draft a cover letter for the Meaford cemetery maintenance contract."];

  return (
    <Col gap={14}>
      <SectionTitle title="AI Assistant" sub="Context-aware procurement intelligence for PUREscapes."/>
      <Row wrap gap={7}>
        {quick.map(q=>(
          <button key={q} onClick={()=>setInp(q)} style={{...F.mono,fontSize:9,padding:"6px 11px",
            border:`1px solid ${T.border}`,color:T.stone,background:"transparent",cursor:"pointer",letterSpacing:"0.06em"}}>
            {q.length>44?q.slice(0,42)+"…":q}
          </button>
        ))}
      </Row>
      <div ref={ref} style={{background:T.surf2,border:`1px solid ${T.border}`,height:380,
        overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:10,flexDirection:m.r==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
            <div style={{width:26,height:26,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",
              justifyContent:"center",...F.mono,fontSize:8,fontWeight:700,
              color:m.r==="user"?T.lime:T.sage,flexShrink:0}}>
              {m.r==="user"?"You":"AI"}
            </div>
            <div style={{background:m.r==="user"?"rgba(122,158,107,0.07)":T.surf,border:`1px solid ${T.border}`,
              padding:"11px 15px",maxWidth:540,...F.sans,fontSize:13,color:T.lime,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
              {m.t}
            </div>
          </div>
        ))}
        {busy&&(
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:26,height:26,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",
              justifyContent:"center",...F.mono,fontSize:8,color:T.sage}}>AI</div>
            <div style={{background:T.surf,border:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",gap:4,alignItems:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:T.sage,
                animation:`dot 1.2s ease-in-out ${i*.2}s infinite`}}/>)}
            </div>
          </div>
        )}
      </div>
      <Row gap={10}>
        <input value={inp} onChange={e=>setInp(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Ask about a tender, request a quote, draft a proposal section..."
          style={{...inputSt,flex:1}}/>
        <Btn onClick={send} disabled={busy}>{busy?"…":"Send"}</Btn>
      </Row>
    </Col>
  );
}

// ── Proposal Builder ──────────────────────────────────────────────────────────
function Proposals({prefill,setPrefill}) {
  const [title,setTitle]=useState(""); const [muni,setMuni]=useState("");
  const [val,setVal]=useState(""); const [deadline,setDeadline]=useState("");
  const [scope,setScope]=useState(""); const [out,setOut]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(prefill){
      setTitle(prefill.title||""); setMuni(prefill.muni||"");
      setVal(prefill.val||""); setDeadline(prefill.deadline||"");
      setScope(prefill.scope||""); setOut("");
      setPrefill(null);
    }
  },[prefill]);

  async function generate(){
    if(!title){return;}
    setBusy(true); setOut("");
    const prompt=`Write a complete, formal, professional municipal bid proposal for PUREscapes Ltd.

TENDER: ${title}
ISSUING BODY: ${muni||"Municipality (not specified)"}
ESTIMATED VALUE: ${val||"Not specified"}
DEADLINE: ${deadline||"Not specified"}
SCOPE OF WORK: ${scope||"General scope — describe capabilities"}

Include these sections with clear headings:
1. Cover Letter (formal, addressed to Procurement Team)
2. Company Overview & Qualifications
3. Understanding of the Scope & Requirements
4. Proposed Methodology & Approach
5. Project Timeline (realistic, phased)
6. Pricing Summary (structured line items using rate card: Labour $85/hr, Operator $105/hr, Excavator $165/hr, Tractor $95/hr, Dump Truck $115/hr, Mobilization $350 flat, 18% markup — show itemized estimate)
7. Health & Safety Statement
8. Closing & Contact

Be specific to this scope. Show local knowledge of Grey/Simcoe region. Make PUREscapes sound like the clear choice.`;

    try{
      const r=await ai([{role:"user",content:prompt}],
        "You are a professional bid writer specializing in Ontario municipal procurement for small trade contractors. Write formal, compelling, specific proposals that win contracts. Use clear section headers.");
      setOut(r);
    }catch{ setOut("Connection issue — please try again."); }
    setBusy(false);
  }

  return (
    <Col gap={18}>
      <SectionTitle title="Proposal Builder" sub="AI-written bid proposals based on your rate card and regional knowledge."/>
      <Grid cols="1fr 1fr" gap={12}>
        <Field label="Tender / Project Name" value={title} onChange={setTitle} placeholder="e.g. Grey County Ditch Maintenance 2025"/>
        <Field label="Issuing Municipality" value={muni} onChange={setMuni} placeholder="e.g. The Corporation of Grey County"/>
        <Field label="Estimated Value" value={val} onChange={setVal} placeholder="e.g. $80,000–$95,000"/>
        <Field label="Submission Deadline" value={deadline} onChange={setDeadline} placeholder="e.g. July 15, 2025 at 2:00 PM"/>
      </Grid>
      <Field label="Scope of Work" value={scope} onChange={setScope} placeholder="Paste the tender scope or describe the work required..." rows={4}/>
      <Row gap={10}>
        <Btn onClick={generate} disabled={busy||!title}>{busy?"Generating…":"✦ Generate Full Proposal"}</Btn>
        {out&&<Btn v="ghost" onClick={()=>{try{navigator.clipboard.writeText(out)}catch{}}}>Copy Text</Btn>}
      </Row>
      {busy&&(
        <Card style={{textAlign:"center",padding:36}}>
          <div style={{...F.mono,fontSize:11,color:T.sage,letterSpacing:"0.15em"}}>GENERATING PROPOSAL…</div>
          <div style={{...F.sans,fontSize:12,color:T.stone,marginTop:8}}>Writing your bid based on the scope and your rate card.</div>
        </Card>
      )}
      {out&&!busy&&(
        <div style={{background:T.surf2,border:`1px solid ${T.border}`,padding:28,...F.sans,fontSize:13,
          color:T.lime,lineHeight:1.85,whiteSpace:"pre-wrap",maxHeight:560,overflowY:"auto"}}>
          {out}
        </div>
      )}
    </Col>
  );
}

// ── Past Winners ──────────────────────────────────────────────────────────────
function Winners({awards}) {
  const [q,setQ]=useState("");
  const rows=awards.filter(a=>!q||JSON.stringify(a).toLowerCase().includes(q.toLowerCase()));
  const TH=({children})=><th style={{...F.mono,fontSize:7,fontWeight:700,letterSpacing:"0.14em",
    textTransform:"uppercase",color:T.stone,padding:"11px 14px",textAlign:"left",
    borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",background:T.surf2}}>{children}</th>;
  const TD=({children,c,serif:s})=><td style={{...s?F.serif:F.sans,fontSize:s?18:12,color:c||T.lime,
    padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>{children}</td>;
  return (
    <Col gap={16}>
      <SectionTitle title="Past Winners" sub="Awarded contracts in your region — competitor intelligence database."/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by project, winner, municipality..."
        style={{...inputSt,width:"100%"}}/>
      <Card style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Project</TH><TH>Municipality</TH><TH>Winner</TH><TH>Award</TH><TH>Category</TH><TH>Date</TH><TH>Bidders</TH></tr></thead>
          <tbody>
            {rows.map(a=>(
              <tr key={a.id} onMouseEnter={e=>e.currentTarget.style.background="rgba(122,158,107,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <TD>{a.tender_title}</TD>
                <TD c={T.stone}>{a.municipality}</TD>
                <TD c={T.sage}>{a.winner_name}</TD>
                <TD c={T.gold} serif>{a.award_amount?`$${a.award_amount.toLocaleString()}`:"—"}</TD>
                <TD c={T.stone}>{a.category}</TD>
                <TD c={T.stone}>{a.awarded_date?new Date(a.awarded_date).toLocaleDateString("en-CA",{year:"numeric",month:"short"}):"—"}</TD>
                <TD c={T.stone}>{a.num_bidders??"—"}</TD>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={7} style={{...F.sans,color:T.stone,textAlign:"center",padding:32}}>No records found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </Col>
  );
}

// ── Our Bids ──────────────────────────────────────────────────────────────────
function Bids({bids,tenders,reload}) {
  const [show,setShow]=useState(false);
  const [tId,setTId]=useState(""); const [amt,setAmt]=useState(""); const [notes,setNotes]=useState(""); const [status,setStatus]=useState("submitted");
  const [saving,setSaving]=useState(false);

  async function save(){
    if(!amt) return;
    setSaving(true);
    try{
      await db("/bids",{method:"POST",body:JSON.stringify({
        tender_id:tId||null,
        bid_amount:parseFloat(amt.replace(/[$,]/g,"")),
        status,outcome_notes:notes,
      })});
      setShow(false); setTId(""); setAmt(""); setNotes(""); setStatus("submitted");
      reload();
    }catch(e){alert("Save error: "+e.message);}
    setSaving(false);
  }

  const sc={won:T.sage,lost:"#e07070",submitted:T.gold,draft:T.stone,withdrawn:T.stone};

  return (
    <Col gap={16}>
      <SectionTitle title="Our Bids" sub="Track all submitted bids, outcomes, and win/loss history."
        action={<Btn sm onClick={()=>setShow(!show)}>+ Record Bid</Btn>}/>
      {show&&(
        <Card>
          <div style={{...F.mono,fontSize:9,color:T.sage,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:16}}>Record a Bid</div>
          <Grid cols="1fr 1fr" gap={12}>
            <Field label="Tender">
              <select value={tId} onChange={e=>setTId(e.target.value)} style={{...inputSt,cursor:"pointer"}}>
                <option value="">Select tender…</option>
                {tenders.map(t=><option key={t.id} value={t.id}>{t.title.slice(0,55)} — {t.municipality}</option>)}
              </select>
            </Field>
            <Field label="Bid Amount" value={amt} onChange={setAmt} placeholder="$85,500"/>
            <Field label="Status">
              <select value={status} onChange={e=>setStatus(e.target.value)} style={{...inputSt,cursor:"pointer"}}>
                {["draft","submitted","won","lost","withdrawn"].map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Notes / Outcome" value={notes} onChange={setNotes} placeholder="Strategy, outcome, lessons learned..."/>
          </Grid>
          <Row gap={10}>
            <Btn onClick={save} disabled={saving||!amt}>{saving?"Saving…":"Save Bid"}</Btn>
            <Btn v="ghost" onClick={()=>setShow(false)}>Cancel</Btn>
          </Row>
        </Card>
      )}
      {bids.length===0&&!show&&(
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{...F.serif,fontSize:22,color:T.mist,marginBottom:8}}>No bids recorded yet.</div>
          <div style={{...F.sans,fontSize:13,color:T.stone}}>Click "Record Bid" to start tracking your submissions and outcomes.</div>
        </Card>
      )}
      {bids.map(b=>{
        const tender=tenders.find(t=>t.id===b.tender_id);
        return (
          <Card key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,padding:"18px 22px"}}>
            <div>
              <div style={{...F.serif,fontSize:18,color:T.mist,marginBottom:4}}>{tender?.title||"Unnamed Tender"}</div>
              <div style={{...F.sans,fontSize:12,color:T.stone}}>
                {tender?.municipality&&<span>{tender.municipality} · </span>}
                {new Date(b.created_at).toLocaleDateString("en-CA")}
                {b.outcome_notes&&<span> · {b.outcome_notes}</span>}
              </div>
            </div>
            <Row center gap={16}>
              <div style={{...F.serif,fontSize:28,color:T.gold}}>${b.bid_amount.toLocaleString()}</div>
              <span style={{...F.mono,fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",
                padding:"4px 10px",border:`1px solid ${(sc[b.status]||T.stone)}40`,color:sc[b.status]||T.stone}}>
                {b.status}
              </span>
            </Row>
          </Card>
        );
      })}
    </Col>
  );
}

// ── Sources ───────────────────────────────────────────────────────────────────
function Sources({sources}) {
  return (
    <Col gap={16}>
      <SectionTitle title="Data Sources" sub="All procurement portals being monitored — scanned every 4 hours."/>
      <Grid cols="1fr 1fr" gap={12}>
        {sources.map(s=>(
          <Card key={s.id} style={{padding:"16px 20px"}}>
            <Row between center style={{marginBottom:6}}>
              <div style={{...F.sans,fontSize:13,color:T.lime}}>{s.name}</div>
              <Row center gap={5}><LiveDot active={s.active}/><span style={{...F.mono,fontSize:7,color:s.active?T.sage:T.stone,letterSpacing:"0.1em"}}>{s.active?"LIVE":"PAUSED"}</span></Row>
            </Row>
            <div style={{...F.mono,fontSize:9,color:T.stone}}>{s.region} · {s.type} · every {s.scrape_interval_hours}h</div>
            {s.url&&<div style={{...F.sans,fontSize:11,color:T.stone,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.url}</div>}
          </Card>
        ))}
        {sources.length===0&&<div style={{...F.sans,color:T.stone,padding:32}}>Loading sources…</div>}
      </Grid>
    </Col>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings({settings,reload}) {
  const rc=settings?.rate_card||{};
  const bp=settings?.bid_preferences||{};
  const [labour,setLabour]=useState(String(rc.labour_per_hour||85));
  const [excavator,setExcavator]=useState(String(rc.excavator_per_hour||165));
  const [tractor,setTractor]=useState(String(rc.tractor_per_hour||95));
  const [mob,setMob]=useState(String(rc.mobilization_flat||350));
  const [markup,setMarkup]=useState(String(rc.markup_percent||18));
  const [minFit,setMinFit]=useState(String(bp.min_fit_score||40));
  const [saving,setSaving]=useState(false);

  async function save(){
    setSaving(true);
    try{
      await db("/company_settings?key=eq.rate_card",{method:"PATCH",body:JSON.stringify({value:{...rc,labour_per_hour:+labour,excavator_per_hour:+excavator,tractor_per_hour:+tractor,mobilization_flat:+mob,markup_percent:+markup},updated_at:new Date().toISOString()})});
      await db("/company_settings?key=eq.bid_preferences",{method:"PATCH",body:JSON.stringify({value:{...bp,min_fit_score:+minFit},updated_at:new Date().toISOString()})});
      reload(); alert("Settings saved!");
    }catch(e){alert("Error: "+e.message);}
    setSaving(false);
  }

  return (
    <Col gap={24}>
      <SectionTitle title="Settings" sub="Rate card and AI preferences used for quote generation and scoring."/>
      <Grid cols="1fr 1fr" gap={28}>
        <Col gap={4}>
          <div style={{...F.mono,fontSize:9,color:T.sage,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Rate Card</div>
          <Field label="Labour / hour" value={labour} onChange={setLabour} placeholder="85"/>
          <Field label="Excavator / hour" value={excavator} onChange={setExcavator} placeholder="165"/>
          <Field label="Tractor / hour" value={tractor} onChange={setTractor} placeholder="95"/>
          <Field label="Mobilization (flat)" value={mob} onChange={setMob} placeholder="350"/>
          <Field label="Markup %" value={markup} onChange={setMarkup} placeholder="18"/>
          <Field label="Min AI Fit Score to Show" value={minFit} onChange={setMinFit} placeholder="40"/>
          <Btn onClick={save} disabled={saving}>{saving?"Saving…":"Save Settings"}</Btn>
        </Col>
        <Col gap={4}>
          <div style={{...F.mono,fontSize:9,color:T.sage,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Company Profile</div>
          {[["Name","PUREscapes Ltd."],["Phone","226-245-0573"],["Email","info@werepure.ca"],["Address","Unit B, 71 Edwin St E, Meaford ON"],["Region","Grey & Simcoe Counties"],["Radius","100km from Meaford"],["Crew","6 people · 2 active crews"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{...F.mono,fontSize:10,color:T.stone,letterSpacing:"0.1em"}}>{k}</span>
              <span style={{...F.sans,fontSize:13,color:T.lime}}>{v}</span>
            </div>
          ))}
        </Col>
      </Grid>
    </Col>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,setAuthed]=useState(false);
  const [panel,setPanel]=useState("overview");
  const [tenders,setTenders]=useState(SEED_TENDERS);
  const [awards,setAwards]=useState(SEED_AWARDS);
  const [bids,setBids]=useState([]);
  const [sources,setSources]=useState(SEED_SOURCES);
  const [settings,setSettings]=useState({rate_card:{labour_per_hour:85,operator_per_hour:105,excavator_per_hour:165,tractor_per_hour:95,dump_truck_per_hour:115,mobilization_flat:350,markup_percent:18},bid_preferences:{min_fit_score:40,max_crew_concurrent:2}});
  const [proposalPrefill,setProposalPrefill]=useState(null);
  const [chatPrefill,setChatPrefill]=useState("");

  async function load(){
    try{
      const [t,a,b,s,cfg]=await Promise.all([
        db("/tenders?order=ai_fit_score.desc"),
        db("/award_results?order=awarded_date.desc"),
        db("/bids?order=created_at.desc"),
        db("/procurement_sources?order=name"),
        db("/company_settings"),
      ]);
      setTenders(Array.isArray(t)?t:[]);
      setAwards(Array.isArray(a)?a:[]);
      setBids(Array.isArray(b)?b:[]);
      setSources(Array.isArray(s)?s:[]);
      const m={}; (Array.isArray(cfg)?cfg:[]).forEach(c=>{m[c.key]=c.value;});
      setSettings(m);
    }catch(e){console.error("Load error",e);}
  }

  useEffect(()=>{if(authed)load();},[authed]);

  if(!authed) return <Login onLogin={()=>setAuthed(true)}/>;

  const props={tenders,awards,bids,sources,settings,
    go:setPanel,reload:load,
    setProposalPrefill,setChatPrefill};

  const panels={
    overview:<Overview {...props}/>,
    tenders:<Tenders {...props}/>,
    ai:<AIPanel prefill={chatPrefill} setPrefill={setChatPrefill}/>,
    proposal:<Proposals prefill={proposalPrefill} setPrefill={setProposalPrefill}/>,
    winners:<Winners {...props}/>,
    bids:<Bids {...props}/>,
    sources:<Sources {...props}/>,
    settings:<Settings {...props}/>,
  };

  return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400&family=Space+Grotesk:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,textarea,select{font-family:'DM Sans',sans-serif;}
        input::placeholder,textarea::placeholder{color:${T.stone};}
        select option{background:${T.surf};}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(122,158,107,0.2);}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes dot{0%,60%,100%{opacity:.2}30%{opacity:1}}
      `}</style>
      <Sidebar active={panel} go={setPanel} logout={()=>setAuthed(false)}/>
      <main style={{marginLeft:210,flex:1,padding:"36px 44px",minWidth:0,overflowX:"hidden"}}>
        {panels[panel]||panels.overview}
      </main>
    </div>
  );
}
