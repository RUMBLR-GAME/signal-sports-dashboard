import { useState, useEffect, useCallback, useRef } from "react";

const API = "https://web-production-72709.up.railway.app/api/state";
const POLL = 3000;
const M = "'DM Mono',monospace";
const S = "'DM Sans',-apple-system,sans-serif";
const fmt = (iso) => !iso ? "—" : new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
const sportIcon = {nba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",wnba:"🏀",epl:"⚽",mls:"⚽",liga:"⚽",BTC:"₿",ETH:"⟠",SOL:"◎"};
const lvlColor = {blowout:"#22C55E",strong:"#3B82F6",safe:"#EAB308",final:"#A855F7",moderate:"#3B82F6",weak:"#EAB308"};
const lvlBg = {blowout:"#D1FAE5",strong:"#DBEAFE",safe:"#FEF3C7",final:"#F3E8FF",moderate:"#DBEAFE",weak:"#FEF3C7"};

function Chart({data=[],w=280,h=60,color="#22C55E"}){
  if(data.length<2)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#D4D4D4",fontSize:11}}>Building...</div>;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1,p=3;
  const pts=data.map((v,i)=>({x:p+(i/(data.length-1))*(w-p*2),y:h-p-((v-mn)/rng)*(h-p*2)}));
  const line=pts.map(pt=>`${pt.x},${pt.y}`).join(" ");
  const last=pts[pts.length-1];
  return(<svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".12"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`${pts[0].x},${h} ${line} ${last.x},${h}`} fill="url(#cg)"/>
    <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={last.x} cy={last.y} r="3" fill={color}/>
    <circle cx={last.x} cy={last.y} r="7" fill={color} opacity=".15"><animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite"/></circle>
  </svg>);
}

function Pulse({color="#22C55E",size=7}){
  return<span style={{position:"relative",display:"inline-flex",width:size,height:size,alignItems:"center",justifyContent:"center"}}>
    <span style={{position:"absolute",width:size,height:size,borderRadius:"50%",background:color,opacity:.25,animation:"pulse 2s ease infinite"}}/>
    <span style={{width:size*.6,height:size*.6,borderRadius:"50%",background:color,position:"relative"}}/>
  </span>;
}

