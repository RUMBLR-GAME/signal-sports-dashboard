import{useState,useEffect,useCallback,useRef}from"react";

const API="https://web-production-72709.up.railway.app/api/state";
const CLOB_API=API.replace("/api/state","/api/clob-status");
const POLL=2500;

/* helpers */
const ts=i=>!i?"":new Date(i).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const tsf=i=>!i?"":new Date(i).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
const pnlC=v=>v>0?"var(--g)":v<0?"var(--r)":"var(--m)";
const pnlS=v=>v==null?"—":`${v>0?"+":""}$${v.toFixed(2)}`;
const ic={nba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",wnba:"🏀",epl:"⚽",mls:"⚽",liga:"⚽",BTC:"₿",ETH:"Ξ",SOL:"◎"};

export default function App(){
  const[s,setS]=useState(null);
  const[conn,setConn]=useState(false);
  const[tab,setTab]=useState("overview");
  const[eqH,setEqH]=useState([]);
  const[clob,setClob]=useState("?");
  const[now,setNow]=useState(Date.now());
  const[expandedTrade,setExpanded]=useState(null);

  const poll=useCallback(async()=>{
    try{const r=await fetch(API);if(!r.ok)throw 0;
    const d=await r.json();setS(d);setConn(true);
    setEqH(p=>[...p.slice(-299),{t:Date.now(),eq:d.equity||0,pnl:d.pnl||0}]);
    }catch{setConn(false)}
  },[]);
  useEffect(()=>{poll();const t=setInterval(poll,POLL);return()=>clearInterval(t)},[poll]);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{
    const chk=async()=>{try{const r=await fetch(CLOB_API);if(r.ok){const d=await r.json();setClob(d.status==="ok"?"ok":d.status==="no_market"?"idle":"err")}}catch{setClob("err")}};
    chk();const t=setInterval(chk,30000);return()=>clearInterval(t);
  },[]);

  const d=s||{};
  const eq=d.equity||0,pnl=d.pnl||0,wr=d.win_rate||0,roi=d.roi||0;
  const trades=d.trade_history||[],logs=d.log||[],games=d.verified_games||[];
  const targets=d.harvest_targets||[],signals=d.synth_signals||[];
  const openPos=d.open_positions||[],eng=d.engines||{};
  const hExp=d.harvest_exposure||0,sExp=d.synth_exposure||0;
  const totalTrades=d.trades||0,wins=d.wins||0,losses=totalTrades-wins;

  const hTrades=trades.filter(t=>t.engine==="harvest");
  const sTrades=trades.filter(t=>t.engine==="synth");
  const hWins=hTrades.filter(t=>t.status==="won").length;
  const sWins=sTrades.filter(t=>t.status==="won").length;
  const hRes=hTrades.filter(t=>t.status==="won"||t.status==="lost");
  const sRes=sTrades.filter(t=>t.status==="won"||t.status==="lost");
  const hPnl=hRes.reduce((a,t)=>a+(t.pnl||0),0);
  const sPnl=sRes.reduce((a,t)=>a+(t.pnl||0),0);
  const bigWin=trades.reduce((mx,t)=>t.pnl>mx?t.pnl:mx,0);
  const bigLoss=trades.reduce((mn,t)=>t.pnl<mn?t.pnl:mn,0);
  const avgWin=wins>0?trades.filter(t=>t.pnl>0).reduce((a,t)=>a+t.pnl,0)/wins:0;
  const avgLoss=losses>0?trades.filter(t=>t.pnl<0).reduce((a,t)=>a+t.pnl,0)/losses:0;

  const pnlTimeline=[];let runPnl=0;
  for(const t of[...trades].reverse()){if(t.pnl!=null){runPnl+=t.pnl;pnlTimeline.push({t:t.timestamp,v:runPnl})}}

  const nowS=Math.floor(now/1000);
  const next5=Math.ceil(nowS/300)*300,next15=Math.ceil(nowS/900)*900;
  const to5=next5-nowS,to15=next15-nowS;
  const fmtCD=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const tabs=[
    {id:"overview",l:"Overview",n:null},
    {id:"feed",l:"Live Feed",n:logs.length||null},
    {id:"crypto",l:"Crypto",n:sTrades.length||null},
    {id:"harvest",l:"Harvest",n:games.filter(g=>g.level!=="final").length||null},
    {id:"positions",l:"Positions",n:openPos.length||null},
    {id:"analytics",l:"Analytics",n:null},
  ];

return(
<div className="root">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');
:root{--bg:#090B10;--s1:#0F1118;--s2:#161823;--s3:#1E2132;--b:#282C42;
--t:#E8EAF0;--m:#7B819A;--d:#4A4F6A;--g:#00E676;--gd:#0A2E1E;--gl:#00E67622;
--r:#FF3D57;--rd:#2E0A14;--rl:#FF3D5722;--a:#FFB300;--al:#FFB30022;
--bl:#448AFF;--bll:#448AFF22;--p:#B388FF;
--mono:'JetBrains Mono',monospace;--sans:'Outfit',sans-serif;--rad:10px}
*{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:var(--bg);color:var(--t)}
.root{font-family:var(--sans);min-height:100vh;background:var(--bg)}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--s3);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes breathe{0%,100%{box-shadow:0 0 0 0 var(--gl)}50%{box-shadow:0 0 0 6px transparent}}
.fu{animation:fadeUp .35s ease-out both}.si{animation:slideIn .3s ease-out both}
.pu{animation:pulse 1.5s infinite}.br{animation:breathe 2s infinite}
.card{background:var(--s1);border:1px solid var(--s3);border-radius:var(--rad);padding:16px;transition:border-color .2s}
.card:hover{border-color:var(--b)}
.trow{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--s3);cursor:pointer;transition:background .15s}
.trow:hover{background:var(--s2)}
@media(max-width:800px){.rg{grid-template-columns:1fr!important}.hd{display:none!important}}
`}</style>

<header style={{background:"var(--s1)",borderBottom:"1px solid var(--b)",padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
  <div style={{display:"flex",alignItems:"center",gap:14}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,var(--g),var(--bl))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"var(--bg)"}}>S</div>
      <div><div style={{fontSize:14,fontWeight:700,letterSpacing:"-.02em"}}>SIGNAL</div><div style={{fontSize:8,color:"var(--d)",letterSpacing:".12em",marginTop:-2}}>HARVEST + SYNTH</div></div>
    </div>
  </div>
  <div style={{display:"flex",alignItems:"center",gap:16}}>
    <div style={{display:"flex",gap:16,fontFamily:"var(--mono)",fontSize:10}}>
      <CountdownPill label="5m" secs={to5} hot={to5<=20}/>
      <CountdownPill label="15m" secs={to15} hot={to15<=30}/>
    </div>
    <div style={{width:1,height:24,background:"var(--b)"}}/>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <Dot on={conn} c="var(--g)" label="API"/><Dot on={eng.harvest} c="var(--g)" label="H"/>
      <Dot on={eng.synth} c="var(--bl)" label="S"/><Dot on={clob==="ok"||clob==="idle"} c={clob==="ok"?"var(--g)":"var(--a)"} label="CLOB"/>
    </div>
  </div>
</header>

<nav style={{background:"var(--s1)",borderBottom:"1px solid var(--b)",padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
  {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:11,fontFamily:"var(--sans)",fontWeight:tab===t.id?700:400,padding:"11px 18px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?"var(--t)":"var(--d)",borderBottom:tab===t.id?"2px solid var(--g)":"2px solid transparent",whiteSpace:"nowrap",transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>{t.l}{t.n!=null&&<span style={{fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:8,background:tab===t.id?"var(--gl)":"var(--s3)",color:tab===t.id?"var(--g)":"var(--d)"}}>{t.n}</span>}</button>)}
</nav>

<main style={{maxWidth:1200,margin:"0 auto",padding:"16px 20px 80px"}}>

{tab==="overview"&&<>
  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:16}} className="rg">
    <div className="card" style={{background:"linear-gradient(135deg,var(--s1),var(--s2))",borderColor:pnl>=0?"var(--g)33":"var(--r)33"}}>
      <div style={{fontSize:9,color:"var(--d)",letterSpacing:".1em",textTransform:"uppercase",fontWeight:500}}>EQUITY</div>
      <div style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color:pnl>=0?"var(--g)":"var(--r)",marginTop:4,lineHeight:1}}>${eq.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div style={{display:"flex",gap:16,marginTop:8}}>
        <span style={{fontSize:11,fontFamily:"var(--mono)",color:pnlC(pnl)}}>{pnlS(pnl)}</span>
        <span style={{fontSize:11,fontFamily:"var(--mono)",color:pnlC(roi)}}>{roi>=0?"+":""}{roi.toFixed(1)}% ROI</span>
      </div>
      {eqH.length>2&&<div style={{marginTop:10}}><Sparkline data={eqH.map(h=>h.eq)} color={pnl>=0?"var(--g)":"var(--r)"} h={50}/></div>}
    </div>
    <StatCard label="TRADES" value={totalTrades} sub={`${wins}W ${losses}L`} color="var(--t)"/>
    <StatCard label="WIN RATE" value={`${(wr*100).toFixed(0)}%`} color={wr>=0.6?"var(--g)":"var(--a)"}><DonutChart pct={wr} size={38} color={wr>=0.6?"var(--g)":"var(--a)"}/></StatCard>
    <StatCard label="DRAWDOWN" value={`${(d.drawdown||0).toFixed(1)}%`} sub={`HWM $${Math.round(d.hwm||eq)}`} color={(d.drawdown||0)>5?"var(--r)":"var(--m)"}/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}} className="rg">
    <EngineCard engine="harvest" on={eng.harvest} trades={d.harvest_trades||0} winRate={hRes.length?hWins/hRes.length:0} pnl={hPnl} exposure={hExp} extra={games.filter(g=>g.level!=="final").length>0?`${games.filter(g=>g.level!=="final").length} live games`:null}/>
    <EngineCard engine="crypto" on={eng.synth} trades={d.synth_trades||0} winRate={sRes.length?sWins/sRes.length:0} pnl={sPnl} exposure={sExp} extra={<span style={{fontFamily:"var(--mono)",fontSize:10}}><span style={{color:to5<=20?"var(--g)":"var(--d)"}}>5m:{fmtCD(to5)}</span>{" "}<span style={{color:to15<=30?"var(--g)":"var(--d)"}}>15m:{fmtCD(to15)}</span>{" "}CLOB:{clob==="ok"?"✓":"○"}</span>}/>
  </div>
  {openPos.length>0&&<><Sec>Open Positions ({openPos.length})</Sec><div className="card" style={{padding:0,marginBottom:16}}>{openPos.map((p,i)=><PosRow key={i} p={p}/>)}</div></>}
  <Sec>Recent Activity</Sec>
  <div className="card" style={{padding:0}}>{trades.length===0&&<Empty>Waiting for first trade…</Empty>}{trades.slice(0,12).map((t,i)=><TradeRow key={t.id||i} t={t} expanded={expandedTrade===t.id} onToggle={()=>setExpanded(expandedTrade===t.id?null:t.id)}/>)}</div>
</>}

{tab==="feed"&&<><Sec>Engine Log ({logs.length} entries)</Sec><div className="card" style={{padding:0,maxHeight:700,overflowY:"auto"}}>{logs.length===0&&<Empty>Waiting for activity…</Empty>}{logs.map((l,i)=><div key={i} className="si" style={{padding:"7px 14px",borderBottom:"1px solid var(--s3)",fontFamily:"var(--mono)",fontSize:11,lineHeight:1.6,animationDelay:`${Math.min(i*20,300)}ms`}}><span style={{color:"var(--d)",marginRight:10}}>{ts(l.t)}</span><span style={{color:l.m.includes("✓")?"var(--g)":l.m.includes("✗")?"var(--r)":l.m.includes("SNIPE")||l.m.includes("ARB")?"var(--a)":l.m.includes("HARVEST")?"var(--g)":"var(--m)"}}>{l.m}</span></div>)}</div></>}

{tab==="crypto"&&<>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:17,fontWeight:700}}>Crypto Engine</span><StatusPill on={clob==="ok"||clob==="idle"} label={clob==="ok"?"CLOB LIVE":clob==="idle"?"IDLE":"OFF"} color={clob==="ok"?"var(--g)":"var(--a)"}/></div>
    <div style={{display:"flex",gap:16,fontFamily:"var(--mono)",fontSize:11}}><CountdownPill label="5m" secs={to5} hot={to5<=20}/><CountdownPill label="15m" secs={to15} hot={to15<=30}/></div>
  </div>
  <div className="card" style={{marginBottom:14,padding:"14px 16px"}}><div style={{fontSize:9,color:"var(--d)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>WINDOW PROGRESS</div><WindowBar label="5-min" total={300} remaining={to5} hotZone={20}/><WindowBar label="15-min" total={900} remaining={to15} hotZone={30}/></div>
  {signals.length>0&&<><Sec>Live Signals ({signals.length})</Sec><div style={{display:"grid",gap:8,marginBottom:16}}>{signals.map((sg,i)=><SignalCard key={i} sg={sg}/>)}</div></>}
  {signals.length===0&&<div className="card" style={{textAlign:"center",padding:32,color:"var(--d)",fontSize:12,marginBottom:16}}>{eng.synth?`Scanning… next window ${fmtCD(Math.min(to5,to15))}`:"Engine offline"}</div>}
  <Sec>Crypto Trades ({sTrades.length})</Sec><div className="card" style={{padding:0}}>{sTrades.length===0&&<Empty>No crypto trades yet</Empty>}{sTrades.slice(0,30).map((t,i)=><TradeRow key={t.id||i} t={t} expanded={expandedTrade===t.id} onToggle={()=>setExpanded(expandedTrade===t.id?null:t.id)}/>)}</div>
</>}

{tab==="harvest"&&<>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:17,fontWeight:700}}>Harvest Engine</span><span style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)"}}>{games.filter(g=>g.level!=="final").length} live · {games.length} total</span></div>
  {games.filter(g=>g.level!=="final").length>0&&<><Sec>Live Verified Games</Sec><div style={{display:"grid",gap:8,marginBottom:16}}>{games.filter(g=>g.level!=="final").map((g,i)=><GameCard key={i} g={g}/>)}</div></>}
  {targets.length>0&&<><Sec>Harvest Targets ({targets.length})</Sec><div style={{display:"grid",gap:8,marginBottom:16}}>{targets.map((t,i)=><TargetCard key={i} t={t}/>)}</div></>}
  <Sec>Harvest Trades ({hTrades.length})</Sec><div className="card" style={{padding:0}}>{hTrades.length===0&&<Empty>No harvest trades yet</Empty>}{hTrades.slice(0,30).map((t,i)=><TradeRow key={t.id||i} t={t} expanded={expandedTrade===t.id} onToggle={()=>setExpanded(expandedTrade===t.id?null:t.id)}/>)}</div>
</>}

{tab==="positions"&&<>
  <Sec>Open ({openPos.length}) · Exposed ${Math.round(d.exposure||0)}</Sec>
  {openPos.length===0&&<div className="card" style={{textAlign:"center",padding:32,color:"var(--d)",fontSize:12,marginBottom:16}}>No open positions</div>}
  {openPos.map((p,i)=><div key={i} className="card fu" style={{marginBottom:8,borderLeft:`3px solid ${p.engine==="harvest"?"var(--g)":"var(--bl)"}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>{ic[p.sport]||"🎯"}</span><EngBadge engine={p.engine}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{p.outcome}</div><div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>{p.detail}</div></div><div style={{textAlign:"right",fontFamily:"var(--mono)"}}><div style={{fontSize:14,fontWeight:700}}>{p.shares}× @ ${(p.entry_price||0).toFixed(4)}</div><div style={{fontSize:11,color:"var(--m)"}}>Cost: ${(p.cost_basis||0).toFixed(2)}</div><div style={{fontSize:9,color:"var(--d)",marginTop:2}}>{tsf(p.entry_time)}</div></div></div></div>)}
  <Sec style={{marginTop:20}}>Resolved ({trades.filter(t=>t.status&&t.status!=="open").length})</Sec>
  <div className="card" style={{padding:0}}>{trades.filter(t=>t.status&&t.status!=="open").slice(0,50).map((t,i)=><TradeRow key={t.id||i} t={t} expanded={expandedTrade===t.id} onToggle={()=>setExpanded(expandedTrade===t.id?null:t.id)}/>)}</div>
