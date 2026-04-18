import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'

// ───────── Config ─────────
const API = import.meta.env.VITE_API_URL || 'https://web-production-72709.up.railway.app'
const POLL_MS = 3000

// ───────── Formatters ─────────
const fmtUSD = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—'
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
const fmtSignedUSD = (n) => {
  if (n == null || isNaN(n)) return '—'
  const s = n >= 0 ? '+' : '−'
  return `${s}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtPct = (n, d = 1) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`)
const fmtSignedPct = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—'
  const s = n >= 0 ? '+' : ''
  return `${s}${(n * 100).toFixed(d)}%`
}
const fmtCents = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}¢`)
const fmtNum = (n, d = 0) => (n == null ? '—' : Number(n).toFixed(d))
const fmtAgo = (ts) => {
  if (!ts) return '—'
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 5) return 'now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const fmtUptime = (s) => {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

// ───────── Sport labels ─────────
const SPORT_LABEL = {
  nba: 'NBA', wnba: 'WNBA', nhl: 'NHL', mlb: 'MLB', nfl: 'NFL',
  ncaab: 'NCAA MB', ncaaf: 'NCAA FB', mls: 'MLS',
  epl: 'Premier League', liga: 'La Liga', seriea: 'Serie A',
  bundes: 'Bundesliga', ligue1: 'Ligue 1', ucl: 'UCL', uel: 'UEL', uecl: 'UECL',
  champ: 'Championship', jleag: 'J-League', j2: 'J2',
  aleag: 'A-League', braA: 'Brazil A', braB: 'Brazil B',
  kleag: 'K-League', china: 'CSL', turk: 'Süper Lig',
  norw: 'Eliteserien', denm: 'Superliga', colom: 'Colombia',
  egypt: 'Egypt', libert: 'Libertadores', sudam: 'Sudamericana',
  saudi: 'Saudi PL', ligamx: 'Liga MX', erediv: 'Eredivisie',
  liga2: 'La Liga 2', lig2fr: 'Ligue 2', bund2: 'Bundesliga 2',
  serieb: 'Serie B', porto: 'Primeira Liga', scotpr: 'Scottish Prem', argA: 'Argentina Primera',
}

// ───────── Icons (inline SVG) ─────────
const I = {
  logo: () => (
    <svg width="20" height="20" viewBox="0 0 32 32"><path d="M5 22 L12 14 L17 18 L27 8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
  ),
  dash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  positions: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 L9 11 L13 15 L21 7"/><path d="M14 7 H21 V14"/></svg>,
  ledger: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10 H21"/><path d="M9 4 V20"/></svg>,
  live: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
  analytics: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 V10"/><path d="M10 20 V4"/><path d="M16 20 V13"/><path d="M22 20 V7"/></svg>,
  harvest: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L12 22"/><path d="M6 8 Q12 4 18 8"/><path d="M4 14 Q12 8 20 14"/></svg>,
  edge: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3 L21 21"/><path d="M21 9 V3 H15"/></svg>,
  lineup: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20 Q3 14 9 14 Q15 14 15 20"/><path d="M15 14 Q21 14 21 20"/></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20 L16.5 16.5"/></svg>,
  bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8 A6 6 0 0 1 18 8 V13 L20 16 H4 L6 13 Z"/><path d="M10 20 Q12 22 14 20"/></svg>,
  help: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9 Q12 6.5 14.5 9 Q15 10.5 12 12 V14"/><circle cx="12" cy="17.5" r="0.8" fill="currentColor"/></svg>,
  refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12 A8 8 0 0 1 18 7"/><path d="M18 3 V7 H14"/><path d="M20 12 A8 8 0 0 1 6 17"/><path d="M6 21 V17 H10"/></svg>,
  chev: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9 L12 15 L18 9"/></svg>,
  arrow: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12 H19"/><path d="M13 6 L19 12 L13 18"/></svg>,
  close: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>,
  pause: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
}

// ───────── Data hook ─────────
function useBotState() {
  const [state, setState] = useState(null)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const fetch1 = async () => {
      try {
        const r = await fetch(`${API}/api/state`, { cache: 'no-store' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (alive) { setState(j); setErr(null) }
      } catch (e) { if (alive) setErr(e.message) }
    }
    fetch1()
    const id = setInterval(() => { fetch1(); setTick(t => t + 1) }, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return { state, err, tick }
}

// ───────── Derived stats ─────────
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
    const live = state.live_games || []
    const wins = trades.filter(t => (t.pnl || 0) > 0).length
    const winRate = trades.length ? wins / trades.length : 0
    // today P&L (since midnight local)
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
    const todayTs = midnight.getTime() / 1000
    const todayTrades = trades.filter(t => (t.closed_at || 0) >= todayTs)
    const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
    const deployed = open.reduce((s, p) => s + (p.cost || 0), 0)
    const exposure = deployed / starting
    return { equity, starting, pct, realized, unrealized, open, trades, live, winRate, todayTrades, todayPnl, deployed, exposure }
  }, [state])
}

// ───────── Equity curve builder ─────────
function useEquityCurve(state, stats) {
  return useMemo(() => {
    if (!state || !stats) return []
    // Prefer state.equity_curve if present; fallback to synthesizing from trade_history
    if (state.equity_curve?.length) {
      return state.equity_curve.map(p => ({ ts: p.ts, equity: p.equity || p.value || p[1] }))
    }
    // Synthesize
    const trades = [...stats.trades].sort((a, b) => (a.closed_at || 0) - (b.closed_at || 0))
    const pts = [{ ts: trades[0]?.opened_at || Date.now()/1000 - 86400, equity: stats.starting }]
    let running = stats.starting
    for (const t of trades) {
      running += (t.pnl || 0)
      pts.push({ ts: t.closed_at || Date.now()/1000, equity: running })
    }
    pts.push({ ts: Date.now() / 1000, equity: stats.equity })
    return pts
  }, [state, stats])
}

// ───────── Main App ─────────
export default function App() {
  const { state, err } = useBotState()
  const stats = useStats(state)
  const [nav, setNav] = useState('dashboard')
  const [confirmClose, setConfirmClose] = useState(null)

  if (err && !state) return <FatalError err={err} />
  if (!state || !stats) return <LoadingSplash />

  return (
    <div className="app">
      <Sidebar active={nav} onNav={setNav} state={state} stats={stats} />
      <main className="main">
        <TopBar state={state} stats={stats} nav={nav} />
        <div className="content">
          {nav === 'dashboard' && <Dashboard state={state} stats={stats} onCloseAll={() => setConfirmClose('all')} />}
          {nav === 'positions' && <PositionsPage state={state} stats={stats} onClose={setConfirmClose} />}
          {nav === 'ledger' && <LedgerPage stats={stats} />}
          {nav === 'live' && <LivePage state={state} />}
          {nav === 'analytics' && <AnalyticsPage state={state} stats={stats} />}
          {nav === 'harvest' && <EnginePage engine="harvest" state={state} stats={stats} />}
          {nav === 'edge' && <EnginePage engine="edge" state={state} stats={stats} />}
          {nav === 'lineup' && <LineupPage state={state} />}
        </div>
      </main>
      {confirmClose && <ConfirmClose target={confirmClose} onDone={() => setConfirmClose(null)} />}
    </div>
  )
}

// ───────── Sidebar ─────────
function Sidebar({ active, onNav, state, stats }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dash' },
    { id: 'positions', label: 'Positions', icon: 'positions', badge: stats.open.length || null },
    { id: 'ledger', label: 'Ledger', icon: 'ledger', badge: stats.trades.length || null },
    { id: 'live', label: 'Live Games', icon: 'live', badge: stats.live.length || null },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  ]
  const engines = [
    { id: 'harvest', label: 'Harvest', icon: 'harvest' },
    { id: 'edge', label: 'Edge', icon: 'edge' },
    { id: 'lineup', label: 'Lineup Watch', icon: 'lineup', on: state.lineup_watcher_enabled },
  ]
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><I.logo /></div>
        <div className="brand-name">Signal</div>
      </div>
      <div className="search-box">
        <I.search />
        <input placeholder="Search…" />
        <span className="kbd">⌘K</span>
      </div>
      <nav className="nav">
        {items.map(it => {
          const IconC = I[it.icon]
          return (
            <button key={it.id} className={`nav-item ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
              <IconC />
              <span>{it.label}</span>
              {it.badge != null && <span className="nav-badge">{it.badge}</span>}
            </button>
          )
        })}
      </nav>
      <div className="nav-header">ENGINES</div>
      <nav className="nav">
        {engines.map(it => {
          const IconC = I[it.icon]
          return (
            <button key={it.id} className={`nav-item ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
              <IconC />
              <span>{it.label}</span>
              {it.on === false && <span className="nav-off">off</span>}
            </button>
          )
        })}
      </nav>
      <div className="spacer" />
      <StatusCard state={state} />
    </aside>
  )
}

function StatusCard({ state }) {
  const ok = state.ws_market_connected && state.ws_sports_connected
  return (
    <div className="status-card">
      <div className="status-row">
        <span className={`dot ${ok ? 'ok' : 'bad'}`} />
        <span className="status-label">{state.paper_mode ? 'PAPER MODE' : 'LIVE'}</span>
      </div>
      <div className="status-meta">
        <div>Uptime <b>{fmtUptime(state.uptime)}</b></div>
        <div>Redis <b className={state.redis_connected ? 'ok' : 'bad'}>{state.redis_connected ? '●' : '○'}</b></div>
      </div>
    </div>
  )
}

// Need to import React for React.createElement usage above (hack since we use jsx transform)
// Actually easier: use a renderIcon helper
// Let me patch — we import icon components directly
function renderIcon(name) { const C = I[name]; return C ? <C /> : null }

// ───────── Top bar ─────────
function TopBar({ state, stats, nav }) {
  const label = { dashboard: 'Dashboard', positions: 'Positions', ledger: 'Ledger', live: 'Live Games', analytics: 'Analytics', harvest: 'Harvest Engine', edge: 'Edge Engine', lineup: 'Lineup Watcher' }[nav] || 'Dashboard'
  return (
    <div className="topbar">
      <div className="crumbs">
        <span className="crumb-icon">←</span>
        <span className="crumb-icon">→</span>
        <span className="crumb-sep">Signal</span>
        <I.chev />
        <span className="crumb-active">{label}</span>
      </div>
      <div className="topbar-right">
        <button className="ic-btn" title="Help"><I.help /></button>
        <button className="ic-btn" title="Notifications"><I.bell /></button>
        <button className="ic-btn" title="Refresh"><I.refresh /></button>
        <div className="user-chip">
          <div className="avatar">G</div>
        </div>
      </div>
    </div>
  )
}

// ───────── Dashboard view ─────────
function Dashboard({ state, stats, onCloseAll }) {
  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Live performance across all engines</p>
        </div>
        <div className="page-actions">
          <Pill label={state.paused ? 'PAUSED' : 'RUNNING'} tone={state.paused ? 'warn' : 'ok'} />
          <button className="btn-ghost"><I.chev /> This session</button>
        </div>
      </div>

      <div className="row row-heroes">
        <HeroEquity stats={stats} />
        <HeroRealized stats={stats} />
        <HeroExposure stats={stats} onCloseAll={onCloseAll} />
      </div>

      <div className="row row-half">
        <PositionsCard stats={stats} />
        <EquityChartCard state={state} stats={stats} />
      </div>

      <div className="row row-half">
        <LiveGamesCard state={state} />
        <SignalsCard state={state} stats={stats} />
      </div>

      <LedgerCard stats={stats} />
    </div>
  )
}

// ───────── Hero cards ─────────
function HeroEquity({ stats }) {
  return (
    <div className="hero hero-active">
      <div className="hero-head">
        <div className="hero-icon-tile active"><I.logo /></div>
        <span className="hero-menu">⋯</span>
      </div>
      <div className="hero-title">Total Equity</div>
      <div className="hero-sub">Paper bankroll · marked-to-market</div>
      <div className="hero-row">
        <div className="hero-value mono">{fmtUSD(stats.equity)}</div>
        <div className={`pill ${stats.pct >= 0 ? 'pill-green' : 'pill-red'}`}>
          {fmtSignedPct(stats.pct, 2)} {stats.pct >= 0 ? '↑' : '↓'}
        </div>
      </div>
      <div className="hero-foot">
        <span>Start {fmtUSD(stats.starting, 0)}</span>
        <span className="hero-arrow">See breakdown <I.arrow /></span>
      </div>
    </div>
  )
}

function HeroRealized({ stats }) {
  const avg = stats.trades.length ? stats.realized / stats.trades.length : 0
  return (
    <div className="hero">
      <div className="hero-head">
        <div className="hero-icon-tile"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 L9 11 L13 15 L21 7"/></svg></div>
        <span className="hero-menu">⋯</span>
      </div>
      <div className="hero-title">Realized P&L</div>
      <div className="hero-sub">{stats.trades.length} closed · {fmtPct(stats.winRate, 0)} win rate</div>
      <div className="hero-row">
        <div className="hero-value mono">{fmtSignedUSD(stats.realized)}</div>
      </div>
      <div className="hero-foot">
        <span>Avg {fmtSignedUSD(avg)}/trade</span>
        <span className="hero-arrow">View ledger <I.arrow /></span>
      </div>
    </div>
  )
}

function HeroExposure({ stats, onCloseAll }) {
  const pctUsed = Math.min(1, stats.exposure)
  return (
    <div className="hero">
      <div className="hero-head">
        <div className="hero-icon-tile"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3 A9 9 0 0 1 21 12"/></svg></div>
        <span className="hero-menu">⋯</span>
      </div>
      <div className="hero-title">Open Exposure</div>
      <div className="hero-sub">{stats.open.length} positions · {fmtSignedUSD(stats.unrealized)} unrealized</div>
      <div className="hero-row">
        <div className="hero-value mono">{fmtUSD(stats.deployed, 0)}</div>
        <div className="pill pill-muted">{fmtPct(pctUsed, 0)}</div>
      </div>
      <div className="exposure-bar">
        <div className="exposure-fill" style={{ width: `${pctUsed * 100}%` }} />
      </div>
      <div className="hero-foot">
        <span>Cap 60%</span>
        <button className="hero-arrow hero-link" onClick={onCloseAll} disabled={!stats.open.length}>
          Close all <I.arrow />
        </button>
      </div>
    </div>
  )
}

// ───────── Positions card ─────────
function PositionsCard({ stats }) {
  const rows = stats.open.slice(0, 6)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Open Positions</div>
          <div className="card-sub">{stats.open.length} live · {fmtSignedUSD(stats.unrealized)} unrealized</div>
        </div>
      </div>
      {rows.length === 0 && <Empty label="No open positions" />}
      <div className="pos-grid">
        {rows.map(p => <PositionTile key={p.id} p={p} />)}
      </div>
    </div>
  )
}

function PositionTile({ p }) {
  const cur = p.current_price || p.entry_price || 0
  const pnl = (p.market_value || cur * p.size) - (p.cost || 0)
  const pnlPct = p.cost ? pnl / p.cost : 0
  const up = pnl >= 0
  const sport = SPORT_LABEL[p.sport] || p.sport?.toUpperCase() || '—'
  return (
    <div className="pos-tile">
      <div className="pos-tile-head">
        <span className={`engine-dot engine-${p.engine}`} />
        <span className="pos-engine">{p.engine}</span>
        <span className="pos-sep">·</span>
        <span className="pos-sport">{sport}</span>
      </div>
      <div className="pos-team">{p.team}</div>
      <div className="pos-meta">
        <span className="mono">{fmtCents(p.entry_price)}</span>
        <span className="pos-arrow">→</span>
        <span className="mono">{fmtCents(cur)}</span>
      </div>
      <div className="pos-foot">
        <span className="mono dim">{fmtUSD(p.cost, 0)}</span>
        <span className={`pill pill-sm ${up ? 'pill-green' : 'pill-red'}`}>{fmtSignedUSD(pnl)}</span>
      </div>
    </div>
  )
}

// ───────── Equity chart card ─────────
function EquityChartCard({ state, stats }) {
  const [range, setRange] = useState('session')
  const curve = useEquityCurve(state, stats)
  const filtered = useMemo(() => {
    if (!curve.length) return []
    const now = Date.now() / 1000
    const cutoff = { '1h': now - 3600, '24h': now - 86400, '7d': now - 7 * 86400, session: 0 }[range] || 0
    return curve.filter(p => p.ts >= cutoff)
  }, [curve, range])
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Equity Curve</div>
          <div className="equity-headline mono">{fmtUSD(stats.equity)}</div>
        </div>
        <div className="range-toggle">
          {['1h', '24h', '7d', 'session'].map(r => (
            <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
              {r === 'session' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>
      <EquityChart points={filtered} starting={stats.starting} />
    </div>
  )
}

function EquityChart({ points, starting }) {
  if (!points.length) return <Empty label="Waiting for data" />
  const W = 560, H = 220, P = 28
  const xs = points.map(p => p.ts)
  const ys = points.map(p => p.equity)
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)]
  const yMin = Math.min(...ys, starting) * 0.995
  const yMax = Math.max(...ys, starting) * 1.005
  const px = t => P + ((t - xMin) / Math.max(1, (xMax - xMin))) * (W - P * 2)
  const py = e => H - P - ((e - yMin) / Math.max(1, (yMax - yMin))) * (H - P * 2)
  const pathD = points.map((p, i) => `${i ? 'L' : 'M'}${px(p.ts).toFixed(1)},${py(p.equity).toFixed(1)}`).join(' ')
  const fillD = `${pathD} L${px(xMax).toFixed(1)},${H - P} L${px(xMin).toFixed(1)},${H - P} Z`
  const last = points[points.length - 1]
  const ticks = 4
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="eq-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF7B3F" />
            <stop offset="100%" stopColor="#FF5A1F" />
          </linearGradient>
        </defs>
        {[...Array(ticks)].map((_, i) => {
          const yv = yMin + (i / (ticks - 1)) * (yMax - yMin)
          const y = py(yv)
          return (
            <g key={i}>
              <line x1={P} y1={y} x2={W - P} y2={y} stroke="#1A1A1A" />
              <text x={P - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#525252" fontFamily="JetBrains Mono">
                {Math.round(yv)}
              </text>
            </g>
          )
        })}
        <line x1={P} y1={py(starting)} x2={W - P} y2={py(starting)} stroke="#404040" strokeDasharray="3 3" />
        <path d={fillD} fill="url(#eq-fill)" />
        <path d={pathD} fill="none" stroke="url(#eq-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={px(last.ts)} cy={py(last.equity)} r="4" fill="#FF5A1F" />
        <circle cx={px(last.ts)} cy={py(last.equity)} r="8" fill="#FF5A1F" opacity="0.25" />
      </svg>
    </div>
  )
}

// ───────── Live games card ─────────
function LiveGamesCard({ state }) {
  const games = (state.live_games || []).slice(0, 6)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Live Games</div>
          <div className="card-sub">{(state.live_games || []).length} in play · monitoring</div>
        </div>
        <div className="pulse-dot" />
      </div>
      {games.length === 0 && <Empty label="No live games" />}
      <div className="live-list">
        {games.map(g => <LiveRow key={g.espn_id} g={g} />)}
      </div>
    </div>
  )
}

function LiveRow({ g }) {
  const leadHome = g.home_score - g.away_score
  const lead = Math.abs(leadHome)
  const leaderIsHome = leadHome > 0
  const tie = leadHome === 0
  const h = g.home_poly, a = g.away_poly
  return (
    <div className="live-row">
      <div className="live-league">{SPORT_LABEL[g.sport] || g.sport}</div>
      <div className="live-teams">
        <div className={`live-team ${leaderIsHome ? 'lead' : ''}`}>{g.away_abbrev} <span className="live-score mono">{g.away_score}</span></div>
        <div className={`live-team ${!leaderIsHome && !tie ? 'lead' : ''}`}>{g.home_abbrev} <span className="live-score mono">{g.home_score}</span></div>
      </div>
      <div className="live-status">{g.detail}</div>
      <div className="live-poly">
        {h != null && a != null ? (
          <>
            <span className="mono dim">{(h*100).toFixed(0)}¢</span>
            <span className="mono dim">·</span>
            <span className="mono dim">{(a*100).toFixed(0)}¢</span>
          </>
        ) : <span className="dim">—</span>}
      </div>
      <div className="live-signal">
        {lead >= 3 ? <span className="pill pill-sm pill-orange">blowout</span> : <span className="live-watch">monitoring</span>}
      </div>
    </div>
  )
}

// ───────── Signals card ─────────
function SignalsCard({ state }) {
  const edges = (state.edges_found || []).slice(0, 7)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Edge Signals</div>
          <div className="card-sub">Top tradeable edges · last scan {fmtAgo(state.last_edge_scan)}</div>
        </div>
      </div>
      {edges.length === 0 && <Empty label="No edges detected" />}
      <div className="signals-list">
        {edges.map((e, i) => (
          <div key={i} className="signal-row">
            <span className="sig-sport">{SPORT_LABEL[e.sport] || e.sport}</span>
            <span className="sig-team">{e.team}</span>
            <span className="mono dim">poly {fmtCents(e.poly)}</span>
            <span className="mono dim">true {fmtCents(e.true)}</span>
            <span className={`pill pill-sm ${e.edge >= 0.05 ? 'pill-green' : 'pill-muted'}`}>{fmtSignedPct(e.edge)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────── Ledger card ─────────
function LedgerCard({ stats }) {
  const rows = [...stats.trades].sort((a, b) => (b.closed_at || 0) - (a.closed_at || 0)).slice(0, 8)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Recent Activity</div>
          <div className="card-sub">{stats.trades.length} closed trades · {fmtSignedUSD(stats.realized)} realized</div>
        </div>
        <div className="card-actions">
          <div className="search-mini"><I.search /><input placeholder="Search" /></div>
        </div>
      </div>
      {rows.length === 0 && <Empty label="No trades yet — the bot will log resolved paper trades here" />}
      {rows.length > 0 && (
        <table className="ledger">
          <thead>
            <tr>
              <th></th>
              <th>Team</th>
              <th>Market</th>
              <th>Engine</th>
              <th className="r">Entry</th>
              <th className="r">Exit</th>
              <th>When</th>
              <th className="r">P&L</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => <LedgerRow key={t.id} t={t} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}

function LedgerRow({ t }) {
  const up = (t.pnl || 0) >= 0
  return (
    <tr>
      <td><input type="checkbox" className="cb" /></td>
      <td className="bold">{t.team}</td>
      <td className="dim">{t.market_question || '—'}</td>
      <td><span className={`engine-chip engine-${t.engine}`}>{t.engine}</span></td>
      <td className="r mono">{fmtCents(t.entry_price)}</td>
      <td className="r mono">{fmtCents(t.exit_price)}</td>
      <td className="dim">{fmtAgo(t.closed_at)}</td>
      <td className={`r mono ${up ? 'p-up' : 'p-down'}`}>{fmtSignedUSD(t.pnl)}</td>
      <td>
        <span className={`result-chip ${up ? 'res-ok' : 'res-bad'}`}>
          <span className="dot" />
          {t.result || (up ? 'WIN' : 'LOSS')}
        </span>
      </td>
    </tr>
  )
}

// ───────── Full pages ─────────
function PositionsPage({ stats, onClose }) {
  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Positions</h1>
          <p className="page-sub">{stats.open.length} open · {fmtSignedUSD(stats.unrealized)} unrealized</p>
        </div>
      </div>
      <div className="card">
        {stats.open.length === 0 && <Empty label="No open positions" />}
        {stats.open.length > 0 && (
          <table className="ledger">
            <thead>
              <tr><th>Team</th><th>Market</th><th>Engine</th><th>Sport</th><th className="r">Entry</th><th className="r">Mark</th><th className="r">Cost</th><th className="r">Unrealized</th><th>Age</th><th></th></tr>
            </thead>
            <tbody>
              {stats.open.map(p => {
                const cur = p.current_price || p.entry_price
                const pnl = (p.market_value || cur * p.size) - (p.cost || 0)
                const up = pnl >= 0
                return (
                  <tr key={p.id}>
                    <td className="bold">{p.team}</td>
                    <td className="dim">{p.market || p.market_question || '—'}</td>
                    <td><span className={`engine-chip engine-${p.engine}`}>{p.engine}</span></td>
                    <td>{SPORT_LABEL[p.sport] || p.sport}</td>
                    <td className="r mono">{fmtCents(p.entry_price)}</td>
                    <td className="r mono">{fmtCents(cur)}</td>
                    <td className="r mono">{fmtUSD(p.cost, 2)}</td>
                    <td className={`r mono ${up ? 'p-up' : 'p-down'}`}>{fmtSignedUSD(pnl)}</td>
                    <td className="dim">{fmtAgo(p.opened_at)}</td>
                    <td><button className="btn-close-sm" onClick={() => onClose(p.id)}>Close</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function LedgerPage({ stats }) {
  const rows = [...stats.trades].sort((a, b) => (b.closed_at || 0) - (a.closed_at || 0))
  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ledger</h1>
          <p className="page-sub">{rows.length} closed · {fmtSignedUSD(stats.realized)} realized · {fmtPct(stats.winRate, 0)} win rate</p>
        </div>
      </div>
      <div className="card">
        <LedgerCard stats={stats} />
      </div>
    </div>
  )
}

function LivePage({ state }) {
  const games = state.live_games || []
  const bySport = useMemo(() => {
    const m = new Map()
    for (const g of games) {
      if (!m.has(g.sport)) m.set(g.sport, [])
      m.get(g.sport).push(g)
    }
    return [...m.entries()]
  }, [games])
  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Live Games</h1>
          <p className="page-sub">{games.length} in play across {bySport.length} leagues</p>
        </div>
      </div>
      {bySport.map(([sport, gs]) => (
        <div key={sport} className="card">
          <div className="card-head"><div className="card-title">{SPORT_LABEL[sport] || sport}</div><div className="card-sub">{gs.length} game{gs.length !== 1 ? 's' : ''}</div></div>
          <div className="live-list">{gs.map(g => <LiveRow key={g.espn_id} g={g} />)}</div>
        </div>
      ))}
      {bySport.length === 0 && <div className="card"><Empty label="No live games right now" /></div>}
    </div>
  )
}

function AnalyticsPage({ state, stats }) {
  const sportsStats = state.sports_stats || {}
  const entries = Object.entries(sportsStats).sort((a, b) => (b[1]?.pnl || 0) - (a[1]?.pnl || 0))
  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Performance breakdown by sport</p>
        </div>
      </div>
      <div className="card">
        {entries.length === 0 && <Empty label="No per-sport data yet" />}
        {entries.length > 0 && (
          <table className="ledger">
            <thead><tr><th>Sport</th><th className="r">Trades</th><th className="r">Wins</th><th className="r">Win %</th><th className="r">P&L</th></tr></thead>
            <tbody>
              {entries.map(([sport, s]) => (
                <tr key={sport}>
                  <td className="bold">{SPORT_LABEL[sport] || sport}</td>
                  <td className="r mono">{s.trades || 0}</td>
                  <td className="r mono">{s.wins || 0}</td>
                  <td className="r mono">{fmtPct((s.wins || 0) / Math.max(1, s.trades || 1), 0)}</td>
                  <td className={`r mono ${(s.pnl || 0) >= 0 ? 'p-up' : 'p-down'}`}>{fmtSignedUSD(s.pnl || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EnginePage({ engine, state, stats }) {
  const trades = stats.trades.filter(t => t.engine === engine)
  const open = stats.open.filter(p => p.engine === engine)
  const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const wins = trades.filter(t => (t.pnl || 0) > 0).length
  const wr = trades.length ? wins / trades.length : 0
  const title = engine === 'harvest' ? 'Harvest Engine' : 'Edge Engine'
  const desc = engine === 'harvest' ? 'Blowout late-game detection · buy leading team near certain outcomes' : 'Sharp bookmaker pre-game prices vs Polymarket · find mispriced markets'
  return (
    <div className="dashboard">
      <div className="page-head">
        <div><h1 className="page-title">{title}</h1><p className="page-sub">{desc}</p></div>
      </div>
      <div className="row row-heroes">
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon(engine)}</div></div><div className="hero-title">Realized</div><div className="hero-sub">{trades.length} trades · {fmtPct(wr, 0)} win rate</div><div className="hero-row"><div className="hero-value mono">{fmtSignedUSD(pnl)}</div></div><div className="hero-foot"><span>Avg {fmtSignedUSD(trades.length ? pnl / trades.length : 0)}</span></div></div>
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon('positions')}</div></div><div className="hero-title">Open</div><div className="hero-sub">Currently deployed</div><div className="hero-row"><div className="hero-value mono">{open.length}</div></div><div className="hero-foot"><span>Cost {fmtUSD(open.reduce((s,p) => s+(p.cost||0), 0), 0)}</span></div></div>
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon('live')}</div></div><div className="hero-title">Last scan</div><div className="hero-sub">Engine activity</div><div className="hero-row"><div className="hero-value mono">{fmtAgo(engine === 'harvest' ? state.last_harvest_scan : state.last_edge_scan)}</div></div></div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Recent {title} trades</div></div>
        {trades.length === 0 && <Empty label="No trades yet" />}
        {trades.length > 0 && (
          <table className="ledger">
            <thead><tr><th>Team</th><th>Market</th><th className="r">Entry</th><th className="r">Exit</th><th className="r">P&L</th><th>When</th></tr></thead>
            <tbody>{[...trades].reverse().slice(0, 20).map(t => <tr key={t.id}><td className="bold">{t.team}</td><td className="dim">{t.market_question || '—'}</td><td className="r mono">{fmtCents(t.entry_price)}</td><td className="r mono">{fmtCents(t.exit_price)}</td><td className={`r mono ${(t.pnl || 0) >= 0 ? 'p-up' : 'p-down'}`}>{fmtSignedUSD(t.pnl)}</td><td className="dim">{fmtAgo(t.closed_at)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function LineupPage({ state }) {
  const sigs = state.lineup_signals || []
  const budget = state.lineup_api_budget || {}
  return (
    <div className="dashboard">
      <div className="page-head"><div><h1 className="page-title">Lineup Watcher</h1><p className="page-sub">Pre-game team-news monitoring for J2, A-League, Championship</p></div></div>
      <div className="row row-heroes">
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon('lineup')}</div></div><div className="hero-title">Status</div><div className="hero-sub">{state.lineup_watcher_enabled ? 'Active' : 'Disabled'}</div><div className="hero-row"><div className="hero-value mono" style={{fontSize: '1.8rem'}}>{state.lineup_watcher_enabled ? 'ON' : 'OFF'}</div></div></div>
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon('analytics')}</div></div><div className="hero-title">API Budget</div><div className="hero-sub">Hourly quota</div><div className="hero-row"><div className="hero-value mono">{budget.used || 0}/{budget.limit || 100}</div></div></div>
        <div className="hero"><div className="hero-head"><div className="hero-icon-tile">{renderIcon('live')}</div></div><div className="hero-title">Active Signals</div><div className="hero-sub">Team-news shifts detected</div><div className="hero-row"><div className="hero-value mono">{sigs.length}</div></div></div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Recent signals</div></div>
        {sigs.length === 0 && <Empty label="No lineup signals yet" />}
      </div>
    </div>
  )
}

// ───────── Shared ─────────
function Pill({ label, tone = 'muted' }) {
  return <span className={`pill pill-tone-${tone}`}><span className="dot" />{label}</span>
}
function Empty({ label }) { return <div className="empty">{label}</div> }
function LoadingSplash() { return <div className="splash"><div className="splash-mark"><I.logo /></div><div className="splash-text">Signal</div></div> }
function FatalError({ err }) { return <div className="splash"><div className="splash-text">Can't reach bot</div><div className="splash-err">{err}</div></div> }

// ───────── Close confirmation ─────────
function ConfirmClose({ target, onDone }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const close = async () => {
    setBusy(true)
    try {
      const url = target === 'all' ? `${API}/api/close-all` : `${API}/api/close/${target}`
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: target === 'all' ? JSON.stringify({ confirm: 'CLOSE_ALL' }) : '{}' })
      const j = await r.json()
      setResult(j)
    } catch (e) { setResult({ error: e.message }) }
    setBusy(false)
  }
  return (
    <div className="modal-bg" onClick={onDone}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">{target === 'all' ? 'Close all positions?' : 'Close position?'}</div><button className="ic-btn" onClick={onDone}><I.close /></button></div>
        <div className="modal-body">
          {!result && <p>This will mark-to-market all open positions at current bid prices. Paper mode — no real funds move.</p>}
          {result?.ok && <div><p>Closed {result.closed || 1} position(s).</p><p className="mono">P&L: {fmtSignedUSD(result.total_pnl ?? result.pnl)}</p></div>}
          {result?.error && <p className="p-down">{result.error}</p>}
        </div>
        <div className="modal-foot">
          {!result && <><button className="btn-ghost" onClick={onDone}>Cancel</button><button className="btn-primary" onClick={close} disabled={busy}>{busy ? 'Closing…' : 'Close'}</button></>}
          {result && <button className="btn-primary" onClick={onDone}>Done</button>}
        </div>
      </div>
    </div>
  )
}

// ───────── (end) ─────────