export default function App(){
  const[s,setS]=useState(null);const[conn,setConn]=useState(false);
  const[page,setPage]=useState("harvest");const[bankH,setBankH]=useState([1000]);const[pnlH,setPnlH]=useState([0]);
  const[alerts,setAlerts]=useState([]);const[alertN,setAlertN]=useState(0);const prevTC=useRef(0);

  const poll=useCallback(async()=>{
    try{const r=await fetch(API);if(!r.ok)throw 0;const d=await r.json();setS(d);setConn(true);
      setBankH(p=>[...p.slice(-59),d.equity||1000]);setPnlH(p=>[...p.slice(-59),d.pnl||0]);
      const trades=d.trade_history||[];
      if(trades.length>prevTC.current&&prevTC.current>0){
        const t=trades[0];const resolved=t.status==="won"||t.status==="lost";
        setAlerts(p=>[{type:resolved?(t.pnl>0?"win":"loss"):(t.engine||"harvest"),
          msg:resolved?`${t.status.toUpperCase()} ${t.outcome||t.event} → $${(t.pnl||0).toFixed(2)}`:`${(t.engine||"").toUpperCase()} ${t.outcome||t.event} @ $${(t.entryPrice||0).toFixed(2)}`,
          engine:t.engine,t:t.timestamp},...p].slice(0,80));
        setAlertN(c=>c+1);}
      prevTC.current=trades.length;
    }catch{setConn(false);}
  },[]);
  useEffect(()=>{poll();const t=setInterval(poll,POLL);return()=>clearInterval(t);},[poll]);

  const d=s||{};const games=d.verified_games||[];const hTargets=d.harvest_targets||[];
  const sSignals=d.synth_signals||[];const trades=d.trade_history||[];
  const openPos=d.open_positions||[];const eq=d.equity||0;const pnl=d.pnl||0;
  const engines=d.engines||{};

  const navItems=[{id:"harvest",l:"Harvest"},{id:"synth",l:"Synth"},{id:"positions",l:"Positions"},{id:"trades",l:"History"},{id:"alerts",l:"Feed",badge:alertN||null},{id:"about",l:"About"}];

  return(<div style={{fontFamily:S,background:"#FAFAF9",minHeight:"100vh",color:"#1a1a1a"}}>
    <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.25}50%{transform:scale(2.5);opacity:0}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .fin{animation:fadeUp .3s ease-out}*{box-sizing:border-box;scrollbar-width:thin}body{margin:0}
      @media(max-width:768px){.hide-m{display:none!important}.g1{grid-template-columns:1fr!important}}`}</style>

    <header style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:50,position:"sticky",top:0,zIndex:50}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:15,fontWeight:700,letterSpacing:"-0.02em"}}>SIGNAL</span>
        <span style={{width:1,height:16,background:"#E5E5E5"}}/>
        <span style={{fontSize:11,color:"#A3A3A3",letterSpacing:".12em",fontWeight:500}}>HARVEST + SYNTH</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Pulse color={!conn?"#EF4444":d.scanning?"#EAB308":"#22C55E"}/>
        <span style={{fontSize:11,color:"#A3A3A3",fontFamily:M}}>{!conn?"Offline":d.scanning?"Scanning":"Live"}</span>
        <button onClick={()=>{setPage("alerts");setAlertN(0)}} style={{background:"none",border:"none",cursor:"pointer",position:"relative",padding:4,display:"flex"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={alertN>0?"#3B82F6":"#ccc"} strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          {alertN>0&&<span style={{position:"absolute",top:0,right:0,width:13,height:13,borderRadius:7,background:"#3B82F6",color:"#fff",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{alertN>9?"9+":alertN}</span>}
        </button>
      </div>
    </header>

    <nav style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"0 20px",display:"flex",gap:0,overflowX:"auto",position:"sticky",top:50,zIndex:40}}>
      {navItems.map(t=><button key={t.id} onClick={()=>{setPage(t.id);if(t.id==="alerts")setAlertN(0)}} style={{fontSize:12,fontFamily:S,padding:"11px 14px",background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap",color:page===t.id?"#1a1a1a":"#A3A3A3",fontWeight:page===t.id?600:400,borderBottom:page===t.id?"2px solid #1a1a1a":"2px solid transparent"}}>
        {t.l}{t.badge&&<span style={{marginLeft:4,width:14,height:14,borderRadius:7,background:"#3B82F6",color:"#fff",fontSize:7,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",verticalAlign:"middle"}}>{t.badge>9?"9+":t.badge}</span>}
      </button>)}
    </nav>

    <main style={{maxWidth:1200,margin:"0 auto",padding:"20px 20px 80px"}}>
      {!conn&&<div style={{padding:"12px 16px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,marginBottom:16,fontSize:13,color:"#991B1B"}}><strong>Bot offline.</strong> Check Railway deployment.</div>}

      {/* KPIs */}
      {conn&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginBottom:16}} className="g1">
        <div style={card}><div style={lbl}>Equity</div><div style={{fontSize:24,fontWeight:600,fontFamily:M}}>${Math.round(eq).toLocaleString()}</div><Chart data={bankH} color={pnl>=0?"#22C55E":"#EF4444"}/></div>
        <div style={card}><div style={lbl}>P&L</div><div style={{fontSize:24,fontWeight:600,fontFamily:M,color:pnl>=0?"#22C55E":"#EF4444"}}>{pnl>=0?"+":""}${pnl.toFixed(2)}</div><Chart data={pnlH} color={pnl>=0?"#22C55E":"#EF4444"}/></div>
        <div style={card}><div style={lbl}>Win Rate</div><div style={{fontSize:24,fontWeight:600,fontFamily:M}}>{((d.win_rate||0)*100).toFixed(1)}%</div><div style={{marginTop:6,fontSize:11,color:"#737373"}}>{d.wins||0}W / {(d.trades||0)-(d.wins||0)}L of {d.trades||0}</div></div>
        <div style={card}><div style={lbl}>Engines</div>
          <div style={{display:"flex",gap:8,marginTop:6}}>{[{l:"Harvest",on:engines.harvest},{l:"Synth",on:engines.synth}].map(e=><div key={e.l} style={{display:"flex",alignItems:"center",gap:4}}><Pulse color={e.on?"#22C55E":"#D4D4D4"} size={6}/><span style={{fontSize:11,color:e.on?"#525252":"#D4D4D4"}}>{e.l}</span></div>)}</div>
          <div style={{marginTop:6,fontSize:11,color:"#737373"}}>Open: {d.open_count||0} · Exp: ${Math.round(d.exposure||0)}</div>
        </div>
      </div>}

      {/* HARVEST TAB */}
      {page==="harvest"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:600}}>ESPN Verified Games</span>
          <span style={{fontSize:11,color:"#D4D4D4"}}>{games.filter(g=>g.level!=="final").length} live · {games.length} total</span>
        </div>
        {!games.length&&<div style={empty}>No verified games right now</div>}
        {games.length>0&&<div style={{...tbl,marginBottom:16}}>
          <div style={{...th,gridTemplateColumns:"40px 1fr 90px 50px 70px 70px"}}><span></span><span>Score</span><span>Status</span><span>Lead</span><span>Conf</span><span>Level</span></div>
          {games.filter(g=>g.level!=="final").slice(0,15).map((g,i)=><div key={i} className="fin" style={{...tr,gridTemplateColumns:"40px 1fr 90px 50px 70px 70px"}}>
            <span>{sportIcon[g.sport]||"🎮"}</span>
            <span style={{fontFamily:M,fontSize:12,fontWeight:500}}>{g.scoreLine}</span>
            <span style={{fontSize:11,color:"#737373"}}>{g.period} {g.clock}</span>
            <span style={{fontFamily:M,fontWeight:600,color:"#22C55E"}}>+{g.lead}</span>
            <span style={{fontFamily:M,fontSize:11,color:g.confidence>=0.995?"#22C55E":"#3B82F6"}}>{(g.confidence*100).toFixed(1)}%</span>
            <span style={{fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:5,background:lvlBg[g.level],color:lvlColor[g.level],textTransform:"uppercase"}}>{g.level}</span>
          </div>)}
        </div>}
        <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>Harvest Targets</div>
        {!hTargets.length&&<div style={empty}>No targets — waiting for live blowouts on Polymarket</div>}
        {hTargets.length>0&&<div style={tbl}>
          <div style={{...th,gridTemplateColumns:"40px 1fr 1fr 60px 60px 70px"}}><span></span><span>Outcome</span><span>Score</span><span>Price</span><span>Return</span><span>Level</span></div>
          {hTargets.map((t,i)=><div key={i} className="fin" style={{...tr,gridTemplateColumns:"40px 1fr 1fr 60px 60px 70px"}}>
            <span>{sportIcon[t.sport]||"🎮"}</span>
            <span style={{fontWeight:500,fontSize:12}}>{t.outcome}</span>
            <span style={{fontFamily:M,fontSize:11,color:"#737373"}}>{t.scoreLine}</span>
            <span style={{fontFamily:M}}>${(t.price||0).toFixed(2)}</span>
            <span style={{fontFamily:M,fontWeight:600,color:"#22C55E"}}>+{((t.return||0)*100).toFixed(1)}%</span>
            <span style={{fontSize:8,fontWeight:600,padding:"2px 7px",borderRadius:5,background:lvlBg[t.level],color:lvlColor[t.level],textTransform:"uppercase"}}>{t.level}</span>
          </div>)}
        </div>}
      </>}

      {/* SYNTH TAB */}
      {page==="synth"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:600}}>Synth SN50 Signals</span>
          <span style={{fontSize:11,color:"#D4D4D4"}}>BTC · ETH · SOL │ 15min · Hourly · Daily</span>
        </div>
        {!sSignals.length&&<div style={empty}>{engines.synth?"No edge detected right now — Synth and Polymarket agree":"Synth engine not connected — add SYNTH_API_KEY to Railway"}</div>}
        {sSignals.length>0&&<div style={tbl}>
          <div style={{...th,gridTemplateColumns:"40px 70px 70px 80px 80px 70px 60px 70px"}}><span></span><span>Asset</span><span>Window</span><span>Synth</span><span>Poly</span><span>Edge</span><span>Side</span><span>Conf</span></div>
          {sSignals.map((s,i)=><div key={i} className="fin" style={{...tr,gridTemplateColumns:"40px 70px 70px 80px 80px 70px 60px 70px"}}>
            <span style={{fontSize:16}}>{sportIcon[s.asset]||"🪙"}</span>
            <span style={{fontWeight:600,fontFamily:M}}>{s.asset}</span>
            <span style={{fontSize:11,color:"#737373"}}>{s.timeframe}</span>
            <span style={{fontFamily:M,color:"#22C55E"}}>{((s.synthProb||0)*100).toFixed(1)}% ↑</span>
            <span style={{fontFamily:M,color:"#737373"}}>{((s.polyProb||0)*100).toFixed(1)}% ↑</span>
            <span style={{fontFamily:M,fontWeight:600,color:s.edge>=0.10?"#22C55E":s.edge>=0.07?"#3B82F6":"#EAB308"}}>+{(s.edgePct||0).toFixed(1)}%</span>
            <span style={{fontWeight:600,color:s.direction==="up"?"#22C55E":"#EF4444"}}>{(s.direction||"").toUpperCase()}</span>
            <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,background:lvlBg[s.confidence],color:lvlColor[s.confidence],textTransform:"uppercase"}}>{s.confidence}</span>
          </div>)}
        </div>}
        <div style={{...card,marginTop:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>How Synth Works</div>
          <div style={{fontSize:12,color:"#737373",lineHeight:1.7}}>Synth (Bittensor SN50) runs 200+ AI models that simulate 1,000 price paths for BTC, ETH, and SOL every 12 minutes. When Synth's probability diverges from Polymarket's implied price by more than 5%, we trade the gap. Proven: $2K → $4.2K in 4 weeks in Synth's own Polymarket trial (110% return).</div>
        </div>
      </>}

      {/* POSITIONS */}
      {page==="positions"&&<>
        <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>Open Positions</div>
        {!openPos.length&&<div style={empty}>No open positions</div>}
        {openPos.length>0&&<div style={tbl}>
          <div style={{...th,gridTemplateColumns:"40px 60px 1fr 1fr 60px 50px 70px"}}><span></span><span>Engine</span><span>Outcome</span><span>Detail</span><span>Entry</span><span>Qty</span><span>Level</span></div>
          {openPos.map((p,i)=><div key={i} className="fin" style={{...tr,gridTemplateColumns:"40px 60px 1fr 1fr 60px 50px 70px"}}>
            <span>{sportIcon[p.sport]||"🎮"}</span>
            <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:p.engine==="harvest"?"#D1FAE5":"#DBEAFE",color:p.engine==="harvest"?"#065F46":"#1E40AF",textTransform:"uppercase"}}>{p.engine}</span>
            <span style={{fontWeight:500,fontSize:12}}>{p.outcome}</span>
            <span style={{fontSize:11,color:"#737373",fontFamily:M}}>{p.detail}</span>
            <span style={{fontFamily:M}}>${(p.entry_price||0).toFixed(2)}</span>
            <span style={{fontFamily:M}}>{p.shares}</span>
            <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,background:lvlBg[p.level],color:lvlColor[p.level],textTransform:"uppercase"}}>{p.level}</span>
          </div>)}
        </div>}
      </>}

      {/* TRADE HISTORY */}
      {page==="trades"&&<>
        <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>Trade History</div>
        {!trades.length&&<div style={empty}>No trades yet</div>}
        {trades.length>0&&<div style={tbl}>
          <div style={{...th,gridTemplateColumns:"40px 60px 1fr 60px 60px 70px 70px"}}><span></span><span>Engine</span><span>Outcome</span><span>Entry</span><span>Status</span><span>P&L</span><span>Edge</span></div>
          {trades.slice(0,50).map((t,i)=>{const w=t.status==="won",l=t.status==="lost";return(
            <div key={i} className="fin" style={{...tr,gridTemplateColumns:"40px 60px 1fr 60px 60px 70px 70px"}}>
              <span>{sportIcon[t.sport]||"🎮"}</span>
              <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:t.engine==="harvest"?"#D1FAE5":"#DBEAFE",color:t.engine==="harvest"?"#065F46":"#1E40AF",textTransform:"uppercase"}}>{t.engine||"?"}</span>
              <span style={{fontWeight:500,fontSize:12}}>{t.outcome||t.event}</span>
              <span style={{fontFamily:M}}>${(t.entryPrice||0).toFixed(2)}</span>
              <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,background:w?"#D1FAE5":l?"#FEE2E2":"#F5F5F4",color:w?"#065F46":l?"#991B1B":"#737373",textTransform:"uppercase"}}>{t.status||"open"}</span>
              <span style={{fontFamily:M,fontWeight:600,color:t.pnl>0?"#22C55E":t.pnl<0?"#EF4444":"#737373"}}>{t.pnl!=null?`$${t.pnl>0?"+":""}${t.pnl.toFixed(2)}`:"—"}</span>
              <span style={{fontFamily:M,fontSize:11,color:"#737373"}}>{t.edgePct?`+${t.edgePct.toFixed(1)}%`:t.return?`+${(t.return*100).toFixed(1)}%`:"—"}</span>
            </div>);})}
        </div>}
      </>}

      {/* ALERTS */}
      {page==="alerts"&&<>
        <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>Activity Feed</div>
        <div style={{...card,padding:"4px 16px",maxHeight:500,overflowY:"auto"}}>
          {!alerts.length&&<div style={{padding:32,textAlign:"center",color:"#D4D4D4",fontSize:13}}>Waiting for first trade...</div>}
          {alerts.map((a,i)=>{const c=a.type==="win"?"#22C55E":a.type==="loss"?"#EF4444":a.type==="harvest"?"#22C55E":a.type==="synth"?"#3B82F6":"#A3A3A3";
            return<div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid #F5F5F4"}}>
              <span style={{width:20,height:20,borderRadius:6,background:c+"15",color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{a.type==="win"?"✓":a.type==="loss"?"✗":"▲"}</span>
              <div><div style={{fontSize:13}}>{a.msg}</div><div style={{fontSize:10,color:"#D4D4D4",fontFamily:M,marginTop:2}}>{(a.engine||"").toUpperCase()} · {fmt(a.t)}</div></div>
            </div>;})}
        </div>
      </>}

      {/* ABOUT */}
      {page==="about"&&<>
        <div style={{fontSize:20,fontWeight:600,marginBottom:16}}>Signal Harvest + Synth</div>
        <div style={{...card,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Engine 1: ESPN Verified Harvest</div>
          <div style={{fontSize:13,color:"#737373",lineHeight:1.7}}>ESPN's free API gives us real-time scores across 10 sports. When a team has a commanding lead late in the game (e.g., +25 in the 4th quarter), we buy their Polymarket shares at 85-97c. Game ends, shares pay $1, we pocket the difference. Win rate: 99%+ on verified blowouts.</div>
        </div>
        <div style={{...card,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Engine 2: Synth SN50 Crypto</div>
          <div style={{fontSize:13,color:"#737373",lineHeight:1.7}}>Bittensor Subnet 50 runs 200+ competing AI models that generate probabilistic price forecasts for BTC, ETH, and SOL. When Synth's probability diverges from Polymarket's price by more than 5%, we trade the divergence. Covers 15-minute, hourly, and daily markets — 363 trading windows per day, running 24/7.</div>
        </div>
        <div style={{...card,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Compounding</div>
          <div style={{fontSize:13,color:"#737373",lineHeight:1.7}}>Both engines share one bankroll. As equity grows, position sizes grow automatically (12% of equity per harvest, 4-8% per Synth trade). Harvest provides steady 99% win-rate compounding during game hours. Synth provides 24/7 volume with 5-10% edge per trade. Together they compound faster than either alone.</div>
        </div>
        <div style={{...card}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Data Sources</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{n:"ESPN",d:"Free, no key",s:"Live scores, 10 sports"},{n:"Synth SN50",d:"$199/mo API",s:"BTC/ETH/SOL forecasts"},{n:"Polymarket",d:"Free Gamma API",s:"Market discovery"},{n:"Polymarket CLOB",d:"For live execution",s:"Order placement"}].map(x=>
              <div key={x.n} style={{border:"1px solid #F0F0EE",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:12,fontWeight:600}}>{x.n}</div>
                <div style={{fontSize:10,color:"#A3A3A3"}}>{x.d}</div>
                <div style={{fontSize:11,color:"#737373",marginTop:2}}>{x.s}</div>
              </div>)}
          </div>
        </div>
        <div style={{fontSize:11,color:"#D4D4D4",marginTop:16,textAlign:"center"}}>Signal Harvest + Synth · Paper Trading · Not Financial Advice</div>
      </>}
    </main>
    <footer style={{borderTop:"1px solid #EBEBEB",padding:"14px 20px",textAlign:"center",fontSize:10,color:"#D4D4D4"}}>Signal · Harvest + Synth · Research Only</footer>
  </div>);
}

const card={background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,padding:"14px 16px"};
const lbl={fontSize:9,color:"#A3A3A3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4};
const empty={padding:40,textAlign:"center",color:"#D4D4D4",fontSize:13,background:"#fff",border:"1px solid #EBEBEB",borderRadius:10};
const tbl={background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"};
const th={display:"grid",padding:"8px 12px",borderBottom:"1px solid #EBEBEB",fontSize:9,color:"#A3A3A3",textTransform:"uppercase",letterSpacing:".05em",alignItems:"center"};
const tr={display:"grid",padding:"10px 12px",borderBottom:"1px solid #F5F5F4",alignItems:"center",fontSize:13};
