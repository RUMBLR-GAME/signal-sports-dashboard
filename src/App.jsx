import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2500;
const f$=(n,d=2)=>(n??0).toFixed(d);const pct=n=>`${((n??0)*100).toFixed(1)}%`;
const usd=n=>{const v=n??0;return`${v>=0?"+":""}$${v.toFixed(2)}`;};
const ago=ts=>{if(!ts)return"—";const s=Math.floor(Date.now()/1000-ts);return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;};
const upT=s=>{if(!s)return"—";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=Math.floor(s%60);return`${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;};
const IC={nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈"};
const SK=new Set("epl,liga,seriea,bundes,ligue1,mls,ligamx,ucl,uel,champ,jleag,j2,aleag,braA,braB,kleag,china,turk,norw,denm,erediv,colom,egypt,libert,sudam,saudi,liga2,lig2fr,bund2,serieb,porto,scotpr,uecl".split(","));
const si=s=>IC[s]||(SK.has(s)?"⚽":"•");
const EC={harvest:"#f59e0b",edge:"#a78bfa",arber:"#22d3ee"};const EN={harvest:"HRV",edge:"EDGE",arber:"ARB"};
const RC={WIN:"#10b981",LOSS:"#ef4444",EXIT_PROFIT:"#10b981",EXIT_LOSS:"#ef4444",PUSH:"#555"};

const Logo=()=><svg viewBox="0 0 352.66 352.66" style={{width:26,height:26}}><path fill="#ffffff" d="M176.33,0C78.95,0,0,78.95,0,176.33v176.33h177.32c96.93-.55,175.34-79.28,175.34-176.33S273.72,0,176.33,0ZM97.86,194.71c-8.53-2.28-13.6-11.05-11.32-19.58l20.64-77.24c2.29-8.53,11.05-13.6,19.58-11.32,8.54,2.28,13.6,11.04,11.32,19.58l-20.65,77.24c-2.28,8.53-11.04,13.6-19.57,11.32h0ZM135.51,216.42c-6.25-6.24-6.26-16.37-.02-22.61l56.5-56.57c6.24-6.25,16.36-6.26,22.61,0,6.25,6.24,6.26,16.36,0,22.61l-56.5,56.57c-6.24,6.25-16.37,6.26-22.61,0h.01ZM254.07,244.59l-77.22,20.74c-8.53,2.29-17.3-2.77-19.6-11.29-2.29-8.53,2.77-17.3,11.3-19.59l77.22-20.74c8.53-2.29,17.3,2.77,19.6,11.29,2.29,8.53-2.77,17.3-11.3,19.59h0Z"/></svg>;

function AreaChart({data,dataKey,color="#10b981",h=64}){
  if(!data?.length)return<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#1a1a1a",fontSize:10}}>No data</div>;
  const vals=data.map(d=>d[dataKey]),lo=Math.min(...vals),hi=Math.max(...vals),W=280;
  const pts=vals.map((v,i)=>({x:(i/(vals.length-1||1))*W,y:4+(1-(v-lo)/(hi-lo||1))*(h-8)}));
  return<svg viewBox={`0 0 ${W} ${h}`} style={{width:"100%",height:h}}>
    <defs><linearGradient id={`ag${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18"/><stop offset="100%" stopColor={color} stopOpacity=".01"/></linearGradient></defs>
    <polygon points={`0,${h} ${pts.map(p=>`${p.x},${p.y}`).join(" ")} ${W},${h}`} fill={`url(#ag${dataKey})`}/>
    <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts.map(p=>`${p.x},${p.y}`).join(" ")}/>
  </svg>;
}

function PriceBar({a,b,w=50}){const t=a+b||1,p=a/t;return<div style={{display:"inline-flex",width:w,height:5,borderRadius:3,overflow:"hidden",background:"#1a1a1a",verticalAlign:"middle"}}><div style={{width:`${p*100}%`,background:"#10b981"}}/><div style={{flex:1,background:"#ef4444"}}/></div>;}

