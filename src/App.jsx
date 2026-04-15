import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "https://web-production-72709.up.railway.app";
const POLL = 2500;

/* ── helpers ───────────────────────────────────────────── */
const $ = (n, d = 2) => (n ?? 0).toFixed(d);
const pct = (n) => `${((n ?? 0) * 100).toFixed(1)}%`;
const usd = (n) => { const v = n ?? 0; return `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`; };
const ago = (ts) => {
  if (!ts) return "—";
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};
const clock = (ts) => ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const up = (s) => { if (!s) return "0s"; const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h ? `${h}h${m}m` : `${m}m`; };

const SI = { nba:"🏀",wnba:"🏀",nhl:"🏒",mlb:"⚾",nfl:"🏈",ncaab:"🏀",ncaaf:"🏈",epl:"⚽",liga:"⚽",seriea:"⚽",bundes:"⚽",ligue1:"⚽",mls:"⚽",ligamx:"⚽",ucl:"⚽",uel:"⚽" };

/* ── equity chart ──────────────────────────────────────── */
function Chart({ curve, base }) {
  if (!curve?.length) return <div style={c.chartNone}>Waiting for first trade…</div>;
  const d = [{ equity: base }, ...curve];
  const v = d.map(p => p.equity);
  const lo = Math.min(...v) - 2, hi = Math.max(...v) + 2;
  const W = 600, H = 140, P = 32;
  const pts = d.map((p, i) => ({
    x: P + (i / (d.length - 1)) * (W - P * 2),
    y: P + (1 - (p.equity - lo) / (hi - lo)) * (H - P * 2),
  }));
  const last = pts[pts.length - 1];
  const isUp = v[v.length - 1] >= base;
  const col = isUp ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <polyline fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"
        points={pts.map(p => `${p.x},${p.y}`).join(" ")} />
      <circle cx={last.x} cy={last.y} r="3" fill={col} />
      <text x={last.x + 6} y={last.y + 3} fill={col} fontSize="9"
        fontFamily="'DM Mono',monospace" fontWeight="500">${$(v[v.length-1])}</text>
    </svg>
  );
}

/* ── number cell ───────────────────────────────────────── */
function N({ label, value, color }) {
  return (
    <div style={c.n}>
      <div style={{ ...c.nVal, color: color || "#fff" }}>{value}</div>
      <div style={c.nLbl}>{label}</div>
    </div>
  );
}

/* ── trade row ─────────────────────────────────────────── */
function Row({ d, open }) {
  const [ex, setEx] = useState(false);
  const eng = d.engine === "harvest";
  return (
    <div style={c.row} onClick={() => setEx(!ex)}>
      <div style={c.rowTop}>
        <span style={{ ...c.eng, color: eng ? "#f59e0b" : "#06b6d4" }}>{eng ? "HRV" : "SHP"}</span>
        <span style={c.rowIcon}>{SI[d.sport] || "•"}</span>
        <span style={c.rowTeam}>{d.team}</span>
        <span style={c.rowMeta}>{$(d.entry_price, 3)}</span>
        <span style={{ ...c.rowMeta, marginLeft: "auto" }}>${$(d.cost)}</span>
        {open ? (
          <span style={{ ...c.tag, color: "#f59e0b" }}>{d.status === "filled" ? "LIVE" : "…"}</span>
        ) : (
          <span style={{ ...c.tag, color: d.result === "WIN" ? "#10b981" : "#ef4444" }}>
            {d.result} {usd(d.pnl)}
          </span>
        )}
        <span style={c.arrow}>{ex ? "−" : "+"}</span>
      </div>
      {ex && (
        <div style={c.rowDetail}>
          <span>{d.market}</span>
          <span>Conf {pct(d.confidence)} · Edge {pct(d.edge)}{d.pinnacle_prob > 0 ? ` · Pin ${pct(d.pinnacle_prob)}` : ""}</span>
          {d.score_line && <span style={{ color: "#f59e0b" }}>{d.score_line}</span>}
          <span style={{ color: "#444" }}>{clock(d.opened_at)}{d.closed_at ? ` → ${clock(d.closed_at)}` : ""}</span>
        </div>
      )}
    </div>
  );
}

