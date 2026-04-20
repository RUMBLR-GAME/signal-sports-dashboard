import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'https://web-production-72709.up.railway.app'
const POLL_MS = 3000

// ───── Formatters ─────
const fmtUSD = (n, d = 2) => n == null || isNaN(n) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtSigned = (n) => {
  if (n == null || isNaN(n)) return '—'
  const s = n >= 0 ? '+' : '−'
  return `${s}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtSignedPct = (n, d = 2) => n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(d)}%`
const fmtPct = (n, d = 0) => n == null ? '—' : `${(n * 100).toFixed(d)}%`
const fmtCents = (n) => n == null ? '—' : `${(n * 100).toFixed(0)}¢`
const fmtAgo = (ts) => {
  if (!ts) return '—'
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 5) return 'now'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const fmtUptime = (s) => {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h ? `${h}h ${m}m` : `${m}m`
}
const mlToProb = (ml) => {
  if (!ml) return null
  const n = Number(ml)
  if (!n) return null
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100)
}

const SPORT_LABEL = {
  nba: 'NBA', wnba: 'WNBA', nhl: 'NHL', mlb: 'MLB', nfl: 'NFL',
  ncaab: 'NCAAB', ncaaf: 'NCAAF', mls: 'MLS',
  epl: 'EPL', liga: 'La Liga', seriea: 'Serie A', bundes: 'Bundesliga', ligue1: 'Ligue 1',
  ucl: 'UCL', uel: 'UEL', uecl: 'UECL',
  champ: 'Championship', jleag: 'J-League', j2: 'J2',
  aleag: 'A-League', braA: 'Brazil A', braB: 'Brazil B',
  kleag: 'K-League', china: 'CSL', turk: 'Süper Lig', tur: 'Süper Lig',
  norw: 'Eliteserien', denm: 'Superliga', colom: 'Colombia', egypt: 'Egypt',
  libert: 'Libertadores', sudam: 'Sudamericana', saudi: 'Saudi', ligamx: 'Liga MX',
  erediv: 'Eredivisie', erediv2: 'Eerste', liga2: 'La Liga 2', lig2fr: 'Ligue 2', bund2: '2. Bundesliga',
  serieb: 'Serie B', porto: 'Primeira', argA: 'Argentina',
  allsv: 'Allsvenskan', ekstra: 'Ekstraklasa',
}

const SignalMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 353 353" fill="currentColor">
    <path d="M97.86,194.71c-8.53-2.28-13.6-11.05-11.32-19.58l20.64-77.24c2.29-8.53,11.05-13.6,19.58-11.32s13.6,11.04,11.32,19.58l-20.65,77.24c-2.28,8.53-11.04,13.6-19.57,11.32Z"/>
    <path d="M135.51,216.42c-6.25-6.24-6.26-16.37-.02-22.61l56.5-56.57c6.24-6.25,16.36-6.26,22.61,0,6.25,6.24,6.26,16.36,0,22.61l-56.5,56.57c-6.24,6.25-16.37,6.26-22.61,0Z"/>
    <path d="M254.07,244.59l-77.22,20.74c-8.53,2.29-17.3-2.77-19.6-11.29-2.29-8.53,2.77-17.3,11.3-19.59l77.22-20.74c8.53-2.29,17.3,2.77,19.6,11.29,2.29,8.53-2.77,17.3-11.3,19.59Z"/>
  </svg>
)

const I = {
  dash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  positions: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 L9 11 L13 15 L21 7"/><path d="M14 7 H21 V14"/></svg>,
  ledger: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10 H21"/><path d="M9 4 V20"/></svg>,
  pulse: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 H7 L9 6 L13 18 L15 12 H21"/></svg>,
  scan: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4 H9 M4 4 V9 M20 4 H15 M20 4 V9 M4 20 H9 M4 20 V15 M20 20 H15 M20 20 V15"/><circle cx="12" cy="12" r="3"/></svg>,
  analytics: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 V10"/><path d="M10 20 V4"/><path d="M16 20 V13"/><path d="M22 20 V7"/></svg>,
  menu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>,
}

