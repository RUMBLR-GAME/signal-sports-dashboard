import{useState,useEffect,useCallback,useRef}from"react";

const API="https://web-production-72709.up.railway.app/api/state";
const P=3000;
const M="'DM Mono',monospace";
const S="'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif";
const fmt=i=>!i?"—":new Date(i).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
const fmtShort=i=>!i?"—":new Date(i).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const ic={nba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",wnba:"🏀",epl:"⚽",mls:"⚽",liga:"⚽",BTC:"₿",ETH:"⟠",SOL:"◎"};
const lc={blowout:"#16A34A",strong:"#2563EB",safe:"#CA8A04",final:"#9333EA",snipe:"#0891B2",synth:"#7C3AED",moderate:"#2563EB",weak:"#CA8A04"};
const lb={blowout:"#DCFCE7",strong:"#DBEAFE",safe:"#FEF9C3",final:"#F3E8FF",snipe:"#CFFAFE",synth:"#EDE9FE",moderate:"#DBEAFE",weak:"#FEF9C3"};

function Spark({data=[],w=240,h=48,color="#16A34A"}){
  if(data.length<2)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#D4D4D8",fontSize:10,fontFamily:M}}>awaiting data...</div>;
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1,pad=2;
  const pts=data.map((v,i)=>({x:pad+(i/(data.length-1))*(w-pad*2),y:h-pad-((v-mn)/r)*(h-pad*2)}));
  const d=pts.map(p=>`${p.x},${p.y}`).join(" ");const last=pts[pts.length-1];
  return<svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
    <defs><linearGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".10"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`${pts[0].x},${h} ${d} ${last.x},${h}`} fill={`url(#g${color.slice(1)})`}/>
    <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={last.x} cy={last.y} r="2.5" fill={color}/>
  </svg>;
}

function Dot({on=false,color="#16A34A"}){return<span style={{width:6,height:6,borderRadius:3,background:on?color:"#D4D4D8",display:"inline-block",boxShadow:on?`0 0 6px ${color}40`:""}}/>}
function Badge({text,bg="#F4F4F5",color="#71717A"}){return<span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,background:bg,color,textTransform:"uppercase",letterSpacing:".03em",whiteSpace:"nowrap"}}>{text}</span>}
function EngineBadge({engine}){const h=engine==="harvest";return<Badge text={engine} bg={h?"#DCFCE7":"#DBEAFE"} color={h?"#166534":"#1E40AF"}/>}
function StatusBadge({status}){const w=status==="won",l=status==="lost";return<Badge text={status||"open"} bg={w?"#DCFCE7":l?"#FEE2E2":"#F4F4F5"} color={w?"#166534":l?"#991B1B":"#71717A"}/>}

