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

const SPORT_LABEL = {
  nba: 'NBA', wnba: 'WNBA', nhl: 'NHL', mlb: 'MLB', nfl: 'NFL',
  ncaab: 'NCAAB', ncaaf: 'NCAAF', mls: 'MLS',
  epl: 'EPL', liga: 'La Liga', seriea: 'Serie A', bundes: 'Bundesliga', ligue1: 'Ligue 1',
  ucl: 'UCL', uel: 'UEL', uecl: 'UECL',
  champ: 'Championship', jleag: 'J-League', j2: 'J2',
  aleag: 'A-League', braA: 'Brazil A', braB: 'Brazil B',
  kleag: 'K-League', china: 'CSL', turk: 'Süper Lig',
  norw: 'Eliteserien', denm: 'Superliga', colom: 'Colombia', egypt: 'Egypt',
  libert: 'Libertadores', sudam: 'Sudamericana', saudi: 'Saudi', ligamx: 'Liga MX',
  erediv: 'Eredivisie', liga2: 'La Liga 2', lig2fr: 'Ligue 2', bund2: '2. Bundesliga',
  serieb: 'Serie B', porto: 'Primeira', argA: 'Argentina',
}

// ───── Signal logo mark ─────
const SignalMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 353 353" fill="currentColor">
    <path d="M97.86,194.71c-8.53-2.28-13.6-11.05-11.32-19.58l20.64-77.24c2.29-8.53,11.05-13.6,19.58-11.32s13.6,11.04,11.32,19.58l-20.65,77.24c-2.28,8.53-11.04,13.6-19.57,11.32Z"/>
    <path d="M135.51,216.42c-6.25-6.24-6.26-16.37-.02-22.61l56.5-56.57c6.24-6.25,16.36-6.26,22.61,0,6.25,6.24,6.26,16.36,0,22.61l-56.5,56.57c-6.24,6.25-16.37,6.26-22.61,0Z"/>
    <path d="M254.07,244.59l-77.22,20.74c-8.53,2.29-17.3-2.77-19.6-11.29-2.29-8.53,2.77-17.3,11.3-19.59l77.22-20.74c8.53-2.29,17.3,2.77,19.6,11.29,2.29,8.53-2.77,17.3-11.3,19.59Z"/>
  </svg>
)

// ───── Icons ─────
const I = {
  dash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  positions: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 L9 11 L13 15 L21 7"/><path d="M14 7 H21 V14"/></svg>,
  ledger: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10 H21"/><path d="M9 4 V20"/></svg>,
  live: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
  analytics: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 V10"/><path d="M10 20 V4"/><path d="M16 20 V13"/><path d="M22 20 V7"/></svg>,
  menu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>,
  arrow: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12 H19"/><path d="M13 6 L19 12 L13 18"/></svg>,
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
    const live = state.live_games || []
    const wins = trades.filter(t => (t.pnl || 0) > 0).length
    const winRate = trades.length ? wins / trades.length : 0
    const deployed = open.reduce((s, p) => s + (p.cost || 0), 0)
    const exposure = deployed / starting
    // per-sport breakdown
    const bySport = {}
    for (const t of trades) {
      const s = t.sport || 'other'
      if (!bySport[s]) bySport[s] = { trades: 0, wins: 0, pnl: 0 }
      bySport[s].trades += 1
      if ((t.pnl || 0) > 0) bySport[s].wins += 1
      bySport[s].pnl += (t.pnl || 0)
    }
    // per-engine
    const harvest = trades.filter(t => t.engine === 'harvest')
    const edge = trades.filter(t => t.engine === 'edge')
    const harvestPnl = harvest.reduce((s, t) => s + (t.pnl || 0), 0)
    const edgePnl = edge.reduce((s, t) => s + (t.pnl || 0), 0)
    const harvestOpen = open.filter(p => p.engine === 'harvest')
    const edgeOpen = open.filter(p => p.engine === 'edge')
    return {
      equity, starting, pct, realized, unrealized, open, trades, live,
      winRate, deployed, exposure, bySport,
      harvest: { trades: harvest, open: harvestOpen, pnl: harvestPnl, winRate: harvest.length ? harvest.filter(t=>(t.pnl||0)>0).length/harvest.length : 0 },
      edge: { trades: edge, open: edgeOpen, pnl: edgePnl, winRate: edge.length ? edge.filter(t=>(t.pnl||0)>0).length/edge.length : 0 },
    }
  }, [state])
}