// ───── Data hooks ─────
function useBotState() {
  const [state, setState] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let alive = true
    const f = async () => {
      try {
        const r = await fetch(`${API}/api/state`, { cache: 'no-store' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (alive) { setState(j); setErr(null) }
      } catch (e) { if (alive) setErr(e.message) }
    }
    f()
    const id = setInterval(f, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return { state, err }
}

function useStats(state) {
  return useMemo(() => {
    if (!state) return null
    const equity = state.equity || 0
    const starting = state.starting_bankroll || 1000
    const pct = (equity - starting) / starting
    const realized = state.total_pnl || 0
    const unrealized = state.unrealized_pnl || 0
    const open = state.open_positions || []
    const trades = state.trade_history || []
    const wins = trades.filter(t => (t.pnl || 0) > 0).length
    const winRate = trades.length ? wins / trades.length : 0
    const deployed = open.reduce((s, p) => s + (p.cost || 0), 0)
    const exposure = deployed / Math.max(equity, 1)
    const bySport = {}
    for (const t of trades) {
      const s = t.sport || 'other'
      if (!bySport[s]) bySport[s] = { trades: 0, wins: 0, pnl: 0 }
      bySport[s].trades += 1
      if ((t.pnl || 0) > 0) bySport[s].wins += 1
      bySport[s].pnl += (t.pnl || 0)
    }
    const clvTrades = trades.filter(t => t.clv_edge != null)
    const avgClv = clvTrades.length ? clvTrades.reduce((s, t) => s + (t.clv_edge || 0), 0) / clvTrades.length : null
    const beatClose = clvTrades.length ? clvTrades.filter(t => (t.clv_edge || 0) > 0).length / clvTrades.length : null
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    const dayStartTs = dayStart.getTime() / 1000
    const todayTrades = trades.filter(t => (t.closed_at || 0) >= dayStartTs)
    const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
    return {
      equity, starting, pct, realized, unrealized, open, trades,
      winRate, deployed, exposure, bySport,
      clvTrades, avgClv, beatClose,
      todayPnl, todayTrades: todayTrades.length,
    }
  }, [state])
}

function useEquityCurve(state, stats) {
  return useMemo(() => {
    if (!state || !stats) return []
    if (state.equity_curve?.length) {
      return state.equity_curve.map(p => ({ ts: p.ts, equity: p.equity ?? p.value ?? p[1] }))
    }
    const tr = [...stats.trades].sort((a, b) => (a.closed_at || 0) - (b.closed_at || 0))
    if (!tr.length) return [
      { ts: Date.now()/1000 - 3600, equity: stats.starting },
      { ts: Date.now()/1000, equity: stats.equity },
    ]
    const pts = [{ ts: (tr[0]?.opened_at || tr[0]?.closed_at || Date.now()/1000) - 60, equity: stats.starting }]
    let running = stats.starting
    for (const t of tr) {
      running += (t.pnl || 0)
      pts.push({ ts: t.closed_at || Date.now()/1000, equity: running })
    }
    pts.push({ ts: Date.now() / 1000, equity: stats.equity })
    return pts
  }, [state, stats])
}

export default function App() {
  const { state, err } = useBotState()
  const stats = useStats(state)
  const [section, setSection] = useState('overview')
  const [navOpen, setNavOpen] = useState(false)
  const [modal, setModal] = useState(null)

  const sectionRefs = {
    overview: useRef(null), positions: useRef(null), ledger: useRef(null),
    edges: useRef(null), scans: useRef(null), analytics: useRef(null),
  }
  const scroller = useRef(null)

  const goTo = (id) => {
    setSection(id); setNavOpen(false)
    const el = sectionRefs[id]?.current
    if (el && scroller.current) {
      scroller.current.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
    }
  }

  if (err && !state) return <Splash err={err} />
  if (!state || !stats) return <Splash />

  return (
    <div className="app">
      <Sidebar active={section} onNav={goTo} stats={stats} state={state} open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="main">
        <button className="mobile-menu" onClick={() => setNavOpen(true)}><I.menu /></button>
        <div className="content" ref={scroller}>
          <section ref={sectionRefs.overview}>
            <OverviewPanel stats={stats} state={state} onCloseAll={() => setModal({ type: 'close-all' })} />
          </section>

          <section ref={sectionRefs.positions} className="section">
            <h2 className="section-title">Positions <span className="count">{stats.open.length}</span></h2>
            <PositionsList positions={stats.open} onClose={(id) => setModal({ type: 'close-one', id })} />
          </section>

          <div className="section grid-2">
            <EquityCard state={state} stats={stats} />
            <ExposureCard stats={stats} state={state} />
          </div>

          <section ref={sectionRefs.edges} className="section">
            <h2 className="section-title">Live edges <span className="count">{(state.edges_found || []).length}</span></h2>
            <LiveEdgesTable edges={state.edges_found || []} open={stats.open} />
          </section>

          <section ref={sectionRefs.scans} className="section">
            <h2 className="section-title">Scan activity</h2>
            <ScanActivity />
          </section>

          <section className="section">
            <h2 className="section-title">Closing line value <span className="sub-title">— proves real alpha</span></h2>
            <CLVPanel stats={stats} />
          </section>

          <section ref={sectionRefs.analytics} className="section">
            <h2 className="section-title">By sport</h2>
            <SportBreakdown bySport={stats.bySport} />
          </section>

          <section ref={sectionRefs.ledger} className="section">
            <h2 className="section-title">Recent trades <span className="count">{stats.trades.length}</span></h2>
            <LedgerTable trades={stats.trades.slice().sort((a,b) => (b.closed_at||0)-(a.closed_at||0)).slice(0,30)} />
          </section>

          <div className="footer">
            <div>Signal · {state.paper_mode ? 'Paper' : 'Live'} · Uptime {fmtUptime(state.uptime)}</div>
            <div className="footer-dim">Auto-refresh {POLL_MS/1000}s · Edge-only</div>
          </div>
        </div>
      </main>
      {modal && <ConfirmModal modal={modal} onDone={() => setModal(null)} />}
    </div>
  )
}

function Sidebar({ active, onNav, stats, state, open, onClose }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: I.dash },
    { id: 'positions', label: 'Positions', icon: I.positions, badge: stats.open.length },
    { id: 'edges', label: 'Edges', icon: I.pulse, badge: (state.edges_found || []).length },
    { id: 'scans', label: 'Scans', icon: I.scan },
    { id: 'analytics', label: 'Analytics', icon: I.analytics },
    { id: 'ledger', label: 'Ledger', icon: I.ledger, badge: stats.trades.length },
  ]
  return (
    <>
      {open && <div className="nav-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><SignalMark size={18} /></div>
          <div className="brand-text">Signal</div>
          <button className="nav-close" onClick={onClose}><I.x /></button>
        </div>
        <nav className="nav">
          {items.map(it => {
            const IconComp = it.icon
            const isActive = active === it.id
            return (
              <button key={it.id} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => onNav(it.id)}>
                <IconComp />
                <span>{it.label}</span>
                {it.badge != null && it.badge > 0 && <span className="nav-badge">{it.badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="nav-spacer" />
        <StatusMini state={state} />
      </aside>
    </>
  )
}

function StatusMini({ state }) {
  const ok = state.ws_market_connected && state.redis_connected
  return (
    <div className="status-mini">
      <span className={`dot ${ok ? 'ok' : 'warn'}`} />
      <span className="status-label">{state.paper_mode ? 'Paper' : 'Live'}</span>
      <span className="status-sub">{fmtUptime(state.uptime)}</span>
    </div>
  )
}

// ───── OVERVIEW PANEL — the top of the dashboard, one coherent unit ─────
function OverviewPanel({ stats, state, onCloseAll }) {
  const sparkPts = useEquityCurve(state, stats)
  const dayUp = stats.todayPnl >= 0
  const totUp = stats.pct >= 0
  const clv = stats.avgClv

  return (
    <div className="overview-panel">
      {/* LEFT — Equity with integrated chart */}
      <div className="ov-equity">
        <div>
          <div className="ov-equity-head">
            <span>Equity</span>
            <span className="live-dot" aria-hidden />
          </div>
          <div className="ov-equity-val">
            <div className="ov-equity-big">{fmtUSD(stats.equity, 2)}</div>
            <div className={`ov-equity-delta ${totUp ? 'up' : 'down'}`}>
              {fmtSignedPct(stats.pct)}
            </div>
          </div>
          <div className="ov-equity-sub">
            <span>{fmtSigned(stats.realized + stats.unrealized)}</span>
            <span className="sep">·</span>
            <span>from {fmtUSD(stats.starting, 0)}</span>
          </div>
        </div>
        <div className="ov-equity-chart">
          <OverviewChart points={sparkPts} starting={stats.starting} />
        </div>
      </div>

      {/* RIGHT — 3 tiles + pipeline */}
      <div className="ov-metrics">
        <div className="ov-tiles">
          {/* Today */}
          <div className="ov-tile">
            <div className="ov-tile-head"><span>Today</span></div>
            <div className={`ov-tile-val ${dayUp ? 'p-up' : 'p-down'}`}>
              {fmtSigned(stats.todayPnl)}
            </div>
            <div className="ov-tile-sub">{stats.todayTrades} {stats.todayTrades === 1 ? 'trade' : 'trades'}</div>
          </div>

          {/* Avg CLV */}
          <div className="ov-tile">
            <div className="ov-tile-head"><span>Avg CLV</span></div>
            <div className={`ov-tile-val ${clv == null ? 'dim' : clv >= 0 ? 'p-up' : 'p-down'}`}>
              {clv == null ? '—' : `${clv >= 0 ? '+' : ''}${(clv * 100).toFixed(2)}¢`}
            </div>
            <div className="ov-tile-sub">
              {stats.beatClose == null
                ? 'awaiting data'
                : `${Math.round(stats.beatClose * 100)}% beat · ${stats.clvTrades.length}`}
            </div>
          </div>

          {/* Deployed */}
          <div className="ov-tile">
            <div className="ov-tile-head">
              <span>Deployed</span>
              {stats.open.length > 0 && (
                <button className="ov-close-btn" onClick={onCloseAll}>Close all</button>
              )}
            </div>
            <div className="ov-tile-val">{fmtUSD(stats.deployed, 0)}</div>
            <div className="ov-tile-sub">{fmtPct(stats.exposure, 0)} · {stats.open.length} open</div>
          </div>
        </div>

        {/* PIPELINE footer */}
        <PipelineStrip state={state} />
      </div>
    </div>
  )
}

function OverviewChart({ points, starting }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const W = 420, H = 88
  const padT = 4, padB = 2

  const data = useMemo(() => {
    if (!points || points.length < 2) return null
    const vals = points.map(p => p.equity)
    let min = Math.min(starting, ...vals)
    let max = Math.max(starting, ...vals)
    const r = max - min || Math.max(starting * 0.02, 1)
    min -= r * 0.1; max += r * 0.1
    const tMin = points[0].ts, tMax = points[points.length - 1].ts
    const dt = tMax - tMin || 1
    const xs = points.map(p => ((p.ts - tMin) / dt) * W)
    const ys = points.map(p => padT + (1 - (p.equity - min) / (max - min)) * (H - padT - padB))
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')
    const area = `${path} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`
    const pts = points.map((p, i) => ({ ...p, x: xs[i], y: ys[i] }))
    return { path, area, pts, min, max }
  }, [points, starting])

  if (!data) return <div className="chart-empty">building curve…</div>

  const last = data.pts[data.pts.length - 1]
  const up = last && last.equity >= starting

  const onMove = (e) => {
    if (!ref.current || !data.pts.length) return
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < data.pts.length; i++) {
      const d = Math.abs(data.pts[i].x - x)
      if (d < bd) { bd = d; best = i }
    }
    setHover(data.pts[best])
  }

  return (
    <div className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart"
           onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="grad-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BDE57A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#BDE57A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF7F86" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#EF7F86" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={data.area} className={`chart-area ${up ? 'up' : 'down'}`} />
        <path d={data.path} className={`chart-line ${up ? 'up' : 'down'}`} />
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={H - padB} className="hover-line" />
          </>
        )}
      </svg>
      {/* Pulse overlay — aspect-preserving so the circle stays round */}
      {last && (
        <div className="pulse-overlay" style={{
          left: `${(last.x / W) * 100}%`,
          top: `${(last.y / H) * 100}%`,
        }}>
          <span className={`pulse-dot-sm ${up ? 'up' : 'down'}`} />
          <span className={`pulse-ring-sm ${up ? 'up' : 'down'}`} />
        </div>
      )}
      {hover && (
        <div className="chart-tooltip" style={{ left: `${Math.max(6, Math.min(94, (hover.x / W) * 100))}%`, top: '-38px' }}>
          <div className="tt-val">{fmtUSD(hover.equity)}</div>
          <div className="tt-sub">{fmtAgo(hover.ts)} ago</div>
        </div>
      )}
    </div>
  )
}

function PipelineStrip({ state }) {
  const odds = state.odds_source_counts || {}
  const diag = state.edge_scan_diag || {}
  const lastScan = state.last_edge_scan
  const lastAgo = lastScan ? Math.floor(Date.now()/1000 - lastScan) : null
  const nextIn = lastScan ? Math.max(0, 120 - lastAgo) : null
  const progressPct = nextIn != null ? ((120 - nextIn) / 120) * 100 : 0
  const leagueCount = Math.max((odds.oddsapi_sports || []).length, (odds.espn_sports || []).length)
  const signals = diag.signals_generated || 0
  return (
    <div className="ov-pipeline">
      <div className="ov-pipe-item">
        <div className="ov-pipe-val">{leagueCount}</div>
        <div className="ov-pipe-lbl">leagues</div>
      </div>
      <div className="ov-pipe-item">
        <div className="ov-pipe-val">{odds.total || 0}</div>
        <div className="ov-pipe-lbl">odds</div>
      </div>
      <div className="ov-pipe-item">
        <div className="ov-pipe-val">{diag.sides_evaluated || 0}</div>
        <div className="ov-pipe-lbl">evaluated</div>
      </div>
      <div className="ov-pipe-item">
        <div className={`ov-pipe-val ${signals > 0 ? 'p-up' : 'dim'}`}>{signals}</div>
        <div className="ov-pipe-lbl">signals</div>
      </div>
      <div className="ov-pipe-item">
        <div className="ov-pipe-val">{lastAgo != null ? `${lastAgo}s` : '—'}</div>
        <div className="ov-pipe-lbl">last</div>
      </div>
      <div className="ov-pipe-item">
        <div className="ov-pipe-val">{nextIn != null ? `${nextIn}s` : '—'}</div>
        <div className="ov-pipe-lbl">next</div>
      </div>
      <div className="ov-pipe-progress">
        <div className="ov-pipe-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}

function PositionsList({ positions, onClose }) {
  if (!positions.length) return <div className="empty small">No open positions — bot is scanning for edges</div>
  return (
    <div className="pos-list">
      <div className="pos-head">
        <div>Position</div>
        <div>Book</div>
        <div>Entry → Now</div>
        <div className="r">Cost</div>
        <div className="r">P&L</div>
        <div></div>
      </div>
      {positions.map(p => {
        const cur = p.current_price || p.entry_price || 0
        const entry = p.entry_price || 0
        const pnl = (p.market_value || cur * p.size) - (p.cost || 0)
        const up = pnl >= 0
        const curUp = cur > entry
        return (
          <div key={p.id} className="pos-row">
            <div className="pos-main">
              <div className="pos-team">{p.team}</div>
              <div className="pos-meta">
                <span className="tag tag-edge">edge</span>
                <span className="pos-sport">{SPORT_LABEL[p.sport] || p.sport}</span>
              </div>
            </div>
            <div className="pos-book">
              {p.book_prob != null ? (
                <>
                  <span className="pos-book-label">{p.provider || 'book'}</span>
                  <span className="mono">{(p.book_prob * 100).toFixed(0)}¢</span>
                </>
              ) : (<span className="dim">—</span>)}
            </div>
            <div className="pos-prices mono">
              <span className="dim">{fmtCents(entry)}</span>
              <span className="sep">→</span>
              <span className={curUp ? 'cur-up' : cur < entry ? 'cur-down' : ''}>{fmtCents(cur)}</span>
            </div>
            <div className="pos-cost mono">{fmtUSD(p.cost, 0)}</div>
            <div className={`pos-pnl mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(pnl)}</div>
            <button className="pos-close" onClick={() => onClose(p.id)} title="Close position"><I.x /></button>
          </div>
        )
      })}
    </div>
  )
}

function EquityCard({ state, stats }) {
  const curve = useEquityCurve(state, stats)
  const [range, setRange] = useState('all')
  const filtered = useMemo(() => {
    const now = Date.now() / 1000
    const cutoff = { '1h': now - 3600, '24h': now - 86400, '7d': now - 7 * 86400, all: 0 }[range] || 0
    return curve.filter(p => p.ts >= cutoff)
  }, [curve, range])
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="section-title flat">Equity</h2>
        <div className="range-btns">
          {['1h', '24h', '7d', 'all'].map(r => (
            <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <LiveChart points={filtered} starting={stats.starting} />
    </div>
  )
}

function LiveChart({ points, starting }) {
  const [hover, setHover] = useState(null)
  const ref = useRef(null)
  const W = 720, H = 200
  const padL = 56, padR = 16, padT = 12, padB = 26
  const plotW = W - padL - padR, plotH = H - padT - padB

  const data = useMemo(() => {
    if (!points.length) return null
    const vals = points.map(p => p.equity)
    let min = Math.min(starting, ...vals)
    let max = Math.max(starting, ...vals)
    const r = max - min || Math.max(starting * 0.02, 1)
    min -= r * 0.08; max += r * 0.08
    const tMin = points[0].ts, tMax = points[points.length - 1].ts
    const dt = tMax - tMin || 1
    const xs = points.map(p => padL + ((p.ts - tMin) / dt) * plotW)
    const ys = points.map(p => padT + (1 - (p.equity - min) / (max - min)) * plotH)
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')
    const bottomY = padT + plotH
    const area = `${path} L ${xs[xs.length - 1].toFixed(1)} ${bottomY} L ${xs[0].toFixed(1)} ${bottomY} Z`
    const pts = points.map((p, i) => ({ ...p, x: xs[i], y: ys[i] }))
    return { path, area, pts, min, max, tMin, tMax }
  }, [points, starting])

  if (!data) return <div className="chart-empty">Building equity curve…</div>

  const onMove = (e) => {
    if (!ref.current || !data.pts.length) return
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < data.pts.length; i++) {
      const d = Math.abs(data.pts[i].x - x)
      if (d < bd) { bd = d; best = i }
    }
    setHover(data.pts[best])
  }

  const lineSY = padT + (1 - (starting - data.min) / (data.max - data.min)) * plotH
  const last = data.pts[data.pts.length - 1]
  const up = last && last.equity >= starting
  const fmtTime = (ts) => {
    const d = new Date(ts * 1000)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Axis ticks: 3 y-ticks + 4 x-ticks
  const yTicks = [data.min + (data.max - data.min) * 0.15, (data.min + data.max) / 2, data.max - (data.max - data.min) * 0.15]
  const xStep = Math.floor(data.pts.length / 4) || 1
  const xTicks = [0, xStep, xStep * 2, xStep * 3].filter(i => i < data.pts.length).map(i => data.pts[i])

  return (
    <div className="chart-wrap standalone">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart standalone" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="grad-up-std" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8D66A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A8D66A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-down-std" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E27178" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E27178" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {yTicks.map((v, i) => {
          const y = padT + (1 - (v - data.min) / (data.max - data.min)) * plotH
          return (
            <g key={i}>
              <text x={padL - 8} y={y + 3} textAnchor="end" className="chart-label">{fmtUSD(v, 0)}</text>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#1F1F1F" strokeWidth="1" />
            </g>
          )
        })}

        {/* Starting line */}
        <line x1={padL} x2={W - padR} y1={lineSY} y2={lineSY} className="base-line" />
        <text x={padL - 8} y={lineSY + 3} textAnchor="end" className="chart-label" style={{ fill: '#808080' }}>{fmtUSD(starting, 0)}</text>

        {/* Area fill */}
        <path d={data.area} className={`chart-area ${up ? 'up' : 'down'}`} />
        {/* Line */}
        <path d={data.path} className={`chart-line ${up ? 'up' : 'down'}`} />

        {/* Live pulse */}
        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="4" className={`pulse-ring-outer ${up ? 'up' : 'down'}`} />
            <circle cx={last.x} cy={last.y} r="3.5" className={`pulse-dot ${up ? 'up' : 'down'}`} />
          </>
        )}

        {/* X-axis time labels */}
        {xTicks.map((p, i) => (
          <text key={i} x={p.x} y={H - 8} className="chart-axis-time">{fmtTime(p.ts)}</text>
        ))}

        {/* Hover crosshair */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={H - padB} className="hover-line" />
            <circle cx={hover.x} cy={hover.y} r="4" className="hover-dot" />
          </>
        )}
      </svg>
      {hover && (
        <div className="chart-tooltip" style={{ left: `${(hover.x / W) * 100}%` }}>
          <div className="tt-val">{fmtUSD(hover.equity)}</div>
          <div className="tt-sub">{fmtAgo(hover.ts)} ago</div>
        </div>
      )}
    </div>
  )
}

function ExposureCard({ stats, state }) {
  const pct = Math.min(1, stats.exposure)
  const R = 42
  const C = 2 * Math.PI * R
  const offset = C * (1 - pct)
  const zone = pct > 0.85 ? 'danger' : pct > 0.6 ? 'full' : 'safe'

  const edgeDeployed = stats.open.filter(p => p.engine === 'edge').reduce((s, p) => s + (p.cost || 0), 0)
  const edgePct = edgeDeployed / Math.max(stats.equity, 1)

  return (
    <div className="exp-card">
      <div className="card-head">
        <h2 className="section-title flat">Exposure</h2>
      </div>
      <div className="exp-ring-wrap">
        <svg className="exp-ring" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={R} className="exp-ring-track" />
          <circle cx="48" cy="48" r={R}
            className={`exp-ring-fill zone-${zone}`}
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
          <text x="48" y="44" className="exp-ring-pct">{Math.round(pct * 100)}%</text>
          <text x="48" y="60" className="exp-ring-pct-sub">deployed</text>
        </svg>
        <div className="exp-legend">
          <div className="leg-item">
            <span className="leg-dot leg-edge" />
            <span className="lbl">Deployed</span>
            <span className="val">{fmtUSD(stats.deployed, 0)}</span>
          </div>
          <div className="leg-item">
            <span className="leg-dot leg-avail" />
            <span className="lbl">Available</span>
            <span className="val">{fmtUSD(stats.equity - stats.deployed, 0)}</span>
          </div>
        </div>
      </div>
      <div className="exp-caps">
        <Cap lbl="Total cap" pct={stats.exposure} cap={0.80} />
        <Cap lbl="Edge cap" pct={edgePct} cap={0.80} />
        <Cap lbl="Positions" pct={stats.open.length / 15} cap={1} raw={`${stats.open.length}/15`} />
      </div>
    </div>
  )
}

function Cap({ lbl, pct, cap, raw }) {
  const ratio = Math.min(1, pct / cap)
  const zone = ratio > 0.9 ? 'over' : ratio > 0.7 ? 'near' : 'under'
  return (
    <div className="exp-cap">
      <div className="exp-cap-lbl">{lbl}</div>
      <div className="exp-cap-track">
        <div className={`exp-cap-bar ${zone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="exp-cap-val">{raw || `${Math.round(pct * 100)}/${Math.round(cap * 100)}%`}</div>
    </div>
  )
}

function LiveEdgesTable({ edges, open }) {
  const [sort, setSort] = useState('edge')
  const openKeys = useMemo(() => new Set(open.map(p => (p.team || '').toLowerCase())), [open])

  const rows = useMemo(() => {
    const seen = new Set()
    const list = (edges || []).filter(e => {
      if (e.status === 'SKIP_NOT_BEST_SIDE') return false
      const k = `${e.team}|${e.commence_time}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    if (sort === 'edge') list.sort((a, b) => (b.effective_edge ?? b.edge ?? 0) - (a.effective_edge ?? a.edge ?? 0))
    else if (sort === 'time') list.sort((a, b) => (a.hours || 0) - (b.hours || 0))
    else if (sort === 'sport') list.sort((a, b) => (a.sport || '').localeCompare(b.sport || ''))
    return list.slice(0, 40)
  }, [edges, sort])

  if (!rows.length) return <div className="empty small">No live edges this scan. Bot checks every 2 min.</div>

  return (
    <div className="edges-panel">
      <div className="edges-sort">
        <span className="dim">Sort:</span>
        {['edge', 'time', 'sport'].map(s => (
          <button key={s} className={`sort-btn ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>{s}</button>
        ))}
      </div>
      <div className="edges-table">
        <div className="edges-head">
          <div>Team</div>
          <div>League</div>
          <div className="r">Poly</div>
          <div className="r">Book</div>
          <div className="r">Edge</div>
          <div className="r">Kickoff</div>
          <div>Status</div>
        </div>
        {rows.map((e, i) => {
          const bookProb = mlToProb(e.moneyline)
          const ev = e.effective_edge ?? e.edge ?? 0
          const isOpen = openKeys.has((e.team || '').toLowerCase())
          return (
            <div key={i} className={`edges-row ${e.status === 'TRADED' ? 'traded' : ''} ${isOpen ? 'is-open' : ''}`}>
              <div className="f-team">
                {isOpen && <span className="hold-dot" title="Currently held" />}
                {e.team}
              </div>
              <div className="f-sport dim">{SPORT_LABEL[e.sport] || e.sport}</div>
              <div className="r mono">{e.poly != null ? `${(e.poly * 100).toFixed(0)}¢` : '—'}</div>
              <div className="r mono">{bookProb != null ? `${(bookProb * 100).toFixed(0)}¢` : '—'}</div>
              <div className={`r mono ${ev >= 0.05 ? 'p-up' : ev >= 0.03 ? '' : 'dim'}`}>
                {ev >= 0 ? '+' : ''}{(ev * 100).toFixed(1)}%
              </div>
              <div className="r mono dim">{e.hours != null ? `${e.hours.toFixed(1)}h` : '—'}</div>
              <div className={`f-status ${statusTone(e.status)}`} title={e.reason || ''}>
                {e.status || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CLVPanel({ stats }) {
  const clv = stats.clvTrades
  if (!clv.length) {
    return (
      <div className="clv-panel empty-state">
        <div className="clv-pending-ring">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--bg-4)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="30 126"
              transform="rotate(-90 24 24)"
            />
          </svg>
        </div>
        <div>
          <div className="clv-empty-title">Collecting data</div>
          <div className="clv-empty-sub">CLV is captured at the T-30 min pre-game exit. First values appear after positions resolve.</div>
          <div className="clv-empty-sub sub-2">Positive = you beat the book's closing line = real alpha.</div>
        </div>
      </div>
    )
  }
  const avg = stats.avgClv
  const recent = [...clv].sort((a, b) => (b.closed_at || 0) - (a.closed_at || 0)).slice(0, 10)
  const max = Math.max(...clv.map(t => Math.abs(t.clv_edge || 0))) || 0.01

  return (
    <div className="clv-panel">
      <div className="clv-summary">
        <div className="clv-stat">
          <div className={`clv-stat-val ${avg >= 0 ? 'p-up' : 'p-down'}`}>
            {avg >= 0 ? '+' : ''}{(avg * 100).toFixed(2)}¢
          </div>
          <div className="clv-stat-lbl">Avg CLV</div>
        </div>
        <div className="clv-stat">
          <div className={`clv-stat-val ${stats.beatClose >= 0.5 ? 'p-up' : 'p-down'}`}>
            {Math.round(stats.beatClose * 100)}%
          </div>
          <div className="clv-stat-lbl">Beat the close</div>
        </div>
        <div className="clv-stat">
          <div className="clv-stat-val">{clv.length}</div>
          <div className="clv-stat-lbl">Samples</div>
        </div>
      </div>

      <div className="clv-table">
        <div className="clv-head">
          <div>Team</div>
          <div>Provider</div>
          <div className="r">Entry book</div>
          <div className="r">Closing</div>
          <div className="r">CLV edge</div>
          <div className="r">P&L</div>
          <div>Visual</div>
        </div>
        {recent.map((t, i) => {
          const ce = t.clv_edge || 0
          const entryProb = t.entry_book_prob || 0
          const clvProb = t.clv_prob
          return (
            <div key={i} className="clv-row">
              <div className="f-team">{t.team}</div>
              <div className="f-prov dim">{t.provider || '—'}</div>
              <div className="r mono">{entryProb ? `${(entryProb * 100).toFixed(0)}¢` : '—'}</div>
              <div className="r mono">{clvProb != null ? `${(clvProb * 100).toFixed(0)}¢` : '—'}</div>
              <div className={`r mono ${ce >= 0 ? 'p-up' : 'p-down'}`}>
                {ce >= 0 ? '+' : ''}{(ce * 100).toFixed(1)}¢
              </div>
              <div className={`r mono ${(t.pnl || 0) >= 0 ? 'p-up' : 'p-down'}`}>{fmtSigned(t.pnl)}</div>
              <div className="clv-viz">
                <div className="clv-viz-center" />
                <div
                  className={`clv-viz-bar ${ce >= 0 ? 'p-up-bg' : 'p-down-bg'}`}
                  style={{
                    width: `${Math.min(50, (Math.abs(ce) / max) * 50)}%`,
                    [ce >= 0 ? 'left' : 'right']: '50%',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SportBreakdown({ bySport }) {
  const rows = Object.entries(bySport).sort((a, b) => b[1].pnl - a[1].pnl)
  // Scale by the MAGNITUDE of largest absolute P&L — positives extend right of center, negatives left
  const max = Math.max(...rows.map(([, v]) => Math.abs(v.pnl)), 1)
  if (!rows.length) return <div className="empty small">No trades yet</div>
  return (
    <div className="sport-rows">
      {rows.map(([sport, v]) => {
        const wr = v.trades ? v.wins / v.trades : 0
        const up = v.pnl >= 0
        const wrTone = wr >= 0.6 ? 'hot' : wr >= 0.5 ? 'warm' : 'cold'
        const barPct = (Math.abs(v.pnl) / max) * 48  // 48% of half-bar width
        return (
          <div key={sport} className="sport-row">
            <div className="sport-name">{SPORT_LABEL[sport] || sport}</div>
            <div className="sport-trades mono dim">{v.trades}</div>
            <div className="sport-wr-wrap">
              <span className={`sport-wr-dot ${wrTone}`} />
              <span className="sport-wr mono">{fmtPct(wr)}</span>
            </div>
            <div className="sport-bar">
              <div className="sport-bar-center" />
              <div
                className={`sport-bar-fill ${up ? 'up' : 'down'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className={`sport-pnl mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(v.pnl)}</div>
          </div>
        )
      })}
    </div>
  )
}

function LedgerTable({ trades }) {
  if (!trades.length) return <div className="empty small">No closed trades yet</div>
  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>Team</div>
        <div className="hide-sm">Sport</div>
        <div className="r">Entry</div>
        <div className="r hide-sm">Exit</div>
        <div className="r hide-sm">CLV</div>
        <div className="r">P&L</div>
        <div className="hide-sm">Reason</div>
      </div>
      {trades.map((t, i) => {
        const up = (t.pnl || 0) >= 0
        const ce = t.clv_edge
        return (
          <div key={i} className="ledger-row">
            <div>{t.team}</div>
            <div className="hide-sm dim">{SPORT_LABEL[t.sport] || t.sport}</div>
            <div className="r mono dim">{fmtCents(t.entry_price)}</div>
            <div className="r mono hide-sm">{fmtCents(t.exit_price)}</div>
            <div className={`r mono hide-sm ${ce == null ? 'dim' : ce >= 0 ? 'p-up' : 'p-down'}`}>
              {ce == null ? '—' : `${ce >= 0 ? '+' : ''}${(ce * 100).toFixed(1)}¢`}
            </div>
            <div className={`r mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(t.pnl)}</div>
            <div className="hide-sm dim ledger-reason" title={t.exit_reason}>{t.exit_reason || '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

function ConfirmModal({ modal, onDone }) {
  const [busy, setBusy] = useState(false)
  const isAll = modal.type === 'close-all'
  const confirm = async () => {
    setBusy(true)
    try {
      const url = isAll ? `${API}/api/close-all` : `${API}/api/close/${modal.id}`
      const body = isAll ? { confirm: 'CLOSE_ALL' } : {}
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } catch (e) { console.error(e) }
    onDone()
  }
  return (
    <div className="modal-backdrop" onClick={onDone}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{isAll ? 'Close all positions?' : 'Close this position?'}</div>
        <div className="modal-sub">
          {isAll ? 'This closes every open position at current market price.' : 'The position will be closed at current market price.'}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onDone} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={confirm} disabled={busy}>{busy ? 'Closing…' : 'Close'}</button>
        </div>
      </div>
    </div>
  )
}

function ScanActivity() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/scans?engine=edge&limit=40`)
        const data = await res.json()
        if (mounted) { setScans(data.scans || []); setLoading(false) }
      } catch (e) { if (mounted) setLoading(false) }
    }
    load()
    const iv = setInterval(load, 10000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  if (loading) return <div className="empty small">Loading scans…</div>
  if (!scans.length) return <div className="empty small">No scans recorded yet</div>

  return (
    <div className="scan-list">
      {scans.slice(0, 30).map(scan => {
        const expanded = expandedId === scan.id
        const findings = scan.findings || []
        const sigCount = scan.signals || 0
        return (
          <div key={`${scan.id}-${scan.ts}`} className="scan-row-wrap">
            <div className={`scan-row ${expanded ? 'expanded' : ''}`} onClick={() => setExpandedId(expanded ? null : scan.id)}>
              <div className="scan-time mono">{fmtScanTime(scan.ts)}</div>
              <div className="scan-stats">
                <span className="scan-stat"><span className="dim">findings</span><span className="mono">{scan.total_findings}</span></span>
                <span className="scan-stat"><span className="dim">signals</span><span className={`mono ${sigCount > 0 ? 'p-up' : 'dim'}`}>{sigCount}</span></span>
                {scan.odds_sources && <span className="scan-stat"><span className="dim">odds</span><span className="mono">{scan.odds_sources.total || 0}</span></span>}
                <span className="scan-stat"><span className="dim">ms</span><span className="mono">{scan.duration_ms}</span></span>
              </div>
              <div className="scan-chevron">{expanded ? '▾' : '▸'}</div>
            </div>
            {expanded && findings.length > 0 && <div className="scan-findings"><EdgeFindingsTable findings={findings} /></div>}
            {expanded && findings.length === 0 && <div className="scan-findings empty small">No findings this scan.</div>}
          </div>
        )
      })}
    </div>
  )
}

function fmtScanTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function statusTone(s) {
  if (s === 'TRADED' || s === 'CANDIDATE') return 'p-up'
  if (s === 'skip' || s?.startsWith('SKIP')) return 'dim'
  return ''
}

function EdgeFindingsTable({ findings }) {
  const sorted = [...findings].sort((a, b) => (b.effective_edge || b.edge || 0) - (a.effective_edge || a.edge || 0))
  return (
    <div className="findings-table">
      <div className="findings-head">
        <div>Team</div>
        <div>Sport</div>
        <div className="r">Poly</div>
        <div className="r">Book</div>
        <div className="r">True</div>
        <div className="r">Edge</div>
        <div>Provider</div>
        <div>Status</div>
      </div>
      {sorted.map((f, i) => {
        const bookProb = mlToProb(f.moneyline)
        const edgeVal = f.effective_edge ?? f.edge ?? 0
        return (
          <div key={i} className="findings-row">
            <div className="f-team">{f.team}</div>
            <div className="f-sport dim">{SPORT_LABEL[f.sport] || f.sport}</div>
            <div className="r mono">{f.poly != null ? `${(f.poly * 100).toFixed(0)}¢` : '—'}</div>
            <div className="r mono">{bookProb != null ? `${(bookProb * 100).toFixed(0)}¢` : '—'}</div>
            <div className="r mono">{f.true != null ? `${(f.true * 100).toFixed(0)}¢` : '—'}</div>
            <div className={`r mono ${edgeVal >= 0.05 ? 'p-up' : edgeVal >= 0.03 ? '' : edgeVal < 0 ? 'p-down' : 'dim'}`}>
              {edgeVal >= 0 ? '+' : ''}{(edgeVal * 100).toFixed(1)}%
            </div>
            <div className="f-prov dim">{f.provider || '—'}</div>
            <div className={`f-status ${statusTone(f.status)}`} title={f.reason || ''}>{f.status || '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

function Splash({ err }) {
  return (
    <div className="splash">
      <div className="splash-inner">
        <div className="splash-mark">
          <SignalMark size={40} />
          <div className="splash-ring" />
          <div className="splash-ring splash-ring-2" />
        </div>
        <div className="splash-text">Signal</div>
        <div className="splash-sub">{err ? 'Connection failed' : 'Loading…'}</div>
        {err && <div className="splash-err">{err}</div>}
      </div>
    </div>
  )
}