</>}

{tab==="analytics"&&<>
  <Sec>Performance Summary</Sec>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}} className="rg">
    <StatCard label="TOTAL TRADES" value={totalTrades} color="var(--t)"/>
    <StatCard label="WIN RATE" value={`${(wr*100).toFixed(1)}%`} color={wr>=0.6?"var(--g)":"var(--a)"}><DonutChart pct={wr} size={38} color={wr>=0.6?"var(--g)":"var(--a)"}/></StatCard>
    <StatCard label="BEST WIN" value={pnlS(bigWin)} color="var(--g)"/>
    <StatCard label="WORST LOSS" value={pnlS(bigLoss)} color="var(--r)"/>
    <StatCard label="AVG WIN" value={pnlS(avgWin)} color="var(--g)"/>
    <StatCard label="AVG LOSS" value={pnlS(avgLoss)} color="var(--r)"/>
  </div>
  {pnlTimeline.length>2&&<><Sec>Cumulative P&L</Sec><div className="card" style={{padding:"14px 16px",marginBottom:16}}><Sparkline data={pnlTimeline.map(p=>p.v)} color={pnl>=0?"var(--g)":"var(--r)"} h={80} showZero/></div></>}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}} className="rg">
    <div className="card"><div style={{fontSize:11,fontWeight:600,color:"var(--d)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Engine Breakdown</div><div style={{display:"flex",gap:20,alignItems:"center"}}><DonutChart pct={totalTrades>0?(d.harvest_trades||0)/totalTrades:0} size={60} color="var(--g)" label="H"/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}><span style={{color:"var(--g)"}}>● Harvest</span><span style={{fontFamily:"var(--mono)",color:"var(--m)"}}>{d.harvest_trades||0} · {pnlS(hPnl)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"var(--bl)"}}>● Crypto</span><span style={{fontFamily:"var(--mono)",color:"var(--m)"}}>{d.synth_trades||0} · {pnlS(sPnl)}</span></div></div></div></div>
    <div className="card"><div style={{fontSize:11,fontWeight:600,color:"var(--d)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Risk Metrics</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><MiniStat label="Exposure" value={`$${Math.round(d.exposure||0)}`} color="var(--bl)"/><MiniStat label="Cash" value={`$${Math.round(d.bankroll||0)}`} color="var(--t)"/><MiniStat label="Drawdown" value={`${(d.drawdown||0).toFixed(1)}%`} color={(d.drawdown||0)>5?"var(--r)":"var(--m)"}/><MiniStat label="HWM" value={`$${Math.round(d.hwm||eq)}`} color="var(--g)"/></div></div>
  </div>
  <Sec>Trade Streak</Sec>
  <div className="card" style={{padding:"14px 16px"}}><div style={{display:"flex",gap:2,height:32,borderRadius:4,overflow:"hidden"}}>{trades.slice(0,60).map((t,i)=>{const w=t.status==="won",l=t.status==="lost";return<div key={i} title={`${t.outcome||t.event}: ${pnlS(t.pnl)}`} style={{flex:1,background:w?"var(--g)":l?"var(--r)":"var(--s3)",opacity:w||l?0.7:0.2,transition:"opacity .2s",cursor:"pointer",minWidth:3,borderRadius:1}} onMouseEnter={e=>e.target.style.opacity="1"} onMouseLeave={e=>e.target.style.opacity=w||l?"0.7":"0.2"}/>})}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:"var(--d)",fontFamily:"var(--mono)"}}><span>oldest</span><span>newest →</span></div></div>
</>}

</main></div>);
}