export default function App(){
  const[s,setS]=useState(null);const[conn,setConn]=useState(false);const[tab,setTab]=useState("feed");
  const[eqH,setEqH]=useState([]);const[pnlH,setPnlH]=useState([]);

  const poll=useCallback(async()=>{try{const r=await fetch(API);if(!r.ok)throw 0;const d=await r.json();setS(d);setConn(true);setEqH(p=>[...p.slice(-119),d.equity||0]);setPnlH(p=>[...p.slice(-119),d.pnl||0])}catch{setConn(false)}},[]);
  useEffect(()=>{poll();const t=setInterval(poll,P);return()=>clearInterval(t)},[poll]);

  const d=s||{};const eq=d.equity||0;const pnl=d.pnl||0;const wr=d.win_rate||0;
  const trades=d.trade_history||[];const log=d.log||[];const games=d.verified_games||[];
  const targets=d.harvest_targets||[];const signals=d.synth_signals||[];const openPos=d.open_positions||[];const eng=d.engines||{};

  const tabs=[{id:"feed",l:"Live Feed"},{id:"harvest",l:"Harvest"},{id:"synth",l:"Crypto"},{id:"positions",l:"Positions"},{id:"history",l:"History"},{id:"about",l:"About"}];

  return<div style={{fontFamily:S,background:"#FAFAFA",minHeight:"100vh",color:"#18181B"}}>
    <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fadeIn .25s ease-out}*{box-sizing:border-box;margin:0}body{margin:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#E4E4E7;border-radius:2px}@media(max-width:768px){.g1{grid-template-columns:1fr!important}.hm{display:none!important}.ow{overflow-x:auto}}`}</style>

    <header style={{background:"#18181B",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"#FAFAFA",fontSize:14,fontWeight:700,letterSpacing:"-0.02em"}}>SIGNAL</span><span style={{color:"#52525B",fontSize:11,letterSpacing:".08em"}}>HARVEST + SYNTH</span></div>
      <div style={{display:"flex",alignItems:"center",gap:10}}><Dot on={conn} color={conn?"#22C55E":"#EF4444"}/><span style={{color:"#A1A1AA",fontSize:10,fontFamily:M}}>{conn?"LIVE":"OFFLINE"}</span></div>
    </header>

    {conn&&<div style={{background:"#fff",borderBottom:"1px solid #E4E4E7",padding:"12px 24px"}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}} className="g1">
      <div><div style={kl}>Equity</div><div style={{fontSize:22,fontWeight:700,fontFamily:M}}>${Math.round(eq).toLocaleString()}</div><Spark data={eqH} color={pnl>=0?"#16A34A":"#DC2626"}/></div>
      <div><div style={kl}>P&L</div><div style={{fontSize:22,fontWeight:700,fontFamily:M,color:pnl>=0?"#16A34A":"#DC2626"}}>{pnl>=0?"+":""}${pnl.toFixed(2)}</div><Spark data={pnlH} color={pnl>=0?"#16A34A":"#DC2626"}/></div>
      <div><div style={kl}>Win Rate</div><div style={{fontSize:22,fontWeight:700,fontFamily:M}}>{(wr*100).toFixed(1)}%</div><div style={{fontSize:10,color:"#A1A1AA",marginTop:2}}>{d.wins||0}W / {(d.trades||0)-(d.wins||0)}L of {d.trades||0}</div></div>
      <div><div style={kl}>ROI</div><div style={{fontSize:22,fontWeight:700,fontFamily:M,color:(d.roi||0)>=0?"#16A34A":"#DC2626"}}>{(d.roi||0)>=0?"+":""}{(d.roi||0).toFixed(1)}%</div><div style={{fontSize:10,color:"#A1A1AA",marginTop:2}}>from ${d.starting||1000}</div></div>
      <div><div style={kl}>Engines</div><div style={{display:"flex",gap:8,marginTop:4}}><div style={{display:"flex",alignItems:"center",gap:4}}><Dot on={eng.harvest} color="#16A34A"/><span style={{fontSize:11,color:eng.harvest?"#18181B":"#D4D4D8"}}>Harvest</span></div><div style={{display:"flex",alignItems:"center",gap:4}}><Dot on={eng.synth} color="#2563EB"/><span style={{fontSize:11,color:eng.synth?"#18181B":"#D4D4D8"}}>Synth</span></div></div><div style={{fontSize:10,color:"#A1A1AA",marginTop:4}}>Open: {d.open_count||0} · Exp: ${Math.round(d.exposure||0)}</div></div>
    </div></div>}

    <nav style={{background:"#fff",borderBottom:"1px solid #E4E4E7",padding:"0 24px",display:"flex",gap:0,overflowX:"auto"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:12,fontFamily:S,fontWeight:tab===t.id?600:400,padding:"10px 16px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?"#18181B":"#A1A1AA",borderBottom:tab===t.id?"2px solid #18181B":"2px solid transparent",whiteSpace:"nowrap"}}>{t.l}</button>)}
    </nav>

    <main style={{maxWidth:1100,margin:"0 auto",padding:"20px 24px 80px"}}>

      {tab==="feed"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
          <span style={{fontSize:16,fontWeight:700}}>Live Feed</span>
          <span style={{fontSize:10,color:"#A1A1AA",fontFamily:M}}>{d.last_scan?fmt(d.last_scan):"—"}</span>
        </div>
        {openPos.length>0&&<div style={{...card,marginBottom:12,borderLeft:"3px solid #2563EB"}}><div style={{fontSize:11,fontWeight:600,color:"#2563EB",marginBottom:6}}>OPEN ({openPos.length})</div>
          {openPos.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12}}><span>{ic[p.sport]||"🎯"}</span><EngineBadge engine={p.engine}/><span style={{fontWeight:500}}>{p.outcome}</span><span style={{color:"#A1A1AA",fontFamily:M,fontSize:11}}>@ ${(p.entry_price||0).toFixed(2)} ×{p.shares}</span><span style={{marginLeft:"auto",fontSize:9,color:"#A1A1AA",fontFamily:M}}>{fmtShort(p.entry_time)}</span></div>)}
        </div>}
        <div style={{...card,padding:0}}>
          {!trades.length&&!log.length&&<div style={{padding:40,textAlign:"center",color:"#D4D4D8",fontSize:13}}>Waiting for first trade...</div>}
          {trades.map((t,i)=>{const w=t.status==="won",l=t.status==="lost",o=!w&&!l;const pc=w?"#16A34A":l?"#DC2626":"#A1A1AA";const bg=w?"#F0FDF4":l?"#FEF2F2":o?"#EFF6FF":"#FAFAFA";
            return<div key={t.id||i} className="fi" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #F4F4F5",background:bg}}>
              <span style={{width:22,height:22,borderRadius:6,background:pc+"18",color:pc,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{w?"✓":l?"✗":"▶"}</span>
              <span style={{fontSize:15}}>{ic[t.sport]||"🎯"}</span>
              <EngineBadge engine={t.engine||"synth"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.outcome||t.event||"Trade"}</div>
                <div style={{fontSize:10,color:"#A1A1AA",fontFamily:M,marginTop:1}}>{t.timeframe?`${t.timeframe} · `:""}{t.scoreLine||t.detail||""}{t.edgePct?` · Edge +${typeof t.edgePct==="number"?t.edgePct.toFixed(1):t.edgePct}%`:""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:M,fontSize:12,fontWeight:600}}>@ ${(t.entryPrice||0).toFixed(2)}</div>{t.pnl!=null&&t.pnl!==undefined&&<div style={{fontFamily:M,fontSize:12,fontWeight:700,color:pc}}>{t.pnl>0?"+":""}${t.pnl.toFixed(2)}</div>}</div>
              <div style={{textAlign:"right",flexShrink:0,minWidth:50}}><StatusBadge status={t.status}/><div style={{fontSize:9,color:"#D4D4D8",fontFamily:M,marginTop:2}}>{fmtShort(t.timestamp)}</div></div>
            </div>})}
          {log.length>0&&<div style={{borderTop:trades.length?"1px solid #E4E4E7":"none"}}><div style={{padding:"8px 16px",fontSize:10,fontWeight:600,color:"#A1A1AA",background:"#FAFAFA"}}>ENGINE LOG</div>
            {log.slice(0,30).map((l,i)=><div key={i} style={{padding:"5px 16px",fontSize:11,color:"#71717A",fontFamily:M,borderBottom:"1px solid #FAFAFA",lineHeight:1.5}}><span style={{color:"#D4D4D8",marginRight:8}}>{fmtShort(l.t)}</span>{l.m}</div>)}
          </div>}
        </div>
      </>}

      {tab==="harvest"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}><span style={{fontSize:16,fontWeight:700}}>ESPN Verified Games</span><span style={{fontSize:10,color:"#A1A1AA"}}>{games.filter(g=>g.level!=="final").length} live · {games.length} total</span></div>
        {!games.length&&<div style={empty}>No verified games</div>}
        {games.length>0&&<div style={{...card,padding:0}} className="ow">
          <div style={{...th,gridTemplateColumns:"36px 1fr 80px 44px 60px 64px",minWidth:400}}><span></span><span>Score</span><span>Status</span><span>Lead</span><span>Conf</span><span>Level</span></div>
          {games.filter(g=>g.level!=="final").concat(games.filter(g=>g.level==="final")).slice(0,20).map((g,i)=><div key={i} className="fi" style={{...tr,gridTemplateColumns:"36px 1fr 80px 44px 60px 64px",minWidth:400,opacity:g.level==="final"?0.45:1}}>
            <span>{ic[g.sport]||"🎮"}</span><span style={{fontFamily:M,fontSize:11,fontWeight:500}}>{g.scoreLine}</span><span style={{fontSize:10,color:"#A1A1AA"}}>{g.period} {g.clock}</span><span style={{fontFamily:M,fontWeight:600,color:"#16A34A",fontSize:12}}>+{g.lead}</span><span style={{fontFamily:M,fontSize:10,color:g.confidence>=0.995?"#16A34A":"#2563EB"}}>{(g.confidence*100).toFixed(1)}%</span><Badge text={g.level} bg={lb[g.level]} color={lc[g.level]}/>
          </div>)}
        </div>}
        {targets.length>0&&<><div style={{fontSize:14,fontWeight:600,marginTop:20,marginBottom:10}}>Harvest Targets</div><div style={{...card,padding:0}} className="ow">
          <div style={{...th,gridTemplateColumns:"36px 1fr 1fr 56px 56px 64px",minWidth:380}}><span></span><span>Outcome</span><span>Score</span><span>Price</span><span>Return</span><span>Level</span></div>
          {targets.map((t,i)=><div key={i} className="fi" style={{...tr,gridTemplateColumns:"36px 1fr 1fr 56px 56px 64px",minWidth:380}}><span>{ic[t.sport]||"🎮"}</span><span style={{fontWeight:500,fontSize:12}}>{t.outcome}</span><span style={{fontFamily:M,fontSize:10,color:"#A1A1AA"}}>{t.scoreLine}</span><span style={{fontFamily:M,fontSize:12}}>${(t.price||0).toFixed(2)}</span><span style={{fontFamily:M,fontSize:12,fontWeight:600,color:"#16A34A"}}>+{((t.return||0)*100).toFixed(1)}%</span><Badge text={t.level} bg={lb[t.level]} color={lc[t.level]}/></div>)}
        </div></>}
      </>}

      {tab==="synth"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}><span style={{fontSize:16,fontWeight:700}}>Crypto Engine</span><span style={{fontSize:10,color:"#A1A1AA"}}>BTC · ETH │ 5min · 15min · Hourly</span></div>
        {signals.length>0&&<div style={{...card,padding:0,marginBottom:12}} className="ow">
          <div style={{...th,gridTemplateColumns:"36px 60px 60px 70px 70px 60px 50px",minWidth:420}}><span></span><span>Asset</span><span>Window</span><span>Synth</span><span>Poly</span><span>Edge</span><span>Side</span></div>
          {signals.map((sg,i)=><div key={i} className="fi" style={{...tr,gridTemplateColumns:"36px 60px 60px 70px 70px 60px 50px",minWidth:420}}>
            <span style={{fontSize:15}}>{ic[sg.asset]||"🪙"}</span><span style={{fontWeight:600,fontFamily:M,fontSize:12}}>{sg.asset}</span><span style={{fontSize:10,color:"#A1A1AA"}}>{sg.timeframe}</span><span style={{fontFamily:M,fontSize:11,color:"#16A34A"}}>{sg.synthProb?((sg.synthProb)*100).toFixed(0)+"%":"—"}</span><span style={{fontFamily:M,fontSize:11,color:"#A1A1AA"}}>{sg.polyProb?((sg.polyProb)*100).toFixed(0)+"%":"—"}</span><span style={{fontFamily:M,fontWeight:600,fontSize:11,color:sg.edge>=0.10?"#16A34A":"#2563EB"}}>+{(sg.edgePct||0).toFixed(1)}%</span><span style={{fontWeight:600,fontSize:11,color:sg.direction==="up"?"#16A34A":"#DC2626"}}>{(sg.direction||"").toUpperCase()}</span>
          </div>)}
        </div>}
        {!signals.length&&<div style={empty}>{eng.synth?"Scanning for latency snipe opportunities...":"Crypto engine offline"}</div>}
        {(()=>{const ct=trades.filter(t=>t.engine==="synth");if(!ct.length)return null;return<><div style={{fontSize:14,fontWeight:600,marginTop:16,marginBottom:10}}>Recent Crypto Trades</div><div style={{...card,padding:0}}>
          {ct.slice(0,20).map((t,i)=>{const w=t.status==="won",l=t.status==="lost";return<div key={i} className="fi" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderBottom:"1px solid #F4F4F5"}}><span>{ic[t.sport]||"₿"}</span><span style={{fontFamily:M,fontSize:11,fontWeight:500}}>{t.outcome||t.event}</span><span style={{fontSize:10,color:"#A1A1AA",fontFamily:M}}>{t.timeframe||""}</span><span style={{fontFamily:M,fontSize:11}}>@ ${(t.entryPrice||0).toFixed(2)}</span><span style={{marginLeft:"auto"}}><StatusBadge status={t.status}/></span><span style={{fontFamily:M,fontWeight:600,fontSize:12,color:w?"#16A34A":l?"#DC2626":"#A1A1AA",minWidth:60,textAlign:"right"}}>{t.pnl!=null?`${t.pnl>0?"+":""}$${t.pnl.toFixed(2)}`:"—"}</span><span style={{fontSize:9,color:"#D4D4D8",fontFamily:M}}>{fmtShort(t.timestamp)}</span></div>})}</div></>;})()}
        <div style={{...card,marginTop:16}}><div style={{fontSize:13,fontWeight:600,marginBottom:6}}>How It Works</div><div style={{fontSize:12,color:"#71717A",lineHeight:1.8}}><strong>Layer 1 — Latency Snipe:</strong> Binance real-time price feed. At T-30s before a 5-min or 15-min window closes, if BTC/ETH has moved decisively, buy the winning side. 98% win rate. Same strategy as the $313→$438K bot.<br/><br/><strong>Layer 2 — Synth Edge:</strong> Bittensor SN50 runs 200+ AI models. When probability diverges from Polymarket by &gt;5%, trade the gap. Requires API key ($199/mo).</div></div>
      </>}

      {tab==="positions"&&<><div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Open Positions</div>
        {!openPos.length&&<div style={empty}>No open positions</div>}
        {openPos.length>0&&<div style={{...card,padding:0}} className="ow">
          <div style={{...th,gridTemplateColumns:"36px 56px 1fr 1fr 56px 44px 60px 80px",minWidth:500}}><span></span><span>Engine</span><span>Outcome</span><span>Detail</span><span>Entry</span><span>Qty</span><span>Level</span><span>Time</span></div>
          {openPos.map((p,i)=><div key={i} className="fi" style={{...tr,gridTemplateColumns:"36px 56px 1fr 1fr 56px 44px 60px 80px",minWidth:500}}><span>{ic[p.sport]||"🎯"}</span><EngineBadge engine={p.engine}/><span style={{fontWeight:500,fontSize:12}}>{p.outcome}</span><span style={{fontSize:10,color:"#A1A1AA",fontFamily:M,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</span><span style={{fontFamily:M,fontSize:12}}>${(p.entry_price||0).toFixed(2)}</span><span style={{fontFamily:M,fontSize:12}}>{p.shares}</span><Badge text={p.level} bg={lb[p.level]||"#F4F4F5"} color={lc[p.level]||"#71717A"}/><span style={{fontSize:9,color:"#D4D4D8",fontFamily:M}}>{fmtShort(p.entry_time)}</span></div>)}
        </div>}
      </>}

      {tab==="history"&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}><span style={{fontSize:16,fontWeight:700}}>Trade History</span><span style={{fontSize:10,color:"#A1A1AA"}}>{trades.length} trades · {d.wins||0}W {(d.trades||0)-(d.wins||0)}L</span></div>
        {!trades.length&&<div style={empty}>No trades yet</div>}
        {trades.length>0&&<div style={{...card,padding:0}} className="ow">
          <div style={{...th,gridTemplateColumns:"36px 56px 1fr 56px 56px 64px 56px 80px",minWidth:500}}><span></span><span>Engine</span><span>Outcome</span><span>Entry</span><span>Status</span><span>P&L</span><span>Edge</span><span>Time</span></div>
          {trades.slice(0,100).map((t,i)=>{const w=t.status==="won",l=t.status==="lost";return<div key={i} className="fi" style={{...tr,gridTemplateColumns:"36px 56px 1fr 56px 56px 64px 56px 80px",minWidth:500}}><span>{ic[t.sport]||"🎯"}</span><EngineBadge engine={t.engine||"?"}/><span style={{fontWeight:500,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.outcome||t.event}</span><span style={{fontFamily:M,fontSize:11}}>${(t.entryPrice||0).toFixed(2)}</span><StatusBadge status={t.status}/><span style={{fontFamily:M,fontSize:12,fontWeight:600,color:w?"#16A34A":l?"#DC2626":"#A1A1AA"}}>{t.pnl!=null?`${t.pnl>0?"+":""}$${t.pnl.toFixed(2)}`:"—"}</span><span style={{fontFamily:M,fontSize:10,color:"#A1A1AA"}}>{t.edgePct?`+${typeof t.edgePct==="number"?t.edgePct.toFixed(1):t.edgePct}%`:"—"}</span><span style={{fontSize:9,color:"#D4D4D8",fontFamily:M}}>{fmtShort(t.timestamp)}</span></div>})}
        </div>}
      </>}

      {tab==="about"&&<><div style={{fontSize:20,fontWeight:700,marginBottom:16}}>Signal Harvest + Synth</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="g1">
          <div style={card}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Dot on={eng.harvest} color="#16A34A"/><span style={{fontSize:14,fontWeight:600}}>Engine 1: Harvest</span></div><div style={{fontSize:12,color:"#71717A",lineHeight:1.8}}>ESPN's free API provides real-time scores across 10 sports. When a team has a commanding lead late in the game, we buy their Polymarket shares at 85-97c. Game ends, shares resolve to $1.00. Win rate: 99%+ on verified blowouts.</div></div>
          <div style={card}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Dot on={eng.synth} color="#2563EB"/><span style={{fontSize:14,fontWeight:600}}>Engine 2: Crypto</span></div><div style={{fontSize:12,color:"#71717A",lineHeight:1.8}}>Three-layer strategy: (1) Latency snipe — Binance confirms BTC/ETH direction at T-10s. (2) Synth SN50 — 200+ AI models vs Polymarket divergence. (3) Pair arb — buy both sides when mispriced. Runs 24/7.</div></div>
        </div>
        <div style={{...card,marginTop:12}}><div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Data Sources</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
          {[{n:"ESPN",c:"$0/mo",d:"Live scores, 10 sports"},{n:"Binance",c:"$0/mo",d:"Real-time BTC/ETH"},{n:"Synth SN50",c:"$199/mo",d:"AI price forecasts"},{n:"Polymarket",c:"$0/mo",d:"Markets + execution"}].map(x=><div key={x.n} style={{border:"1px solid #E4E4E7",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:12,fontWeight:600}}>{x.n}</div><div style={{fontSize:10,color:"#16A34A",fontFamily:M}}>{x.c}</div><div style={{fontSize:10,color:"#A1A1AA",marginTop:2}}>{x.d}</div></div>)}
        </div></div>
        <div style={{textAlign:"center",marginTop:16,fontSize:10,color:"#D4D4D8"}}>Signal · Harvest + Synth · Paper Trading · Not Financial Advice</div>
      </>}
    </main>
  </div>;
}

const kl={fontSize:9,color:"#A1A1AA",letterSpacing:".06em",textTransform:"uppercase",fontWeight:500,marginBottom:2};
const card={background:"#fff",border:"1px solid #E4E4E7",borderRadius:10,padding:"14px 16px"};
const empty={padding:40,textAlign:"center",color:"#D4D4D8",fontSize:13,background:"#fff",border:"1px solid #E4E4E7",borderRadius:10};
const th={display:"grid",padding:"7px 16px",borderBottom:"1px solid #E4E4E7",fontSize:9,color:"#A1A1AA",textTransform:"uppercase",letterSpacing:".04em",alignItems:"center",fontWeight:500};
const tr={display:"grid",padding:"8px 16px",borderBottom:"1px solid #F4F4F5",alignItems:"center",fontSize:13};
