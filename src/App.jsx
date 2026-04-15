import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2500;

/* ── helpers ── */
const f$ = (n,d=2) => (n??0).toFixed(d);
const pct = n => `${((n??0)*100).toFixed(1)}%`;
const usd = n => {const v=n??0; return `${v>=0?"+":""}$${v.toFixed(2)}`;};
const ago = ts => {if(!ts)return"—";const s=Math.floor(Date.now()/1000-ts);return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;};
const uptime = s => {if(!s)return"0s";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${m}m`:`${m}m`;};
const clock = ts => ts?new Date(ts*1000).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";

const ICONS = {
  nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",
  epl:"⚽",liga:"⚽",seriea:"⚽",bundes:"⚽",ligue1:"⚽",mls:"⚽",ligamx:"⚽",
  ucl:"⚽",uel:"⚽",champ:"⚽",jleag:"⚽",j2:"⚽",aleag:"⚽",braA:"⚽",braB:"⚽",
  kleag:"⚽",china:"⚽",turk:"⚽",norw:"⚽",denm:"⚽",erediv:"⚽",colom:"⚽",
  egypt:"⚽",libert:"⚽",sudam:"⚽",saudi:"⚽",
};

const ENG = {harvest:{label:"HARVEST",icon:"🌾",color:"#f59e0b",desc:"Blowout detection"},edge:{label:"EDGE",icon:"⚡",color:"#8b5cf6",desc:"Pre-game convergence"},arber:{label:"ARBER",icon:"🔄",color:"#06b6d4",desc:"Internal arbitrage"}};
const RES_CLR = {WIN:"#10b981",LOSS:"#ef4444",EXIT_PROFIT:"#10b981",EXIT_LOSS:"#ef4444",PUSH:"#666"};

/* ── equity chart ── */
function Chart({curve,base}) {
  if(!curve?.length) return null;
  const d=[{equity:base},...curve], v=d.map(p=>p.equity);
  const lo=Math.min(...v)-2, hi=Math.max(...v)+2, W=600, H=120, P=8;
  const pts=d.map((p,i)=>({x:P+(i/(d.length-1))*(W-P*2), y:P+(1-(p.equity-lo)/(hi-lo))*(H-P*2)}));
  const last=pts[pts.length-1], up=v[v.length-1]>=base, col=up?"#10b981":"#ef4444";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",marginTop:16}}>
      <defs><linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={col} stopOpacity="0.15"/><stop offset="100%" stopColor={col} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`${pts[0].x},${H} ${pts.map(p=>`${p.x},${p.y}`).join(" ")} ${last.x},${H}`} fill="url(#gfill)"/>
      <polyline fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.map(p=>`${p.x},${p.y}`).join(" ")}/>
      <circle cx={last.x} cy={last.y} r="4" fill="#000" stroke={col} strokeWidth="2"/>
    </svg>
  );
}

/* ── trade row ── */
function Row({d, isOpen}) {
  const [open, setOpen] = useState(false);
  const e = ENG[d.engine] || {color:"#666",label:"?"};
  return(
    <div onClick={()=>setOpen(!open)} style={{padding:"12px 0",borderBottom:"1px solid #111",cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:e.color,fontSize:10,fontWeight:700,letterSpacing:"0.08em",width:36}}>{e.label.slice(0,3)}</span>
        <span style={{fontSize:13}}>{ICONS[d.sport]||"•"}</span>
        <span style={{color:"#fff",fontWeight:600,fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.team}</span>
        <span style={{color:"#444",fontSize:11}}>${f$(d.cost)}</span>
        {isOpen ? (
          <span style={{color:"#f59e0b",fontSize:10,fontWeight:600}}>{d.status==="filled"?"LIVE":"OPEN"}</span>
        ) : (
          <span style={{color:RES_CLR[d.result]||"#666",fontSize:10,fontWeight:600}}>{d.result} {usd(d.pnl)}</span>
        )}
      </div>
      {open && (
        <div style={{marginTop:10,paddingLeft:44,display:"flex",flexDirection:"column",gap:4,fontSize:11,color:"#555"}}>
          <span>{d.market}</span>
          <span>{d.side} @ {f$(d.entry_price,3)} × {d.size?.toFixed?.(0)||d.size}</span>
          <span>Edge {pct(d.edge)} · Conf {pct(d.confidence)}{d.true_prob>0?` · True ${pct(d.true_prob)}`:""}</span>
          {d.score_line && <span style={{color:"#f59e0b"}}>{d.score_line}</span>}
          {d.exit_reason && <span style={{color:"#8b5cf6"}}>Exit: {d.exit_reason.replace("_"," ")}</span>}
          <span style={{color:"#333"}}>{clock(d.opened_at)}{d.closed_at?` → ${clock(d.closed_at)}`:""}</span>
        </div>
      )}
    </div>
  );
}

/* ── engine status row ── */
function EngineRow({engine, stats, count}) {
  const e = ENG[engine];
  const s = stats || {};
  const hasTrades = (s.total_trades||0) > 0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid #0a0a0a"}}>
      <span style={{fontSize:16}}>{e.icon}</span>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
          <span style={{color:e.color,fontSize:11,fontWeight:700,letterSpacing:"0.12em"}}>{e.label}</span>
          <span style={{color:"#333",fontSize:10}}>{e.desc}</span>
        </div>
        {hasTrades ? (
          <div style={{display:"flex",gap:12,marginTop:4,fontSize:11}}>
            <span style={{color:(s.total_pnl||0)>=0?"#10b981":"#ef4444"}}>{usd(s.total_pnl)}</span>
            <span style={{color:"#555"}}>{s.wins||0}W {s.losses||0}L</span>
            <span style={{color:"#555"}}>{pct(s.win_rate)}</span>
          </div>
        ) : (
          <div style={{marginTop:3,fontSize:10,color:"#222"}}>Scanning{count>0?` · ${count} open`:""}…</div>
        )}
      </div>
      {(s.open_positions||0)>0 && <span style={{color:e.color,fontSize:13,fontWeight:700}}>{s.open_positions}</span>}
    </div>
  );
}

/* ── main app ── */
export default function App() {
  const [s, setS] = useState(null);
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState("open"); // "open" | "history"

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/state`);
      if(!r.ok) throw 0;
      setS(await r.json());
      setOk(true);
    } catch { setOk(false); }
  }, []);

  useEffect(() => { poll(); const i=setInterval(poll,POLL); return()=>clearInterval(i); }, [poll]);

  if (!s) return (
    <div style={S.root}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100dvh",gap:16}}>
        <div style={S.spinner}/>
        <span style={{color:"#222",fontSize:12,fontFamily:FF}}>Connecting…</span>
      </div>
    </div>
  );

  const trades = s.trade_history || [];
  const positions = s.open_positions || [];
  const hasTrades = trades.length > 0;
  const hasPositions = positions.length > 0;
  const pnlColor = (s.total_pnl||0) >= 0 ? "#10b981" : "#ef4444";

  return (
    <div style={S.root}>
      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:"#10b981",fontSize:18,fontWeight:800}}>◈</span>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.18em",color:"#fff"}}>SIGNAL</span>
          {s.paper_mode && <span style={S.badge}>PAPER</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:ok?"#10b981":"#ef4444"}}/>
          <span style={{color:"#333",fontSize:10}}>{uptime(s.uptime)}</span>
        </div>
      </header>

      <main style={S.main}>
        {/* ── HERO: EQUITY ── */}
        <div style={{textAlign:"center",padding:"40px 0 20px"}}>
          <div style={{fontSize:42,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>
            ${f$(s.equity)}
          </div>
          <div style={{fontSize:14,color:pnlColor,marginTop:4,fontWeight:500}}>
            {usd(s.total_pnl)}
          </div>
          {hasTrades && (
            <div style={{fontSize:11,color:"#444",marginTop:8}}>
              {s.overall_stats?.total_trades} trades · {pct(s.overall_stats?.win_rate)} win · {s.scan_count} scans
            </div>
          )}
          {!hasTrades && !hasPositions && (
            <div style={{fontSize:11,color:"#222",marginTop:12}}>
              Scanning 40 leagues · waiting for signals
            </div>
          )}
        </div>

        {/* ── EQUITY CURVE (only shows when there's data) ── */}
        <Chart curve={s.equity_curve} base={s.starting_bankroll}/>

        {/* ── LIVE GAMES TICKER ── */}
        {s.live_games?.length > 0 && (
          <div style={S.ticker}>
            {s.live_games.map((g,i) => (
              <span key={i} style={S.tickItem}>
                {ICONS[g.sport]||"•"} {g.away} @ {g.home} <span style={{color:"#333"}}>{g.detail}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── ENGINES ── */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:10,color:"#333",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Engines</div>
          <div style={{background:"#0a0a0a",borderRadius:10,border:"1px solid #111",padding:"2px 16px"}}>
            <EngineRow engine="harvest" stats={s.harvest_stats} count={positions.filter(p=>p.engine==="harvest").length}/>
            <EngineRow engine="edge" stats={s.edge_stats} count={positions.filter(p=>p.engine==="edge").length}/>
            <EngineRow engine="arber" stats={s.arber_stats} count={positions.filter(p=>p.engine==="arber").length}/>
          </div>
        </div>

        {/* ── POSITIONS & TRADES (only shows when data exists) ── */}
        {(hasPositions || hasTrades) && (
          <div style={{marginTop:28}}>
            <div style={S.tabs}>
              <button onClick={()=>setTab("open")} style={tab==="open"?S.tabOn:S.tabOff}>
                Open{hasPositions?` ${positions.length}`:""}
              </button>
              <button onClick={()=>setTab("history")} style={tab==="history"?S.tabOn:S.tabOff}>
                History{hasTrades?` ${trades.length}`:""}
              </button>
            </div>
            <div style={{background:"#0a0a0a",borderRadius:"0 0 10px 10px",border:"1px solid #111",borderTop:"none",padding:"0 16px"}}>
              {tab === "open" && !hasPositions && <div style={S.nil}>No open positions</div>}
              {tab === "open" && positions.map(p => <Row key={p.id} d={p} isOpen/>)}
              {tab === "history" && !hasTrades && <div style={S.nil}>No trades yet</div>}
              {tab === "history" && trades.map(t => <Row key={t.id} d={t} isOpen={false}/>)}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={S.foot}>
          H {ago(s.last_harvest_scan)} · E {ago(s.last_edge_scan)} · A {ago(s.last_arber_scan)} · R {ago(s.last_resolve_check)}
        </div>
      </main>
    </div>
  );
}

/* ── styles ── */
const FF = "'DM Mono', 'IBM Plex Mono', monospace";
const S = {
  root: { minHeight:"100dvh", background:"#000", color:"#e5e5e5", fontFamily:FF, WebkitFontSmoothing:"antialiased" },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderBottom:"1px solid #0a0a0a" },
  badge: { fontSize:8, padding:"2px 6px", border:"1px solid #f59e0b33", color:"#f59e0b", borderRadius:3, letterSpacing:"0.1em", fontFamily:FF },
  main: { maxWidth:480, margin:"0 auto", padding:"0 20px 60px" },
  ticker: { display:"flex", gap:14, overflowX:"auto", padding:"16px 0", fontSize:11, scrollbarWidth:"none", WebkitOverflowScrolling:"touch", borderTop:"1px solid #0a0a0a", marginTop:20 },
  tickItem: { whiteSpace:"nowrap", flexShrink:0, color:"#888" },
  tabs: { display:"flex", background:"#0a0a0a", borderRadius:"10px 10px 0 0", border:"1px solid #111", borderBottom:"none", overflow:"hidden" },
  tabOff: { flex:1, background:"none", border:"none", color:"#333", fontFamily:FF, fontSize:11, padding:"10px 0", cursor:"pointer", textAlign:"center", borderBottom:"2px solid transparent" },
  tabOn: { flex:1, background:"none", border:"none", color:"#fff", fontFamily:FF, fontSize:11, padding:"10px 0", cursor:"pointer", textAlign:"center", borderBottom:"2px solid #10b981" },
  nil: { padding:28, textAlign:"center", color:"#1a1a1a", fontSize:11 },
  foot: { marginTop:40, textAlign:"center", fontSize:9, color:"#1a1a1a", letterSpacing:"0.05em" },
  spinner: { width:16, height:16, border:"2px solid #111", borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite" },
};

if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    @keyframes spin{to{transform:rotate(360deg)}}
    *{margin:0;padding:0;box-sizing:border-box}
    html{font-size:16px;-webkit-text-size-adjust:100%}
    body{background:#000;overflow-x:hidden}
    ::-webkit-scrollbar{width:0;height:0}
    button:active{opacity:.7}
    button{-webkit-tap-highlight-color:transparent}
  `;
  document.head.appendChild(el);
}