function TH({children,w,align}){return<th style={{padding:"7px 6px",textAlign:align||"left",color:"#444",fontSize:9,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #1a1a1a",whiteSpace:"nowrap",width:w}}>{children}</th>;}
function TD({children,color,align,fw}){return<td style={{padding:"6px 6px",color:color||"#999",fontSize:11,textAlign:align||"left",fontWeight:fw||400,borderBottom:"1px solid #0d0d0d",whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{children}</td>;}

export default function App(){
  const[s,setS]=useState(null);const[ok,setOk]=useState(false);const[tab,setTab]=useState("harvest");
  const poll=useCallback(async()=>{try{const r=await fetch(`${API}/api/state`);if(!r.ok)throw 0;setS(await r.json());setOk(true);}catch{setOk(false);}},[]);
  useEffect(()=>{poll();const i=setInterval(poll,POLL);return()=>clearInterval(i);},[poll]);
  useEffect(()=>{const i=setInterval(()=>{},1000);return()=>clearInterval(i);},[]);

  if(!s)return<div style={S.root}><div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",gap:10}}>
    <div style={{width:14,height:14,border:"2px solid #1a1a1a",borderTopColor:"#10b981",borderRadius:"50%",animation:"spin .6s linear infinite"}}/><span style={{color:"#333",fontSize:12}}>Connecting…</span></div></div>;

  const pos=s.open_positions||[],trades=s.trade_history||[],logs=s.scan_log||[],edges=s.edges_found||[],games=s.live_games||[],blowouts=s.blowout_log||[];
  const st=s.overall_stats||{};const pC=(s.total_pnl||0)>=0?"#10b981":"#ef4444";

  return<div style={S.root}>
    {/* HEADER */}
    <header style={S.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Logo/><span style={{fontSize:15,fontWeight:700,letterSpacing:"0.15em",color:"#fff"}}>SIGNAL</span>
        <span style={{color:"#333",fontSize:15,fontWeight:300}}>|</span>
        <span style={{color:"#888",fontSize:13,fontWeight:500}}>Sports</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:10,color:"#555"}}>{s.scan_count} scans</span>
        <span style={{fontSize:10,color:"#333"}}>{upT(s.uptime)}</span>
        <span style={{width:7,height:7,borderRadius:"50%",background:ok?"#10b981":"#ef4444",boxShadow:`0 0 6px ${ok?"#10b98155":"#ef444455"}`}}/>
      </div>
    </header>

    {/* STAT BAR */}
    <div style={S.statBar}>
      <div style={S.statCell}><div style={S.statLabel}>Equity</div><div style={S.statVal}>${f$(s.equity)}</div></div>
      <div style={S.statCell}><div style={S.statLabel}>P&L</div><div style={{...S.statVal,color:pC}}>{usd(s.total_pnl)}</div></div>
      <div style={S.statCell}><div style={S.statLabel}>Deployed</div><div style={{...S.statVal,color:"#f59e0b"}}>${f$(s.open_cost)}</div></div>
      <div style={S.statCell}><div style={S.statLabel}>Trades</div><div style={S.statVal}>{st.total_trades||0}<span style={{color:"#333",fontSize:11,marginLeft:4}}>{st.total_trades>0?`${pct(st.win_rate)} win`:""}</span></div></div>
    </div>

    {/* MAIN LAYOUT */}
    <div style={S.body}>
      <div style={S.left}>
        {/* TABS */}
        <div style={S.tabs}>
          {[["harvest","Harvest",games.length],["edges","Edge Scanner",edges.length],["positions","Positions",pos.length],["history","History",trades.length],["feed","Feed",logs.length]].map(([k,label,n])=>
            <button key={k} onClick={()=>setTab(k)} style={tab===k?S.tabOn:S.tabOff}>{label}{n>0?<span style={{color:tab===k?"#10b981":"#333",marginLeft:4}}>{n}</span>:null}</button>
          )}
        </div>

        <div style={S.tableWrap}>
          {/* ═══ HARVEST: Live games with Polymarket odds ═══ */}
          {tab==="harvest"&&<table style={S.tbl}><thead><tr>
            <TH w={28}/><TH>Game</TH><TH align="center">Score</TH><TH align="center">Lead</TH><TH align="center">Poly Home</TH><TH align="center">Poly Away</TH><TH align="center">True Prob</TH><TH align="right">Status</TH>
          </tr></thead><tbody>
            {games.length===0&&<tr><TD colSpan={8}><span style={{color:"#1a1a1a"}}>No live games right now</span></TD></tr>}
            {games.map((g,i)=>{
              const lead=Math.abs((g.home_score||0)-(g.away_score||0));
              const leader=(g.home_score||0)>=(g.away_score||0)?g.home_abbrev:g.away_abbrev;
              const blowout=blowouts.find(b=>b.leader===leader)||null;
              const isSignal=blowout&&blowout.status==="signal";
              const hasOdds=g.home_poly!=null||g.away_poly!=null;
              return<tr key={i} style={{background:isSignal?"#10b98112":"transparent",animation:`fadeIn 0.2s ease ${i*0.03}s both`}}>
                <TD>{si(g.sport)}</TD>
                <TD><span style={{color:"#fff",fontWeight:600}}>{g.away_abbrev||g.away} @ {g.home_abbrev||g.home}</span></TD>
                <TD align="center"><span style={{color:"#fff",fontWeight:700,fontSize:13}}>{g.away_score??""}-{g.home_score??""}</span></TD>
                <TD align="center">{lead>0?<span style={{color:lead>=10?"#10b981":lead>=5?"#f59e0b":"#555",fontWeight:600}}>+{lead}</span>:<span style={{color:"#222"}}>—</span>}</TD>
                <TD align="center">{g.home_poly!=null?<span style={{color:"#fff",fontWeight:600}}>{f$(g.home_poly,2)}¢</span>:<span style={{color:"#1a1a1a"}}>—</span>}</TD>
                <TD align="center">{g.away_poly!=null?<span style={{color:"#fff",fontWeight:600}}>{f$(g.away_poly,2)}¢</span>:<span style={{color:"#1a1a1a"}}>—</span>}</TD>
                <TD align="center">{g.home_true_prob!=null?<span style={{color:"#a78bfa",fontWeight:600}}>{pct(Math.max(g.home_true_prob,g.away_true_prob||0))}</span>:<span style={{color:"#1a1a1a"}}>—</span>}</TD>
                <TD align="right">
                  {isSignal?<span style={{color:"#10b981",fontSize:10,fontWeight:700}}>● TRADING</span>:
                   blowout?<span style={{color:"#f59e0b",fontSize:9}}>{blowout.reason?.slice(0,24)}</span>:
                   hasOdds?<span style={{color:"#555",fontSize:9}}>monitoring</span>:
                   <span style={{color:"#222",fontSize:9}}>no market</span>}
                </TD>
              </tr>;})}
          </tbody></table>}

          {/* ═══ EDGE SCANNER: All games with odds ═══ */}
          {tab==="edges"&&<table style={S.tbl}><thead><tr>
            <TH w={28}/><TH>Team</TH><TH align="center">Poly vs True</TH><TH align="right">Edge</TH><TH align="right">Hrs</TH><TH align="right">Source</TH>
          </tr></thead><tbody>
            {edges.length===0&&<tr><TD colSpan={6}><span style={{color:"#1a1a1a"}}>No odds data yet — ESPN updates every ~2 min. Edges appear when upcoming games have odds posted.</span></TD></tr>}
            {edges.map((e,i)=>{const ec=e.edge>=0.10?"#10b981":e.edge>=0.05?"#f59e0b":e.edge>=0.03?"#555":"#222";
              return<tr key={i} style={{animation:`fadeIn 0.15s ease ${i*0.02}s both`}}>
                <TD>{si(e.sport)}</TD>
                <TD><span style={{color:e.edge>=0.05?"#fff":"#555",fontWeight:e.edge>=0.05?600:400}}>{e.team}</span></TD>
                <TD align="center"><span style={{color:"#666"}}>{f$(e.poly,2)}</span> <PriceBar a={e.poly} b={e.true}/> <span style={{color:"#aaa"}}>{f$(e.true,2)}</span></TD>
                <TD align="right" fw={700} color={ec}>{pct(e.edge)}</TD>
                <TD align="right" color="#444">{e.hours||"—"}</TD>
                <TD align="right" color="#333">{e.provider||""}</TD>
              </tr>;})}
          </tbody></table>}

          {/* ═══ POSITIONS ═══ */}
          {tab==="positions"&&<table style={S.tbl}><thead><tr>
            <TH w={28}/><TH w={40}>Eng</TH><TH>Market</TH><TH align="right">Entry</TH><TH align="right">Cost</TH><TH align="right">Edge</TH>
          </tr></thead><tbody>
            {pos.length===0&&<tr><TD colSpan={6}><span style={{color:"#1a1a1a"}}>No open positions</span></TD></tr>}
            {pos.map((p,i)=><tr key={p.id} style={{animation:`fadeIn 0.15s ease ${i*0.02}s both`}}>
              <TD>{si(p.sport)}</TD>
              <TD><span style={{color:EC[p.engine],fontSize:9,fontWeight:700}}>{EN[p.engine]}</span></TD>
              <TD><span style={{color:"#fff",fontWeight:500}}>{p.team||p.side}</span> <span style={{color:"#222",fontSize:10}}>{p.market?.slice(0,35)}</span></TD>
              <TD align="right">{f$(p.entry_price,3)}</TD>
              <TD align="right">${f$(p.cost)}</TD>
              <TD align="right" color={p.edge>=0.10?"#10b981":p.edge>=0.05?"#f59e0b":"#555"}>{p.edge>0?pct(p.edge):"—"}</TD>
            </tr>)}
          </tbody></table>}

          {/* ═══ HISTORY ═══ */}
          {tab==="history"&&<table style={S.tbl}><thead><tr>
            <TH w={28}/><TH w={40}>Eng</TH><TH>Team</TH><TH align="right">Entry</TH><TH align="right">P&L</TH><TH align="right">Result</TH>
          </tr></thead><tbody>
            {trades.length===0&&<tr><TD colSpan={6}><span style={{color:"#1a1a1a"}}>No resolved trades yet</span></TD></tr>}
            {trades.map((t,i)=><tr key={t.id} style={{animation:`fadeIn 0.15s ease ${i*0.02}s both`}}>
              <TD>{si(t.sport)}</TD>
              <TD><span style={{color:EC[t.engine],fontSize:9,fontWeight:700}}>{EN[t.engine]}</span></TD>
              <TD><span style={{color:"#fff",fontWeight:500}}>{t.team||t.side}</span></TD>
              <TD align="right">{f$(t.entry_price,3)}</TD>
              <TD align="right" color={RC[t.result]}>{usd(t.pnl)}</TD>
              <TD align="right"><span style={{color:RC[t.result],fontSize:10,fontWeight:600}}>{t.result}</span></TD>
            </tr>)}
          </tbody></table>}

          {/* ═══ FEED ═══ */}
          {tab==="feed"&&<div style={{padding:"6px 12px",maxHeight:500,overflowY:"auto",scrollbarWidth:"none"}}>
            {logs.length===0?<div style={{color:"#1a1a1a",padding:20,textAlign:"center",fontSize:10}}>Waiting…</div>:
            logs.map((l,i)=>{const ec=l.engine?EC[l.engine]:"#333";const hot=l.level==="signal"||l.level==="trade";
              return<div key={i} style={{padding:"3px 0",borderBottom:"1px solid #0a0a0a",display:"flex",gap:6,fontSize:11,animation:i===logs.length-1?"fadeIn 0.3s":"none"}}>
                <span style={{color:"#1a1a1a",fontSize:9,width:24,flexShrink:0,textAlign:"right"}}>{ago(l.t)}</span>
                {l.engine&&<span style={{color:ec,fontSize:9,fontWeight:700,width:26}}>{EN[l.engine]||""}</span>}
                <span style={{color:hot?ec:"#444",flex:1}}>{l.msg}</span>
              </div>;})}
          </div>}
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={S.right}>
        <div style={S.card}><div style={S.cHead}><span>Equity Curve</span><span style={{color:pC}}>${f$(s.equity)}</span></div><AreaChart data={s.equity_curve} dataKey="equity" color={pC}/></div>
        <div style={S.card}><div style={S.cHead}><span>Engines</span></div>
          {["harvest","edge","arber"].map(id=>{const st2=s[`${id}_stats`]||{};const c=pos.filter(p=>p.engine===id).length;
            return<div key={id} style={{padding:"6px 0",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:EC[id],fontSize:9,fontWeight:700,width:36}}>{EN[id]}</span>
              <div style={{flex:1}}>{(st2.total_trades||0)>0?<span style={{fontSize:11,color:(st2.total_pnl||0)>=0?"#10b981":"#ef4444",fontWeight:600}}>{usd(st2.total_pnl)} <span style={{color:"#333",fontWeight:400}}>{st2.wins}W/{st2.losses}L</span></span>:<span style={{fontSize:10,color:"#1a1a1a"}}>Scanning…</span>}</div>
              {c>0&&<span style={{background:EC[id]+"22",color:EC[id],fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:6}}>{c}</span>}
            </div>;})}
        </div>
        <div style={S.card}><div style={S.cHead}><span>Capital</span><span style={{color:"#555"}}>${f$(s.total_equity||s.equity)}</span></div>
          {["harvest","edge","arber"].map(id=>{const cost=pos.filter(p=>p.engine===id).reduce((a,p)=>a+p.cost,0);const pctW=s.total_equity>0?cost/s.total_equity:0;
            return<div key={id} style={{marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#444",marginBottom:2}}><span style={{color:EC[id]}}>{EN[id]}</span><span>${f$(cost)}</span></div><div style={{height:3,background:"#111",borderRadius:2}}><div style={{height:"100%",background:EC[id],borderRadius:2,width:`${Math.min(pctW*100,100)}%`,transition:"width .4s"}}/></div></div>;})}
        </div>
        <div style={S.card}><div style={S.cHead}><span>Live</span><span style={{color:"#10b981"}}>{games.length} games</span></div>
          {games.slice(0,6).map((g,i)=><div key={i} style={{padding:"3px 0",fontSize:10,color:"#555",display:"flex",gap:4}}>
            <span>{si(g.sport)}</span><span style={{color:"#888"}}>{g.away_abbrev||g.away}</span><span style={{color:"#fff",fontWeight:700}}>{g.away_score}-{g.home_score}</span><span style={{color:"#888"}}>{g.home_abbrev||g.home}</span><span style={{color:"#333",marginLeft:"auto"}}>{g.detail?.split(" - ")[0]||""}</span>
          </div>)}
        </div>
      </div>
    </div>

    <div style={{textAlign:"center",padding:"16px 0 40px",fontSize:9,color:"#111"}}>H {ago(s.last_harvest_scan)} · E {ago(s.last_edge_scan)} · A {ago(s.last_arber_scan)}</div>
  </div>;
}

const S={
  root:{minHeight:"100dvh",background:"#0a0a0a",color:"#ccc",fontFamily:"'Inter',system-ui,sans-serif",WebkitFontSmoothing:"antialiased",fontSize:13},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:10},
  statBar:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #1a1a1a"},
  statCell:{padding:"14px 20px",borderRight:"1px solid #1a1a1a"},
  statLabel:{fontSize:10,color:"#555",letterSpacing:"0.06em",marginBottom:2},
  statVal:{fontSize:20,fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"},
  body:{display:"flex",minHeight:"calc(100dvh - 140px)"},
  left:{flex:1,minWidth:0,borderRight:"1px solid #1a1a1a",display:"flex",flexDirection:"column"},
  right:{width:260,flexShrink:0},
  tabs:{display:"flex",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",overflowX:"auto",scrollbarWidth:"none",flexShrink:0},
  tabOff:{background:"none",border:"none",borderBottom:"2px solid transparent",color:"#444",fontSize:11,padding:"9px 14px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"},
  tabOn:{background:"none",border:"none",borderBottom:"2px solid #10b981",color:"#fff",fontSize:11,padding:"9px 14px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"},
  tableWrap:{flex:1,overflowY:"auto",overflowX:"auto",scrollbarWidth:"thin"},
  tbl:{width:"100%",borderCollapse:"collapse",fontVariantNumeric:"tabular-nums"},
  card:{padding:"12px 16px",borderBottom:"1px solid #1a1a1a"},
  cHead:{display:"flex",justifyContent:"space-between",fontSize:10,color:"#444",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6},
};

if(typeof document!=="undefined"){const el=document.createElement("style");el.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;overflow-x:hidden}
::-webkit-scrollbar{width:3px;height:0}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
button:active{opacity:.7}button{-webkit-tap-highlight-color:transparent}
@media(max-width:700px){
  .sb{grid-template-columns:repeat(2,1fr)!important}
  .bd{flex-direction:column!important}
  .rt{width:100%!important;flex-direction:row;flex-wrap:wrap;border-top:1px solid #1a1a1a}
  .rt>div{flex:1;min-width:140px}
}
`;document.head.appendChild(el);}
