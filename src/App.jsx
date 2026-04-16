import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2500;
const f$=(n,d=2)=>(n??0).toFixed(d);
const pct=n=>`${((n??0)*100).toFixed(1)}%`;
const usd=n=>{const v=n??0;return`${v>=0?"+":""}$${v.toFixed(2)}`;};
const ago=ts=>{if(!ts)return"—";const s=Math.floor(Date.now()/1000-ts);return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;};
const upT=s=>{if(!s)return"0:00";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=Math.floor(s%60);return`${h}h ${String(m).padStart(2,"0")}m ${String(sc).padStart(2,"0")}s`;};
const IC={nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈"};
const SK=new Set("epl,liga,seriea,bundes,ligue1,mls,ligamx,ucl,uel,champ,jleag,j2,aleag,braA,braB,kleag,china,turk,norw,denm,erediv,colom,egypt,libert,sudam,saudi,liga2,lig2fr,bund2,serieb,porto,scotpr,uecl".split(","));
const si=s=>IC[s]||(SK.has(s)?"⚽":"•");
const EC={harvest:"#f59e0b",edge:"#a78bfa",arber:"#22d3ee"};
const EN={harvest:"HARVEST",edge:"EDGE",arber:"ARBER"};
const RC={WIN:"#10b981",LOSS:"#ef4444",EXIT_PROFIT:"#10b981",EXIT_LOSS:"#ef4444",PUSH:"#555"};

/* Logo */
const Logo=()=><svg viewBox="0 0 352.66 352.66" style={{width:28,height:28}}><path fill="#10b981" d="M176.33,0C78.95,0,0,78.95,0,176.33v176.33h177.32c96.93-.55,175.34-79.28,175.34-176.33S273.72,0,176.33,0ZM97.86,194.71c-8.53-2.28-13.6-11.05-11.32-19.58l20.64-77.24c2.29-8.53,11.05-13.6,19.58-11.32,8.54,2.28,13.6,11.04,11.32,19.58l-20.65,77.24c-2.28,8.53-11.04,13.6-19.57,11.32h0ZM135.51,216.42c-6.25-6.24-6.26-16.37-.02-22.61l56.5-56.57c6.24-6.25,16.36-6.26,22.61,0,6.25,6.24,6.26,16.36,0,22.61l-56.5,56.57c-6.24,6.25-16.37,6.26-22.61,0h.01ZM254.07,244.59l-77.22,20.74c-8.53,2.29-17.3-2.77-19.6-11.29-2.29-8.53,2.77-17.3,11.3-19.59l77.22-20.74c8.53-2.29,17.3,2.77,19.6,11.29,2.29,8.53-2.77,17.3-11.3,19.59h0Z"/></svg>;

/* Area Chart */
function AreaChart({data,dataKey,color="#10b981",h=80}){
  if(!data?.length)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#222",fontSize:11}}>No data yet</div>;
  const vals=data.map(d=>d[dataKey]),lo=Math.min(...vals),hi=Math.max(...vals),W=300;
  const pts=vals.map((v,i)=>({x:(i/(vals.length-1))*W,y:4+(1-(v-lo)/(hi-lo||1))*(h-8)}));
  const area=`0,${h} ${pts.map(p=>`${p.x},${p.y}`).join(" ")} ${W},${h}`;
  return<svg viewBox={`0 0 ${W} ${h}`} style={{width:"100%",height:h}}>
    <defs><linearGradient id={`g${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2"/><stop offset="100%" stopColor={color} stopOpacity=".02"/></linearGradient></defs>
    <polygon points={area} fill={`url(#g${dataKey})`}/>
    <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts.map(p=>`${p.x},${p.y}`).join(" ")}/>
  </svg>;
}

/* Price Bar (like Almanac) */
function PriceBar({a,b,w=60}){
  const total=a+b||1,pA=a/total;
  return<div style={{display:"flex",width:w,height:6,borderRadius:3,overflow:"hidden",background:"#1a1a1a"}}>
    <div style={{width:`${pA*100}%`,background:"#10b981",borderRadius:"3px 0 0 3px"}}/>
    <div style={{flex:1,background:"#ef4444",borderRadius:"0 3px 3px 0"}}/>
  </div>;
}

/* Stat Card */
function Stat({label,value,sub,color}){
  return<div style={S.stat}>
    <div style={{fontSize:10,color:"#555",letterSpacing:"0.06em"}}>{label}</div>
    <div style={{fontSize:20,fontWeight:700,color:color||"#fff",marginTop:2}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"#333",marginTop:1}}>{sub}</div>}
  </div>;
}