/* ── engine section ────────────────────────────────────── */
function Engine({ name, color, stats, positions, trades }) {
  const [tab, setTab] = useState("open");
  const s = stats || {};
  const items = tab === "open" ? positions : trades;
  return (
    <div style={c.engine}>
      <div style={c.engHead}>
        <span style={{ ...c.engTitle, color }}>{name}</span>
        <span style={c.engSub}>{s.total_trades || 0} trades · {pct(s.win_rate)} W</span>
      </div>
      <div style={c.engStats}>
        <N label="P&L" value={usd(s.total_pnl)} color={(s.total_pnl||0) >= 0 ? "#10b981" : "#ef4444"} />
        <N label="W / L" value={`${s.wins||0}/${s.losses||0}`} />
        <N label="Open" value={s.open_positions || 0} color="#f59e0b" />
      </div>
      <div style={c.tabs}>
        {["open", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={tab === t ? c.tabOn : c.tabOff}>
            {t === "open" ? `Open ${positions.length}` : `History ${trades.length}`}
          </button>
        ))}
      </div>
      <div style={c.list}>
        {items.length === 0 && <div style={c.nil}>{tab === "open" ? "No positions" : "No trades yet"}</div>}
        {items.map(d => <Row key={d.id} d={d} open={tab === "open"} />)}
      </div>
    </div>
  );
}

