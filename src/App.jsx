import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2000;

/* helpers */
const f$ = (n,d=2)=>(n??0).toFixed(d);
const pct = n=>`${((n??0)*100).toFixed(1)}%`;
const usd = n=>{const v=n??0;return`${v>=0?"+":""}$${v.toFixed(2)}`;};
const ago = ts=>{if(!ts)return"—";const s=Math.floor(Date.now()/1000-ts);return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;};
const uptime=s=>{if(!s)return"0s";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${m}m`:`${m}m`;};
const IC={nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈"};
const SK=new Set("epl,liga,seriea,bundes,ligue1,mls,ligamx,ucl,uel,champ,jleag,j2,aleag,braA,braB,kleag,china,turk,norw,denm,erediv,colom,egypt,libert,sudam,saudi,liga2,lig2fr,bund2,serieb,porto,scotpr,uecl".split(","));
const si=s=>IC[s]||(SK.has(s)?"⚽":"•");
const ENGS={harvest:{l:"HARVEST",i:"🌾",c:"#f59e0b",g:"rgba(245,158,11,0.08)"},edge:{l:"EDGE FINDER",i:"⚡",c:"#a78bfa",g:"rgba(167,139,250,0.08)"},arber:{l:"POLY ARBER",i:"🔄",c:"#22d3ee",g:"rgba(34,211,238,0.08)"}};
const RC={WIN:"#10b981",LOSS:"#ef4444",EXIT_PROFIT:"#10b981",EXIT_LOSS:"#ef4444",PUSH:"#555"};

/* ── Sparkline ── */
function Spark({curve,base,w=200,h=48}){
  if(!curve?.length)return null;
  const d=[{equity:base},...curve],v=d.map(p=>p.equity);
  const lo=Math.min(...v)*0.998,hi=Math.max(...v)*1.002;
  const pts=d.map((p,i)=>({x:(i/(d.length-1))*w,y:4+(1-(p.equity-lo)/(hi-lo||1))*(h-8)}));
  const last=pts[pts.length-1],up=v[v.length-1]>=base,col=up?"#10b981":"#ef4444";
  return<svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h}}>
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity=".15"/><stop offset="100%" stopColor={col} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`0,${h} ${pts.map(p=>`${p.x},${p.y}`).join(" ")} ${w},${h}`} fill="url(#sg)"/>
    <polyline fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" points={pts.map(p=>`${p.x},${p.y}`).join(" ")}/>
    <circle cx={last.x} cy={last.y} r="3" fill={col}><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle>
  </svg>;
}

/* ── Allocation Ring ── */
function Ring({harvest=0,edge=0,arber=0,free=0}){
  const total=harvest+edge+arber+free||1;
  const segs=[{v:harvest,c:"#f59e0b"},{v:edge,c:"#a78bfa"},{v:arber,c:"#22d3ee"},{v:free,c:"#1a1a1a"}];
  let off=0;const r=36,cx=44,cy=44,sw=7;
  const circ=2*Math.PI*r;
  return<svg viewBox="0 0 88 88" style={{width:88,height:88}}>
    {segs.map((s,i)=>{const pctV=s.v/total;const dash=pctV*circ;const gap=circ-dash;const o=off;off+=pctV;
      return<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={sw} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-o*circ} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"all 0.5s ease"}}/>;
    })}
    <text x={cx} y={cy-2} textAnchor="middle" fill="#fff" fontSize="13" fontFamily="'JetBrains Mono',monospace" fontWeight="700">{Math.round((1-free/total)*100)}%</text>
    <text x={cx} y={cy+11} textAnchor="middle" fill="#444" fontSize="8" fontFamily="'Instrument Sans',sans-serif" letterSpacing="0.08em">DEPLOYED</text>
  </svg>;
}

/* ── Metric Card ── */
function Metric({label,value,color,glow}){
  return<div style={{background:"#0a0a0a",border:"1px solid #151515",borderRadius:10,padding:"12px 14px",flex:1,minWidth:0,boxShadow:glow?`0 0 20px ${glow}`:"none",transition:"box-shadow 0.3s"}}>
    <div style={{fontSize:8,color:"#444",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4,fontFamily:"'Instrument Sans',sans-serif"}}>{label}</div>
    <div style={{fontSize:16,fontWeight:700,color:color||"#fff",fontFamily:"'JetBrains Mono',monospace"}}>{value}</div>
  </div>;
}

/* ── Engine Card ── */
function EngineCard({id,stats,count}){
  const e=ENGS[id],s=stats||{},has=(s.total_trades||0)>0;
  return<div style={{background:e.g,border:`1px solid ${e.c}22`,borderRadius:10,padding:"12px 14px",flex:1,minWidth:0,position:"relative",overflow:"hidden"}}>
    {count>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${e.c},transparent)`,animation:"scanline 2s ease-in-out infinite"}}/>}
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
      <span style={{fontSize:14}}>{e.i}</span>
      <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:e.c,fontFamily:"'Instrument Sans',sans-serif"}}>{e.l}</span>
      {count>0&&<span style={{marginLeft:"auto",background:e.c+"33",color:e.c,fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:8}}>{count}</span>}
    </div>
    {has?<div style={{display:"flex",gap:10,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>
      <span style={{color:(s.total_pnl||0)>=0?"#10b981":"#ef4444",fontWeight:600}}>{usd(s.total_pnl)}</span>
      <span style={{color:"#555"}}>{s.wins}W/{s.losses}L</span>
      <span style={{color:"#555"}}>{pct(s.win_rate)}</span>
    </div>:<div style={{fontSize:10,color:"#333",fontFamily:"'JetBrains Mono',monospace"}}>Scanning…</div>}
  </div>;
}

/* ── Terminal Feed ── */
function Terminal({logs}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[logs]);
  return<div style={{background:"#050505",border:"1px solid #151515",borderRadius:10,overflow:"hidden"}}>
    <div style={{padding:"8px 12px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:6}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444"}}/>
      <span style={{width:6,height:6,borderRadius:"50%",background:"#f59e0b"}}/>
      <span style={{width:6,height:6,borderRadius:"50%",background:"#10b981"}}/>
      <span style={{fontSize:9,color:"#333",marginLeft:8,fontFamily:"'Instrument Sans',sans-serif",letterSpacing:"0.08em"}}>ACTIVITY</span>
    </div>
    <div ref={ref} style={{padding:"8px 12px",maxHeight:180,overflowY:"auto",scrollbarWidth:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
      {(!logs||!logs.length)?<div style={{color:"#1a1a1a",padding:"20px 0",textAlign:"center",fontSize:10}}>Waiting for scan data…</div>:
      logs.map((l,i)=>{const ec=l.engine?ENGS[l.engine]?.c:"#333";const hot=l.level==="signal"||l.level==="trade";
        return<div key={i} style={{padding:"3px 0",display:"flex",gap:8,animation:i===logs.length-1?"fadeSlide 0.3s ease":"none"}}>
          <span style={{color:"#222",fontSize:9,width:24,flexShrink:0,textAlign:"right"}}>{ago(l.t)}</span>
          <span style={{color:hot?ec:"#444"}}>{l.msg}</span>
        </div>;})}
    </div>
  </div>;
}

/* ── Edge Scanner Table ── */
function EdgeTable({edges}){
  if(!edges?.length)return<div style={{padding:20,textAlign:"center",color:"#1a1a1a",fontSize:10}}>No edges detected — next scan ~2min</div>;
  return<div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
      <thead><tr style={{borderBottom:"1px solid #1a1a1a"}}>
        {["","Team","Poly","True","Edge","Provider"].map(h=><th key={h} style={{padding:"6px 4px",textAlign:"left",color:"#333",fontSize:8,fontWeight:400,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Instrument Sans',sans-serif"}}>{h}</th>)}
      </tr></thead>
      <tbody>{edges.slice(0,8).map((e,i)=>{
        const ec=e.edge>=0.10?"#10b981":e.edge>=0.07?"#a78bfa":"#555";
        return<tr key={i} style={{borderBottom:"1px solid #0a0a0a"}}>
          <td style={{padding:"6px 4px",fontSize:13}}>{si(e.sport)}</td>
          <td style={{padding:"6px 4px",color:"#fff",fontWeight:600,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.team}</td>
          <td style={{padding:"6px 4px",color:"#555"}}>{f$(e.poly,2)}</td>
          <td style={{padding:"6px 4px",color:"#888"}}>{f$(e.true,2)}</td>
          <td style={{padding:"6px 4px",color:ec,fontWeight:700}}>{pct(e.edge)}</td>
          <td style={{padding:"6px 4px",color:"#333",fontSize:9}}>{e.provider}</td>
        </tr>;})}
      </tbody>
    </table>
  </div>;
}

/* ── Position Row ── */
function PosRow({p}){
  const [open,setOpen]=useState(false);const e=ENGS[p.engine]||{c:"#555",l:"?"};
  return<div onClick={()=>setOpen(!open)} style={{padding:"10px 0",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace"}}>
      <span style={{color:e.c,fontSize:8,fontWeight:700,letterSpacing:"0.08em",width:26}}>{e.l?.split(" ")[0]?.slice(0,3)}</span>
      <span style={{fontSize:12}}>{si(p.sport)}</span>
      <span style={{color:"#fff",fontWeight:600,fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.team||p.side}</span>
      <span style={{color:"#555",fontSize:10}}>${f$(p.cost)}</span>
      <span style={{width:6,height:6,borderRadius:"50%",background:e.c,animation:"pulse 2s infinite"}}/>
    </div>
    {open&&<div style={{marginTop:6,paddingLeft:32,fontSize:10,color:"#444",display:"flex",flexDirection:"column",gap:2,fontFamily:"'JetBrains Mono',monospace"}}>
      <span style={{color:"#555"}}>{p.market}</span>
      <span>@ {f$(p.entry_price,3)} × {Math.round(p.size)} shares</span>
      {p.edge>0&&<span style={{color:"#a78bfa"}}>Edge {pct(p.edge)}{p.true_prob>0?` · True ${pct(p.true_prob)}`:""}</span>}
      {p.score_line&&<span style={{color:"#f59e0b"}}>{p.score_line}</span>}
    </div>}
  </div>;
}

/* ── Trade Row ── */
function TradeRow({t}){
  const [open,setOpen]=useState(false);const e=ENGS[t.engine]||{c:"#555",l:"?"};
  return<div onClick={()=>setOpen(!open)} style={{padding:"10px 0",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace"}}>
      <span style={{color:e.c,fontSize:8,fontWeight:700,letterSpacing:"0.08em",width:26}}>{e.l?.split(" ")[0]?.slice(0,3)}</span>
      <span style={{fontSize:12}}>{si(t.sport)}</span>
      <span style={{color:"#fff",fontWeight:600,fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team||t.side}</span>
      <span style={{color:RC[t.result]||"#555",fontSize:11,fontWeight:700}}>{usd(t.pnl)}</span>
    </div>
    {open&&<div style={{marginTop:6,paddingLeft:32,fontSize:10,color:"#444",display:"flex",flexDirection:"column",gap:2,fontFamily:"'JetBrains Mono',monospace"}}>
      <span>{t.market}</span>
      <span>Entry {f$(t.entry_price,3)} · ${f$(t.cost)} → ${f$(t.payout)}</span>
      {t.exit_reason&&<span style={{color:"#a78bfa"}}>Exit: {t.exit_reason.replace(/_/g," ")}</span>}
    </div>}
  </div>;
}

/* ── Section ── */
function Sec({title,right,children,mt=24}){
  return<div style={{marginTop:mt}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,padding:"0 2px"}}>
      <span style={{fontSize:9,color:"#444",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'Instrument Sans',sans-serif",fontWeight:600}}>{title}</span>
      {right&&<span style={{fontSize:9,color:"#333",fontFamily:"'JetBrains Mono',monospace"}}>{right}</span>}
    </div>
    {children}
  </div>;
}

/* ══════════════════ MAIN APP ══════════════════ */
export default function App(){
  const[s,setS]=useState(null);
  const[ok,setOk]=useState(false);
  const[tab,setTab]=useState("open");
  const poll=useCallback(async()=>{try{const r=await fetch(`${API}/api/state`);if(!r.ok)throw 0;setS(await r.json());setOk(true);}catch{setOk(false);}},[]);
  useEffect(()=>{poll();const i=setInterval(poll,POLL);return()=>clearInterval(i);},[poll]);

  if(!s)return<div style={S.root}><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100dvh",gap:16}}>
    <div style={S.spin}/><span style={{color:"#333",fontSize:11,fontFamily:FH}}>Connecting to Signal Harvest…</span>
  </div></div>;

  const pos=s.open_positions||[],trades=s.trade_history||[],logs=s.scan_log||[],edges=s.edges_found||[],games=s.live_games||[];
  const pnlC=(s.total_pnl||0)>=0?"#10b981":"#ef4444";
  const freeCapital=Math.max(s.equity,0);
  const totalStats=s.overall_stats||{};

  return<div style={S.root}>
    {/* COMMAND BAR */}
    <header style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{color:"#10b981",fontSize:18,fontWeight:800}}>◈</span>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.18em",color:"#fff",fontFamily:FH}}>SIGNAL</span>
        <span style={{fontSize:7,padding:"2px 7px",border:`1px solid ${s.paper_mode?"#f59e0b44":"#10b98144"}`,color:s.paper_mode?"#f59e0b":"#10b981",borderRadius:3,letterSpacing:"0.1em",fontFamily:FD}}>{s.paper_mode?"PAPER":"LIVE"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:ok?"#10b981":"#ef4444",boxShadow:ok?"0 0 8px #10b98166":"0 0 8px #ef444466",animation:"pulse 2s infinite"}}/>
        <span style={{color:"#444",fontSize:10,fontFamily:FD}}>{uptime(s.uptime)}</span>
      </div>
    </header>

    <main style={S.main}>
      {/* HERO — Equity */}
      <div style={{textAlign:"center",padding:"36px 0 12px",position:"relative"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{fontSize:9,color:"#555",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:FH,fontWeight:600,marginBottom:6}}>Total Equity</div>
        <div style={{fontSize:48,fontWeight:700,color:"#fff",fontFamily:FD,letterSpacing:"-0.03em",textShadow:"0 0 40px rgba(16,185,129,0.15)"}}>${f$(s.equity)}</div>
        <div style={{fontSize:16,color:pnlC,fontWeight:600,fontFamily:FD,marginTop:2}}>{usd(s.total_pnl)}</div>
      </div>

      {/* SPARKLINE */}
      <Spark curve={s.equity_curve} base={s.starting_bankroll}/>

      {/* METRICS ROW */}
      <div style={{display:"flex",gap:8,marginTop:20}}>
        <Metric label="Trades" value={totalStats.total_trades||0}/>
        <Metric label="Win Rate" value={pct(totalStats.win_rate)} color={(totalStats.win_rate||0)>0.5?"#10b981":"#fff"}/>
        <Metric label="Deployed" value={`$${f$(s.open_cost)}`} color="#f59e0b" glow={s.open_cost>0?"rgba(245,158,11,0.05)":undefined}/>
        <Metric label="Scans" value={s.scan_count||0}/>
      </div>

      {/* LIVE GAMES */}
      {games.length>0&&<div style={S.ticker}>
        <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",animation:"pulse 1.5s infinite",flexShrink:0}}/>
        <span style={{color:"#ef4444",fontSize:8,fontWeight:700,letterSpacing:"0.1em",fontFamily:FH,flexShrink:0}}>LIVE</span>
        <div style={{display:"flex",gap:14,overflowX:"auto",scrollbarWidth:"none"}}>
          {games.map((g,i)=><span key={i} style={{whiteSpace:"nowrap",color:"#888",fontSize:11,fontFamily:FD}}>{si(g.sport)} {g.away} @ {g.home} <span style={{color:"#333"}}>{g.detail}</span></span>)}
        </div>
      </div>}

      {/* ENGINES + ALLOCATION */}
      <Sec title="Engines" right={`${pos.length} positions open`}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
            <EngineCard id="harvest" stats={s.harvest_stats} count={pos.filter(p=>p.engine==="harvest").length}/>
            <EngineCard id="edge" stats={s.edge_stats} count={pos.filter(p=>p.engine==="edge").length}/>
            <EngineCard id="arber" stats={s.arber_stats} count={pos.filter(p=>p.engine==="arber").length}/>
          </div>
          <Ring
            harvest={pos.filter(p=>p.engine==="harvest").reduce((a,p)=>a+p.cost,0)}
            edge={pos.filter(p=>p.engine==="edge").reduce((a,p)=>a+p.cost,0)}
            arber={pos.filter(p=>p.engine==="arber").reduce((a,p)=>a+p.cost,0)}
            free={freeCapital}
          />
        </div>
      </Sec>

      {/* TERMINAL */}
      <Sec title="Activity" right={logs.length?`${logs.length} events`:""}>
        <Terminal logs={logs}/>
      </Sec>

      {/* EDGE SCANNER */}
      <Sec title="Edge Scanner" right={edges.length?`${edges.length} detected`:""}>
        <div style={{background:"#050505",border:"1px solid #151515",borderRadius:10,padding:"4px 10px"}}>
          <EdgeTable edges={edges}/>
        </div>
      </Sec>

      {/* POSITIONS + HISTORY */}
      <Sec title="Book">
        <div style={{background:"#050505",border:"1px solid #151515",borderRadius:10,overflow:"hidden"}}>
          <div style={{display:"flex",borderBottom:"1px solid #111"}}>
            {[["open",`Open ${pos.length}`],["history",`History ${trades.length}`]].map(([k,label])=>
              <button key={k} onClick={()=>setTab(k)} style={tab===k?S.tabOn:S.tabOff}>{label}</button>
            )}
          </div>
          <div style={{padding:"4px 12px",minHeight:80}}>
            {tab==="open"&&(pos.length?pos.map(p=><PosRow key={p.id} p={p}/>):<div style={S.nil}>No open positions</div>)}
            {tab==="history"&&(trades.length?trades.map(t=><TradeRow key={t.id} t={t}/>):<div style={S.nil}>No resolved trades</div>)}
          </div>
        </div>
      </Sec>

      {/* FOOTER */}
      <div style={S.foot}>
        <span>H {ago(s.last_harvest_scan)} · E {ago(s.last_edge_scan)} · A {ago(s.last_arber_scan)}</span>
      </div>
    </main>
  </div>;
}

const FH="'Instrument Sans','Inter',sans-serif";
const FD="'JetBrains Mono','Fira Code',monospace";

const S={
  root:{minHeight:"100dvh",background:"#000",color:"#e5e5e5",fontFamily:FD,WebkitFontSmoothing:"antialiased",backgroundImage:"radial-gradient(#111 1px,transparent 1px)",backgroundSize:"20px 20px"},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid #0a0a0a",backdropFilter:"blur(8px)",background:"rgba(0,0,0,0.8)",position:"sticky",top:0,zIndex:10},
  main:{maxWidth:480,margin:"0 auto",padding:"0 16px 60px"},
  ticker:{display:"flex",alignItems:"center",gap:10,padding:"14px 0",borderTop:"1px solid #0a0a0a",marginTop:16,overflow:"hidden"},
  tabOff:{flex:1,background:"none",border:"none",color:"#333",fontFamily:FD,fontSize:10,padding:"10px 0",cursor:"pointer",textAlign:"center"},
  tabOn:{flex:1,background:"none",border:"none",color:"#fff",fontFamily:FD,fontSize:10,padding:"10px 0",cursor:"pointer",textAlign:"center",borderBottom:"2px solid #10b981"},
  nil:{padding:28,textAlign:"center",color:"#1a1a1a",fontSize:10},
  foot:{marginTop:40,textAlign:"center",fontSize:9,color:"#222",fontFamily:FD},
  spin:{width:16,height:16,border:"2px solid #151515",borderTopColor:"#10b981",borderRadius:"50%",animation:"spin .6s linear infinite"},
};

if(typeof document!=="undefined"){const el=document.createElement("style");el.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes scanline{0%,100%{transform:translateX(-100%)}50%{transform:translateX(100%)}}
*{margin:0;padding:0;box-sizing:border-box}
html{font-size:16px;-webkit-text-size-adjust:100%}
body{background:#000;overflow-x:hidden}
::-webkit-scrollbar{width:0;height:0}
button:active{opacity:.7}
button{-webkit-tap-highlight-color:transparent}
`;document.head.appendChild(el);}