// Build equity curve (from state.equity_curve or synthesized from trades)
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

// ───── Main App ─────
export default function App() {
  const { state, err } = useBotState()
  const stats = useStats(state)
  const [section, setSection] = useState('overview')
  const [navOpen, setNavOpen] = useState(false)
  const [modal, setModal] = useState(null) // {type: 'close-all'|'close-one', id?}
  const sectionRefs = {
    overview: useRef(null), positions: useRef(null), ledger: useRef(null),
    live: useRef(null), analytics: useRef(null), harvest: useRef(null), edge: useRef(null),
  }
  const scroller = useRef(null)

  const goTo = (id) => {
    setSection(id)
    setNavOpen(false)
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
            <HeroRow stats={stats} state={state} onCloseAll={() => setModal({ type: 'close-all' })} onGo={goTo} />
          </section>

          <section ref={sectionRefs.live} className="section">
            <h2 className="section-title">Live <span className="count">{stats.live.length}</span></h2>
            <LivePanel games={stats.live} />
          </section>

          <section ref={sectionRefs.positions} className="section">
            <h2 className="section-title">Positions <span className="count">{stats.open.length}</span></h2>
            <PositionsList positions={stats.open} onClose={(id) => setModal({ type: 'close-one', id })} />
          </section>

          <div className="section grid-2">
            <EquityCard state={state} stats={stats} />
            <ExposureCard stats={stats} />
          </div>

          <section ref={sectionRefs.harvest} className="section grid-2">
            <EngineCard engine="harvest" stats={stats.harvest} state={state} lastScan={state.last_harvest_scan} />
            <EngineCard engine="edge" stats={stats.edge} state={state} lastScan={state.last_edge_scan} />
          </section>

          <section ref={sectionRefs.analytics} className="section">
            <h2 className="section-title">By sport</h2>
            <SportBreakdown bySport={stats.bySport} />
          </section>

          <section className="section">
            <h2 className="section-title">Confidence vs outcome</h2>
            <CalibrationChart trades={stats.trades} />
          </section>

          <section className="section">
            <h2 className="section-title">Edge heatmap</h2>
            <EdgeHeatmap edges={state.edges_found || []} />
          </section>

          <section ref={sectionRefs.ledger} className="section">
            <h2 className="section-title">Recent trades <span className="count">{stats.trades.length}</span></h2>
            <LedgerTable trades={stats.trades.slice().sort((a,b) => (b.closed_at||0)-(a.closed_at||0)).slice(0,20)} />
          </section>

          <div className="footer">
            <div>Signal · {state.paper_mode ? 'Paper' : 'Live'} · Uptime {fmtUptime(state.uptime)}</div>
            <div className="footer-dim">Auto-refresh every {POLL_MS/1000}s</div>
          </div>
        </div>
      </main>
      {modal && <ConfirmModal modal={modal} onDone={() => setModal(null)} />}
    </div>
  )
}

