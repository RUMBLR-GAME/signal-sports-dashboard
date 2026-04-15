import{useState,useEffect,useCallback,useMemo}from"react";

const API="https://web-production-72709.up.railway.app/api/state";
const CLOB_API=API.replace("/api/state","/api/clob-status");
const POLL=2500;

/* ── helpers ── */
const $=v=>v==null?"—":typeof v==="number"?v.toFixed(2):v;
const ts=i=>!i?"":new Date(i).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const tsf=i=>!i?"":new Date(i).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
const pnlC=v=>v>0?"var(--g)":v<0?"var(--r)":"var(--m)";
const pnlS=v=>v==null?"—":`${v>0?"+":""}$${v.toFixed(2)}`;
const pctS=v=>v==null?"—":`${v>0?"+":""}${(v*100).toFixed(1)}%`;
const ic={nba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",wnba:"🏀",epl:"⚽",mls:"⚽",liga:"⚽",BTC:"₿",ETH:"Ξ",SOL:"◎"};

export default function App(){
  const[s,setS]=useState(null);
  const[conn,setConn]=useState(false);
  const[tab,setTab]=useState("overview");
  const[eqH,setEqH]=useState([]);
  const[clob,setClob]=useState("?");
  const[now,setNow]=useState(Date.now());

  /* poll state */
  const poll=useCallback(async()=>{
    try{const r=await fetch(API);if(!r.ok)throw 0;
    const d=await r.json();setS(d);setConn(true);
    setEqH(p=>[...p.slice(-199),{t:Date.now(),eq:d.equity||0,pnl:d.pnl||0}]);
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

  /* derived stats */
  const hTrades=trades.filter(t=>t.engine==="harvest");
  const sTrades=trades.filter(t=>t.engine==="synth");
  const hWins=hTrades.filter(t=>t.status==="won").length;
  const sWins=sTrades.filter(t=>t.status==="won").length;
  const hResolved=hTrades.filter(t=>t.status==="won"||t.status==="lost");
  const sResolved=sTrades.filter(t=>t.status==="won"||t.status==="lost");
  const hPnl=hResolved.reduce((a,t)=>a+(t.pnl||0),0);
  const sPnl=sResolved.reduce((a,t)=>a+(t.pnl||0),0);

  /* countdown to next 5min window */
  const nowS=Math.floor(now/1000);
  const next5=Math.ceil(nowS/300)*300;
  const next15=Math.ceil(nowS/900)*900;
  const to5=next5-nowS;
  const to15=next15-nowS;
  const fmtCD=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const tabs=[
    {id:"overview",l:"Overview"},
    {id:"feed",l:"Live Feed"},
    {id:"crypto",l:"Crypto"},
    {id:"harvest",l:"Harvest"},
    {id:"positions",l:"Positions"},
  ];

return(
<div className="root">
<style>{`
:root{--bg:#0C0E14;--s1:#13151E;--s2:#1A1D2B;--s3:#242838;--b:#2E3348;
--t:#E8EAF0;--m:#7B819A;--d:#4A4F6A;--g:#00E676;--gd:#0A3D2A;
--r:#FF3D57;--rd:#3D0A16;--a:#FFB300;--bl:#448AFF;--p:#B388FF;
--mono:'JetBrains Mono','Fira Code','SF Mono',monospace;
--sans:'Satoshi','General Sans',-apple-system,system-ui,sans-serif;
--rad:8px}
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;background:var(--bg);color:var(--t)}
.root{font-family:var(--sans);min-height:100vh;background:var(--bg)}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--s3);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes glow{0%,100%{box-shadow:0 0 8px var(--g)22}50%{box-shadow:0 0 20px var(--g)44}}
.fu{animation:fadeUp .3s ease-out both}
.pu{animation:pulse 2s infinite}
@media(max-width:800px){.rg{grid-template-columns:1fr!important}.hd{display:none!important}}
`}</style>

{/* ══ HEADER ══ */}
<header style={{background:conn?"var(--s1)":"var(--rd)",borderBottom:"1px solid var(--b)",padding:"0 20px",height:48,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background .3s"}}>
  <div style={{display:"flex",alignItems:"center",gap:12}}>
    <span style={{fontSize:15,fontWeight:800,letterSpacing:"-.03em",color:"var(--t)"}}>SIGNAL</span>
    <span style={{fontSize:10,color:"var(--d)",letterSpacing:".1em",fontWeight:500}}>v2</span>
  </div>
  <div style={{display:"flex",alignItems:"center",gap:16}}>
    {/* countdown timers */}
    <div style={{display:"flex",gap:12,fontFamily:"var(--mono)",fontSize:10,color:"var(--m)"}}>
      <span title="Next 5-min window close">5m <span style={{color:to5<=20?"var(--g)":"var(--d)",fontWeight:to5<=20?700:400}}>{fmtCD(to5)}</span></span>
      <span title="Next 15-min window close">15m <span style={{color:to15<=30?"var(--g)":"var(--d)",fontWeight:to15<=30?700:400}}>{fmtCD(to15)}</span></span>
    </div>
    <div style={{width:1,height:20,background:"var(--b)"}}/>
    {/* status dots */}
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <Dot on={conn} c="var(--g)" label="API"/>
      <Dot on={eng.harvest} c="var(--g)" label="H"/>
      <Dot on={eng.synth} c="var(--bl)" label="S"/>
      <Dot on={clob==="ok"||clob==="idle"} c={clob==="ok"?"var(--g)":"var(--a)"} label="CLOB"/>
    </div>
  </div>
</header>

{/* ══ NAV ══ */}
<nav style={{background:"var(--s1)",borderBottom:"1px solid var(--b)",padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
  {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{
    fontSize:11,fontFamily:"var(--sans)",fontWeight:tab===t.id?600:400,
    padding:"10px 18px",background:"none",border:"none",cursor:"pointer",
    color:tab===t.id?"var(--t)":"var(--d)",
    borderBottom:tab===t.id?"2px solid var(--g)":"2px solid transparent",
    whiteSpace:"nowrap",transition:"all .15s"
  }}>{t.l}</button>)}
</nav>

<main style={{maxWidth:1200,margin:"0 auto",padding:"16px 20px 80px"}}>

{/* ══ OVERVIEW TAB ══ */}
{tab==="overview"&&<>
  {/* top stats row */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}} className="rg">
    <StatCard label="EQUITY" value={`$${eq.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} sub={`from $${d.starting||1000}`} color={pnl>=0?"var(--g)":"var(--r)"}/>
    <StatCard label="P&L" value={pnlS(pnl)} color={pnlC(pnl)} sub={`ROI ${roi>=0?"+":""}${roi.toFixed(1)}%`}/>
    <StatCard label="WIN RATE" value={`${(wr*100).toFixed(1)}%`} sub={`${d.wins||0}W / ${(d.trades||0)-(d.wins||0)}L`} color="var(--t)"/>
    <StatCard label="OPEN" value={openPos.length} sub={`$${Math.round(d.exposure||0)} exposed`} color="var(--bl)"/>
    <StatCard label="DRAWDOWN" value={`${(d.drawdown||0).toFixed(1)}%`} sub={`HWM $${(d.hwm||eq).toFixed(0)}`} color={(d.drawdown||0)>5?"var(--r)":"var(--m)"}/>
  </div>

  {/* equity sparkline */}
  {eqH.length>2&&<div style={{...card,padding:"12px 16px",marginBottom:16}}>
    <div style={{fontSize:10,color:"var(--d)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Equity Curve</div>
    <Sparkline data={eqH.map(h=>h.eq)} color={pnl>=0?"var(--g)":"var(--r)"} h={60}/>
  </div>}

  {/* two-column: engine stats */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}} className="rg">
    <div style={card}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <Dot on={eng.harvest} c="var(--g)"/><span style={{fontSize:13,fontWeight:700}}>Harvest</span>
        <span style={{marginLeft:"auto",fontSize:10,color:"var(--d)",fontFamily:"var(--mono)"}}>Exp: ${hExp.toFixed(0)}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <MiniStat label="Trades" value={d.harvest_trades||0}/>
        <MiniStat label="Win Rate" value={hResolved.length?`${(hWins/hResolved.length*100).toFixed(0)}%`:"—"}/>
        <MiniStat label="P&L" value={pnlS(hPnl)} color={pnlC(hPnl)}/>
      </div>
      {games.filter(g=>g.level!=="final").length>0&&<div style={{marginTop:10,fontSize:10,color:"var(--g)",fontFamily:"var(--mono)"}}>
        {games.filter(g=>g.level!=="final").length} live games monitored
      </div>}
    </div>
    <div style={card}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <Dot on={eng.synth} c="var(--bl)"/><span style={{fontSize:13,fontWeight:700}}>Crypto</span>
        <span style={{marginLeft:"auto",fontSize:10,color:"var(--d)",fontFamily:"var(--mono)"}}>Exp: ${sExp.toFixed(0)}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <MiniStat label="Trades" value={d.synth_trades||0}/>
        <MiniStat label="Win Rate" value={sResolved.length?`${(sWins/sResolved.length*100).toFixed(0)}%`:"—"}/>
        <MiniStat label="P&L" value={pnlS(sPnl)} color={pnlC(sPnl)}/>
      </div>
      <div style={{marginTop:10,display:"flex",gap:12,fontSize:10,fontFamily:"var(--mono)"}}>
        <span style={{color:to5<=20?"var(--g)":"var(--d)"}}>5m: {fmtCD(to5)}</span>
        <span style={{color:to15<=30?"var(--g)":"var(--d)"}}>15m: {fmtCD(to15)}</span>
        <span style={{color:clob==="ok"?"var(--g)":"var(--d)"}}>CLOB {clob==="ok"?"✓":"○"}</span>
      </div>
    </div>
  </div>

  {/* open positions */}
  {openPos.length>0&&<>
    <SectionTitle>Open Positions ({openPos.length})</SectionTitle>
    <div style={{...card,padding:0,marginBottom:16}}>
      {openPos.map((p,i)=><div key={i} className="fu" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid var(--s3)"}}>
        <span style={{fontSize:14}}>{ic[p.sport]||"🎯"}</span>
        <EngBadge engine={p.engine}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600}}>{p.outcome}</div>
          <div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</div>
        </div>
        <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11}}>
          <div style={{fontWeight:600}}>${(p.entry_price||0).toFixed(4)} × {p.shares}</div>
          <div style={{color:"var(--d)",fontSize:9,marginTop:2}}>{ts(p.entry_time)}</div>
        </div>
      </div>)}
    </div>
  </>}

  {/* recent trades */}
  <SectionTitle>Recent Activity</SectionTitle>
  <div style={{...card,padding:0}}>
    {trades.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--d)",fontSize:12}}>Waiting for first trade…</div>}
    {trades.slice(0,15).map((t,i)=><TradeRow key={t.id||i} t={t}/>)}
  </div>
</>}

{/* ══ LIVE FEED TAB ══ */}
{tab==="feed"&&<>
  <SectionTitle>Engine Log</SectionTitle>
  <div style={{...card,padding:0,maxHeight:600,overflowY:"auto"}}>
    {logs.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--d)",fontSize:12}}>Waiting for activity…</div>}
    {logs.map((l,i)=><div key={i} style={{padding:"6px 14px",borderBottom:"1px solid var(--s3)",fontFamily:"var(--mono)",fontSize:11,color:"var(--m)",lineHeight:1.6}}>
      <span style={{color:"var(--d)",marginRight:10}}>{ts(l.t)}</span>
      <span style={{color:l.m.includes("✓")?"var(--g)":l.m.includes("✗")?"var(--r)":l.m.includes("SNIPE")||l.m.includes("HARVEST")?"var(--a)":"var(--m)"}}>{l.m}</span>
    </div>)}
  </div>
</>}

{/* ══ CRYPTO TAB ══ */}
{tab==="crypto"&&<>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16,fontWeight:700}}>Crypto Engine</span>
      <StatusPill on={clob==="ok"||clob==="idle"} label={clob==="ok"?"CLOB LIVE":clob==="idle"?"CLOB IDLE":"CLOB OFF"} color={clob==="ok"?"var(--g)":"var(--a)"}/>
    </div>
    <div style={{display:"flex",gap:14,fontFamily:"var(--mono)",fontSize:11}}>
      <span style={{color:to5<=20?"var(--g)":"var(--d)"}}>5m {fmtCD(to5)}{to5<=20&&<span className="pu" style={{color:"var(--g)",marginLeft:4}}>● HOT</span>}</span>
      <span style={{color:to15<=30?"var(--g)":"var(--d)"}}>15m {fmtCD(to15)}{to15<=30&&<span className="pu" style={{color:"var(--g)",marginLeft:4}}>● HOT</span>}</span>
    </div>
  </div>

  {/* live signals */}
  {signals.length>0&&<>
    <SectionTitle>Live Signals</SectionTitle>
    <div style={{display:"grid",gap:8,marginBottom:16}}>
      {signals.map((sg,i)=><div key={i} className="fu" style={{...card,padding:"12px 14px",borderLeft:`3px solid ${sg.layer==="arb"?"var(--a)":sg.direction==="up"?"var(--g)":"var(--r)"}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{ic[sg.asset]||"🪙"}</span>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,fontWeight:700}}>{sg.asset}</span>
              <LayerBadge layer={sg.layer}/>
              <span style={{fontSize:10,color:"var(--d)"}}>{sg.timeframe}</span>
            </div>
            <div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>
              {sg.shares}× @ ${(sg.price||0).toFixed(4)} = ${(sg.cost||0).toFixed(2)}
            </div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:sg.direction==="up"?"var(--g)":sg.direction==="down"?"var(--r)":"var(--a)"}}>
              {sg.direction?.toUpperCase()}
            </div>
            <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--m)",marginTop:2}}>
              EV: {sg.ev!=null?`+${(sg.ev*100).toFixed(1)}¢`:"—"} · {sg.priceSource==="clob"?"LIVE":"EST"}
            </div>
          </div>
        </div>
      </div>)}
    </div>
  </>}
  {signals.length===0&&<div style={{...card,textAlign:"center",padding:32,color:"var(--d)",fontSize:12,marginBottom:16}}>
    {eng.synth?"Scanning… next window in "+fmtCD(Math.min(to5,to15)):"Engine offline"}
  </div>}

  {/* crypto trade history */}
  <SectionTitle>Crypto Trades ({sTrades.length})</SectionTitle>
  <div style={{...card,padding:0}}>
    {sTrades.length===0&&<div style={{padding:32,textAlign:"center",color:"var(--d)",fontSize:12}}>No crypto trades yet</div>}
    {sTrades.slice(0,30).map((t,i)=><TradeRow key={t.id||i} t={t}/>)}
  </div>
</>}