/* COMPONENTS */
function Dot({on,c,label}){return<div style={{display:"flex",alignItems:"center",gap:3}} title={label}><span style={{width:6,height:6,borderRadius:3,background:on?c:"var(--d)",display:"block",transition:"all .3s",boxShadow:on?`0 0 8px ${c}55`:""}}/><span style={{fontSize:9,color:on?c:"var(--d)",fontFamily:"var(--mono)",fontWeight:500}}>{label}</span></div>}

function CountdownPill({label,secs,hot}){const f=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;return<div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:hot?"var(--gl)":"var(--s3)",transition:"all .3s"}} className={hot?"br":""}><span style={{fontSize:9,color:"var(--d)"}}>{label}</span><span style={{fontSize:11,fontWeight:700,color:hot?"var(--g)":"var(--d)",fontFamily:"var(--mono)"}}>{f(secs)}</span>{hot&&<span className="pu" style={{fontSize:7,color:"var(--g)",fontWeight:700}}>HOT</span>}</div>}

function StatCard({label,value,sub,color,children}){return<div className="card"><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:9,color:"var(--d)",letterSpacing:".08em",textTransform:"uppercase",fontWeight:500,marginBottom:4}}>{label}</div><div style={{fontSize:20,fontWeight:800,fontFamily:"var(--mono)",color:color||"var(--t)",lineHeight:1.2}}>{value}</div>{sub&&<div style={{fontSize:10,color:"var(--d)",marginTop:4,fontFamily:"var(--mono)"}}>{sub}</div>}</div>{children}</div></div>}