/* Table Header */
function TH({children,w,align="left",onClick}){
  return<th onClick={onClick} style={{padding:"8px 6px",textAlign:align,color:"#555",fontSize:9,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #1a1a1a",cursor:onClick?"pointer":"default",whiteSpace:"nowrap",width:w}}>{children}</th>;
}
function TD({children,color,align="left",mono}){
  return<td style={{padding:"7px 6px",color:color||"#ccc",fontSize:12,textAlign:align,fontVariantNumeric:mono?"tabular-nums":"normal",borderBottom:"1px solid #0d0d0d",whiteSpace:"nowrap"}}>{children}</td>;
}

/* Main App */
export default function App(){
  const[s,setS]=useState(null);
  const[ok,setOk]=useState(false);
  const[tab,setTab]=useState("live");
  const[now,setNow]=useState(Date.now());
  const ref=useRef(null);

  const poll=useCallback(async()=>{try{const r=await fetch(`${API}/api/state`);if(!r.ok)throw 0;setS(await r.json());setOk(true);}catch{setOk(false);}},[]);
  useEffect(()=>{poll();const i=setInterval(poll,POLL);return()=>clearInterval(i);},[poll]);
  useEffect(()=>{const i=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(i);},[]);

  if(!s)return<div style={S.root}><div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",gap:12}}>
    <div style={{width:16,height:16,border:"2px solid #1a1a1a",borderTopColor:"#10b981",borderRadius:"50%",animation:"spin .6s linear infinite"}}/><span style={{color:"#333",fontSize:12}}>Connecting…</span>
  </div></div>;

  const pos=s.open_positions||[],trades=s.trade_history||[],logs=s.scan_log||[],edges=s.edges_found||[],games=s.live_games||[];
  const st=s.overall_stats||{};const pC=(s.total_pnl||0)>=0?"#10b981":"#ef4444";

  return<div style={S.root}>
    {/* ══ HEADER ══ */}
    <header style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Logo/>
        <span style={{fontSize:15,fontWeight:700,letterSpacing:"0.14em",color:"#fff"}}>SIGNAL</span>
        <span style={{fontSize:9,padding:"2px 8px",border:`1px solid ${s.paper_mode?"#f59e0b33":"#10b98133"}`,color:s.paper_mode?"#f59e0b":"#10b981",borderRadius:4,letterSpacing:"0.08em"}}>{s.paper_mode?"PAPER":"LIVE"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:11,color:"#555"}}>{s.scan_count} scans</span>
        <span style={{fontSize:11,color:"#333"}}>{upT(s.uptime)}</span>
        <span style={{width:8,height:8,borderRadius:"50%",background:ok?"#10b981":"#ef4444",boxShadow:`0 0 6px ${ok?"#10b98166":"#ef444466"}`}}/>
      </div>
    </header>

    {/* ══ STAT CARDS ══ */}
    <div style={S.stats}>
      <Stat label="Equity" value={`$${f$(s.equity)}`} sub={`Start $${f$(s.starting_bankroll)}`}/>
      <Stat label="P&L" value={usd(s.total_pnl)} color={pC}/>
      <Stat label="Deployed" value={`$${f$(s.open_cost)}`} sub={`${pos.length} positions`} color="#f59e0b"/>
      <Stat label="Win Rate" value={st.total_trades?pct(st.win_rate):"—"} sub={st.total_trades?`${st.wins}W / ${st.losses}L`:"0 trades"}/>
    </div>

    <div style={S.body}>
      {/* ══ LEFT: MAIN CONTENT ══ */}
      <div style={S.left}>
        {/* TABS */}
        <div style={S.tabs}>
          {[["live","Live",games.length],["edges","Edges",edges.length],["positions","Positions",pos.length],["history","History",trades.length],["feed","Feed",logs.length]].map(([k,label,count])=>
            <button key={k} onClick={()=>setTab(k)} style={tab===k?S.tabOn:S.tabOff}>
              {label}{count>0&&<span style={{color:tab===k?"#10b981":"#444",marginLeft:4,fontSize:10}}>{count}</span>}
            </button>
          )}
        </div>

        {/* TAB CONTENT */}
        <div style={S.tableWrap}>
          {/* LIVE GAMES */}
          {tab==="live"&&(<table style={S.table}>
            <thead><tr><TH w={30}/><TH>Game</TH><TH align="center">Score</TH><TH align="right">Status</TH></tr></thead>
            <tbody>{games.length===0?<tr><TD colSpan={4}><span style={{color:"#222"}}>No live games right now</span></TD></tr>:
              games.map((g,i)=><tr key={i} style={{animation:`fadeIn 0.2s ease ${i*0.03}s both`}}>
                <TD>{si(g.sport)}</TD>
                <TD><span style={{color:"#fff",fontWeight:600}}>{g.away} @ {g.home}</span></TD>
                <TD align="center"><span style={{color:"#fff",fontWeight:600}}>{g.away?.split(" ").pop()} - {g.home?.split(" ").pop()}</span></TD>
                <TD align="right"><span style={{color:"#10b981",fontSize:11}}>{g.detail}</span></TD>
              </tr>)}
            </tbody>
          </table>)}

          {/* EDGES */}
          {tab==="edges"&&(<table style={S.table}>
            <thead><tr><TH w={30}/><TH>Team</TH><TH align="center">Price</TH><TH align="center">Prob</TH><TH align="right">Edge</TH><TH align="right">Time</TH></tr></thead>
            <tbody>{edges.length===0?<tr><TD colSpan={6}><span style={{color:"#222"}}>No edges detected — ESPN odds update every ~2min</span></TD></tr>:
              edges.map((e,i)=>{
                const ec=e.edge>=0.10?"#10b981":e.edge>=0.05?"#f59e0b":"#555";
                return<tr key={i} style={{animation:`fadeIn 0.2s ease ${i*0.03}s both`}}>
                  <TD>{si(e.sport)}</TD>
                  <TD><span style={{color:"#fff",fontWeight:600}}>{e.team}</span></TD>
                  <TD align="center" mono>
                    <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>
                      <span style={{color:"#888"}}>{f$(e.poly,2)}</span>
                      <PriceBar a={e.poly} b={1-e.poly}/>
                      <span style={{color:"#aaa"}}>{f$(e.true,2)}</span>
                    </div>
                  </TD>
                  <TD align="center" mono color="#888">{pct(e.true)}</TD>
                  <TD align="right" mono color={ec}><strong>{pct(e.edge)}</strong></TD>
                  <TD align="right" color="#444">{e.hours?`${e.hours}h`:""}</TD>
                </tr>;})}
            </tbody>
          </table>)}

          {/* POSITIONS */}
          {tab==="positions"&&(<table style={S.table}>
            <thead><tr><TH w={30}/><TH w={50}>Engine</TH><TH>Market</TH><TH align="right">Entry</TH><TH align="right">Cost</TH><TH align="right">Edge</TH></tr></thead>
            <tbody>{pos.length===0?<tr><TD colSpan={6}><span style={{color:"#222"}}>No open positions</span></TD></tr>:
              pos.map((p,i)=><tr key={p.id} style={{animation:`fadeIn 0.2s ease ${i*0.03}s both`}}>
                <TD>{si(p.sport)}</TD>
                <TD><span style={{color:EC[p.engine],fontSize:10,fontWeight:700}}>{EN[p.engine]}</span></TD>
                <TD><span style={{color:"#fff",fontWeight:500}}>{p.team||p.side}</span><br/><span style={{color:"#333",fontSize:10}}>{p.market?.slice(0,40)}</span></TD>
                <TD align="right" mono>{f$(p.entry_price,3)}</TD>
                <TD align="right" mono>${f$(p.cost)}</TD>
                <TD align="right" mono color={p.edge>=0.10?"#10b981":p.edge>=0.05?"#f59e0b":"#555"}>{p.edge>0?pct(p.edge):"—"}</TD>
              </tr>)}
            </tbody>
          </table>)}

          {/* HISTORY */}
          {tab==="history"&&(<table style={S.table}>
            <thead><tr><TH w={30}/><TH w={50}>Engine</TH><TH>Team</TH><TH align="right">Entry</TH><TH align="right">P&L</TH><TH align="right">Result</TH></tr></thead>
            <tbody>{trades.length===0?<tr><TD colSpan={6}><span style={{color:"#222"}}>No resolved trades yet</span></TD></tr>:
              trades.map((t,i)=><tr key={t.id} style={{animation:`fadeIn 0.2s ease ${i*0.03}s both`}}>
                <TD>{si(t.sport)}</TD>
                <TD><span style={{color:EC[t.engine],fontSize:10,fontWeight:700}}>{EN[t.engine]}</span></TD>
                <TD><span style={{color:"#fff",fontWeight:500}}>{t.team||t.side}</span></TD>
                <TD align="right" mono>{f$(t.entry_price,3)}</TD>
                <TD align="right" mono color={RC[t.result]||"#555"}>{usd(t.pnl)}</TD>
                <TD align="right"><span style={{color:RC[t.result]||"#555",fontSize:10,fontWeight:600}}>{t.result}</span></TD>
              </tr>)}
            </tbody>
          </table>)}

          {/* FEED */}
          {tab==="feed"&&(<div style={{padding:"8px 12px",maxHeight:400,overflowY:"auto",scrollbarWidth:"none"}}>
            {logs.length===0?<div style={{color:"#222",padding:20,textAlign:"center",fontSize:11}}>Waiting for scan data…</div>:
            logs.map((l,i)=>{const ec=l.engine?EC[l.engine]:"#333";const hot=l.level==="signal"||l.level==="trade";
              return<div key={i} style={{padding:"4px 0",borderBottom:"1px solid #0d0d0d",display:"flex",gap:8,fontSize:11,animation:i===logs.length-1?"fadeIn 0.3s ease":"none"}}>
                <span style={{color:"#222",fontSize:10,width:28,flexShrink:0,textAlign:"right"}}>{ago(l.t)}</span>
                {l.engine&&<span style={{color:ec,fontSize:9,fontWeight:700,width:28}}>{EN[l.engine]?.slice(0,3)}</span>}
                <span style={{color:hot?ec:"#555",flex:1}}>{l.msg}</span>
              </div>;})}
          </div>)}
        </div>
      </div>

      {/* ══ RIGHT: CHARTS + ENGINE STATUS ══ */}
      <div style={S.right}>
        {/* Equity Chart */}
        <div style={S.card}>
          <div style={S.cardHead}><span>Equity</span><span style={{color:pC,fontWeight:700}}>${f$(s.equity)}</span></div>
          <AreaChart data={s.equity_curve} dataKey="equity" color={pC}/>
        </div>

        {/* Engine Status */}
        <div style={S.card}>
          <div style={S.cardHead}><span>Engines</span></div>
          {["harvest","edge","arber"].map(id=>{const st2=s[`${id}_stats`]||{};const c=pos.filter(p=>p.engine===id).length;
            return<div key={id} style={{padding:"8px 0",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:EC[id],fontSize:10,fontWeight:700,letterSpacing:"0.08em",width:52}}>{EN[id]}</span>
              <div style={{flex:1}}>
                {(st2.total_trades||0)>0?<span style={{fontSize:11,color:(st2.total_pnl||0)>=0?"#10b981":"#ef4444",fontWeight:600}}>{usd(st2.total_pnl)}</span>:<span style={{fontSize:10,color:"#222"}}>Scanning…</span>}
              </div>
              {c>0&&<span style={{background:EC[id]+"22",color:EC[id],fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:6}}>{c}</span>}
              <span style={{width:6,height:6,borderRadius:"50%",background:"#10b981",animation:"pulse 2s infinite"}}/>
            </div>;})}
        </div>

        {/* Trade Count */}
        <div style={S.card}>
          <div style={S.cardHead}><span>Total Trades</span></div>
          <div style={{fontSize:28,fontWeight:700,color:"#fff",padding:"4px 0"}}>{st.total_trades||0}</div>
          {st.total_trades>0&&<div style={{fontSize:10,color:"#444"}}>{st.wins}W · {st.losses}L · {pct(st.win_rate)} win rate</div>}
        </div>

        {/* Capital Allocation */}
        <div style={S.card}>
          <div style={S.cardHead}><span>Capital</span></div>
          {["harvest","edge","arber"].map(id=>{
            const cost=pos.filter(p=>p.engine===id).reduce((a,p)=>a+p.cost,0);
            const pctW=s.total_equity>0?cost/s.total_equity:0;
            return<div key={id} style={{marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginBottom:2}}>
                <span style={{color:EC[id]}}>{EN[id]}</span><span>${f$(cost)}</span>
              </div>
              <div style={{height:4,background:"#111",borderRadius:2}}>
                <div style={{height:"100%",background:EC[id],borderRadius:2,width:`${pctW*100}%`,transition:"width 0.5s"}}/>
              </div>
            </div>;})}
          <div style={{marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginBottom:2}}>
              <span style={{color:"#333"}}>FREE</span><span>${f$(s.equity)}</span>
            </div>
            <div style={{height:4,background:"#111",borderRadius:2}}>
              <div style={{height:"100%",background:"#222",borderRadius:2,width:`${s.total_equity>0?(s.equity/s.total_equity)*100:100}%`,transition:"width 0.5s"}}/>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{textAlign:"center",padding:"20px 0 40px",fontSize:9,color:"#1a1a1a"}}>
      H {ago(s.last_harvest_scan)} · E {ago(s.last_edge_scan)} · A {ago(s.last_arber_scan)} · R {ago(s.last_resolve_check)}
    </div>
  </div>;
}