/* ── app ───────────────────────────────────────────────── */
export default function App() {
  const [s, setS] = useState(null);
  const [ok, setOk] = useState(false);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/state`);
      if (!r.ok) throw 0;
      setS(await r.json());
      setOk(true);
    } catch { setOk(false); }
  }, []);

  useEffect(() => { poll(); const i = setInterval(poll, POLL); return () => clearInterval(i); }, [poll]);

  const hp = (s?.open_positions||[]).filter(p => p.engine==="harvest");
  const sp = (s?.open_positions||[]).filter(p => p.engine==="sharp");
  const ht = (s?.trade_history||[]).filter(t => t.engine==="harvest");
  const st = (s?.trade_history||[]).filter(t => t.engine==="sharp");

  return (
    <div style={c.root}>
      {/* header */}
      <header style={c.head}>
        <div style={c.brand}>
          <span style={c.mark}>◈</span>
          <span style={c.wordmark}>SIGNAL</span>
          {s?.paper_mode && <span style={c.mode}>PAPER</span>}
          {s && !s.paper_mode && <span style={{...c.mode, color:"#10b981", borderColor:"#10b98133"}}>LIVE</span>}
        </div>
        <div style={c.headR}>
          <span style={{width:6,height:6,borderRadius:"50%",background:ok?"#10b981":"#ef4444",flexShrink:0}} />
          {s && <span style={c.headMeta}>${$(s.equity)} · {usd(s.total_pnl)} · {up(s.uptime)}</span>}
        </div>
      </header>

      {!s ? (
        <div style={c.loading}>
          <div style={c.spin} />
          <span style={{ color: "#333", fontSize: 12 }}>connecting…</span>
        </div>
      ) : (
        <main style={c.main}>
          {/* live games ticker */}
          {s.live_games?.length > 0 && (
            <div style={c.ticker}>
              {s.live_games.map((g, i) => (
                <span key={i} style={c.tickItem}>
                  {SI[g.sport]||"•"} {g.away} @ {g.home} <span style={{color:"#444"}}>{g.detail}</span>
                </span>
              ))}
            </div>
          )}

          {/* equity */}
          <section style={c.section}>
            <div style={c.chartWrap}><Chart curve={s.equity_curve} base={s.starting_bankroll} /></div>
          </section>

          {/* numbers */}
          <div style={c.grid}>
            <N label="Start" value={`$${$(s.starting_bankroll)}`} />
            <N label="Equity" value={`$${$(s.equity)}`} />
            <N label="P&L" value={usd(s.total_pnl)} color={s.total_pnl>=0?"#10b981":"#ef4444"} />
            <N label="Win%" value={pct(s.overall_stats?.win_rate)} />
            <N label="Trades" value={s.overall_stats?.total_trades ?? 0} />
            <N label="Scans" value={s.scan_count} />
          </div>

          {/* engines */}
          <Engine name="HARVEST" color="#f59e0b" stats={s.harvest_stats} positions={hp} trades={ht} />
          <Engine name="SHARP" color="#06b6d4" stats={s.sharp_stats} positions={sp} trades={st} />

          {/* footer */}
          <div style={c.foot}>
            H {ago(s.last_harvest_scan)} · S {ago(s.last_sharp_scan)} · R {ago(s.last_resolve_check)}
            {s.odds_api_quota != null && <span> · Q {s.odds_api_quota}/500</span>}
          </div>
        </main>
      )}
    </div>
  );
}

/* ── styles — VV-inspired: black, white, one accent ──── */
const ff = "'DM Mono', 'JetBrains Mono', monospace";
const c = {
  root: { minHeight:"100dvh", background:"#000", color:"#e5e5e5", fontFamily:ff, padding:"0 env(safe-area-inset-right) 0 env(safe-area-inset-left)", WebkitFontSmoothing:"antialiased" },
  head: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 16px 12px", borderBottom:"1px solid #111" },
  brand: { display:"flex", alignItems:"center", gap:8 },
  mark: { fontSize:18, color:"#10b981", fontWeight:700 },
  wordmark: { fontSize:12, fontWeight:700, letterSpacing:"0.2em", color:"#fff" },
  mode: { fontSize:8, padding:"2px 6px", border:"1px solid #f59e0b33", color:"#f59e0b", borderRadius:2, letterSpacing:"0.1em" },
  headR: { display:"flex", alignItems:"center", gap:8 },
  headMeta: { fontSize:11, color:"#666", whiteSpace:"nowrap" },
  main: { maxWidth:600, margin:"0 auto", padding:"0 16px 48px" },
  section: { marginTop:20 },
  chartWrap: { background:"#0a0a0a", borderRadius:8, border:"1px solid #111", padding:"12px 8px" },
  chartNone: { height:60, display:"flex", alignItems:"center", justifyContent:"center", color:"#222", fontSize:11 },
  grid: { display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6, marginTop:16 },
  n: { background:"#0a0a0a", border:"1px solid #111", borderRadius:6, padding:"10px 8px", textAlign:"center" },
  nVal: { fontSize:14, fontWeight:600, color:"#fff" },
  nLbl: { fontSize:8, color:"#444", textTransform:"uppercase", letterSpacing:"0.12em", marginTop:3 },
  engine: { marginTop:20, background:"#0a0a0a", border:"1px solid #111", borderRadius:8, overflow:"hidden" },
  engHead: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid #111" },
  engTitle: { fontSize:11, fontWeight:700, letterSpacing:"0.15em" },
  engSub: { fontSize:10, color:"#333" },
  engStats: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, padding:"10px" },
  tabs: { display:"flex", borderBottom:"1px solid #111" },
  tabOff: { flex:1, background:"none", border:"none", borderBottom:"2px solid transparent", color:"#333", fontFamily:ff, fontSize:10, padding:"8px 0", cursor:"pointer", textAlign:"center" },
  tabOn: { flex:1, background:"none", border:"none", borderBottom:"2px solid #10b981", color:"#e5e5e5", fontFamily:ff, fontSize:10, padding:"8px 0", cursor:"pointer", textAlign:"center" },
  list: { maxHeight:300, overflowY:"auto" },
  nil: { padding:24, textAlign:"center", color:"#1a1a1a", fontSize:10 },
  row: { padding:"10px 12px", borderBottom:"1px solid #0a0a0a", cursor:"pointer", minHeight:44 },
  rowTop: { display:"flex", alignItems:"center", gap:6, fontSize:11 },
  eng: { fontSize:9, fontWeight:600, letterSpacing:"0.08em" },
  rowIcon: { fontSize:12 },
  rowTeam: { fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 },
  rowMeta: { color:"#444", fontSize:10 },
  tag: { fontSize:9, fontWeight:600, letterSpacing:"0.05em" },
  arrow: { color:"#222", fontSize:12, marginLeft:4, fontWeight:300 },
  rowDetail: { display:"flex", flexDirection:"column", gap:3, marginTop:8, paddingLeft:8, borderLeft:"2px solid #111", fontSize:10, color:"#555" },
  ticker: { display:"flex", gap:12, overflowX:"auto", padding:"12px 0", fontSize:11, scrollbarWidth:"none", WebkitOverflowScrolling:"touch" },
  tickItem: { whiteSpace:"nowrap", flexShrink:0 },
  foot: { marginTop:32, textAlign:"center", fontSize:9, color:"#222" },
  loading: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, height:"70dvh" },
  spin: { width:16, height:16, border:"2px solid #111", borderTopColor:"#10b981", borderRadius:"50%", animation:"spin .7s linear infinite" },
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
  `;
  document.head.appendChild(el);
}