function MiniStat({label,value,color}){return<div><div style={{fontSize:9,color:"var(--d)",letterSpacing:".05em",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:14,fontWeight:700,fontFamily:"var(--mono)",color:color||"var(--t)",marginTop:2}}>{value}</div></div>}

function DonutChart({pct,size=40,color="var(--g)",label}){const r=size/2-3,circ=2*Math.PI*r,offset=circ*(1-Math.min(pct||0,1));return<svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--s3)" strokeWidth={3}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>{label&&<text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" style={{transform:"rotate(90deg)",transformOrigin:"center",fontSize:9,fontWeight:700,fill:color,fontFamily:"var(--mono)"}}>{label}</text>}</svg>}

function EngineCard({engine,on,trades,winRate,pnl,exposure,extra}){const h=engine==="harvest",c=h?"var(--g)":"var(--bl)";return<div className="card"><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Dot on={on} c={c}/><span style={{fontSize:14,fontWeight:700,textTransform:"capitalize"}}>{engine}</span><span style={{marginLeft:"auto",fontSize:10,color:"var(--d)",fontFamily:"var(--mono)"}}>Exp: ${exposure.toFixed(0)}</span></div><div style={{display:"flex",alignItems:"center",gap:16}}><DonutChart pct={winRate} size={48} color={c}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,flex:1}}><MiniStat label="Trades" value={trades}/><MiniStat label="Win Rate" value={winRate>0?`${(winRate*100).toFixed(0)}%`:"—"}/><MiniStat label="P&L" value={pnlS(pnl)} color={pnlC(pnl)}/></div></div>{extra&&<div style={{marginTop:10,fontSize:10,color:c}}>{extra}</div>}</div>}