{/* ══ HARVEST TAB ══ */}
{tab==="harvest"&&<>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <span style={{fontSize:16,fontWeight:700}}>Harvest Engine</span>
    <span style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)"}}>{games.filter(g=>g.level!=="final").length} live · {games.length} total</span>
  </div>

  {/* live games */}
  {games.filter(g=>g.level!=="final").length>0&&<>
    <SectionTitle>Live Verified Games</SectionTitle>
    <div style={{display:"grid",gap:6,marginBottom:16}}>
      {games.filter(g=>g.level!=="final").map((g,i)=><div key={i} className="fu" style={{...card,padding:"10px 14px",borderLeft:`3px solid ${g.level==="blowout"?"var(--g)":g.level==="strong"?"var(--bl)":"var(--a)"}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>{ic[g.sport]||"🎮"}</span>
          <div>
            <div style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:600}}>{g.scoreLine}</div>
            <div style={{fontSize:10,color:"var(--d)",marginTop:2}}>{g.period} {g.clock} · {g.leader} +{g.lead}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:g.confidence>=0.995?"var(--g)":"var(--bl)"}}>
              {(g.confidence*100).toFixed(1)}%
            </span>
            <LevelBadge level={g.level}/>
          </div>
        </div>
      </div>)}
    </div>
  </>}

  {/* targets */}
  {targets.length>0&&<>
    <SectionTitle>Harvest Targets ({targets.length})</SectionTitle>
    <div style={{display:"grid",gap:6,marginBottom:16}}>
      {targets.map((t,i)=><div key={i} className="fu" style={{...card,padding:"10px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:14}}>{ic[t.sport]||"🎮"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600}}>{t.outcome}</div>
            <div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>{t.scoreLine}</div>
          </div>
          <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:11}}>
            <div style={{fontWeight:700,color:"var(--g)"}}>${(t.price||0).toFixed(4)} → +{((t.return||0)*100).toFixed(1)}%</div>
            <div style={{fontSize:9,color:"var(--d)",marginTop:2}}>
              EV:{t.ev!=null?`+${(t.ev*100).toFixed(1)}¢`:"—"} · {t.priceSource==="clob"?"LIVE":"GAMMA"}
            </div>
          </div>
          <LevelBadge level={t.level}/>
        </div>
      </div>)}
    </div>
  </>}

  {/* harvest trades */}
  <SectionTitle>Harvest Trades ({hTrades.length})</SectionTitle>
  <div style={{...card,padding:0}}>
    {hTrades.length===0&&<div style={{padding:32,textAlign:"center",color:"var(--d)",fontSize:12}}>No harvest trades yet</div>}
    {hTrades.slice(0,30).map((t,i)=><TradeRow key={t.id||i} t={t}/>)}
  </div>
</>}

{/* ══ POSITIONS TAB ══ */}
{tab==="positions"&&<>
  <SectionTitle>Open Positions ({openPos.length})</SectionTitle>
  {openPos.length===0&&<div style={{...card,textAlign:"center",padding:32,color:"var(--d)",fontSize:12}}>No open positions</div>}
  {openPos.map((p,i)=><div key={i} className="fu" style={{...card,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${p.engine==="harvest"?"var(--g)":"var(--bl)"}`}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>{ic[p.sport]||"🎯"}</span>
      <EngBadge engine={p.engine}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600}}>{p.outcome}</div>
        <div style={{fontSize:10,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</div>
      </div>
      <div style={{textAlign:"right",fontFamily:"var(--mono)"}}>
        <div style={{fontSize:13,fontWeight:700}}>{p.shares}× @ ${(p.entry_price||0).toFixed(4)}</div>
        <div style={{fontSize:11,color:"var(--m)"}}>Cost: ${(p.cost_basis||0).toFixed(2)}</div>
        <div style={{fontSize:9,color:"var(--d)",marginTop:2}}>{tsf(p.entry_time)}</div>
      </div>
    </div>
  </div>)}

  <SectionTitle style={{marginTop:20}}>Resolved ({trades.filter(t=>t.status==="won"||t.status==="lost").length})</SectionTitle>
  <div style={{...card,padding:0}}>
    {trades.filter(t=>t.status==="won"||t.status==="lost").slice(0,50).map((t,i)=><TradeRow key={t.id||i} t={t}/>)}
  </div>
</>}

</main>
</div>
);
}