// ───── Sidebar ─────
function Sidebar({ active, onNav, stats, state, open, onClose }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: I.dash },
    { id: 'live', label: 'Live', icon: I.live, badge: stats.live.length },
    { id: 'positions', label: 'Positions', icon: I.positions, badge: stats.open.length },
    { id: 'harvest', label: 'Engines', icon: I.analytics },
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
          {items.map(it => (
            <button key={it.id} className={`nav-item ${active === it.id || (it.id === 'harvest' && (active === 'edge')) ? 'active' : ''}`} onClick={() => onNav(it.id)}>
              <it.icon />
              <span>{it.label}</span>
              {it.badge != null && it.badge > 0 && <span className="nav-badge">{it.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-spacer" />
        <StatusMini state={state} />
      </aside>
    </>
  )
}

function StatusMini({ state }) {
  const ok = state.ws_market_connected && state.ws_sports_connected && state.redis_connected
  return (
    <div className="status-mini">
      <span className={`dot ${ok ? 'ok' : 'warn'}`} />
      <span className="status-label">{state.paper_mode ? 'Paper' : 'Live'}</span>
      <span className="status-sub">{fmtUptime(state.uptime)}</span>
    </div>
  )
}

// ───── Hero row: equity, realized, exposure ─────
function HeroRow({ stats, state, onCloseAll, onGo }) {
  return (
    <div className="hero-row">
      <div className="hero hero-featured">
        <div className="hero-head">
          <SignalMark size={14} />
          <span>Equity</span>
        </div>
        <div className="hero-big mono">{fmtUSD(stats.equity, 2)}</div>
        <div className="hero-foot">
          <span className={`pill ${stats.pct >= 0 ? 'p-up' : 'p-down'}`}>
            {fmtSignedPct(stats.pct)}
          </span>
          <span className="hero-dim">start {fmtUSD(stats.starting, 0)}</span>
        </div>
      </div>

      <div className="hero" onClick={() => onGo('ledger')} role="button">
        <div className="hero-head"><span>Realized</span></div>
        <div className="hero-big mono">{fmtSigned(stats.realized)}</div>
        <div className="hero-foot">
          <span className="hero-dim">{stats.trades.length} trades · {fmtPct(stats.winRate)} win</span>
        </div>
      </div>

      <div className="hero">
        <div className="hero-head"><span>Deployed</span></div>
        <div className="hero-big mono">{fmtUSD(stats.deployed, 0)}</div>
        <div className="exposure-bar"><div className="exposure-fill" style={{ width: `${Math.min(100, stats.exposure * 100)}%` }} /></div>
        <div className="hero-foot">
          <span className="hero-dim">{stats.open.length} open · {fmtPct(stats.exposure)} of cap</span>
          {stats.open.length > 0 && <button className="hero-action" onClick={(e) => { e.stopPropagation(); onCloseAll() }}>Close all</button>}
        </div>
      </div>
    </div>
  )
}

// ───── Live games panel ─────
function LivePanel({ games }) {
  if (!games.length) return <div className="empty small">No live games</div>
  return (
    <div className="live-list">
      {games.map(g => <LiveRow key={g.espn_id} g={g} />)}
    </div>
  )
}

function LiveRow({ g }) {
  const leadHome = (g.home_score || 0) - (g.away_score || 0)
  const h = g.home_poly, a = g.away_poly
  const blowout = Math.abs(leadHome) >= 3
  return (
    <div className={`live-row ${blowout ? 'blowout' : ''}`}>
      <div className="live-league">{SPORT_LABEL[g.sport] || g.sport}</div>
      <div className="live-matchup">
        <div className={`ln ${leadHome < 0 ? 'lead' : ''}`}><span className="tm">{g.away_abbrev}</span><span className="sc mono">{g.away_score ?? 0}</span></div>
        <div className={`ln ${leadHome > 0 ? 'lead' : ''}`}><span className="tm">{g.home_abbrev}</span><span className="sc mono">{g.home_score ?? 0}</span></div>
      </div>
      <div className="live-clock mono">{g.detail || '—'}</div>
      <div className="live-prices mono">
        {h != null ? `${(h*100).toFixed(0)}` : '—'}
        <span className="sep">/</span>
        {a != null ? `${(a*100).toFixed(0)}` : '—'}
      </div>
      <div className="live-tag">{blowout ? <span className="tag tag-orange">blowout</span> : <span className="tag-mute">·</span>}</div>
    </div>
  )
}

// ───── Positions list ─────
function PositionsList({ positions, onClose }) {
  if (!positions.length) return <div className="empty small">No open positions</div>
  return (
    <div className="pos-list">
      {positions.map(p => {
        const cur = p.current_price || p.entry_price || 0
        const pnl = (p.market_value || cur * p.size) - (p.cost || 0)
        const up = pnl >= 0
        return (
          <div key={p.id} className="pos-row">
            <div className="pos-main">
              <div className="pos-team">{p.team}</div>
              <div className="pos-meta">
                <span className={`tag tag-${p.engine}`}>{p.engine}</span>
                <span className="pos-sport">{SPORT_LABEL[p.sport] || p.sport}</span>
              </div>
            </div>
            <div className="pos-prices mono">
              <span>{fmtCents(p.entry_price)}</span>
              <span className="sep">→</span>
              <span>{fmtCents(cur)}</span>
            </div>
            <div className="pos-cost mono dim">{fmtUSD(p.cost, 0)}</div>
            <div className={`pos-pnl mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(pnl)}</div>
            <button className="pos-close" onClick={() => onClose(p.id)}><I.x /></button>
          </div>
        )
      })}
    </div>
  )
}

// ───── Equity card with animated live chart ─────
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
        <div className="seg">
          {['1h', '24h', '7d', 'all'].map(r => (
            <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div className="equity-hero mono">{fmtUSD(stats.equity, 2)}</div>
      <div className="equity-delta">
        <span className={`pill ${stats.pct >= 0 ? 'p-up' : 'p-down'}`}>{fmtSignedPct(stats.pct)}</span>
        <span className="dim">{fmtSigned(stats.equity - stats.starting)} since start</span>
      </div>
      <LiveChart points={filtered} starting={stats.starting} />
    </div>
  )
}

function LiveChart({ points, starting }) {
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)
  if (!points.length) return <div className="chart-empty">Waiting for data</div>
  const W = 600, H = 180, P = 24
  const xs = points.map(p => p.ts)
  const ys = points.map(p => p.equity)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys, starting)
  const yMax = Math.max(...ys, starting)
  const yRange = Math.max(1, yMax - yMin) * 1.15
  const yCenter = (yMin + yMax) / 2
  const yTop = yCenter + yRange / 2
  const yBot = yCenter - yRange / 2
  const px = t => P + ((t - xMin) / Math.max(1, xMax - xMin)) * (W - P * 2)
  const py = e => H - P - ((e - yBot) / (yTop - yBot)) * (H - P * 2)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(p.ts).toFixed(1)},${py(p.equity).toFixed(1)}`).join(' ')
  const fillPath = `${path} L${px(xMax).toFixed(1)},${H-P} L${px(xMin).toFixed(1)},${H-P} Z`
  const last = points[points.length - 1]
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = points[0], bestDist = Infinity
    for (const p of points) {
      const d = Math.abs(px(p.ts) - x)
      if (d < bestDist) { bestDist = d; best = p }
    }
    setHover(best)
  }
  return (
    <div className="chart-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart">
        <defs>
          <linearGradient id="ef" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* starting line */}
        <line x1={P} y1={py(starting)} x2={W-P} y2={py(starting)} stroke="#262626" strokeDasharray="3 4" />
        {/* fill */}
        <path d={fillPath} fill="url(#ef)" />
        {/* line */}
        <path d={path} fill="none" stroke="#FF5A1F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* last pulse */}
        <circle cx={px(last.ts)} cy={py(last.equity)} r="3.5" fill="#FF5A1F" />
        <circle cx={px(last.ts)} cy={py(last.equity)} r="7" fill="#FF5A1F" opacity="0.35" className="pulse-ring" />
        {/* hover line */}
        {hover && <>
          <line x1={px(hover.ts)} y1={P} x2={px(hover.ts)} y2={H-P} stroke="#404040" strokeDasharray="2 3" />
          <circle cx={px(hover.ts)} cy={py(hover.equity)} r="4" fill="#FF5A1F" stroke="#000" strokeWidth="2" />
        </>}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: `${(px(hover.ts) / W) * 100}%` }}>
          <div className="tip-val mono">{fmtUSD(hover.equity)}</div>
          <div className="tip-ago">{new Date(hover.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      )}
    </div>
  )
}

// ───── Exposure card (visualized as horizontal stacked bar) ─────
function ExposureCard({ stats }) {
  const byEngine = {}
  for (const p of stats.open) {
    const k = p.engine || 'other'
    byEngine[k] = (byEngine[k] || 0) + (p.cost || 0)
  }
  const cap = stats.starting * 0.6
  const entries = Object.entries(byEngine).sort((a,b) => b[1]-a[1])
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="section-title flat">Exposure</h2>
        <span className="dim mono">{fmtPct(stats.exposure)} / 60%</span>
      </div>
      <div className="equity-hero mono">{fmtUSD(stats.deployed, 0)} <span className="cap-of">of {fmtUSD(cap, 0)}</span></div>
      <div className="exposure-bar big">
        {entries.map(([eng, cost], i) => (
          <div key={eng} className={`exposure-seg tag-${eng}`} style={{ width: `${(cost / stats.starting) * 100 / 0.6 * 100 / 100}%` }} title={`${eng}: ${fmtUSD(cost,0)}`} />
        ))}
      </div>
      <div className="exposure-legend">
        {entries.map(([eng, cost]) => (
          <div key={eng} className="legend-item">
            <span className={`legend-dot dot-${eng}`}></span>
            <span className="legend-label">{eng}</span>
            <span className="mono dim">{fmtUSD(cost, 0)}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-dot dot-free"></span>
          <span className="legend-label">available</span>
          <span className="mono dim">{fmtUSD(Math.max(0, cap - stats.deployed), 0)}</span>
        </div>
      </div>
    </div>
  )
}

// ───── Engine tile (Harvest & Edge) ─────
function EngineCard({ engine, stats, state, lastScan }) {
  const title = engine === 'harvest' ? 'Harvest' : 'Edge'
  const sub = engine === 'harvest' ? 'Live blowouts' : 'Pre-game edges'
  // Small sparkline from engine's trades
  const trades = useMemo(() => [...stats.trades].sort((a,b) => (a.closed_at||0)-(b.closed_at||0)), [stats.trades])
  const sparkData = useMemo(() => {
    let running = 0
    return trades.map(t => { running += (t.pnl||0); return running })
  }, [trades])
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="section-title flat">{title}</h2>
          <div className="dim small">{sub}</div>
        </div>
        <span className={`tag tag-${engine}`}>{engine}</span>
      </div>
      <div className="engine-stats">
        <Stat label="P&L" value={fmtSigned(stats.pnl)} tone={stats.pnl >= 0 ? 'up' : 'down'} />
        <Stat label="Trades" value={stats.trades.length} />
        <Stat label="Win rate" value={fmtPct(stats.winRate)} />
        <Stat label="Open" value={stats.open.length} />
      </div>
      <Sparkline values={sparkData} />
      <div className="card-foot dim mono">last scan {fmtAgo(lastScan)}</div>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-val mono ${tone === 'up' ? 'p-up' : tone === 'down' ? 'p-down' : ''}`}>{value}</div>
    </div>
  )
}

function Sparkline({ values }) {
  if (values.length < 2) return <div className="sparkline-empty" />
  const W = 300, H = 40
  const min = Math.min(0, ...values), max = Math.max(0, ...values)
  const range = Math.max(1, max - min)
  const path = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const zeroY = H - ((0 - min) / range) * H
  const last = values[values.length - 1]
  const up = last >= 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sparkline" preserveAspectRatio="none">
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="#262626" strokeDasharray="2 3" />
      <path d={path} fill="none" stroke={up ? '#C8E66A' : '#F87171'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ───── Sport breakdown: bar chart ─────
function SportBreakdown({ bySport }) {
  const rows = Object.entries(bySport).sort((a,b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
  if (!rows.length) return <div className="empty small">No closed trades yet</div>
  const maxAbs = Math.max(...rows.map(r => Math.abs(r[1].pnl)))
  return (
    <div className="card">
      <div className="sport-rows">
        {rows.map(([sport, s]) => {
          const pct = Math.abs(s.pnl) / maxAbs * 100
          const up = s.pnl >= 0
          return (
            <div key={sport} className="sport-row">
              <div className="sport-label">{SPORT_LABEL[sport] || sport}</div>
              <div className="sport-trades mono dim">{s.trades}</div>
              <div className="sport-wr mono dim">{fmtPct(s.wins / Math.max(1, s.trades))}</div>
              <div className="sport-bar">
                <div className={`sport-bar-fill ${up ? 'up' : 'down'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className={`sport-pnl mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(s.pnl)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───── Calibration chart ─────
function CalibrationChart({ trades }) {
  // Group trades by confidence bucket, show win rate in each
  const buckets = useMemo(() => {
    const b = []
    for (let i = 0; i < 10; i++) b.push({ low: i/10, high: (i+1)/10, wins: 0, total: 0, avgConf: 0 })
    for (const t of trades) {
      const c = t.confidence ?? t.true_prob
      if (c == null) continue
      const idx = Math.min(9, Math.floor(c * 10))
      buckets[idx].total += 1
      buckets[idx].avgConf += c
      if ((t.pnl || 0) > 0) buckets[idx].wins += 1
    }
    return buckets.map(x => ({ ...x, avgConf: x.total ? x.avgConf/x.total : (x.low+x.high)/2, wr: x.total ? x.wins/x.total : null }))
  }, [trades])
  const hasData = buckets.some(b => b.total > 0)
  if (!hasData) return <div className="card"><div className="empty small">No confidence data yet</div></div>
  const W = 600, H = 240, P = 32
  return (
    <div className="card">
      <div className="card-head small-head">
        <div className="dim small">Model confidence vs actual win rate. Perfect calibration = diagonal.</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart calib" preserveAspectRatio="none">
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={P + v*(W-P*2)} y1={P} x2={P + v*(W-P*2)} y2={H-P} stroke="#1A1A1A" />
            <line x1={P} y1={H-P - v*(H-P*2)} x2={W-P} y2={H-P - v*(H-P*2)} stroke="#1A1A1A" />
            <text x={P + v*(W-P*2)} y={H-P+14} textAnchor="middle" fontSize="10" fill="#525252">{(v*100).toFixed(0)}%</text>
            <text x={P-6} y={H-P - v*(H-P*2) + 3} textAnchor="end" fontSize="10" fill="#525252">{(v*100).toFixed(0)}%</text>
          </g>
        ))}
        {/* diagonal (perfect calibration) */}
        <line x1={P} y1={H-P} x2={W-P} y2={P} stroke="#404040" strokeDasharray="3 4" />
        {/* buckets */}
        {buckets.map((b, i) => {
          if (!b.total) return null
          const cx = P + b.avgConf * (W-P*2)
          const cy = H-P - b.wr * (H-P*2)
          const r = 3 + Math.min(14, Math.sqrt(b.total) * 2.2)
          return <circle key={i} cx={cx} cy={cy} r={r} fill="#FF5A1F" fillOpacity="0.45" stroke="#FF5A1F" strokeWidth="1.5" />
        })}
      </svg>
    </div>
  )
}

// ───── Edge heatmap (per-sport × edge magnitude) ─────
function EdgeHeatmap({ edges }) {
  // Aggregate: sport → avg edge
  const rows = useMemo(() => {
    const m = {}
    for (const e of edges) {
      const s = e.sport
      if (!m[s]) m[s] = { edges: [], count: 0 }
      m[s].edges.push(e.edge || 0)
      m[s].count += 1
    }
    return Object.entries(m).map(([sport, v]) => {
      const avg = v.edges.reduce((a,b)=>a+b,0) / v.edges.length
      const max = Math.max(...v.edges)
      return { sport, avg, max, count: v.count }
    }).sort((a,b) => b.max - a.max).slice(0, 18)
  }, [edges])
  if (!rows.length) return <div className="card"><div className="empty small">No edge data</div></div>
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.max))) || 0.1
  return (
    <div className="card">
      <div className="card-head small-head">
        <div className="dim small">Largest edge detected per sport · {edges.length} signals evaluated</div>
      </div>
      <div className="heatmap">
        {rows.map(r => {
          const intensity = Math.min(1, Math.abs(r.max) / maxAbs)
          const up = r.max >= 0
          return (
            <div key={r.sport} className="heat-cell" style={{
              background: up
                ? `rgba(255, 90, 31, ${0.12 + intensity * 0.55})`
                : `rgba(248, 113, 113, ${0.10 + intensity * 0.45})`,
            }}>
              <div className="heat-label">{SPORT_LABEL[r.sport] || r.sport}</div>
              <div className="heat-val mono">{fmtSignedPct(r.max, 1)}</div>
              <div className="heat-count mono">{r.count}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───── Ledger table ─────
function LedgerTable({ trades }) {
  if (!trades.length) return <div className="empty small">No trades yet</div>
  return (
    <div className="ledger-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th>Team</th>
            <th className="hide-sm">Market</th>
            <th>Engine</th>
            <th className="r hide-sm">Entry</th>
            <th className="r hide-sm">Exit</th>
            <th className="r">P&L</th>
            <th className="hide-sm">When</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(t => {
            const up = (t.pnl || 0) >= 0
            return (
              <tr key={t.id}>
                <td className="bold">{t.team}</td>
                <td className="dim hide-sm">{t.market_question || '—'}</td>
                <td><span className={`tag tag-${t.engine}`}>{t.engine}</span></td>
                <td className="r mono hide-sm">{fmtCents(t.entry_price)}</td>
                <td className="r mono hide-sm">{fmtCents(t.exit_price)}</td>
                <td className={`r mono ${up ? 'p-up' : 'p-down'}`}>{fmtSigned(t.pnl)}</td>
                <td className="dim hide-sm">{fmtAgo(t.closed_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ───── Modal ─────
function ConfirmModal({ modal, onDone }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const act = async () => {
    setBusy(true)
    try {
      const url = modal.type === 'close-all' ? `${API}/api/close-all` : `${API}/api/close/${modal.id}`
      const body = modal.type === 'close-all' ? JSON.stringify({ confirm: 'CLOSE_ALL' }) : '{}'
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      const j = await r.json()
      setResult(j)
    } catch (e) { setResult({ error: e.message }) }
    setBusy(false)
  }
  return (
    <div className="modal-bg" onClick={onDone}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{modal.type === 'close-all' ? 'Close all positions?' : 'Close position?'}</div>
          <button className="ic-btn" onClick={onDone}><I.x /></button>
        </div>
        {!result && <p className="modal-body">Marks all open positions to market at current bid prices. Paper mode — no real funds.</p>}
        {result?.ok && (
          <div className="modal-body">
            <p>Closed {result.closed ?? 1} position{(result.closed ?? 1) !== 1 ? 's' : ''}.</p>
            <p className={`mono ${(result.total_pnl ?? result.pnl) >= 0 ? 'p-up' : 'p-down'}`}>P&L: {fmtSigned(result.total_pnl ?? result.pnl)}</p>
          </div>
        )}
        {result?.error && <p className="modal-body p-down">{result.error}</p>}
        <div className="modal-foot">
          {!result && <><button className="btn-ghost" onClick={onDone}>Cancel</button><button className="btn-primary" onClick={act} disabled={busy}>{busy ? 'Closing…' : 'Close'}</button></>}
          {result && <button className="btn-primary" onClick={onDone}>Done</button>}
        </div>
      </div>
    </div>
  )
}

// ───── Splash ─────
function Splash({ err }) {
  return (
    <div className="splash">
      <div className="splash-mark"><SignalMark size={36} /></div>
      <div className="splash-text">Signal</div>
      {err && <div className="splash-err">{err}</div>}
    </div>
  )
}