function WindowBar({label,total,remaining,hotZone}){const pct=Math.min((total-remaining)/total,1),inHot=remaining<=hotZone;return<div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--d)",marginBottom:3,fontFamily:"var(--mono)"}}><span>{label}</span><span style={{color:inHot?"var(--g)":"var(--d)"}}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")} left</span></div><div style={{height:6,background:"var(--s3)",borderRadius:3,overflow:"hidden",position:"relative"}}><div style={{height:"100%",width:`${pct*100}%`,background:inHot?"var(--g)":"var(--bl)",borderRadius:3,transition:"width 1s linear"}}/><div style={{position:"absolute",right:0,top:0,height:"100%",width:`${hotZone/total*100}%`,background:"var(--gl)",borderRadius:"0 3px 3px 0"}}/></div></div>}

function SignalCard({sg}){const dirC=sg.direction==="up"?"var(--g)":sg.direction==="down"?"var(--r)":"var(--a)";return<div className="card fu" style={{borderLeft:`3px solid ${dirC}`,padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>{ic[sg.asset]||"🪙"}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,fontWeight:700}}>{sg.asset}</span><LayerBadge layer={sg.layer}/><span style={{fontSize:10,color:"var(--d)"}}>{sg.timeframe}</span><span style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--d)",padding:"1px 5px",borderRadius:3,background:"var(--s3)"}}>{sg.priceSource==="clob"?"LIVE":"EST"}</span></div><div style={{display:"flex",gap:14,marginTop:4,fontSize:10,fontFamily:"var(--mono)",color:"var(--m)"}}><span>{sg.shares}× @ ${(sg.price||0).toFixed(4)}</span><span>Cost: ${(sg.cost||0).toFixed(2)}</span>{sg.spread>0&&<span>Spread: {(sg.spread*100).toFixed(1)}%</span>}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,fontFamily:"var(--mono)",color:dirC}}>{sg.direction?.toUpperCase()}</div><div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--g)",marginTop:2}}>EV: {sg.ev!=null?`+${(sg.ev*100).toFixed(1)}¢`:"—"}</div></div></div></div>}

