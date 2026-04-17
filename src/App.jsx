import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ─── Config ─────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'https://web-production-72709.up.railway.app'
const POLL_MS = 3000

// ─── Formatters ─────────────────────────────────────────────────────────
const fmtUSD = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—'
  const neg = n < 0
  const v = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  return (neg ? '-$' : '$') + v
}
const fmtSignedUSD = (n) => {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : '−'
  const v = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}$${v}`
}
const fmtPct = (n, d = 1) => (n == null ? '—' : `${(n * 100).toFixed(d)}%`)
const fmtCents = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}¢`)
const fmtNum = (n, d = 0) => (n == null ? '—' : Number(n).toFixed(d))
const fmtAgo = (ts) => {
  if (!ts) return '—'
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 0) return 'now'
  if (s < 5) return 'now'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`
  return 'stale'
}
const fmtUptime = (s) => {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

// ─── Sport taxonomy ─────────────────────────────────────────────────────
const US_SPORTS = new Set(['nba', 'wnba', 'nhl', 'mlb', 'nfl', 'ncaab', 'ncaaf', 'mls'])
const SOCCER = new Set([
  'epl', 'liga', 'seriea', 'bundes', 'ligue1', 'ucl', 'uel', 'mls', 'ligamx',
  'erediv', 'liga2', 'lig2fr', 'bund2', 'serieb', 'porto', 'scotpr', 'uecl',
  'champ', 'jleag', 'j2', 'aleag', 'braA', 'braB', 'kleag', 'china',
  'turk', 'norw', 'denm', 'colom', 'egypt', 'libert', 'sudam', 'saudi',
])
const SPORT_LABEL = {
  nba: 'NBA', wnba: 'WNBA', nhl: 'NHL', mlb: 'MLB', nfl: 'NFL',
  ncaab: 'NCAA MB', ncaaf: 'NCAA FB', mls: 'MLS',
  epl: 'Premier League', liga: 'La Liga', seriea: 'Serie A',
  bundes: 'Bundesliga', ligue1: 'Ligue 1', ucl: 'UCL', uel: 'UEL', uecl: 'UECL',
  champ: 'Championship', jleag: 'J-League', j2: 'J2 League',
  aleag: 'A-League', braA: 'Brazil A', braB: 'Brazil B',
  kleag: 'K-League', china: 'CSL', turk: 'Süper Lig',
  norw: 'Eliteserien', denm: 'Superliga', colom: 'Colombia',
  egypt: 'Egypt PL', libert: 'Libertadores', sudam: 'Sudamericana',
  saudi: 'Saudi PL', ligamx: 'Liga MX', erediv: 'Eredivisie',
  porto: 'Primeira', liga2: 'La Liga 2', lig2fr: 'Ligue 2',
  bund2: '2. Bundesliga', serieb: 'Serie B', scotpr: 'Scottish',
}
const sportTag = (s) => SPORT_LABEL[s] || (s ? s.toUpperCase() : '—')
const sportIsSoccer = (s) => SOCCER.has(s)

const ENGINE_COLOR = { harvest: 'var(--accent)', edge: 'var(--violet)' }
const ENGINE_LABEL = { harvest: 'Harvest', edge: 'Edge' }

// ─── Logo (your Signal mark, just reproduced clean) ─────────────────────
function Logo({ size = 20 }) {
  return (
    <svg viewBox="0 0 352.66 352.66" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M176.33,0C78.95,0,0,78.95,0,176.33v176.33h177.32c96.93-.55,175.34-79.28,175.34-176.33S273.72,0,176.33,0ZM97.86,194.71c-8.53-2.28-13.6-11.05-11.32-19.58l20.64-77.24c2.29-8.53,11.05-13.6,19.58-11.32,8.54,2.28,13.6,11.04,11.32,19.58l-20.65,77.24c-2.28,8.53-11.04,13.6-19.57,11.32h0ZM135.51,216.42c-6.25-6.24-6.26-16.37-.02-22.61l56.5-56.57c6.24-6.25,16.36-6.26,22.61,0,6.25,6.24,6.26,16.36,0,22.61l-56.5,56.57c-6.24,6.25-16.37,6.26-22.61,0h.01ZM254.07,244.59l-77.22,20.74c-8.53,2.29-17.3-2.77-19.6-11.29-2.29-8.53,2.77-17.3,11.3-19.59l77.22-20.74c8.53-2.29,17.3,2.77,19.6,11.29,2.29,8.53-2.77,17.3-11.3,19.59h0Z"
      />
    </svg>
  )
}

// ─── Animated number (count up on mount and change) ─────────────────────
function AnimNum({ value, fmt = fmtUSD, duration = 700, className = '' }) {
  const [v, setV] = useState(value || 0)
  const prev = useRef(value || 0)
  useEffect(() => {
    const from = prev.current
    const to = value || 0
    if (from === to) return
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setV(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className={className}>{fmt(v)}</span>
}

// ─── Sparkline (SVG, smooth path, animated on mount) ────────────────────
function Sparkline({ data, color = 'var(--accent)', h = 80, fillOpacity = 0.12, showPeakShade = false, peak = null }) {
  if (!data || data.length < 2) return <div style={{ height: h }} />
  const vals = data.map((d) => (Array.isArray(d) ? d[1] : d.equity ?? d.value))
  const times = data.map((d) => (Array.isArray(d) ? d[0] : d.time ?? d.t))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 1000
  const pad = 4
  const innerH = h - pad * 2

  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: pad + (1 - (v - min) / range) * innerH,
  }))

  // Smooth path (Catmull-Rom-ish)
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i]
    const cx = (p0.x + p1.x) / 2
    d += ` Q ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} ${cx.toFixed(2)} ${((p0.y + p1.y) / 2).toFixed(2)}`
    d += ` T ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
  }

  const gradId = `gg-${color.replace(/[^a-z]/gi, '')}-${h}`
  const lastVal = vals[vals.length - 1]
  const firstVal = vals[0]
  const up = lastVal >= firstVal

  // Drawdown (peak) shade region — shaded portion from peak to current if below peak
  const peakLine = showPeakShade && peak
    ? pad + (1 - (peak - min) / range) * innerH
    : null

  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area under the curve */}
      <path
        d={`${d} L ${W} ${h} L 0 ${h} Z`}
        fill={`url(#${gradId})`}
      />
      {/* Peak dashed line */}
      {peakLine != null && (
        <line x1="0" x2={W} y1={peakLine} y2={peakLine} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 4" />
      )}
      {/* Line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 2000, animation: 'drawLine 1.6s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      />
      {/* Last-point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="6" fill={color} opacity="0.25" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
    </svg>
  )
}

// ─── Status dot with tooltip ───────────────────────────────────────────
function StatusDot({ state = 'live', label }) {
  const cls = state === 'live' ? 'live' : state === 'warn' ? 'warn' : state === 'err' ? 'err' : ''
  return (
    <span className="pill" title={label}>
      <span className={`pill-dot ${cls}`} />
      <span style={{ color: 'var(--ink-1)', fontSize: 11 }}>{label}</span>
    </span>
  )
}

// ─── Hero — the "revenue" moment ───────────────────────────────────────
function Hero({ s, onPause, onResume }) {
  const pnl = s.total_pnl || 0
  const equity = s.equity || 0
  const starting = s.starting_bankroll || 1000
  const totalRet = starting > 0 ? pnl / starting : 0
  const dd = s.drawdown_pct || 0
  const peak = s.peak_equity || equity
  const pnlPos = pnl >= 0
  const paused = !!s.paused
  const circuitTripped = !!(s.circuit && s.circuit.tripped)

  return (
    <section style={{ padding: '28px 0 40px' }}>
      <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
        <div className="col gap-16" style={{ flex: 1, minWidth: 260 }}>
          <div className="label">Total equity</div>
          <div className="row gap-16" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <AnimNum value={equity} fmt={(n) => fmtUSD(n, 2)} className="hero-num" />
            <div className={`delta ${pnlPos ? 'pos' : 'neg'}`}>
              {pnlPos ? '+' : '−'}{fmtPct(Math.abs(totalRet), 2)}
            </div>
          </div>
          <div className="row gap-16 wrap caption" style={{ color: 'var(--ink-2)' }}>
            <span>Starting <span className="num" style={{ color: 'var(--ink-1)' }}>{fmtUSD(starting, 0)}</span></span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>Peak <span className="num" style={{ color: 'var(--ink-1)' }}>{fmtUSD(peak, 2)}</span></span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>Drawdown <span className="num" style={{ color: dd > 0.05 ? 'var(--neg)' : 'var(--ink-1)' }}>{fmtPct(dd, 1)}</span></span>
            {s.unrealized_pnl != null && (
              <>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>
                  Unrealized <span className="num" style={{ color: s.unrealized_pnl >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {fmtSignedUSD(s.unrealized_pnl)}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="row gap-10" style={{ marginTop: 8 }}>
            {paused || circuitTripped ? (
              <button className="btn btn-primary" onClick={onResume}>Resume trading</button>
            ) : (
              <button className="btn btn-danger" onClick={() => onPause(60)}>Pause 60 min</button>
            )}
            <button className="btn" onClick={() => onPause(15)} disabled={paused}>Pause 15m</button>
            {circuitTripped && <span className="pill"><span className="pill-dot err" /> Circuit: {s.circuit.consec_losses || 0} losses</span>}
          </div>
        </div>

        <div className="col gap-12" style={{ flex: 1, minWidth: 320, maxWidth: 560 }}>
          <div className="row between">
            <div className="col gap-4">
              <div className="label">Equity curve</div>
              <div className="caption">Since {fmtAgo(s.equity_curve?.[0]?.[0])} ago</div>
            </div>
            <div className="row gap-12 caption">
              <div className="row gap-4"><span style={{ width: 8, height: 2, background: pnlPos ? 'var(--accent)' : 'var(--neg)' }} /> Equity</div>
              <div className="row gap-4"><span style={{ width: 8, height: 1, borderTop: '1px dashed var(--ink-4)' }} /> Peak</div>
            </div>
          </div>
          <Sparkline
            data={s.equity_curve || []}
            color={pnlPos ? 'var(--accent)' : 'var(--neg)'}
            h={120}
            fillOpacity={0.14}
            showPeakShade
            peak={peak}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Engine cards (per-engine P&L attribution) ─────────────────────────
function EngineCard({ id, stats, positions, live, lastScan }) {
  const deployed = stats?.open_cost || 0
  const pnl = stats?.total_pnl || 0
  const wins = stats?.wins || 0
  const losses = stats?.losses || 0
  const trades = (wins + losses) || stats?.total_trades || 0
  const wr = wins + losses > 0 ? wins / (wins + losses) : 0
  const unrealized = stats?.unrealized || 0
  const active = positions?.filter((p) => p.engine === id).length || 0
  const color = ENGINE_COLOR[id]

  return (
    <div className="card">
      <div className="card-head">
        <div className="row gap-10">
          <span style={{ width: 8, height: 8, background: color, borderRadius: '50%' }} />
          <span className="card-title" style={{ color: 'var(--ink)' }}>{ENGINE_LABEL[id]}</span>
        </div>
        <span className="caption">
          scan {fmtAgo(lastScan)} ago
        </span>
      </div>

      <div className="col gap-12">
        <div className="row between">
          <div className="col gap-4">
            <div className="tiny">Realized</div>
            <div className="display-num" style={{ color: pnl >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
              {fmtSignedUSD(pnl)}
            </div>
          </div>
          <div className="col gap-4" style={{ alignItems: 'flex-end' }}>
            <div className="tiny">Unrealized</div>
            <div className="stat-num" style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
              {fmtSignedUSD(unrealized)}
            </div>
          </div>
        </div>

        <div className="row between" style={{ paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <div className="col gap-4">
            <div className="tiny">Trades</div>
            <div className="row gap-8">
              <span className="stat-num" style={{ fontSize: 18 }}>{trades}</span>
              <span className="caption num" style={{ color: wr >= 0.5 ? 'var(--pos)' : 'var(--ink-2)' }}>
                {fmtPct(wr, 0)} win
              </span>
            </div>
          </div>
          <div className="col gap-4" style={{ alignItems: 'flex-end' }}>
            <div className="tiny">Deployed</div>
            <div className="row gap-6">
              <span className="stat-num" style={{ fontSize: 18 }}>{fmtUSD(deployed, 0)}</span>
              {active > 0 && (
                <span className="pill" style={{ background: 'transparent', borderColor: color + '40', color }}>
                  {active} open
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Capital allocation stack bar ──────────────────────────────────────
function CapitalCard({ s }) {
  const equity = s.equity || 1
  const harvestCost = s.harvest_stats?.open_cost || 0
  const edgeCost = s.edge_stats?.open_cost || 0
  const cash = Math.max(0, equity - harvestCost - edgeCost)
  const total = harvestCost + edgeCost + cash
  const p = (x) => (total > 0 ? (x / total) * 100 : 0)

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Capital</span>
        <span className="caption num">{fmtUSD(equity, 2)}</span>
      </div>

      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'var(--bg-2)' }}>
        <div style={{ width: `${p(harvestCost)}%`, background: 'var(--accent)', transition: 'width 420ms ease' }} />
        <div style={{ width: `${p(edgeCost)}%`, background: 'var(--violet)', transition: 'width 420ms ease' }} />
      </div>

      <div className="col gap-8" style={{ marginTop: 16 }}>
        <AllocRow color="var(--accent)" label="Harvest" value={harvestCost} total={equity} />
        <AllocRow color="var(--violet)" label="Edge" value={edgeCost} total={equity} />
        <AllocRow color="var(--ink-3)" label="Cash" value={cash} total={equity} />
      </div>
    </div>
  )
}
function AllocRow({ color, label, value, total }) {
  const pct = total > 0 ? value / total : 0
  return (
    <div className="row between">
      <div className="row gap-8">
        <span style={{ width: 6, height: 6, background: color, borderRadius: '50%' }} />
        <span className="caption">{label}</span>
      </div>
      <div className="row gap-12">
        <span className="caption num" style={{ color: 'var(--ink-2)' }}>{fmtPct(pct, 0)}</span>
        <span className="caption num" style={{ color: 'var(--ink-1)', minWidth: 72, textAlign: 'right' }}>{fmtUSD(value, 2)}</span>
      </div>
    </div>
  )
}

// ─── Activity heatmap (scans over last 24h grouped by hour) ────────────
function ActivityCard({ s }) {
  const now = Date.now() / 1000
  // Use scan_log timestamps to build 7x24 matrix (day of week × hour)
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0))
    const logs = s.scan_log || []
    for (const l of logs) {
      if (!l.t) continue
      if (now - l.t > 7 * 86400) continue
      const d = new Date(l.t * 1000)
      g[d.getDay()][d.getHours()]++
    }
    return g
  }, [s.scan_log, now])

  const maxCount = Math.max(1, ...grid.flat())
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="card-head">
        <span className="card-title">Scan activity · 7 days</span>
        <span className="caption">{s.scan_count || 0} scans · {fmtAgo(s.last_harvest_scan)} ago</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(24, 1fr)', gap: 3, alignItems: 'center' }}>
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="tiny" style={{ textAlign: 'center', opacity: h % 3 === 0 ? 1 : 0 }}>
            {h}
          </div>
        ))}
        {grid.map((row, dIdx) => (
          <div key={`r-${dIdx}`} style={{ display: 'contents' }}>
            <div className="tiny" style={{ textAlign: 'right', paddingRight: 6 }}>{days[dIdx]}</div>
            {row.map((c, h) => {
              const v = c / maxCount
              const bg = v === 0
                ? 'var(--bg-2)'
                : `rgba(139, 124, 255, ${0.12 + v * 0.7})`
              return (
                <div
                  key={`${dIdx}-${h}`}
                  className="heat-cell"
                  style={{ background: bg }}
                  title={`${days[dIdx]} ${h}:00 — ${c} scans`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 14, color: 'var(--ink-3)' }}>
        <span className="tiny">Less</span>
        <div className="row gap-4">
          {[0.1, 0.3, 0.5, 0.75, 1].map((v, i) => (
            <span key={i} className="heat-cell" style={{ width: 10, height: 10, background: `rgba(139, 124, 255, ${0.12 + v * 0.7})` }} />
          ))}
        </div>
        <span className="tiny">More</span>
      </div>
    </div>
  )
}

// ─── Live games table ──────────────────────────────────────────────────
function LiveGames({ games, blowoutLog }) {
  const byAb = useMemo(() => {
    const m = {}
    for (const b of blowoutLog || []) m[`${b.leader}_${b.lead}`] = b
    return m
  }, [blowoutLog])

  const sorted = useMemo(() => {
    return [...(games || [])].sort((a, b) => {
      const la = Math.abs((a.home_score || 0) - (a.away_score || 0))
      const lb = Math.abs((b.home_score || 0) - (b.away_score || 0))
      return lb - la
    })
  }, [games])

  return (
    <div className="card">
      <div className="card-head">
        <div className="col gap-4">
          <span className="card-title">Live games</span>
          <span className="caption">{sorted.length} in play</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState text="No games in play right now." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>League</th>
                <th>Matchup</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ textAlign: 'center' }}>Lead</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Home ¢</th>
                <th style={{ textAlign: 'right' }}>Away ¢</th>
                <th style={{ textAlign: 'right' }}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, i) => {
                const lead = Math.abs((g.home_score || 0) - (g.away_score || 0))
                const leaderAb = (g.home_score || 0) >= (g.away_score || 0) ? g.home_abbrev : g.away_abbrev
                const diag = byAb[`${leaderAb}_${lead}`]
                const trading = diag?.status === 'signal'
                const skipReason = diag?.status === 'skip' ? diag.reason : null
                const homeLead = (g.home_score || 0) > (g.away_score || 0)
                const awayLead = (g.away_score || 0) > (g.home_score || 0)
                return (
                  <tr key={g.espn_id || i} className="ticker-row">
                    <td style={{ whiteSpace: 'nowrap' }}><span className="caption" style={{ color: 'var(--ink-2)' }}>{sportTag(g.sport)}</span></td>
                    <td style={{ minWidth: 120 }}>
                      <div className="col" style={{ gap: 2 }}>
                        <span style={{ color: awayLead ? 'var(--ink)' : 'var(--ink-2)', fontWeight: awayLead ? 600 : 400, fontSize: 12 }}>
                          {g.away_abbrev || g.away_team}
                        </span>
                        <span style={{ color: homeLead ? 'var(--ink)' : 'var(--ink-2)', fontWeight: homeLead ? 600 : 400, fontSize: 12 }}>
                          {g.home_abbrev || g.home_team}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                        <span className="num" style={{ color: awayLead ? 'var(--ink)' : 'var(--ink-2)', fontWeight: awayLead ? 600 : 400, fontSize: 13 }}>{g.away_score ?? 0}</span>
                        <span className="num" style={{ color: homeLead ? 'var(--ink)' : 'var(--ink-2)', fontWeight: homeLead ? 600 : 400, fontSize: 13 }}>{g.home_score ?? 0}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {lead > 0 ? (
                        <span className="num" style={{ color: lead >= 10 ? 'var(--accent)' : 'var(--ink-2)', fontSize: 12, fontWeight: 500 }}>+{lead}</span>
                      ) : <span className="caption" style={{ color: 'var(--ink-4)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                      <span className="mono" style={{ fontSize: 11 }}>{g.detail || `P${g.period} ${g.clock}`}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: g.home_poly != null ? 'var(--ink)' : 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                      {g.home_poly != null ? fmtCents(g.home_poly) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: g.away_poly != null ? 'var(--ink)' : 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                      {g.away_poly != null ? fmtCents(g.away_poly) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {trading ? (
                        <span className="pill" style={{ background: 'rgba(184,255,94,0.10)', color: 'var(--accent)', borderColor: 'rgba(184,255,94,0.25)' }}>
                          <span className="pill-dot live" /> Trading
                        </span>
                      ) : skipReason ? (
                        <span className="caption" style={{ color: 'var(--ink-3)' }} title={skipReason}>
                          {skipReason.length > 22 ? skipReason.slice(0, 22) + '…' : skipReason}
                        </span>
                      ) : (
                        <span className="caption" style={{ color: 'var(--ink-4)' }}>monitoring</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Edge scanner ──────────────────────────────────────────────────────
function EdgeScanner({ edges, threshold }) {
  const [sortBy, setSortBy] = useState('edge')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    let arr = edges || []
    if (filter === 'tradeable') arr = arr.filter((e) => (e.effective_edge ?? e.edge) >= (threshold || 0.05))
    else if (filter === 'us') arr = arr.filter((e) => US_SPORTS.has(e.sport))
    else if (filter === 'soccer') arr = arr.filter((e) => sportIsSoccer(e.sport))
    if (q) arr = arr.filter((e) => (e.team || '').toLowerCase().includes(q.toLowerCase()))
    const by = sortBy
    arr = [...arr].sort((a, b) => {
      if (by === 'edge') return (b.edge || 0) - (a.edge || 0)
      if (by === 'hours') return (a.hours || 0) - (b.hours || 0)
      if (by === 'poly') return (b.poly || 0) - (a.poly || 0)
      return 0
    })
    return arr
  }, [edges, filter, q, sortBy, threshold])

  return (
    <div className="card">
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="col gap-4">
          <span className="card-title">Edge scanner</span>
          <span className="caption">
            {filtered.length} of {edges?.length || 0} opportunities · threshold {fmtPct(threshold || 0.05, 0)}
          </span>
        </div>
        <div className="row gap-10 wrap">
          <input className="input" placeholder="Filter team…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg">
            <button data-active={filter === 'all'} onClick={() => setFilter('all')}>All</button>
            <button data-active={filter === 'tradeable'} onClick={() => setFilter('tradeable')}>Tradeable</button>
            <button data-active={filter === 'us'} onClick={() => setFilter('us')}>US</button>
            <button data-active={filter === 'soccer'} onClick={() => setFilter('soccer')}>Soccer</button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text={edges?.length > 0 ? 'No matches for current filter.' : 'Waiting for odds feed. Edges appear when upcoming games post lines.'}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>League</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }} className="sortable" onClick={() => setSortBy('poly')}>Poly</th>
                <th style={{ textAlign: 'center' }}>True</th>
                <th style={{ textAlign: 'right' }} className="sortable" onClick={() => setSortBy('edge')}>Edge</th>
                <th style={{ textAlign: 'right' }} className="sortable" onClick={() => setSortBy('hours')}>T−</th>
                <th style={{ textAlign: 'right' }}>Book</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map((e, i) => {
                const tradeable = (e.effective_edge ?? e.edge) >= (threshold || 0.05)
                const edgeColor = e.edge >= 0.10 ? 'var(--accent)' : e.edge >= 0.05 ? 'var(--violet)' : 'var(--ink-2)'
                return (
                  <tr key={i}>
                    <td><span className="caption" style={{ color: 'var(--ink-2)' }}>{sportTag(e.sport)}</span></td>
                    <td>
                      <span style={{ color: tradeable ? 'var(--ink)' : 'var(--ink-1)', fontWeight: tradeable ? 500 : 400 }}>
                        {e.team}
                      </span>
                      {e.stale && <span className="pill" style={{ marginLeft: 8, background: 'transparent', color: 'var(--warn)', borderColor: 'rgba(255,181,71,0.25)', padding: '1px 6px', fontSize: 9 }}>stale</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtCents(e.poly)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="row gap-6" style={{ justifyContent: 'center' }}>
                        <span className="pbar">
                          <span className="pbar-fill" style={{ width: `${(e.true || 0) * 100}%` }} />
                        </span>
                        <span className="num caption" style={{ color: 'var(--ink-1)' }}>{fmtCents(e.true)}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: edgeColor, fontWeight: 500 }} className="num">
                      {e.edge >= 0 ? '+' : ''}{fmtPct(e.edge, 1)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--ink-2)' }} className="num">{e.hours ? `${e.hours.toFixed(1)}h` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--ink-3)' }} className="caption">{e.provider || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Blowout diagnostics (why did / didn't we trade) ───────────────────
function BlowoutLog({ log }) {
  const traded = (log || []).filter((b) => b.status === 'signal')
  const skipped = (log || []).filter((b) => b.status === 'skip')

  return (
    <div className="card">
      <div className="card-head">
        <div className="col gap-4">
          <span className="card-title">Blowout log · why / why not</span>
          <span className="caption">
            <span style={{ color: 'var(--accent)' }}>{traded.length} traded</span>
            <span style={{ color: 'var(--ink-4)', margin: '0 8px' }}>·</span>
            <span style={{ color: 'var(--ink-2)' }}>{skipped.length} skipped</span>
          </span>
        </div>
      </div>

      {log?.length === 0 || !log ? (
        <EmptyState text="No blowouts detected yet." />
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>League</th>
                <th>Leader</th>
                <th style={{ textAlign: 'right' }}>Lead</th>
                <th style={{ textAlign: 'right' }}>Conf</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {log.map((b, i) => {
                const traded = b.status === 'signal'
                return (
                  <tr key={i}>
                    <td><span className="caption" style={{ color: 'var(--ink-2)' }}>{sportTag(b.sport)}</span></td>
                    <td>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{b.leader}</span>
                      <span className="caption" style={{ color: 'var(--ink-3)', marginLeft: 6 }}>vs {b.trailer}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="num">+{b.lead}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtPct(b.confidence, 1)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--ink-1)' }} className="num">{b.price ? fmtCents(b.price) : '—'}</td>
                    <td>
                      {traded ? (
                        <span className="pill" style={{ background: 'rgba(184,255,94,0.10)', color: 'var(--accent)', borderColor: 'rgba(184,255,94,0.25)' }}>
                          Traded · {fmtUSD(b.bet, 0)}
                        </span>
                      ) : (
                        <span className="caption" style={{ color: 'var(--ink-3)' }}>{b.reason}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Open positions ────────────────────────────────────────────────────
function OpenPositions({ positions }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="col gap-4">
          <span className="card-title">Open positions</span>
          <span className="caption">{positions.length} live · marked-to-market</span>
        </div>
      </div>
      {positions.length === 0 ? (
        <EmptyState text="No open positions." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Engine</th>
                <th>League</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Entry</th>
                <th style={{ textAlign: 'right' }}>Mark</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
                <th style={{ textAlign: 'right' }}>Unrealized</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const mark = p.current_price ?? p.entry_price
                const unreal = p.unrealized_pnl ?? ((mark - p.entry_price) * p.size)
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ color: ENGINE_COLOR[p.engine], fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {ENGINE_LABEL[p.engine] || p.engine}
                      </span>
                    </td>
                    <td><span className="caption" style={{ color: 'var(--ink-2)' }}>{sportTag(p.sport)}</span></td>
                    <td><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{p.team}</span></td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtCents(p.entry_price)}</td>
                    <td style={{ textAlign: 'right', color: mark > p.entry_price ? 'var(--pos)' : mark < p.entry_price ? 'var(--neg)' : 'var(--ink-1)' }} className="num">
                      {fmtCents(mark)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtUSD(p.cost, 2)}</td>
                    <td style={{ textAlign: 'right', color: unreal >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 500 }} className="num">
                      {fmtSignedUSD(unreal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Trade history ─────────────────────────────────────────────────────
function TradeLedger({ trades }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="col gap-4">
          <span className="card-title">Ledger</span>
          <span className="caption">{trades.length} resolved trades</span>
        </div>
      </div>
      {trades.length === 0 ? (
        <EmptyState text="No resolved trades yet." />
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Engine</th>
                <th>League</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Entry</th>
                <th style={{ textAlign: 'right' }}>Exit</th>
                <th style={{ textAlign: 'right' }}>P&L</th>
                <th>Outcome</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => {
                const win = t.pnl > 0
                return (
                  <tr key={t.id || i}>
                    <td>
                      <span style={{ color: ENGINE_COLOR[t.engine], fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {ENGINE_LABEL[t.engine] || t.engine}
                      </span>
                    </td>
                    <td><span className="caption" style={{ color: 'var(--ink-2)' }}>{sportTag(t.sport)}</span></td>
                    <td><span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{t.team}</span></td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtCents(t.entry_price)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtCents(t.exit_price ?? t.payout / (t.size || 1))}</td>
                    <td style={{ textAlign: 'right', color: win ? 'var(--pos)' : 'var(--neg)', fontWeight: 500 }} className="num">
                      {fmtSignedUSD(t.pnl)}
                    </td>
                    <td>
                      <span className="pill" style={{ background: 'transparent', color: win ? 'var(--pos)' : 'var(--neg)', borderColor: win ? 'rgba(184,255,94,0.25)' : 'rgba(255,107,107,0.25)', fontSize: 10 }}>
                        {t.result}
                      </span>
                    </td>
                    <td><span className="caption" style={{ color: 'var(--ink-3)' }}>{t.exit_reason || '—'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Per-sport P&L grid ───────────────────────────────────────────────
function SportBreakdown({ sportsStats }) {
  const entries = Object.entries(sportsStats || {})
    .sort(([, a], [, b]) => Math.abs(b.pnl || 0) - Math.abs(a.pnl || 0))
    .slice(0, 18)
  const maxAbs = Math.max(1, ...entries.map(([, s]) => Math.abs(s.pnl || 0)))

  return (
    <div className="card">
      <div className="card-head">
        <div className="col gap-4">
          <span className="card-title">P&L by league</span>
          <span className="caption">Realized · Σ across engines</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <EmptyState text="No resolved trades in any league yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {entries.map(([sport, st]) => {
            const pnl = st.pnl || 0
            const pos = pnl >= 0
            const pct = Math.abs(pnl) / maxAbs
            return (
              <div key={sport} className="card-sm" style={{ padding: 14 }}>
                <div className="tiny" style={{ color: 'var(--ink-2)' }}>{sportTag(sport)}</div>
                <div className="stat-num" style={{ fontSize: 18, color: pos ? 'var(--pos)' : 'var(--neg)', margin: '4px 0 6px' }}>
                  {fmtSignedUSD(pnl)}
                </div>
                <div className="tiny" style={{ color: 'var(--ink-3)' }}>
                  {st.total_trades} trades · {fmtPct(st.win_rate, 0)} win
                </div>
                <div style={{ marginTop: 8, height: 2, background: 'var(--bg-2)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: pos ? 'var(--accent)' : 'var(--neg)', transition: 'width 400ms ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Activity feed (scan log, compact) ────────────────────────────────
function ActivityFeed({ logs }) {
  const shown = (logs || []).slice().reverse().slice(0, 80)
  return (
    <div className="card" style={{ minHeight: 360 }}>
      <div className="card-head">
        <span className="card-title">Activity</span>
        <span className="caption">{logs?.length || 0} events</span>
      </div>
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {shown.length === 0 ? (
          <EmptyState text="Waiting for first scan…" />
        ) : (
          shown.map((l, i) => {
            const ec = l.engine ? ENGINE_COLOR[l.engine] : 'var(--ink-3)'
            const hot = l.level === 'trade' || l.level === 'signal'
            return (
              <div key={i} className="row ticker-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', gap: 14, alignItems: 'flex-start' }}>
                <span className="mono" style={{ color: 'var(--ink-4)', fontSize: 10, width: 44, textAlign: 'right', flexShrink: 0 }}>
                  {fmtAgo(l.t)}
                </span>
                <span style={{ color: ec, fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', width: 60, flexShrink: 0 }}>
                  {l.engine ? (ENGINE_LABEL[l.engine] || l.engine) : ''}
                </span>
                <span style={{ color: hot ? 'var(--ink)' : 'var(--ink-2)', fontSize: 12, lineHeight: 1.5, flex: 1, minWidth: 0 }}>{l.msg}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── System / diagnostics ─────────────────────────────────────────────
function SystemCard({ s }) {
  const wsS = s.ws_sports_connected
  const wsM = s.ws_market_connected
  const verified = s.series_verified || {}
  const verifiedCount = Object.values(verified).filter(Boolean).length
  const verifiedTotal = Object.keys(verified).length
  const poly = s.poly_diag || {}

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">System</span>
        <span className="caption">{fmtUptime(s.uptime)} uptime</span>
      </div>

      <div className="col gap-10">
        <DiagRow label="Mode" value={s.paper_mode ? 'Paper' : 'Live'} tone={s.paper_mode ? 'ink-1' : 'accent'} />
        <DiagRow label="Sports WS" value={wsS ? 'Connected' : 'Disconnected'} tone={wsS ? 'pos' : 'neg'} />
        <DiagRow label="Market WS" value={wsM ? 'Connected' : 'Disconnected'} tone={wsM ? 'pos' : 'neg'} />
        <DiagRow label="Odds API" value={s.odds_api_enabled ? 'Active' : 'Not configured'} tone={s.odds_api_enabled ? 'pos' : 'ink-3'} />
        <DiagRow
          label="Series IDs"
          value={verifiedTotal ? `${verifiedCount} / ${verifiedTotal}` : '—'}
          tone={verifiedCount === verifiedTotal ? 'pos' : 'warn'}
        />
        <DiagRow label="Last harvest" value={`${fmtAgo(s.last_harvest_scan)} ago`} tone="ink-1" />
        <DiagRow label="Last edge" value={`${fmtAgo(s.last_edge_scan)} ago`} tone="ink-1" />
        {s.circuit?.tripped && (
          <DiagRow label="Circuit" value="Tripped · cooling down" tone="neg" />
        )}
      </div>

      {Object.keys(poly).length > 0 && (
        <>
          <hr className="hr" style={{ margin: '18px 0 14px' }} />
          <div className="tiny" style={{ marginBottom: 8, color: 'var(--ink-2)' }}>POLYMARKET SERIES · markets returned</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            {Object.entries(poly).slice(0, 20).map(([sp, d]) => (
              <div key={sp} className="row between" style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--ink-2)' }}>{sportTag(sp)}</span>
                <span className="mono num" style={{ color: d.filtered > 0 ? 'var(--ink-1)' : 'var(--ink-4)' }}>{d.filtered}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
function DiagRow({ label, value, tone = 'ink-1' }) {
  const toneVar = { 'pos': 'var(--pos)', 'neg': 'var(--neg)', 'warn': 'var(--warn)', 'accent': 'var(--accent)', 'ink-1': 'var(--ink-1)', 'ink-3': 'var(--ink-3)' }[tone] || 'var(--ink-1)'
  return (
    <div className="row between" style={{ fontSize: 12 }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: toneVar, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyState({ text }) {
  return (
    <div className="center" style={{ padding: '40px 20px', color: 'var(--ink-3)', fontSize: 12, textAlign: 'center' }}>
      {text}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [s, setS] = useState(null)
  const [online, setOnline] = useState(false)
  const [tab, setTab] = useState('live')
  const [err, setErr] = useState(null)

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/state`, { cache: 'no-store' })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const data = await r.json()
      setS(data)
      setOnline(true)
      setErr(null)
    } catch (e) {
      setOnline(false)
      setErr(e.message)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  const callPause = useCallback(async (minutes) => {
    try {
      await fetch(`${API}/api/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      })
      poll()
    } catch (e) { /* swallow */ }
  }, [poll])

  const callResume = useCallback(async () => {
    try {
      await fetch(`${API}/api/resume`, { method: 'POST' })
      poll()
    } catch (e) { /* swallow */ }
  }, [poll])

  // Loading skeleton
  if (!s) {
    return (
      <div className="shell grain center" style={{ minHeight: '100dvh' }}>
        <div className="col center gap-12">
          <div className="spin" />
          <div className="caption" style={{ color: 'var(--ink-3)' }}>
            {err ? `Connection error: ${err}` : 'Connecting to Signal…'}
          </div>
        </div>
      </div>
    )
  }

  const live = s.live_games || []
  const edges = s.edges_found || []
  const blowout = s.blowout_log || []
  const positions = s.open_positions || []
  const trades = s.trade_history || []
  const logs = s.scan_log || []

  const TAB_COUNTS = {
    live: live.length + (blowout?.filter(b => b.status === 'signal').length || 0),
    edge: edges.filter((e) => (e.effective_edge ?? e.edge) >= (0.05)).length,
    positions: positions.length,
    ledger: trades.length,
  }

  return (
    <div className="shell grain">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,11,0.78)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="container row between" style={{ height: 60 }}>
          <div className="row gap-10">
            <div style={{ color: 'var(--ink)', display: 'flex' }}><Logo size={22} /></div>
            <div className="row gap-8" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Signal</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Sports</span>
            </div>
          </div>

          <div className="row gap-10">
            <StatusDot
              state={online && !s.paused ? 'live' : !online ? 'err' : 'warn'}
              label={!online ? 'Offline' : s.paused ? 'Paused' : s.paper_mode ? 'Paper · Live' : 'Live'}
            />
            <span className="pill hide-mobile" title="Uptime">
              <span style={{ color: 'var(--ink-3)' }}>{fmtUptime(s.uptime)}</span>
            </span>
            <span className="pill hide-mobile" title={`${s.scan_count} scans`}>
              <span className="mono num" style={{ color: 'var(--ink-2)' }}>{s.scan_count || 0}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>scans</span>
            </span>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: 80 }}>
        {/* ── Hero ────────────────────────────────────────────────── */}
        <Hero s={s} onPause={callPause} onResume={callResume} />

        {/* ── Engine cards row ───────────────────────────────────── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <EngineCard id="harvest" stats={s.harvest_stats} positions={positions} live={live} lastScan={s.last_harvest_scan} />
          <EngineCard id="edge" stats={s.edge_stats} positions={positions} live={live} lastScan={s.last_edge_scan} />
          <CapitalCard s={s} />
          <SystemCard s={s} />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="row between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="tabs">
            <button data-active={tab === 'live'} onClick={() => setTab('live')}>
              Live <span className="tab-count">{TAB_COUNTS.live}</span>
            </button>
            <button data-active={tab === 'edge'} onClick={() => setTab('edge')}>
              Edge <span className="tab-count">{TAB_COUNTS.edge}</span>
            </button>
            <button data-active={tab === 'positions'} onClick={() => setTab('positions')}>
              Positions <span className="tab-count">{TAB_COUNTS.positions}</span>
            </button>
            <button data-active={tab === 'ledger'} onClick={() => setTab('ledger')}>
              Ledger <span className="tab-count">{TAB_COUNTS.ledger}</span>
            </button>
            <button data-active={tab === 'analytics'} onClick={() => setTab('analytics')}>
              Analytics
            </button>
          </div>
        </div>

        {/* ── Tab content ────────────────────────────────────────── */}
        {tab === 'live' && (
          <div className="col gap-20" style={{ marginBottom: 24 }}>
            <LiveGames games={live} blowoutLog={blowout} />
            <BlowoutLog log={blowout} />
          </div>
        )}
        {tab === 'edge' && (
          <div style={{ marginBottom: 24 }}>
            <EdgeScanner edges={edges} threshold={0.05} />
          </div>
        )}
        {tab === 'positions' && (
          <div style={{ marginBottom: 24 }}>
            <OpenPositions positions={positions} />
          </div>
        )}
        {tab === 'ledger' && (
          <div style={{ marginBottom: 24 }}>
            <TradeLedger trades={trades} />
          </div>
        )}
        {tab === 'analytics' && (
          <div className="col gap-20" style={{ marginBottom: 24 }}>
            <SportBreakdown sportsStats={s.sports_stats} />
            <div className="grid-2">
              <ActivityCard s={s} />
              <ActivityFeed logs={logs} />
            </div>
          </div>
        )}

        {/* ── Always-on: activity feed (except on analytics which shows it already) ── */}
        {tab !== 'analytics' && (
          <ActivityFeed logs={logs} />
        )}

        <footer style={{ paddingTop: 40, textAlign: 'center' }}>
          <span className="tiny" style={{ color: 'var(--ink-4)' }}>
            Signal Harvest v18 · {s.paper_mode ? 'paper' : 'live'} · updates every {Math.round(POLL_MS / 1000)}s
          </span>
        </footer>
      </main>
    </div>
  )
}