/* ══ COMPONENTS ══ */

function Dot({on,c,label}){return(
  <div style={{display:"flex",alignItems:"center",gap:3}} title={label}>
    <span style={{width:6,height:6,borderRadius:3,background:on?c:"var(--d)",display:"block",transition:"background .3s",boxShadow:on?`0 0 6px ${c}66`:""}}/>
    <span style={{fontSize:9,color:on?c:"var(--d)",fontFamily:"var(--mono)",fontWeight:500}}>{label}</span>
  </div>
)}

function StatCard({label,value,sub,color}){return(
  <div style={{background:"var(--s1)",border:"1px solid var(--s3)",borderRadius:"var(--rad)",padding:"12px 14px"}}>
    <div style={{fontSize:9,color:"var(--d)",letterSpacing:".08em",textTransform:"uppercase",fontWeight:500,marginBottom:4}}>{label}</div>
    <div style={{fontSize:20,fontWeight:800,fontFamily:"var(--mono)",color:color||"var(--t)",lineHeight:1.2}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"var(--d)",marginTop:4,fontFamily:"var(--mono)"}}>{sub}</div>}
  </div>
)}

function MiniStat({label,value,color}){return(
  <div>
    <div style={{fontSize:9,color:"var(--d)",letterSpacing:".05em",textTransform:"uppercase"}}>{label}</div>
    <div style={{fontSize:14,fontWeight:700,fontFamily:"var(--mono)",color:color||"var(--t)",marginTop:2}}>{value}</div>
  </div>
)}