function GameCard({g}){const lc=g.level==="blowout"?"var(--g)":g.level==="strong"?"var(--bl)":"var(--a)";return<div className="card fu" style={{borderLeft:`3px solid ${lc}`,padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>{ic[g.sport]||"🎮"}</span><div style={{flex:1}}><div style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600}}>{g.scoreLine}</div><div style={{fontSize:10,color:"var(--d)",marginTop:2}}>{g.period} {g.clock} · {g.leader} +{g.lead}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><DonutChart pct={g.confidence} size={32} color={lc}/><div style={{textAlign:"right"}}><div style={{fontSize:12,fontFamily:"var(--mono)",fontWeight:700,color:lc}}>{(g.confidence*100).toFixed(1)}%</div><LevelBadge level={g.level}/></div></div></div></div>}

function TargetCard({t}){return<div className="card fu" style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14}}>{ic[t.sport]||"🎮"}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{t.outcome}</div><div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>{t.scoreLine}</div></div><div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11}}><div style={{fontWeight:700,color:"var(--g)"}}>${(t.price||0).toFixed(4)} → +{((t.return||0)*100).toFixed(1)}%</div><div style={{fontSize:9,color:"var(--d)",marginTop:2}}>EV:+{t.ev!=null?(t.ev*100).toFixed(1):"?"}¢ · {t.priceSource==="clob"?"LIVE":"GAMMA"} · {t.shares}×</div></div><LevelBadge level={t.level}/></div></div>}