const S={
  root:{minHeight:"100dvh",background:"#0a0a0a",color:"#ccc",fontFamily:"'Inter','Helvetica Neue',sans-serif",WebkitFontSmoothing:"antialiased",fontSize:13},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:10},
  stats:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #1a1a1a"},
  stat:{padding:"16px 20px",borderRight:"1px solid #1a1a1a"},
  body:{display:"flex",minHeight:"60vh"},
  left:{flex:1,borderRight:"1px solid #1a1a1a",overflow:"hidden"},
  right:{width:280,flexShrink:0,overflow:"auto"},
  tabs:{display:"flex",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",overflowX:"auto",scrollbarWidth:"none"},
  tabOff:{background:"none",border:"none",color:"#555",fontSize:12,padding:"10px 16px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"},
  tabOn:{background:"none",border:"none",color:"#fff",fontSize:12,padding:"10px 16px",cursor:"pointer",borderBottom:"2px solid #10b981",whiteSpace:"nowrap",fontFamily:"inherit"},
  tableWrap:{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100dvh - 220px)"},
  table:{width:"100%",borderCollapse:"collapse"},
  card:{padding:"14px 16px",borderBottom:"1px solid #1a1a1a"},
  cardHead:{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:11,color:"#555",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8},
};

if(typeof document!=="undefined"){const el=document.createElement("style");el.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:0}
::-webkit-scrollbar-track{background:#0a0a0a}
::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
button:active{opacity:.7}
button{-webkit-tap-highlight-color:transparent}
table{font-variant-numeric:tabular-nums}
@media(max-width:700px){
  .app-body{flex-direction:column!important}
  .app-right{width:100%!important;display:grid;grid-template-columns:1fr 1fr;border-right:none!important;border-top:1px solid #1a1a1a}
  .app-right>div{border-right:1px solid #1a1a1a}
}
`;document.head.appendChild(el);}
