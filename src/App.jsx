import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2000;

const f$ = (n,d=2) => (n??0).toFixed(d);
const pct = n => `${((n??0)*100).toFixed(1)}%`;
const usd = n => {const v=n??0;return `${v>=0?"+":""}$${v.toFixed(2)}`;};
const ago = ts => {if(!ts)return"—";const s=Math.floor(Date.now()/1000-ts);return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;};
const uptime = s => {if(!s)return"0s";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${m}m`:`${m}m`;};
const IC = {nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈"};
const soccerKeys = new Set(["epl","liga","seriea","bundes","ligue1","mls","ligamx","ucl","uel","champ","jleag","j2","aleag","braA","braB","kleag","china","turk","norw","denm","erediv","colom","egypt","libert","sudam","saudi","liga2","lig2fr","bund2","serieb","porto","scotpr","uecl"]);
const icon = s => IC[s] || (soccerKeys.has(s) ? "⚽" : "•");

const ENG = {
  harvest:{l:"HARVEST",i:"🌾",c:"#f59e0b",d:"Live blowout detection"},
  edge:{l:"EDGE",i:"⚡",c:"#a78bfa",d:"Pre-game convergence"},
  arber:{l:"ARBER",i:"🔄",c:"#22d3ee",d:"Internal arbitrage"},
};

function Chart({curve,base}) {
  if(!curve?.length) return null;
  const d=[{equity:base},...curve],v=d.map(p=>p.equity);
  const lo=Math.min(...v)*0.998,hi=Math.max(...v)*1.002,W=600,H=100;
  const pts=d.map((p,i)=>({x:(i/(d.length-1))*W,y:8+(1-(p.equity-lo)/(hi-lo||1))*(H-16)}));
  const last=pts[pts.length-1],up=v[v.length-1]>=base,col=up?"#10b981":"#ef4444";
  const area=`0,${H} ${pts.map(p=>`${p.x},${p.y}`).join(" ")} ${W},${H}`;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",opacity:0.9}}>
    <defs><linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.2"/><stop offset="100%" stopColor={col} stopOpacity="0"/></linearGradient></defs>
    <polygon points={area} fill="url(#af)"/>
    <polyline fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" points={pts.map(p=>`${p.x},${p.y}`).join(" ")}/>
    <circle cx={last.x} cy={last.y} r="3" fill={col}><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/></circle>
  </svg>;
}

function Pulse({color="#10b981",size=6}) {
  return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:color,boxShadow:`0 0 ${size}px ${color}66`,animation:"pulse 2s ease-in-out infinite"}}/>;
}

function EngineRow({id,stats,openCount}) {
  const e=ENG[id];const s=stats||{};
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid #111"}}>
    <span style={{fontSize:15,width:24,textAlign:"center"}}>{e.i}</span>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{color:e.c,fontSize:10,fontWeight:700,letterSpacing:"0.1em"}}>{e.l}</span>
        <span style={{color:"#222",fontSize:9}}>{e.d}</span>
      </div>
      <div style={{display:"flex",gap:10,marginTop:3,fontSize:11}}>
        {(s.total_trades||0)>0 ? <>
          <span style={{color:(s.total_pnl||0)>=0?"#10b981":"#ef4444",fontWeight:600}}>{usd(s.total_pnl)}</span>
          <span style={{color:"#444"}}>{s.wins||0}W/{s.losses||0}L</span>
          <span style={{color:"#444"}}>{pct(s.win_rate)}</span>
        </> : <span style={{color:"#1a1a1a"}}>Scanning…</span>}
      </div>
    </div>
    {openCount>0&&<span style={{background:e.c+"22",color:e.c,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{openCount}</span>}
  </div>;
}

function LogFeed({logs}) {
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[logs]);
  if(!logs?.length) return <div style={S.nil}>Waiting for scan data…</div>;
  return <div ref={ref} style={{maxHeight:200,overflowY:"auto",scrollbarWidth:"none"}}>
    {logs.map((l,i)=>{
      const ec=l.engine?ENG[l.engine]?.c:"#333";
      const isSignal=l.level==="signal"||l.level==="trade";
      return <div key={i} style={{padding:"5px 0",borderBottom:"1px solid #0a0a0a",fontSize:11,display:"flex",gap:8,animation:i===logs.length-1?"fadeIn 0.3s ease":"none"}}>
        <span style={{color:"#1a1a1a",fontSize:9,flexShrink:0,width:28,textAlign:"right",marginTop:1}}>{ago(l.t)}</span>
        <span style={{color:isSignal?ec:"#444",flex:1}}>{l.msg}</span>
      </div>;
    })}
  </div>;
}

function EdgeScanner({edges}) {
  if(!edges?.length) return <div style={S.nil}>No edges detected — next scan ~2min</div>;
  return <div>{edges.slice(0,8).map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 0",borderBottom:"1px solid #0a0a0a",fontSize:11}}>
    <span style={{fontSize:12}}>{icon(e.sport)}</span>
    <span style={{color:"#fff",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.team}</span>
    <span style={{color:"#555",fontSize:10}}>{f$(e.poly,2)}</span>
    <span style={{color:"#888",fontSize:10}}>→</span>
    <span style={{color:"#888",fontSize:10}}>{f$(e.true,2)}</span>
    <span style={{color:e.edge>=0.10?"#10b981":e.edge>=0.07?"#a78bfa":"#666",fontWeight:700,fontSize:11,minWidth:36,textAlign:"right"}}>{pct(e.edge)}</span>
  </div>)}</div>;
}

function Position({p}) {
  const [open,setOpen]=useState(false);
  const e=ENG[p.engine]||{c:"#666",l:"?"};
  return <div onClick={()=>setOpen(!open)} style={{padding:"10px 0",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{color:e.c,fontSize:9,fontWeight:700,width:28}}>{e.l?.slice(0,3)}</span>
      <span style={{fontSize:12}}>{icon(p.sport)}</span>
      <span style={{color:"#fff",fontWeight:600,fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.team||p.side}</span>
      <span style={{color:"#555",fontSize:10}}>${f$(p.cost)}</span>
      <Pulse color="#f59e0b" size={5}/>
    </div>
    {open&&<div style={{marginTop:6,paddingLeft:34,fontSize:10,color:"#444",display:"flex",flexDirection:"column",gap:2}}>
      <span>{p.market}</span>
      <span>Entry {f$(p.entry_price,3)} × {Math.round(p.size)} shares · ${f$(p.cost)}</span>
      {p.edge>0&&<span style={{color:"#a78bfa"}}>Edge {pct(p.edge)}{p.true_prob>0?` · True ${pct(p.true_prob)}`:""}</span>}
      {p.score_line&&<span style={{color:"#f59e0b"}}>{p.score_line}</span>}
    </div>}
  </div>;
}

function TradeRow({t}) {
  const [open,setOpen]=useState(false);
  const e=ENG[t.engine]||{c:"#666",l:"?"};
  const rc={WIN:"#10b981",LOSS:"#ef4444",EXIT_PROFIT:"#10b981",EXIT_LOSS:"#ef4444",PUSH:"#666"};
  return <div onClick={()=>setOpen(!open)} style={{padding:"10px 0",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{color:e.c,fontSize:9,fontWeight:700,width:28}}>{e.l?.slice(0,3)}</span>
      <span style={{fontSize:12}}>{icon(t.sport)}</span>
      <span style={{color:"#fff",fontWeight:600,fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team||t.side}</span>
      <span style={{color:rc[t.result]||"#666",fontSize:11,fontWeight:600}}>{usd(t.pnl)}</span>
      <span style={{color:rc[t.result]||"#666",fontSize:9,fontWeight:600}}>{t.result}</span>
    </div>
    {open&&<div style={{marginTop:6,paddingLeft:34,fontSize:10,color:"#444",display:"flex",flexDirection:"column",gap:2}}>
      <span>{t.market}</span>
      <span>Entry {f$(t.entry_price,3)} · Cost ${f$(t.cost)} · Payout ${f$(t.payout)}</span>
      {t.exit_reason&&<span style={{color:"#a78bfa"}}>Exit: {t.exit_reason.replace(/_/g," ")}</span>}
    </div>}
  </div>;
}

function Section({title,right,children}) {
  return <div style={{marginTop:24}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
      <span style={{fontSize:9,color:"#333",letterSpacing:"0.12em",textTransform:"uppercase"}}>{title}</span>
      {right&&<span style={{fontSize:9,color:"#222"}}>{right}</span>}
    </div>
    <div style={{background:"#060606",borderRadius:10,border:"1px solid #111",padding:"2px 14px"}}>{children}</div>
  </div>;
}

export default function App() {
  const [s,setS]=useState(null);
  const [ok,setOk]=useState(false);
  const [tab,setTab]=useState("feed");
  const poll=useCallback(async()=>{try{const r=await fetch(`${API}/api/state`);if(!r.ok)throw 0;setS(await r.json());setOk(true);}catch{setOk(false);}},[]);
  useEffect(()=>{poll();const i=setInterval(poll,POLL);return()=>clearInterval(i);},[poll]);

  if(!s) return <div style={S.root}><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100dvh",gap:12}}>
    <div style={S.spin}/><span style={{color:"#222",fontSize:11,fontFamily:FF}}>Connecting…</span>
  </div></div>;

  const pos=s.open_positions||[];
  const trades=s.trade_history||[];
  const logs=s.scan_log||[];
  const edges=s.edges_found||[];
  const games=s.live_games||[];
  const pnlC=(s.total_pnl||0)>=0?"#10b981":"#ef4444";

  return <div style={S.root}>
    <header style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:"#10b981",fontSize:16,fontWeight:800}}>◈</span>
        <span style={{fontSize:12,fontWeight:700,letterSpacing:"0.15em",color:"#fff"}}>SIGNAL</span>
        {s.paper_mode&&<span style={S.badge}>PAPER</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Pulse color={ok?"#10b981":"#ef4444"}/>
        <span style={{color:"#333",fontSize:10}}>{uptime(s.uptime)} · {s.scan_count} scans</span>
      </div>
    </header>

    <main style={S.main}>
      <div style={{textAlign:"center",padding:"28px 0 4px"}}>
        <div style={{fontSize:9,color:"#333",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Equity</div>
        <div style={{fontSize:38,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>${f$(s.equity)}</div>
        <div style={{fontSize:14,color:pnlC,marginTop:2,fontWeight:600}}>{usd(s.total_pnl)}</div>
        {(s.overall_stats?.total_trades||0)>0&&<div style={{fontSize:10,color:"#333",marginTop:4}}>
          {s.overall_stats.total_trades} trades · {pct(s.overall_stats.win_rate)} win · ${f$(s.open_cost)} deployed
        </div>}
        {(s.overall_stats?.total_trades||0)===0&&<div style={{fontSize:10,color:"#1a1a1a",marginTop:4}}>
          40 leagues · {s.scan_count} scans · ${f$(s.open_cost)} deployed
        </div>}
      </div>
      <Chart curve={s.equity_curve} base={s.starting_bankroll}/>

      {games.length>0&&<div style={S.ticker}>
        <Pulse color="#ef4444" size={4}/>
        <span style={{color:"#ef4444",fontSize:8,fontWeight:700,letterSpacing:"0.08em"}}>LIVE</span>
        {games.map((g,i)=><span key={i} style={S.tickItem}>{icon(g.sport)} {g.away} @ {g.home} <span style={{color:"#333"}}>{g.detail}</span></span>)}
      </div>}

      <Section title="Engines" right={`${pos.length} open · $${f$(s.open_cost)} deployed`}>
        <EngineRow id="harvest" stats={s.harvest_stats} openCount={pos.filter(p=>p.engine==="harvest").length}/>
        <EngineRow id="edge" stats={s.edge_stats} openCount={pos.filter(p=>p.engine==="edge").length}/>
        <EngineRow id="arber" stats={s.arber_stats} openCount={pos.filter(p=>p.engine==="arber").length}/>
      </Section>

      <div style={{marginTop:24}}>
        <div style={S.tabs}>
          {[["feed","Feed"],["edges","Scanner"],["open",`Open ${pos.length}`],["history",`Trades ${trades.length}`]].map(([k,label])=>
            <button key={k} onClick={()=>setTab(k)} style={tab===k?S.tabOn:S.tabOff}>{label}</button>
          )}
        </div>
        <div style={S.tabBody}>
          {tab==="feed"&&<LogFeed logs={logs}/>}
          {tab==="edges"&&<EdgeScanner edges={edges}/>}
          {tab==="open"&&(pos.length?pos.map(p=><Position key={p.id} p={p}/>):<div style={S.nil}>No open positions</div>)}
          {tab==="history"&&(trades.length?trades.map(t=><TradeRow key={t.id} t={t}/>):<div style={S.nil}>No resolved trades</div>)}
        </div>
      </div>

      <div style={S.foot}>H {ago(s.last_harvest_scan)} · E {ago(s.last_edge_scan)} · A {ago(s.last_arber_scan)}</div>
    </main>
  </div>;
}

const FF="'DM Mono','IBM Plex Mono',monospace";
const S={
  root:{minHeight:"100dvh",background:"#000",color:"#e5e5e5",fontFamily:FF,WebkitFontSmoothing:"antialiased"},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #0a0a0a"},
  badge:{fontSize:7,padding:"2px 6px",border:"1px solid #f59e0b44",color:"#f59e0b",borderRadius:3,letterSpacing:"0.1em",fontFamily:FF},
  main:{maxWidth:480,margin:"0 auto",padding:"0 16px 60px"},
  ticker:{display:"flex",alignItems:"center",gap:10,overflowX:"auto",padding:"12px 0",fontSize:11,scrollbarWidth:"none",borderTop:"1px solid #0a0a0a",marginTop:12},
  tickItem:{whiteSpace:"nowrap",flexShrink:0,color:"#888"},
  tabs:{display:"flex",background:"#060606",borderRadius:"10px 10px 0 0",border:"1px solid #111",borderBottom:"none",overflow:"hidden"},
  tabOff:{flex:1,background:"none",border:"none",color:"#333",fontFamily:FF,fontSize:10,padding:"10px 0",cursor:"pointer",textAlign:"center"},
  tabOn:{flex:1,background:"none",border:"none",color:"#fff",fontFamily:FF,fontSize:10,padding:"10px 0",cursor:"pointer",textAlign:"center",borderBottom:"2px solid #10b981"},
  tabBody:{background:"#060606",borderRadius:"0 0 10px 10px",border:"1px solid #111",borderTop:"none",padding:"4px 14px",minHeight:100},
  nil:{padding:24,textAlign:"center",color:"#1a1a1a",fontSize:10},
  foot:{marginTop:32,textAlign:"center",fontSize:9,color:"#1a1a1a"},
  spin:{width:14,height:14,border:"2px solid #111",borderTopColor:"#10b981",borderRadius:"50%",animation:"spin .6s linear infinite"},
};

if(typeof document!=="undefined"){const el=document.createElement("style");el.textContent=`
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
*{margin:0;padding:0;box-sizing:border-box}
html{font-size:16px;-webkit-text-size-adjust:100%}
body{background:#000;overflow-x:hidden}
::-webkit-scrollbar{width:0;height:0}
button:active{opacity:.7}
button{-webkit-tap-highlight-color:transparent}
`;document.head.appendChild(el);}