function SectionTitle({children,style:sx}){return(
  <div style={{fontSize:11,fontWeight:600,color:"var(--d)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8,...sx}}>{children}</div>
)}

function EngBadge({engine}){
  const h=engine==="harvest";
  return<span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,
    background:h?"var(--gd)":"#0A1A3D",color:h?"var(--g)":"var(--bl)",
    textTransform:"uppercase",letterSpacing:".04em"}}>{engine}</span>
}

function LayerBadge({layer}){
  const cols={snipe:{bg:"#0A3D2A",c:"var(--g)"},synth:{bg:"#1A0A3D",c:"var(--p)"},arb:{bg:"#3D2A0A",c:"var(--a)"}};
  const s=cols[layer]||cols.snipe;
  return<span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:s.bg,color:s.c,textTransform:"uppercase",letterSpacing:".05em"}}>{layer}</span>
}

function LevelBadge({level}){
  const cols={blowout:{bg:"var(--gd)",c:"var(--g)"},strong:{bg:"#0A1A3D",c:"var(--bl)"},safe:{bg:"#3D2A0A",c:"var(--a)"},final:{bg:"#1A0A3D",c:"var(--p)"}};
  const s=cols[level]||{bg:"var(--s3)",c:"var(--d)"};
  return<span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:s.bg,color:s.c,textTransform:"uppercase",letterSpacing:".05em"}}>{level}</span>
}