function TradeRow({t,expanded,onToggle}){const w=t.status==="won",l=t.status==="lost",o=!w&&!l,ac=w?"var(--g)":l?"var(--r)":"var(--bl)",bg=w?"var(--gd)":l?"var(--rd)":"transparent";return<><div className="trow" style={{background:bg}} onClick={onToggle}><span style={{width:20,height:20,borderRadius:5,background:`${ac}22`,color:ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{w?"✓":l?"✗":"▸"}</span><span style={{fontSize:14}}>{ic[t.sport]||"🎯"}</span><EngBadge engine={t.engine||"synth"}/>{t.layer&&<LayerBadge layer={t.layer}/>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.outcome||t.event||"Trade"}</div><div style={{fontSize:9,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>{t.timeframe?`${t.timeframe} · `:""}{t.scoreLine||""}{t.ev!=null&&t.ev!==0?` · EV:+${(t.ev*100).toFixed(1)}¢`:""}</div></div><div style={{textAlign:"right",flexShrink:0,fontFamily:"var(--mono)"}}><div style={{fontSize:12,fontWeight:600}}>${(t.entryPrice||0).toFixed(t.priceSource==="clob"?4:2)}</div>{t.pnl!=null&&<div style={{fontSize:12,fontWeight:700,color:ac,marginTop:1}}>{pnlS(t.pnl)}</div>}</div><div style={{textAlign:"right",flexShrink:0,minWidth:44}}><span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${ac}22`,color:ac,textTransform:"uppercase"}}>{t.status||"open"}</span><div style={{fontSize:8,color:"var(--d)",fontFamily:"var(--mono)",marginTop:3}}>{ts(t.timestamp)}</div></div><span style={{fontSize:10,color:"var(--d)",transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)"}}>▾</span></div>
{expanded&&<div className="fu" style={{padding:"10px 14px 14px 54px",background:"var(--s2)",borderBottom:"1px solid var(--s3)"}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,fontSize:11,fontFamily:"var(--mono)"}}><div><span style={{color:"var(--d)"}}>Entry Price</span><br/><span style={{fontWeight:600}}>${(t.entryPrice||0).toFixed(4)}</span></div><div><span style={{color:"var(--d)"}}>Shares</span><br/><span style={{fontWeight:600}}>{t.shares||"—"}</span></div><div><span style={{color:"var(--d)"}}>Cost</span><br/><span style={{fontWeight:600}}>${(t.cost||0).toFixed(2)}</span></div><div><span style={{color:"var(--d)"}}>P&L</span><br/><span style={{fontWeight:600,color:pnlC(t.pnl)}}>{pnlS(t.pnl)}</span></div><div><span style={{color:"var(--d)"}}>Edge / EV</span><br/><span style={{fontWeight:600}}>{t.edgePct!=null?`+${typeof t.edgePct==="number"?t.edgePct.toFixed(1):t.edgePct}%`:""}{t.ev?` · +${(t.ev*100).toFixed(1)}¢`:""}</span></div><div><span style={{color:"var(--d)"}}>Confidence</span><br/><span style={{fontWeight:600}}>{t.confidence?`${(t.confidence*100).toFixed(1)}%`:"—"}</span></div><div><span style={{color:"var(--d)"}}>Price Source</span><br/><span style={{fontWeight:600}}>{t.priceSource==="clob"?"CLOB (Live)":t.priceSource==="gamma"?"Gamma API":t.priceSource||"Estimate"}</span></div><div><span style={{color:"var(--d)"}}>Spread</span><br/><span style={{fontWeight:600}}>{t.spread?`${(t.spread*100).toFixed(2)}%`:"—"}</span></div>{t.synthProb!=null&&<div><span style={{color:"var(--d)"}}>Synth Prob</span><br/><span style={{fontWeight:600}}>{(t.synthProb*100).toFixed(1)}%</span></div>}{t.polyProb!=null&&<div><span style={{color:"var(--d)"}}>Poly Prob</span><br/><span style={{fontWeight:600}}>{(t.polyProb*100).toFixed(1)}%</span></div>}<div><span style={{color:"var(--d)"}}>Time</span><br/><span style={{fontWeight:600}}>{tsf(t.timestamp)}</span></div><div><span style={{color:"var(--d)"}}>Engine / Layer</span><br/><span style={{fontWeight:600}}>{t.engine||"—"} / {t.layer||t.level||"—"}</span></div></div></div>}</>}

function PosRow({p}){return<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid var(--s3)"}}><span style={{fontSize:14}}>{ic[p.sport]||"🎯"}</span><EngBadge engine={p.engine}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600}}>{p.outcome}</div><div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</div></div><div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11}}><div style={{fontWeight:600}}>${(p.entry_price||0).toFixed(4)} × {p.shares}</div><div style={{color:"var(--d)",fontSize:9,marginTop:2}}>{ts(p.entry_time)}</div></div></div>}

function Sec({children,style:sx}){return<div style={{fontSize:11,fontWeight:600,color:"var(--d)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8,...sx}}>{children}</div>}
function Empty({children}){return<div style={{padding:36,textAlign:"center",color:"var(--d)",fontSize:12}}>{children}</div>}
function EngBadge({engine}){const h=engine==="harvest";return<span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,background:h?"var(--gd)":"#0A1A3D",color:h?"var(--g)":"var(--bl)",textTransform:"uppercase",letterSpacing:".04em"}}>{engine}</span>}
function LayerBadge({layer}){const c={snipe:{bg:"var(--gd)",c:"var(--g)"},synth:{bg:"#1A0A3D",c:"var(--p)"},arb:{bg:"#3D2A0A",c:"var(--a)"}};const s=c[layer]||c.snipe;return<span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:s.bg,color:s.c,textTransform:"uppercase",letterSpacing:".05em"}}>{layer}</span>}
function LevelBadge({level}){const c={blowout:{bg:"var(--gd)",c:"var(--g)"},strong:{bg:"#0A1A3D",c:"var(--bl)"},safe:{bg:"#3D2A0A",c:"var(--a)"},final:{bg:"#1A0A3D",c:"var(--p)"}};const s=c[level]||{bg:"var(--s3)",c:"var(--d)"};return<span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:s.bg,color:s.c,textTransform:"uppercase",letterSpacing:".05em"}}>{level}</span>}
function StatusPill({on,label,color}){return<div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:10,background:on?`${color}18`:"var(--s3)",fontSize:9,fontWeight:600,fontFamily:"var(--mono)"}}><span style={{width:5,height:5,borderRadius:3,background:on?color:"var(--d)"}}/><span style={{color:on?color:"var(--d)"}}>{label}</span></div>}

function Sparkline({data=[],color="var(--g)",h=48,showZero}){
  if(data.length<2)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--d)",fontSize:10,fontFamily:"var(--mono)"}}>awaiting data…</div>;
  const w=700,pad=4;const mn=Math.min(...data,showZero?0:Infinity),mx=Math.max(...data,showZero?0:-Infinity),r=mx-mn||1;
  const toY=v=>h-pad-((v-mn)/r)*(h-pad*2);
  const pts=data.map((v,i)=>({x:pad+(i/(data.length-1))*(w-pad*2),y:toY(v)}));
  const dd=pts.map(p=>`${p.x},${p.y}`).join(" ");const last=pts[pts.length-1];
  const uid=`sp${Math.random().toString(36).slice(2,7)}`;const zeroY=showZero?toY(0):null;
  return<svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
    <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    {showZero&&zeroY!=null&&<line x1={pad} y1={zeroY} x2={w-pad} y2={zeroY} stroke="var(--s3)" strokeWidth="1" strokeDasharray="4,4"/>}
    <polygon points={`${pts[0].x},${h} ${dd} ${last.x},${h}`} fill={`url(#${uid})`}/>
    <polyline points={dd} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={last.x} cy={last.y} r="3.5" fill={color}><animate attributeName="r" values="3.5;5.5;3.5" dur="2s" repeatCount="indefinite"/></circle>
  </svg>;
}