function StatusPill({on,label,color}){return(
  <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:10,background:on?`${color}18`:"var(--s3)",fontSize:9,fontWeight:600,fontFamily:"var(--mono)"}}>
    <span style={{width:5,height:5,borderRadius:3,background:on?color:"var(--d)"}}/>
    <span style={{color:on?color:"var(--d)"}}>{label}</span>
  </div>
)}

function TradeRow({t}){
  const w=t.status==="won",l=t.status==="lost",o=!w&&!l;
  const ac=w?"var(--g)":l?"var(--r)":"var(--bl)";
  const bg=w?"var(--gd)":l?"var(--rd)":"transparent";
  return(
    <div className="fu" style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"1px solid var(--s3)",background:bg,transition:"background .2s"}}>
      <span style={{width:20,height:20,borderRadius:5,background:`${ac}22`,color:ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{w?"✓":l?"✗":"▸"}</span>
      <span style={{fontSize:14}}>{ic[t.sport]||"🎯"}</span>
      <EngBadge engine={t.engine||"synth"}/>
      {t.layer&&<LayerBadge layer={t.layer}/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.outcome||t.event||"Trade"}</div>
        <div style={{fontSize:9,color:"var(--d)",fontFamily:"var(--mono)",marginTop:2}}>
          {t.timeframe?`${t.timeframe} · `:""}
          {t.scoreLine||""}
          {t.ev!=null&&t.ev!==0?` · EV:+${(t.ev*100).toFixed(1)}¢`:""}
          {t.priceSource?` · ${t.priceSource==="clob"?"LIVE":t.priceSource==="gamma"?"GAMMA":"EST"}`:""}
        </div>
      </div>
      <div style={{textAlign:"right",flexShrink:0,fontFamily:"var(--mono)"}}>
        <div style={{fontSize:12,fontWeight:600}}>${(t.entryPrice||0).toFixed(t.priceSource==="clob"?4:2)}</div>
        {t.pnl!=null&&<div style={{fontSize:12,fontWeight:700,color:ac,marginTop:1}}>{pnlS(t.pnl)}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0,minWidth:44}}>
        {!o&&<span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${ac}22`,color:ac,textTransform:"uppercase"}}>{t.status}</span>}
        {o&&<span style={{fontSize:8,fontWeight:600,padding:"2px 6px",borderRadius:3,background:"var(--s3)",color:"var(--bl)",textTransform:"uppercase"}}>open</span>}
        <div style={{fontSize:8,color:"var(--d)",fontFamily:"var(--mono)",marginTop:3}}>{ts(t.timestamp)}</div>
      </div>
    </div>
  )
}

function Sparkline({data=[],color="var(--g)",h=48}){
  if(data.length<2)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--d)",fontSize:10,fontFamily:"var(--mono)"}}>awaiting data…</div>;
  const w=600;const pad=2;
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;
  const pts=data.map((v,i)=>({x:pad+(i/(data.length-1))*(w-pad*2),y:h-pad-((v-mn)/r)*(h-pad*2)}));
  const d=pts.map(p=>`${p.x},${p.y}`).join(" ");const last=pts[pts.length-1];
  const uid=`sp${Math.random().toString(36).slice(2,6)}`;
  return<svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
    <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".15"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <polygon points={`${pts[0].x},${h} ${d} ${last.x},${h}`} fill={`url(#${uid})`}/>
    <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={last.x} cy={last.y} r="3" fill={color}><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/></circle>
  </svg>;
}

const card={background:"var(--s1)",border:"1px solid var(--s3)",borderRadius:"var(--rad)",padding:"14px 16px"};
