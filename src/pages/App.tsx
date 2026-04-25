/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'

// Auth gate wrapper
export default function AuthGate() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", color: '#555', fontSize: '12px', letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  )

  if (!user) {
    window.location.href = '/login'
    return null
  }

  return <Baseline />
}


// ============================================================
// BASELINE — Life Scorecard
// ============================================================

// 4 scored categories. People + Home are bonus-only.
const CATEGORIES = [
  { id: 'health',   name: 'Health'   },
  { id: 'movement', name: 'Movement' },
  { id: 'business', name: 'Business' },
  { id: 'mind',     name: 'Mind'     },
]

const THRESHOLDS = {
  health:   35,
  movement: 35,
  business: 40,
  mind:     25,
}

const DRINK_TYPES = ['Wine', 'Beer', 'Whiskey', 'Cocktail']
const COMPANIES   = ['Ink Imprints', 'HeartWest']
const PROJECTS    = ['Baseline app', 'Canfield archive', 'Junior Athletics', 'Art collection', 'Other']
const GOLF_COMPANY = ['Solo', 'Friends', 'Family', 'Networking']

const getRolloverHour = () => {
  try {
    const c = JSON.parse(localStorage.getItem('baseline:config') || '{}')
    return typeof c.rolloverHour === 'number' ? c.rolloverHour : 4
  } catch { return 4 }
}

const todayISO = () => {
  const now  = new Date()
  const roll = getRolloverHour()
  if (now.getHours() < roll) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

const isoFromDate = d => {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const daysAgo  = n => { const d = new Date(); d.setDate(d.getDate() - n); return isoFromDate(d) }
const addDays  = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return isoFromDate(dt)
}
const prettyDate = iso => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
const isToday  = iso => iso === todayISO()
const isFuture = iso => iso > todayISO()

const emptyDay = (date = todayISO()) => ({
  date,
  stretched:        false,
  waterOz:          0,
  redBulls:         0,
  drinks:           { Wine: 0, Beer: 0, Whiskey: 0, Cocktail: 0 },
  meals:            { salad: false, healthy: false, smoothie: false, flexible: false, fastFood: false, fromScratch: false },
  sleepBedtime:     '',
  sleepWakeTime:    '',
  saunaMin:         0,
  hotTubMin:        0,
  recCenter:        false,
  substituteCardio: false,
  weight:           null,
  cardioMin:        0,
  cycling:          [],
  golf:             [],
  outdoor:          [],
  indoor:           [],
  gambling:         [],
  projects:         [],
  wallaceWalks:     0,
  wallaceMinutes:   0,
  deepWorkMinutes:  0,
  revenue:          [],
  customers:        [],
  contacts:         [],
  dinnerWithDad:    false,
  social:           [],
  reading:          [],
  booksFinished:    0,
  meditation:       0,
  natureMinutes:    0,
  homeTasks:        [],
  vacationMode:     false,
  journal:          '',
  closed:           false,
  closedAt:         null,
  score:            0,
  grade:            'D',
  wl:               'L',
  categoryScores:   {},
  categoriesHit:    0,
  balanceMultiplier: 0,
  bonus:            0,
})

// ============================================================
// SCORING ENGINE v2
// 4 categories: Health, Movement, Business, Mind
// Best 3 of 4 averaged → balance multiplier → + bonus (max 15)
// ============================================================

function scoreHealth(d) {
  let s = 0

  // Hydration — 48oz goal, 25 pts max
  s += Math.min(25, Math.round((d.waterOz || 0) / 48 * 25))

  // Nutrition
  const m = d.meals || {}
  if (m.salad)       s += 10
  if (m.healthy)     s += 10
  if (m.smoothie)    s += 5
  if (m.fromScratch) s += 8
  if (m.fastFood)    s -= 10

  // Red Bulls
  const rb = d.redBulls || 0
  if      (rb === 0) s += 10
  else if (rb === 1) s += 8
  else if (rb === 2) s += 5
  else if (rb === 3) s += 2
  else               s -= 8

  // Alcohol
  const drinks = Object.values(d.drinks || {}).reduce((a, b) => a + b, 0)
  if      (drinks === 0) s += 5
  else if (drinks <= 2)  s += 0
  else                   s -= Math.min(drinks * 3, 12)

  // Bedtime
  if (d.sleepBedtime) {
    const [hh] = d.sleepBedtime.split(':').map(Number)
    if      (hh >= 20 && hh <= 23) s += 12
    else if (hh === 0)              s += 6
    else if (hh >= 1 && hh <= 3)   s -= 5
  }

  // Morning stretch
  if (d.stretched) s += 8

  // Sauna / hot tub — bonus
  if ((d.saunaMin  || 0) >= 10) s += 6
  if ((d.hotTubMin || 0) >= 10) s += 4

  if (d.vacationMode) s = Math.max(s, 50)
  return Math.max(0, Math.min(100, Math.round(s)))
}

function scoreMovement(d) {
  let s = 0

  const cyclingMiles = (d.cycling || []).reduce((t, r) => t + (Number(r.miles) || 0), 0)
  const golfHoles    = (d.golf    || []).reduce((t, g) => t + (Number(g.holes) || 0), 0)
  const outdoorMin   = (d.outdoor || []).reduce((t, o) => t + (Number(o.minutes) || 0), 0)
  const indoorMin    = (d.indoor  || []).reduce((t, o) => t + (Number(o.minutes) || 0), 0)
  const wallaceWalks = d.wallaceWalks   || 0
  const wallaceMin   = d.wallaceMinutes || 0
  const cardioMin    = d.cardioMin      || 0
  const rec          = d.recCenter
  const subCardio    = d.substituteCardio

  // Base exercise — any one satisfies "moved today"
  const exercised = rec || subCardio || cardioMin >= 20 || cyclingMiles >= 3 || golfHoles >= 9
  if (exercised) s += 35

  // Rec center bonus
  if (rec) s += 10

  // Cycling — miles × 3, max 40 pts
  if (cyclingMiles > 0) s += Math.min(40, Math.round(cyclingMiles * 3))

  // Golf
  if (golfHoles >= 9) {
    s += 15
    const golfWalked = (d.golf || []).some(g => g.walked)
    if (golfWalked) s += 5
  }

  // Cardio minutes (non-cycling)
  if (cardioMin > 0 && cyclingMiles === 0) {
    s += Math.round(Math.min(cardioMin, 60) / 60 * 10)
  }

  // Wallace
  if (wallaceWalks >= 1) s += 8
  if (wallaceWalks >= 2) s += 4
  if (wallaceMin  >= 30) s += 3

  // Outdoor activity
  if (outdoorMin >= 20) s += 8
  if (outdoorMin >= 60) s += 7

  // Indoor activity
  if (indoorMin >= 30) s += 5

  // S-TIER STACK: bike + Wallace + outdoor all in one day
  const hasStack = cyclingMiles >= 5 && wallaceWalks >= 1 && outdoorMin >= 20
  if (hasStack) s += 15

  if (d.vacationMode) s = Math.max(s, 50)
  return Math.max(0, Math.min(100, Math.round(s)))
}

function scoreBusiness(d) {
  let s = 0
  const dwMin     = d.deepWorkMinutes || 0
  const revenue   = (d.revenue   || []).reduce((t, r) => t + Number(r.amount  || 0), 0)
  const customers = (d.customers || []).reduce((t, c) => t + Number(c.count   || 0), 0)

  // Deep work — 4h = B floor, 5h = A push
  if      (dwMin >= 300) s += 75                               // 5+ hrs: S-tier work
  else if (dwMin >= 240) s  = Math.round(dwMin / 300 * 75)    // 4–5 hrs
  else if (dwMin >    0) s  = Math.round(dwMin / 300 * 55)    // partial

  // Revenue — A push
  if (revenue > 0) s += Math.round(Math.min(revenue / 500, 1) * 20)

  // New client — S-tier flag
  if (customers > 0) s += Math.min(customers * 15, 25)

  return Math.max(0, Math.min(100, Math.round(s)))
}

function scoreMind(d) {
  let s = 0
  const readingMin  = (d.reading || []).reduce((t, r) => t + Number(r.minutes || 0), 0)
  const booksFinished = d.booksFinished   || 0
  const meditationMin = d.meditation      || 0
  const natureMin     = d.natureMinutes   || 0

  // Reading — core
  if      (readingMin >= 45) s += 55
  else if (readingMin >= 20) s += 45
  else if (readingMin >= 2)  s += 25   // B floor

  // Books
  s += Math.min(booksFinished, 1) * 20

  // Meditation
  if (meditationMin >= 5)  s += 10
  if (meditationMin >= 15) s += 8

  // Nature
  if (natureMin >= 20) s += 8
  if (natureMin >= 60) s += 7

  // Passive outdoor credit — bike, golf, Wallace, hiking all feed Mind
  const cyclingMiles = (d.cycling || []).reduce((t, r) => t + (Number(r.miles) || 0), 0)
  const golfHoles    = (d.golf    || []).reduce((t, g) => t + (Number(g.holes) || 0), 0)
  const wallaceWalks = d.wallaceWalks || 0
  const outdoorMin   = (d.outdoor || []).reduce((t, o) => t + (Number(o.minutes) || 0), 0)

  let outdoorCredit = 0
  if (cyclingMiles >= 5) outdoorCredit += 12
  else if (cyclingMiles >= 1) outdoorCredit += 6
  if (golfHoles    >= 9) outdoorCredit += 8
  if (wallaceWalks >= 1) outdoorCredit += 6
  if (outdoorMin   >= 30) outdoorCredit += 6
  s += Math.min(outdoorCredit, 20)   // cap passive credit at 20

  return Math.max(0, Math.min(100, Math.round(s)))
}

// Bonus pool — People + Home, max 15 pts
function calcBonus(d) {
  let bonus = 0
  if (d.dinnerWithDad) bonus += 6
  for (const c of (d.contacts || [])) {
    if      (c.quality === 'in-person') bonus += 3
    else if (c.quality === 'call')      bonus += 2
    else                                bonus += 1
  }
  if ((d.social || []).length > 0) bonus += 3
  bonus += Math.min((d.homeTasks || []).length * 2, 4)
  return Math.min(bonus, 15)
}

function computeDay(d) {
  const cs = {
    health:   scoreHealth(d),
    movement: scoreMovement(d),
    business: scoreBusiness(d),
    mind:     scoreMind(d),
  }

  // Best 3 of 4
  const sorted = Object.values(cs).sort((a, b) => b - a)
  const raw    = Math.round(sorted.slice(0, 3).reduce((a, b) => a + b, 0) / 3)

  // How many categories hit threshold
  const hit = CATEGORIES.filter(c => cs[c.id] >= THRESHOLDS[c.id]).length

  // Balance multiplier (4-category scale)
  const multMap = [0.72, 0.82, 0.90, 0.96, 1.00]
  let bm = d.vacationMode ? Math.max(0.90, multMap[hit]) : multMap[hit]

  // Bonus from People + Home
  const bonus = calcBonus(d)

  // Final score
  const score = Math.min(100, Math.round(raw * bm) + bonus)

  let grade, wl
  if      (score >= 90) { grade = 'S'; wl = 'W' }
  else if (score >= 78) { grade = 'A'; wl = 'W' }
  else if (score >= 65) { grade = 'B'; wl = 'P' }
  else if (score >= 50) { grade = 'C'; wl = 'L' }
  else                  { grade = 'D'; wl = 'L' }

  return { ...d, categoryScores: cs, score, grade, wl, categoriesHit: hit, balanceMultiplier: bm, bonus }
}

// ============================================================
// STORAGE (localStorage + Supabase background sync)
// ============================================================

const STORAGE = {
  getDay(date) {
    try { const r = localStorage.getItem(`baseline:day:${date}`); return r ? JSON.parse(r) : null }
    catch { return null }
  },
  saveDay(day) {
    localStorage.setItem(`baseline:day:${day.date}`, JSON.stringify(day))
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return
      supabase.from('days').upsert(
        { user_id: data.user.id, date: day.date, data: day, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      ).then(() => {})
    })
  },
  listDays() {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('baseline:day:')) {
        try { out.push(JSON.parse(localStorage.getItem(k))) } catch {}
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  },
  getConfig() {
    try { const r = localStorage.getItem('baseline:config'); if (r) return JSON.parse(r) } catch {}
    return {
      inkMonthlyTarget:      10000,
      heartwestMonthlyTarget: 10000,
      weightGoal:            145,
      cyclingWeeklyGoal:     35,
      deepWorkDailyGoal:     240,
      waterGoal:             48,
      redBullCap:            3,
      rolloverHour:          4,
    }
  },
  saveConfig(c) {
    localStorage.setItem('baseline:config', JSON.stringify(c))
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return
      supabase.from('config').upsert(
        { user_id: data.user.id, data: c, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      ).then(() => {})
    })
  },
  exportAll() {
    return JSON.stringify({ days: this.listDays(), config: this.getConfig(), exportedAt: new Date().toISOString() }, null, 2)
  },
  importAll(json) {
    const data = JSON.parse(json)
    if (data.days)   for (const d of data.days) this.saveDay(d)
    if (data.config) this.saveConfig(data.config)
  },
}

// ============================================================
// DESIGN TOKENS
// ============================================================

const s = {
  bg:          '#0a0a0a',
  panel:       '#141414',
  panelRaised: '#1a1a1a',
  border:      '#262626',
  borderLight: '#333',
  text:        '#e8e8e8',
  textDim:     '#888',
  textMuted:   '#555',
  gold:        '#c9a227',
  green:       '#3ecf8e',
  red:         '#ef4444',
  blue:        '#6ba4ff',
  orange:      '#ff9933',
}
const f = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  ui:      "'Inter', -apple-system, sans-serif",
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function Panel({ children, label, style = {} }) {
  return (
    <div style={{ background: s.panel, border: `1px solid ${s.border}`, padding: 20, ...style }}>
      {label && <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.2em', marginBottom: 12 }}>{label.toUpperCase()}</div>}
      {children}
    </div>
  )
}

function Stat({ label, value, sub, color = s.text, big = false }) {
  return (
    <div>
      <div style={{ fontFamily: f.mono, fontSize: 9, color: s.textDim, letterSpacing: '0.2em', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: f.mono, fontSize: big ? 32 : 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: 20, height: 20, border: `1.5px solid ${checked ? s.gold : s.borderLight}`, background: checked ? s.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <span style={{ color: '#000', fontSize: 13, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14 }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
  )
}

function NumberInput({ label, value, onChange, unit, step = 1, min = 0 }) {
  return (
    <div>
      <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onChange(Math.max(min, Number(value) - step))} style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: s.text, width: 36, height: 36, cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>−</button>
        <input type="number" inputMode="numeric" value={value} onChange={e => onChange(Number(e.target.value))} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: '8px 6px', width: 60, fontFamily: f.mono, fontSize: 14, textAlign: 'center' }} />
        <button onClick={() => onChange(Number(value) + step)} style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: s.text, width: 36, height: 36, cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>+</button>
        {unit && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}

function Slider({ label, value, onChange, max, unit }) {
  const pct = Math.min(100, value / max * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em' }}>{label.toUpperCase()}</span>
        <span style={{ fontFamily: f.mono, fontSize: 12, color: s.gold }}>{value} / {max} {unit}</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%' }} />
      <div style={{ height: 3, background: s.border, marginTop: -2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: s.gold, transition: 'width 0.2s' }} />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange, big = false }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: big ? '16px 20px' : '10px 14px', border: `1px solid ${value ? s.gold : s.border}`, background: value ? 'rgba(201,162,39,0.08)' : s.panel, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ fontSize: big ? 16 : 14, fontWeight: big ? 600 : 400 }}>{label}</span>
      <div style={{ width: 44, height: 24, background: value ? s.gold : s.borderLight, borderRadius: 12, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, background: '#000', borderRadius: 10, transition: 'left 0.2s' }} />
      </div>
    </div>
  )
}

const btnGold = { background: s.gold, color: '#000', border: 'none', padding: '8px 14px', fontFamily: f.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }
const inp     = { background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: '8px 10px', fontFamily: f.mono, fontSize: 13 }

// ============================================================
// SHELL
// ============================================================

function Shell({ children, tab, setTab, viewDate, prevDay, nextDay, goToToday, day }) {
  const showNav      = tab === 'Today' || tab === 'Log'
  const viewingToday = viewDate === todayISO()
  const atFuture     = viewDate >= todayISO()
  return (
    <div style={{ minHeight: '100vh', background: s.bg, color: s.text, fontFamily: f.ui, paddingBottom: 40 }}>
      <div className="pad-header header-wrap" style={{ borderBottom: `1px solid ${s.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.panel, position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div className="logo-big" style={{ fontFamily: f.display, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>BASELINE</div>
          <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginTop: 2 }}>ESTABLISH YOURS · THEN BEAT IT</div>
        </div>
        <div className="tabs-row" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {['Today', 'Log', 'Week', 'Trends', 'Config'].map(t => (
            <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{ background: tab === t ? s.gold : 'transparent', color: tab === t ? '#000' : s.text, border: `1px solid ${tab === t ? s.gold : s.border}`, padding: '8px 14px', fontFamily: f.mono, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontWeight: 600 }}>{t.toUpperCase()}</button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/login' })} style={{ background: 'transparent', color: s.textDim, border: `1px solid ${s.border}`, padding: '8px 14px', fontFamily: f.mono, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', marginLeft: 8 }}>LOGOUT</button>
        </div>
      </div>
      {showNav && (
        <div style={{ borderBottom: `1px solid ${s.border}`, padding: '10px 24px', background: viewingToday ? s.panel : '#1a1510', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', position: 'sticky', top: 82, zIndex: 99 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={prevDay} style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: s.text, padding: '6px 12px', fontFamily: f.mono, fontSize: 14, cursor: 'pointer' }}>←</button>
            <div style={{ minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontFamily: f.mono, fontSize: 9, color: s.textDim, letterSpacing: '0.2em' }}>{viewingToday ? 'TODAY' : day.closed ? 'CLOSED · VIEWING' : 'VIEWING · EDITABLE'}</div>
              <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: viewingToday ? s.gold : s.text, marginTop: 2 }}>{prettyDate(viewDate)}</div>
            </div>
            <button onClick={nextDay} disabled={atFuture} style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: atFuture ? s.textMuted : s.text, padding: '6px 12px', fontFamily: f.mono, fontSize: 14, cursor: atFuture ? 'not-allowed' : 'pointer', opacity: atFuture ? 0.4 : 1 }}>→</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {day.closed && <span style={{ fontFamily: f.mono, fontSize: 10, color: s.green, letterSpacing: '0.15em', padding: '4px 10px', border: `1px solid ${s.green}`, background: 'rgba(62,207,142,0.08)' }}>✓ CLOSED</span>}
            {!viewingToday && <button onClick={goToToday} style={{ background: s.gold, color: '#000', border: 'none', padding: '7px 14px', fontFamily: f.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}>JUMP TO TODAY</button>}
          </div>
        </div>
      )}
      <div className="pad-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
        {children}
      </div>
    </div>
  )
}

// ============================================================
// TODAY
// ============================================================

function TodayView({ day, allDays, config, goToDate, closeDay, reopenDay }) {
  const streak = useMemo(() => {
    let n = 0
    const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date))
    for (const d of sorted) {
      if (d.categoriesHit >= 3 || (d.vacationMode && d.categoriesHit >= 2)) n++
      else break
    }
    return n
  }, [allDays])

  const lifetime = useMemo(() => {
    const a = { redBulls: 0, wine: 0, beer: 0, whiskey: 0, cocktail: 0, stretches: 0, wallace: 0, books: 0, bikeMiles: 0, deepWorkHrs: 0 }
    for (const d of allDays) {
      a.redBulls   += d.redBulls || 0
      a.wine       += d.drinks?.Wine    || 0
      a.beer       += d.drinks?.Beer    || 0
      a.whiskey    += d.drinks?.Whiskey || 0
      a.cocktail   += d.drinks?.Cocktail || 0
      if (d.stretched) a.stretches++
      a.wallace    += d.wallaceWalks || 0
      a.books      += d.booksFinished || 0
      for (const r of d.cycling || []) a.bikeMiles += Number(r.miles) || 0
      a.deepWorkHrs += (d.deepWorkMinutes || 0) / 60
    }
    return a
  }, [allDays])

  const weekDays = useMemo(() => {
    const t = new Date()
    const dow = t.getDay()
    const mon = new Date(t)
    mon.setDate(t.getDate() - (dow + 6) % 7)
    const o = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      o.push({ iso, day: d, data: allDays.find(x => x.date === iso) })
    }
    return o
  }, [allDays])

  const weekRevenue    = weekDays.reduce((t, w) => t + (w.data?.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0)
  const monthRevenue   = useMemo(() => {
    const m = todayISO().slice(0, 7)
    return allDays.filter(d => d.date.startsWith(m)).reduce((t, d) => t + (d.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0)
  }, [allDays])
  const weekCyclingMi  = weekDays.reduce((a, w) => { for (const r of w.data?.cycling || []) a += Number(r.miles) || 0; return a }, 0)
  const weekDeepWork   = weekDays.reduce((t, w) => t + (w.data?.deepWorkMinutes || 0) / 60, 0)
  const weekWallaceMin = weekDays.reduce((t, w) => t + (w.data?.wallaceMinutes  || 0), 0)
  const weekCardioMin  = weekDays.reduce((t, w) => t + (w.data?.cardioMin       || 0), 0)
  const weekRecVisits  = weekDays.filter(w => w.data?.recCenter).length
  const weekSleep = (() => {
    const hrs = []
    for (const w of weekDays) {
      const d = w.data
      if (d?.sleepBedtime && d?.sleepWakeTime) {
        const [bh, bm] = d.sleepBedtime.split(':').map(Number)
        const [wh, wm] = d.sleepWakeTime.split(':').map(Number)
        const bed  = bh < 12 ? (bh + 24) * 60 + bm : bh * 60 + bm
        const wake = (wh < 12 ? wh + 24 : wh + 24) * 60 + wm
        const diff = (wake - bed) / 60
        if (diff > 0 && diff < 14) hrs.push(diff)
      }
    }
    return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0
  })()
  const dinnerDadWeek = weekDays.some(w => w.data?.dinnerWithDad)

  const gc = day.grade === 'S' ? s.gold : day.grade === 'A' ? s.green : day.grade === 'B' ? s.blue : day.grade === 'C' ? s.orange : s.red
  const wc = day.wl === 'W' ? s.green : day.wl === 'P' ? s.blue : s.red

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
        <Panel label="Today">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
            <div className="grade-big" style={{ fontFamily: f.display, fontSize: 140, fontWeight: 900, lineHeight: 1, color: gc, letterSpacing: '-0.05em' }}>{day.grade}</div>
            <div>
              <div className="score-big" style={{ fontFamily: f.mono, fontSize: 52, fontWeight: 700, color: s.text, lineHeight: 1 }}>{day.score}</div>
              <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.2em', marginTop: 8 }}>/ 100 DAILY SCORE</div>
              <div style={{ display: 'inline-block', marginTop: 14, padding: '6px 14px', background: wc, color: '#000', fontFamily: f.mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em' }}>
                {day.wl === 'W' ? 'WIN' : day.wl === 'P' ? 'PUSH' : 'LOSS'}
              </div>
            </div>
          </div>
          <div className="grid-3" style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${s.border}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <Stat label="Streak"   value={streak}    sub={streak === 1 ? 'day' : 'days'} color={streak > 0 ? s.gold : s.textDim} />
            <Stat label="Cat. Hit" value={`${day.categoriesHit}/4`} color={day.categoriesHit === 4 ? s.green : s.text} />
            <Stat label="Bonus"    value={`+${day.bonus || 0}`}     color={day.bonus > 0 ? s.gold : s.textDim} />
          </div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${s.border}` }}>
            {!day.closed
              ? <button onClick={closeDay} style={{ width: '100%', background: s.green, color: '#000', border: 'none', padding: '12px', fontFamily: f.mono, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.2em' }}>CLOSE DAY · LOCK IN THIS GRADE</button>
              : <div>
                  <div style={{ fontFamily: f.mono, fontSize: 10, color: s.green, letterSpacing: '0.2em', marginBottom: 8, textAlign: 'center' }}>✓ DAY CLOSED {day.closedAt ? '· ' + new Date(day.closedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</div>
                  <button onClick={reopenDay} style={{ width: '100%', background: 'transparent', color: s.textDim, border: `1px solid ${s.border}`, padding: '8px', fontFamily: f.mono, fontSize: 11, cursor: 'pointer', letterSpacing: '0.15em' }}>REOPEN TO EDIT</button>
                </div>
            }
          </div>
        </Panel>

        <Panel label="Category Breakdown">
          <div style={{ display: 'grid', gap: 8 }}>
            {CATEGORIES.map(c => {
              const sc  = day.categoryScores[c.id] || 0
              const hit = sc >= THRESHOLDS[c.id]
              return (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 36px', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.1em' }}>{c.name.toUpperCase()}</div>
                  <div style={{ height: 10, background: s.bg, position: 'relative', border: `1px solid ${s.border}` }}>
                    <div style={{ height: '100%', width: `${sc}%`, background: hit ? s.gold : s.textMuted, transition: 'width 0.3s' }} />
                    <div style={{ position: 'absolute', top: 0, left: `${THRESHOLDS[c.id]}%`, width: 2, height: '100%', background: s.textDim }} />
                  </div>
                  <div style={{ fontFamily: f.mono, fontSize: 12, fontWeight: 600, color: hit ? s.gold : s.textDim, textAlign: 'right' }}>{sc}</div>
                </div>
              )
            })}
          </div>
          {/* Bonus breakdown */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${s.border}` }}>
            <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8 }}>BONUS POOL</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {day.dinnerWithDad && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.gold }}>DWD +6</span>}
              {(day.contacts || []).length > 0 && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.gold }}>Contacts +{Math.min((day.contacts || []).reduce((t, c) => t + (c.quality === 'in-person' ? 3 : c.quality === 'call' ? 2 : 1), 0), 9)}</span>}
              {(day.social   || []).length > 0 && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.gold }}>Social +3</span>}
              {(day.homeTasks || []).length > 0 && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.gold }}>Home +{Math.min((day.homeTasks || []).length * 2, 4)}</span>}
              {(day.bonus || 0) === 0 && <span style={{ fontFamily: f.mono, fontSize: 11, color: s.textMuted }}>No bonuses yet</span>}
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${s.border}`, fontFamily: f.mono, fontSize: 9, color: s.textDim, letterSpacing: '0.1em' }}>GOLD = HIT · TICK = THRESHOLD · BEST 3/4 SCORED</div>
        </Panel>
      </div>

      <Panel label="This Week">
        <div className="grid-7" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 20 }}>
          {weekDays.map(w => {
            const isTodayCell  = w.iso === todayISO()
            const isFutureCell = isFuture(w.iso)
            const sc  = w.data?.score || 0
            const g   = w.data?.grade || '—'
            const col = !w.data ? s.textMuted : g === 'S' ? s.gold : g === 'A' ? s.green : g === 'B' ? s.blue : g === 'C' ? s.orange : s.red
            return (
              <div key={w.iso} onClick={() => { if (!isFutureCell && goToDate) goToDate(w.iso) }}
                style={{ border: `1px solid ${isTodayCell ? s.gold : s.border}`, padding: '10px 4px', textAlign: 'center', background: isTodayCell ? 'rgba(201,162,39,0.05)' : 'transparent', cursor: isFutureCell ? 'default' : 'pointer', opacity: isFutureCell ? 0.3 : 1 }}
                onMouseEnter={e => { if (!isFutureCell) e.currentTarget.style.background = 'rgba(201,162,39,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isTodayCell ? 'rgba(201,162,39,0.05)' : 'transparent' }}>
                <div style={{ fontFamily: f.mono, fontSize: 9, color: s.textDim, letterSpacing: '0.15em' }}>{w.day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div>
                <div style={{ fontFamily: f.display, fontSize: 26, fontWeight: 700, color: col, marginTop: 4, lineHeight: 1 }}>{g}</div>
                <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, marginTop: 2 }}>{w.data ? sc : '—'}</div>
              </div>
            )
          })}
        </div>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 16 }}>
          <Stat label="Miles Biked" value={`${weekCyclingMi.toFixed(1)}mi`} sub={`goal ${config.cyclingWeeklyGoal}`} color={weekCyclingMi >= config.cyclingWeeklyGoal ? s.green : s.text} />
          <Stat label="Cardio"      value={`${weekCardioMin}m`}  sub="this week" />
          <Stat label="Wallace Min" value={`${weekWallaceMin}m`} sub="this week" />
          <Stat label="Deep Work"   value={`${weekDeepWork.toFixed(1)}h`} sub="goal 28h" color={weekDeepWork >= 28 ? s.green : s.text} />
        </div>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <Stat label="Rec Visits" value={`${weekRecVisits}/7`} color={weekRecVisits >= 5 ? s.green : s.text} />
          <Stat label="Sleep Avg"  value={weekSleep ? `${weekSleep.toFixed(1)}h` : '—'} sub="per night" color={weekSleep >= 7 ? s.green : s.text} />
          <Stat label="DWD"        value={dinnerDadWeek ? '✓' : '—'} color={dinnerDadWeek ? s.green : s.red} />
          <Stat label="Week Rev"   value={`$${weekRevenue.toLocaleString()}`} color={s.gold} />
        </div>
      </Panel>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        <Panel label="Month to Date">
          <Stat label="Revenue MTD" value={`$${monthRevenue.toLocaleString()}`} sub={`target $${(config.inkMonthlyTarget + config.heartwestMonthlyTarget).toLocaleString()}`} big color={monthRevenue >= config.inkMonthlyTarget ? s.green : s.gold} />
          <div style={{ height: 8, background: s.bg, marginTop: 16, border: `1px solid ${s.border}` }}>
            <div style={{ height: '100%', width: `${Math.min(100, monthRevenue / (config.inkMonthlyTarget + config.heartwestMonthlyTarget) * 100)}%`, background: s.gold }} />
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${s.border}`, fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em' }}>
            WEEK REV: <span style={{ color: s.text }}>${weekRevenue.toLocaleString()}</span>
          </div>
        </Panel>
        <Panel label="Lifetime Counters">
          <div className="lifetime-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Stat label="Red Bulls"    value={lifetime.redBulls}              color={s.red} />
            <Stat label="Stretches"    value={lifetime.stretches}             color={s.gold} />
            <Stat label="Wallace Walks" value={lifetime.wallace}              color={s.green} />
            <Stat label="Wine"         value={lifetime.wine}                  color={s.textDim} />
            <Stat label="Beer"         value={lifetime.beer}                  color={s.textDim} />
            <Stat label="Whiskey"      value={lifetime.whiskey}               color={s.textDim} />
            <Stat label="Cocktails"    value={lifetime.cocktail}              color={s.textDim} />
            <Stat label="Books"        value={lifetime.books}                 color={s.blue} />
            <Stat label="Work Hrs"     value={lifetime.deepWorkHrs.toFixed(0)} color={s.gold} />
            <Stat label="Miles Biked"  value={lifetime.bikeMiles.toFixed(0)}  color={s.green} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ============================================================
// DEEP WORK TIMER
// ============================================================

function DeepWorkTimer({ day, setDay }) {
  const [running,   setRunning]   = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed,   setElapsed]   = useState(0)
  const tickRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('baseline:timerStart')
    if (saved) {
      const start = Number(saved)
      if (!isNaN(start)) { setRunning(true); setStartedAt(start); setElapsed(Math.floor((Date.now() - start) / 1000)) }
    }
  }, [])

  useEffect(() => {
    if (running && startedAt) {
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    } else if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [running, startedAt])

  const start = () => { const now = Date.now(); localStorage.setItem('baseline:timerStart', String(now)); setStartedAt(now); setElapsed(0); setRunning(true) }
  const stop  = () => { const minutes = Math.round(elapsed / 60); setDay({ ...day, deepWorkMinutes: day.deepWorkMinutes + minutes }); localStorage.removeItem('baseline:timerStart'); setRunning(false); setStartedAt(null); setElapsed(0) }
  const manualAdd = m => setDay({ ...day, deepWorkMinutes: Math.max(0, day.deepWorkMinutes + m) })

  const h = Math.floor(elapsed / 3600), m = Math.floor(elapsed % 3600 / 60), sec = elapsed % 60
  const totalHrs = (day.deepWorkMinutes / 60).toFixed(2)

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.2em', marginBottom: 4 }}>DEEP WORK TODAY</div>
        <div style={{ fontFamily: f.mono, fontSize: 32, fontWeight: 700, color: s.gold, lineHeight: 1 }}>{totalHrs}<span style={{ fontSize: 16, color: s.textDim }}>h</span></div>
      </div>
      <div style={{ fontFamily: f.mono, fontSize: 24, color: running ? s.green : s.textMuted, minWidth: 110 }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(sec).padStart(2,'0')}</div>
      {!running
        ? <button onClick={start} style={{ background: s.green, color: '#000', border: 'none', padding: '10px 22px', fontFamily: f.mono, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.15em' }}>START</button>
        : <button onClick={stop}  style={{ background: s.red,   color: '#000', border: 'none', padding: '10px 18px', fontFamily: f.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.15em' }}>STOP · LOG {Math.round(elapsed / 60)}m</button>
      }
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
        {[15, 30, 60].map(n => <button key={n} onClick={() => manualAdd(n)}   style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: s.text, padding: '6px 10px', fontFamily: f.mono, fontSize: 11, cursor: 'pointer' }}>+{n}m</button>)}
        <button onClick={() => manualAdd(-15)} style={{ background: s.panelRaised, border: `1px solid ${s.border}`, color: s.text, padding: '6px 10px', fontFamily: f.mono, fontSize: 11, cursor: 'pointer' }}>−15</button>
      </div>
    </div>
  )
}

// ============================================================
// LOG
// ============================================================

function LogView({ day, setDay, config }) {
  const upd      = p => setDay({ ...day, ...p })
  const updMeals = (k, v) => upd({ meals: { ...day.meals, [k]: v } })

  const [newContact, setNewContact] = useState('')
  const [newContactQ, setNewContactQ] = useState('text')
  const [newRead,    setNewRead]    = useState({ what: '', minutes: 20 })
  const [newRev,     setNewRev]     = useState({ company: COMPANIES[0], amount: '' })
  const [newCust,    setNewCust]    = useState({ company: COMPANIES[0], count: 1 })
  const [newRide,    setNewRide]    = useState({ type: 'MTB', miles: '', minutes: '', hrAvg: '', hrMax: '', elevation: '' })
  const [newGolf,    setNewGolf]    = useState({ holes: 18, score: '', walked: false, drinks: 0, company: 'Friends', networking: false, quality: 'fun' })
  const [newOut,     setNewOut]     = useState({ type: 'Walk', otherName: '', minutes: 30 })
  const [newIndoor,  setNewIndoor]  = useState({ type: 'Basketball', otherName: '', minutes: 30 })
  const [newProj,    setNewProj]    = useState({ name: PROJECTS[0], minutes: 30 })
  const [newGamble,  setNewGamble]  = useState({ type: 'Blackjack', pnl: 0 })
  const [newSocial,  setNewSocial]  = useState({ type: '', minutes: 60 })
  const [newTask,    setNewTask]    = useState('')

  const addContact = () => { if (!newContact.trim()) return; upd({ contacts: [...day.contacts, { name: newContact.trim(), quality: newContactQ }] }); setNewContact('') }
  const addReading = () => { upd({ reading: [...day.reading, { what: newRead.what.trim() || 'Reading session', minutes: newRead.minutes }] }); setNewRead({ what: '', minutes: 20 }) }
  const addRev     = () => { if (!newRev.amount) return; upd({ revenue: [...day.revenue, { ...newRev, amount: Number(newRev.amount) }] }); setNewRev({ company: COMPANIES[0], amount: '' }) }
  const addCust    = () => { upd({ customers: [...day.customers, { ...newCust }] }); setNewCust({ company: COMPANIES[0], count: 1 }) }
  const addRide    = () => { if (!newRide.miles) return; upd({ cycling: [...day.cycling, { ...newRide, miles: Number(newRide.miles), minutes: Number(newRide.minutes || 0), hrAvg: Number(newRide.hrAvg || 0), hrMax: Number(newRide.hrMax || 0), elevation: Number(newRide.elevation || 0) }] }); setNewRide({ type: 'MTB', miles: '', minutes: '', hrAvg: '', hrMax: '', elevation: '' }) }
  const addGolf    = () => { upd({ golf: [...day.golf, { ...newGolf }] }); setNewGolf({ holes: 18, score: '', walked: false, drinks: 0, company: 'Friends', networking: false, quality: 'fun' }) }
  const addOut     = () => { const type = newOut.type === 'Other' ? newOut.otherName.trim() || 'Other' : newOut.type; upd({ outdoor: [...day.outdoor, { type, minutes: newOut.minutes }] }); setNewOut({ type: 'Walk', otherName: '', minutes: 30 }) }
  const addIndoor  = () => { const type = newIndoor.type === 'Other' ? newIndoor.otherName.trim() || 'Other' : newIndoor.type; upd({ indoor: [...(day.indoor || []), { type, minutes: newIndoor.minutes }] }); setNewIndoor({ type: 'Basketball', otherName: '', minutes: 30 }) }
  const addProj    = () => { upd({ projects: [...day.projects, { name: newProj.name, minutes: newProj.minutes }] }); setNewProj({ name: PROJECTS[0], minutes: 30 }) }
  const addGamble  = () => { upd({ gambling: [...day.gambling, { type: newGamble.type, pnl: Number(newGamble.pnl) }] }); setNewGamble({ type: 'Blackjack', pnl: 0 }) }
  const addSocial  = () => { if (!newSocial.type.trim()) return; upd({ social: [...(day.social || []), { type: newSocial.type.trim(), minutes: newSocial.minutes }] }); setNewSocial({ type: '', minutes: 60 }) }
  const addTask    = () => { if (!newTask.trim()) return; upd({ homeTasks: [...day.homeTasks, { task: newTask.trim() }] }); setNewTask('') }
  const rm = (k, i) => upd({ [k]: day[k].filter((_, idx) => idx !== i) })

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Toggle label="Morning Stretch (15 min)" value={day.stretched} onChange={v => upd({ stretched: v })} big />
      <Toggle label="Vacation Mode — relaxed grading curve" value={day.vacationMode} onChange={v => upd({ vacationMode: v })} />

      <Panel label="Health · Hydration & Vices">
        <div style={{ display: 'grid', gap: 18 }}>
          <Slider label="Water" value={day.waterOz} onChange={v => upd({ waterOz: v })} max={config.waterGoal * 2} unit="oz" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <NumberInput label={`Red Bulls (cap ${config.redBullCap})`} value={day.redBulls} onChange={v => upd({ redBulls: v })} />
            {DRINK_TYPES.map(t => <NumberInput key={t} label={t} value={day.drinks[t]} onChange={v => upd({ drinks: { ...day.drinks, [t]: v } })} />)}
          </div>
        </div>
      </Panel>

      <Panel label="Health · Nutrition">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 4 }}>
          <CheckRow label="Salad"            checked={day.meals.salad}       onChange={v => updMeals('salad', v)} />
          <CheckRow label="Healthy Meal"     checked={day.meals.healthy}     onChange={v => updMeals('healthy', v)} />
          <CheckRow label="Smoothie"         checked={day.meals.smoothie}    onChange={v => updMeals('smoothie', v)} />
          <CheckRow label="Flexible Meal"    checked={day.meals.flexible}    onChange={v => updMeals('flexible', v)} />
          <CheckRow label="Cooked From Scratch" checked={day.meals.fromScratch} onChange={v => updMeals('fromScratch', v)} />
          <CheckRow label="Fast Food (penalty)" checked={day.meals.fastFood}  onChange={v => updMeals('fastFood', v)} />
        </div>
      </Panel>

      <Panel label="Health · Body & Recovery">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Toggle label="Rec Center"       value={day.recCenter}        onChange={v => upd({ recCenter: v })} />
          <Toggle label="Substitute Cardio" value={day.substituteCardio} onChange={v => upd({ substituteCardio: v })} />
          <NumberInput label="Cardio"   value={day.cardioMin}  onChange={v => upd({ cardioMin: v })}  unit="min" step={5} />
          <NumberInput label="Sauna"    value={day.saunaMin}   onChange={v => upd({ saunaMin: v })}   unit="min" step={5} />
          <NumberInput label="Hot Tub"  value={day.hotTubMin}  onChange={v => upd({ hotTubMin: v })}  unit="min" step={5} />
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 6 }}>BEDTIME</div>
            <input type="time" value={day.sleepBedtime}  onChange={e => upd({ sleepBedtime: e.target.value })}  style={inp} />
          </div>
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 6 }}>WAKE TIME</div>
            <input type="time" value={day.sleepWakeTime} onChange={e => upd({ sleepWakeTime: e.target.value })} style={inp} />
          </div>
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 6 }}>WEIGHT (LB)</div>
            <input type="number" inputMode="decimal" value={day.weight || ''} onChange={e => upd({ weight: e.target.value ? Number(e.target.value) : null })} style={{ ...inp, width: 100 }} />
          </div>
        </div>
      </Panel>

      <Panel label="Business · Deep Work + Revenue">
        <DeepWorkTimer day={day} setDay={setDay} />
        <div className="grid-2" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 10 }}>REVENUE TODAY</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <select value={newRev.company} onChange={e => setNewRev({ ...newRev, company: e.target.value })} style={inp}>{COMPANIES.map(c => <option key={c}>{c}</option>)}</select>
              <input type="number" inputMode="decimal" placeholder="$" value={newRev.amount} onChange={e => setNewRev({ ...newRev, amount: e.target.value })} style={{ ...inp, width: 100 }} />
              <button onClick={addRev} style={btnGold}>ADD</button>
            </div>
            {day.revenue.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
                <span>{r.company}</span><span style={{ color: s.gold }}>${Number(r.amount).toLocaleString()}</span>
                <button onClick={() => rm('revenue', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 10 }}>CUSTOMERS ACQUIRED</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <select value={newCust.company} onChange={e => setNewCust({ ...newCust, company: e.target.value })} style={inp}>{COMPANIES.map(c => <option key={c}>{c}</option>)}</select>
              <input type="number" inputMode="numeric" value={newCust.count} onChange={e => setNewCust({ ...newCust, count: Number(e.target.value) })} style={{ ...inp, width: 70 }} />
              <button onClick={addCust} style={btnGold}>ADD</button>
            </div>
            {day.customers.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
                <span>{c.company}</span><span style={{ color: s.gold }}>{c.count}</span>
                <button onClick={() => rm('customers', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="Movement · Cycling">
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={newRide.type} onChange={e => setNewRide({ ...newRide, type: e.target.value })} style={inp}><option>MTB</option><option>Gravel</option><option>Road</option></select>
          <input type="number" inputMode="decimal" placeholder="miles"   value={newRide.miles}     onChange={e => setNewRide({ ...newRide, miles:     e.target.value })} style={{ ...inp, width: 80 }} />
          <input type="number" inputMode="numeric" placeholder="min"     value={newRide.minutes}   onChange={e => setNewRide({ ...newRide, minutes:   e.target.value })} style={{ ...inp, width: 70 }} />
          <input type="number" inputMode="numeric" placeholder="HR avg"  value={newRide.hrAvg}     onChange={e => setNewRide({ ...newRide, hrAvg:     e.target.value })} style={{ ...inp, width: 80 }} />
          <input type="number" inputMode="numeric" placeholder="HR max"  value={newRide.hrMax}     onChange={e => setNewRide({ ...newRide, hrMax:     e.target.value })} style={{ ...inp, width: 80 }} />
          <input type="number" inputMode="numeric" placeholder="elev ft" value={newRide.elevation} onChange={e => setNewRide({ ...newRide, elevation: e.target.value })} style={{ ...inp, width: 80 }} />
          <button onClick={addRide} style={btnGold}>ADD RIDE</button>
        </div>
        {day.cycling.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12, flexWrap: 'wrap' }}>
            <span style={{ color: s.gold }}>{r.type}</span><span>{r.miles} mi</span><span>{r.minutes} min</span>
            {r.hrAvg > 0 && <span style={{ color: s.textDim }}>HR {r.hrAvg}/{r.hrMax}</span>}
            {r.elevation > 0 && <span style={{ color: s.textDim }}>{r.elevation}ft</span>}
            <button onClick={() => rm('cycling', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
      </Panel>

      <Panel label="Movement · Golf (post-round)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
          {[
            ['HOLES',       <select value={newGolf.holes}   onChange={e => setNewGolf({ ...newGolf, holes: Number(e.target.value) })} style={{ ...inp, width: '100%' }}><option value={9}>9</option><option value={18}>18</option><option value={27}>27</option><option value={36}>36</option></select>],
            ['SCORE',       <input type="number" value={newGolf.score}  onChange={e => setNewGolf({ ...newGolf, score: e.target.value })} style={{ ...inp, width: '100%' }} />],
            ['DRINKS',      <input type="number" value={newGolf.drinks} onChange={e => setNewGolf({ ...newGolf, drinks: Number(e.target.value) })} style={{ ...inp, width: '100%' }} />],
            ['PLAYED WITH', <select value={newGolf.company} onChange={e => setNewGolf({ ...newGolf, company: e.target.value })} style={{ ...inp, width: '100%' }}>{GOLF_COMPANY.map(c => <option key={c}>{c}</option>)}</select>],
            ['QUALITY',     <select value={newGolf.quality} onChange={e => setNewGolf({ ...newGolf, quality: e.target.value })} style={{ ...inp, width: '100%' }}><option value="fun">Fun</option><option value="productive">Productive</option><option value="both">Both</option><option value="meh">Meh</option></select>],
          ].map(([lbl, el]) => (
            <div key={lbl}>
              <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, letterSpacing: '0.15em', marginBottom: 4 }}>{lbl}</div>
              {el}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <CheckRow label="Walked"     checked={newGolf.walked}     onChange={v => setNewGolf({ ...newGolf, walked: v })} />
          <CheckRow label="Networking" checked={newGolf.networking} onChange={v => setNewGolf({ ...newGolf, networking: v })} />
          <button onClick={addGolf} style={{ ...btnGold, marginLeft: 'auto', padding: '10px 18px' }}>LOG ROUND</button>
        </div>
        {day.golf.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12, flexWrap: 'wrap' }}>
            <span style={{ color: s.gold }}>{r.holes}h</span>
            {r.score && <span>Score: {r.score}</span>}
            <span>{r.walked ? 'Walked' : 'Cart'}</span><span>{r.drinks} 🍺</span><span>{r.company}</span>
            {r.networking && <span style={{ color: s.green }}>NET</span>}
            <button onClick={() => rm('golf', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
      </Panel>

      <Panel label="Movement · Wallace, Outdoors, Indoor, Projects, Gambling">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <NumberInput label="Wallace Walks"   value={day.wallaceWalks}   onChange={v => upd({ wallaceWalks: v })} />
          <NumberInput label="Wallace Minutes" value={day.wallaceMinutes} onChange={v => upd({ wallaceMinutes: v })} unit="min" step={5} />
        </div>

        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8, marginTop: 16 }}>OUTDOOR ACTIVITY</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={newOut.type} onChange={e => setNewOut({ ...newOut, type: e.target.value })} style={inp}><option>Walk</option><option>Paddleboard</option><option>Fishing</option><option>Hiking</option><option>Ski</option><option>Other</option></select>
          {newOut.type === 'Other' && <input type="text" placeholder="what activity?" value={newOut.otherName} onChange={e => setNewOut({ ...newOut, otherName: e.target.value })} style={{ ...inp, flex: 1, minWidth: 140 }} />}
          <input type="number" inputMode="numeric" value={newOut.minutes} onChange={e => setNewOut({ ...newOut, minutes: Number(e.target.value) })} style={{ ...inp, width: 80 }} />
          <span style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, alignSelf: 'center' }}>min</span>
          <button onClick={addOut} style={btnGold}>ADD</button>
        </div>
        {day.outdoor.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.green }}>{o.type}</span><span>{o.minutes} min</span>
            <button onClick={() => rm('outdoor', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}

        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8, marginTop: 16 }}>INDOOR ACTIVITY</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={newIndoor.type} onChange={e => setNewIndoor({ ...newIndoor, type: e.target.value })} style={inp}><option>Basketball</option><option>Pickleball</option><option>Racquetball</option><option>Yoga</option><option>Weights</option><option>Swim</option><option>Climbing</option><option>Other</option></select>
          {newIndoor.type === 'Other' && <input type="text" placeholder="what activity?" value={newIndoor.otherName} onChange={e => setNewIndoor({ ...newIndoor, otherName: e.target.value })} style={{ ...inp, flex: 1, minWidth: 140 }} />}
          <input type="number" inputMode="numeric" value={newIndoor.minutes} onChange={e => setNewIndoor({ ...newIndoor, minutes: Number(e.target.value) })} style={{ ...inp, width: 80 }} />
          <span style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, alignSelf: 'center' }}>min</span>
          <button onClick={addIndoor} style={btnGold}>ADD</button>
        </div>
        {(day.indoor || []).map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.blue }}>{o.type}</span><span>{o.minutes} min</span>
            <button onClick={() => rm('indoor', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}

        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8, marginTop: 16 }}>PERSONAL PROJECT</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} style={inp}>{PROJECTS.map(p => <option key={p}>{p}</option>)}</select>
          <input type="number" inputMode="numeric" placeholder="min" value={newProj.minutes} onChange={e => setNewProj({ ...newProj, minutes: Number(e.target.value) })} style={{ ...inp, width: 100 }} />
          <button onClick={addProj} style={btnGold}>ADD</button>
        </div>
        {day.projects.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.gold }}>{p.name}</span><span>{p.minutes} min</span>
            <button onClick={() => rm('projects', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}

        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8, marginTop: 16 }}>GAMBLING</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={newGamble.type} onChange={e => setNewGamble({ ...newGamble, type: e.target.value })} style={inp}><option>Blackjack</option><option>Roulette</option><option>Sports Bet</option><option>Poker</option><option>Other</option></select>
          <input type="number" inputMode="decimal" placeholder="net $" value={newGamble.pnl} onChange={e => setNewGamble({ ...newGamble, pnl: e.target.value })} style={{ ...inp, width: 120 }} />
          <button onClick={addGamble} style={btnGold}>ADD</button>
        </div>
        {day.gambling.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span>{g.type}</span><span style={{ color: Number(g.pnl) > 0 ? s.green : Number(g.pnl) < 0 ? s.red : s.textDim }}>{Number(g.pnl) > 0 ? '+' : ''}${Number(g.pnl).toLocaleString()}</span>
            <button onClick={() => rm('gambling', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
      </Panel>

      <Panel label="People · Bonus Category">
        <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, marginBottom: 12, lineHeight: 1.6 }}>People adds bonus points on top of your scored categories. DWD +6, in-person +3 each, call +2, text +1, social +3. Max +15 total.</div>
        <div style={{ marginBottom: 16 }}>
          <Toggle label="DWD — Dinner With Dad" value={day.dinnerWithDad} onChange={v => upd({ dinnerWithDad: v })} />
        </div>
        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8 }}>ADD CONTACT</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Name" value={newContact} onChange={e => setNewContact(e.target.value)} onKeyDown={e => e.key === 'Enter' && addContact()} style={{ ...inp, flex: 1, minWidth: 140 }} />
          <select value={newContactQ} onChange={e => setNewContactQ(e.target.value)} style={inp}>
            <option value="text">Text / DM</option><option value="call">Call</option><option value="in-person">In-person</option>
          </select>
          <button onClick={addContact} style={btnGold}>ADD</button>
        </div>
        {day.contacts.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.gold }}>{c.name}</span><span style={{ color: s.textDim }}>{c.quality}</span>
            <button onClick={() => rm('contacts', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8, marginTop: 16 }}>SOCIAL ACTIVITY</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="e.g. Dinner with friends" value={newSocial.type} onChange={e => setNewSocial({ ...newSocial, type: e.target.value })} onKeyDown={e => e.key === 'Enter' && addSocial()} style={{ ...inp, flex: 1, minWidth: 180 }} />
          <input type="number" inputMode="numeric" placeholder="min" value={newSocial.minutes} onChange={e => setNewSocial({ ...newSocial, minutes: Number(e.target.value) })} style={{ ...inp, width: 80 }} />
          <button onClick={addSocial} style={btnGold}>ADD</button>
        </div>
        {(day.social || []).map((sa, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.gold }}>{sa.type}</span><span>{sa.minutes} min</span>
            <button onClick={() => rm('social', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
      </Panel>

      <Panel label="Mind · Reading & Recovery">
        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, letterSpacing: '0.15em', marginBottom: 8 }}>READING SESSION</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="What did you read? (optional)" value={newRead.what} onChange={e => setNewRead({ ...newRead, what: e.target.value })} onKeyDown={e => e.key === 'Enter' && addReading()} style={{ ...inp, flex: 1, minWidth: 160 }} />
          <input type="number" inputMode="numeric" placeholder="min" value={newRead.minutes} onChange={e => setNewRead({ ...newRead, minutes: Number(e.target.value) })} style={{ ...inp, width: 70 }} />
          <button onClick={addReading} style={btnGold}>ADD</button>
        </div>
        {day.reading.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span style={{ color: s.blue }}>{r.what}</span><span>{r.minutes} min</span>
            <button onClick={() => rm('reading', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginTop: 16 }}>
          <NumberInput label="Books Finished Today" value={day.booksFinished} onChange={v => upd({ booksFinished: v })} />
          <NumberInput label="Meditation" value={day.meditation}    onChange={v => upd({ meditation: v })}    unit="min" step={5} />
          <NumberInput label="Nature Time" value={day.natureMinutes} onChange={v => upd({ natureMinutes: v })} unit="min" step={10} />
        </div>
      </Panel>

      <Panel label="Home · Bonus Tasks">
        <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, marginBottom: 12 }}>Dishes / bed / laundry assumed habitual — bonus for bigger tasks. Each task adds +2 pts (max +4).</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Task completed" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} style={{ ...inp, flex: 1, minWidth: 160 }} />
          <button onClick={addTask} style={btnGold}>ADD</button>
        </div>
        {day.homeTasks.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 4, fontFamily: f.mono, fontSize: 12 }}>
            <span>{t.task}</span>
            <button onClick={() => rm('homeTasks', i)} style={{ background: 'none', border: 'none', color: s.textDim, cursor: 'pointer', marginLeft: 'auto', fontSize: 16 }}>×</button>
          </div>
        ))}
      </Panel>

      <Panel label="Journal">
        <div style={{ fontFamily: f.mono, fontSize: 10, color: s.textDim, marginBottom: 12, lineHeight: 1.5 }}>Freeform notes for the day — wins, reflections, things to remember. Saves automatically.</div>
        <textarea value={day.journal || ''} onChange={e => upd({ journal: e.target.value })} placeholder="What happened today? What's on your mind?" style={{ ...inp, width: '100%', minHeight: 160, fontFamily: f.mono, fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
      </Panel>
    </div>
  )
}

// ============================================================
// WEEK
// ============================================================

function WeekView({ allDays, config }) {
  const t = new Date(), dow = t.getDay()
  const mon = new Date(t); mon.setDate(t.getDate() - (dow + 6) % 7)
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    weekDays.push({ iso, day: d, data: allDays.find(x => x.date === iso) })
  }
  const logged = weekDays.filter(w => w.data)
  const avg    = logged.length ? Math.round(logged.reduce((t, w) => t + w.data.score, 0) / logged.length) : 0
  const wins   = logged.filter(w => w.data.wl === 'W').length
  const losses = logged.filter(w => w.data.wl === 'L').length
  const pushes = logged.filter(w => w.data.wl === 'P').length
  const rev    = logged.reduce((t, w) => t + (w.data.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0)
  const cust   = logged.reduce((t, w) => t + (w.data.customers?.reduce((s, c) => s + Number(c.count || 0), 0) || 0), 0)
  const cyc    = logged.reduce((a, w) => { for (const r of w.data.cycling || []) a.miles += Number(r.miles) || 0; return a }, { miles: 0 })
  const dw     = logged.reduce((t, w) => t + (w.data.deepWorkMinutes || 0) / 60, 0)
  const stretches  = logged.filter(w => w.data.stretched).length
  const waterAvg   = logged.length ? Math.round(logged.reduce((t, w) => t + (w.data.waterOz || 0), 0) / logged.length) : 0
  const rb         = logged.reduce((t, w) => t + (w.data.redBulls || 0), 0)
  const drinks     = logged.reduce((t, w) => t + Object.values(w.data.drinks || {}).reduce((s, v) => s + v, 0), 0)
  const sau        = logged.reduce((t, w) => t + (w.data.saunaMin || 0), 0)
  const ht         = logged.reduce((t, w) => t + (w.data.hotTubMin || 0), 0)
  const cardio     = logged.reduce((t, w) => t + (w.data.cardioMin || 0), 0)
  const wallaceMin = logged.reduce((t, w) => t + (w.data.wallaceMinutes || 0), 0)
  const recVisits  = logged.filter(w => w.data.recCenter).length
  const readMin    = logged.reduce((t, w) => t + (w.data.reading?.reduce((s, r) => s + Number(r.minutes || 0), 0) || 0), 0)
  const holes      = logged.reduce((t, w) => t + (w.data.golf?.reduce((s, g) => s + g.holes, 0) || 0), 0)
  const dad        = weekDays.some(w => w.data?.dinnerWithDad)
  const sleepHrs   = (() => {
    const hrs = []
    for (const w of logged) {
      const d = w.data
      if (d?.sleepBedtime && d?.sleepWakeTime) {
        const [bh, bm] = d.sleepBedtime.split(':').map(Number)
        const [wh, wm] = d.sleepWakeTime.split(':').map(Number)
        const bed  = bh < 12 ? (bh + 24) * 60 + bm : bh * 60 + bm
        const wake = (wh < 12 ? wh + 24 : wh + 24) * 60 + wm
        const diff = (wake - bed) / 60
        if (diff > 0 && diff < 14) hrs.push(diff)
      }
    }
    return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0
  })()

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Panel label="Week Scorecard">
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <Stat label="Avg Score"   value={avg}                     big color={avg >= 85 ? s.green : avg >= 70 ? s.blue : s.red} />
          <Stat label="W / P / L"   value={`${wins}-${pushes}-${losses}`} big color={wins > losses ? s.green : s.red} />
          <Stat label="Days Logged" value={`${logged.length}/7`}    big />
          <Stat label="DWD"         value={dad ? '✓' : 'MISSING'}   big color={dad ? s.green : s.red} />
        </div>
      </Panel>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <Panel label="Health Week">
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Stat label="Stretches" value={`${stretches}/7`}    color={stretches >= 5 ? s.green : s.red} />
            <Stat label="Avg Water" value={`${waterAvg} oz`}    color={waterAvg >= config.waterGoal ? s.green : s.red} />
            <Stat label="Red Bulls" value={rb}                   color={rb <= 14 ? s.green : s.red} />
            <Stat label="Drinks"    value={drinks} />
            <Stat label="Sauna"     value={`${sau}m`}   sub="goal 50" color={sau >= 50 ? s.green : s.text} />
            <Stat label="Hot Tub"   value={`${ht}m`}    sub="goal 50" color={ht  >= 50 ? s.green : s.text} />
            <Stat label="Sleep Avg" value={sleepHrs ? `${sleepHrs.toFixed(1)}h` : '—'} sub="per night" color={sleepHrs >= 7 ? s.green : s.text} />
            <Stat label="Rec Visits" value={`${recVisits}/7`}   color={recVisits >= 5 ? s.green : s.text} />
            <Stat label="Cardio"    value={`${cardio}m`} />
          </div>
        </Panel>
        <Panel label="Business Week">
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Stat label="Revenue"   value={`$${rev.toLocaleString()}`}  color={s.gold} />
            <Stat label="New Cust." value={cust}                         color={s.gold} />
            <Stat label="Deep Work" value={`${dw.toFixed(1)}h`} sub="goal 28h" color={dw >= 28 ? s.green : s.red} />
            <Stat label="Avg / Day" value={`${(dw / 7).toFixed(1)}h`}  sub="goal 4h" />
          </div>
        </Panel>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <Panel label="Movement Week">
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Stat label="Miles Biked"  value={cyc.miles.toFixed(1)} sub={`goal ${config.cyclingWeeklyGoal}`} color={cyc.miles >= config.cyclingWeeklyGoal ? s.green : s.red} />
            <Stat label="Wallace Min"  value={`${wallaceMin}m`}     color={s.green} />
            <Stat label="Holes"        value={holes}                sub="max 54"  color={holes > 54 ? s.red : s.green} />
            <Stat label="Cardio"       value={`${cardio}m`} />
          </div>
        </Panel>
        <Panel label="Mind Week">
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Stat label="Reading Min"  value={readMin} sub="goal 150" color={readMin >= 150 ? s.green : s.text} />
            <Stat label="Reading Days" value={logged.filter(w => (w.data.reading?.length || 0) > 0).length} sub="goal 5" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ============================================================
// TRENDS
// ============================================================

function TrendsView({ allDays, config }) {
  const last30 = useMemo(() => {
    const o = []
    for (let i = 29; i >= 0; i--) {
      const iso = daysAgo(i)
      const d   = allDays.find(x => x.date === iso)
      o.push({ date: iso.slice(5), score: d?.score || 0, weight: d?.weight || null, deepWork: d ? d.deepWorkMinutes / 60 : 0 })
    }
    return o
  }, [allDays])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Panel label="30-Day Score Trend">
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <AreaChart data={last30}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor={s.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={s.gold} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="2 4" stroke={s.border} />
              <XAxis dataKey="date" stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
              <YAxis domain={[0, 100]} stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
              <Tooltip contentStyle={{ background: s.panel, border: `1px solid ${s.border}`, fontFamily: f.mono, fontSize: 12 }} />
              <Area type="monotone" dataKey="score" stroke={s.gold} strokeWidth={2} fill="url(#sg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <Panel label={`Weight Trend (goal ${config.weightGoal} lb)`}>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={last30.filter(d => d.weight)}>
                <CartesianGrid strokeDasharray="2 4" stroke={s.border} />
                <XAxis dataKey="date" stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
                <Tooltip contentStyle={{ background: s.panel, border: `1px solid ${s.border}`, fontFamily: f.mono, fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke={s.green} strokeWidth={2} dot={{ fill: s.green, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel label="Deep Work Hours (30d)">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={last30}>
                <CartesianGrid strokeDasharray="2 4" stroke={s.border} />
                <XAxis dataKey="date" stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
                <YAxis stroke={s.textDim} tick={{ fill: s.textDim, fontSize: 10, fontFamily: f.mono }} />
                <Tooltip contentStyle={{ background: s.panel, border: `1px solid ${s.border}`, fontFamily: f.mono, fontSize: 12 }} />
                <Line type="monotone" dataKey="deepWork" stroke={s.gold} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ============================================================
// CONFIG
// ============================================================

function ConfigView({ config, setConfig }) {
  const upd = (k, v) => setConfig({ ...config, [k]: v })
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)

  const doExport = () => {
    const blob = new Blob([STORAGE.exportAll()], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `baseline-backup-${todayISO()}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  const doImport = () => { try { STORAGE.importAll(importText); alert('Imported. Refresh to see data.') } catch (e) { alert('Import failed: ' + e.message) } }
  const nuke = () => {
    if (!confirm('Delete ALL Baseline data? This cannot be undone.')) return
    const keys = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('baseline:')) keys.push(k) }
    for (const k of keys) localStorage.removeItem(k)
    alert('Wiped. Refresh.')
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Panel label="Day Handling">
        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, marginBottom: 14, lineHeight: 1.6 }}>Your "day" ends at this hour, not at midnight. Default: 4 AM.</div>
        <NumberInput label="Day Rollover Hour (0-23)" value={config.rolloverHour} onChange={v => upd('rolloverHour', Math.max(0, Math.min(23, v)))} unit=":00" />
      </Panel>
      <Panel label="Configuration">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <NumberInput label="Ink Imprints Monthly Target"  value={config.inkMonthlyTarget}       onChange={v => upd('inkMonthlyTarget', v)}       unit="$"   step={500} />
          <NumberInput label="HeartWest Monthly Target"     value={config.heartwestMonthlyTarget}  onChange={v => upd('heartwestMonthlyTarget', v)}  unit="$"   step={500} />
          <NumberInput label="Weight Goal"                  value={config.weightGoal}              onChange={v => upd('weightGoal', v)}              unit="lb" />
          <NumberInput label="Cycling Weekly Goal"          value={config.cyclingWeeklyGoal}       onChange={v => upd('cyclingWeeklyGoal', v)}       unit="mi" />
          <NumberInput label="Deep Work Daily Goal"         value={config.deepWorkDailyGoal}       onChange={v => upd('deepWorkDailyGoal', v)}       unit="min" step={15} />
          <NumberInput label="Water Daily Goal"             value={config.waterGoal}               onChange={v => upd('waterGoal', v)}               unit="oz"  step={4} />
          <NumberInput label="Red Bull Daily Cap"           value={config.redBullCap}              onChange={v => upd('redBullCap', v)} />
        </div>
      </Panel>
      <Panel label="Data — Backup & Restore">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={doExport}                      style={btnGold}>EXPORT BACKUP (.json)</button>
          <button onClick={() => setShowImport(!showImport)} style={{ ...btnGold, background: s.panelRaised, color: s.text, border: `1px solid ${s.border}` }}>IMPORT</button>
          <button onClick={nuke}                          style={{ ...btnGold, background: s.red }}>WIPE ALL DATA</button>
        </div>
        {showImport && (
          <div style={{ marginTop: 14 }}>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste exported JSON here..." style={{ ...inp, width: '100%', minHeight: 120, fontFamily: f.mono, fontSize: 11 }} />
            <button onClick={doImport} style={{ ...btnGold, marginTop: 8 }}>IMPORT DATA</button>
          </div>
        )}
      </Panel>
      <Panel label="About">
        <div style={{ fontFamily: f.mono, fontSize: 11, color: s.textDim, lineHeight: 1.8 }}>
          BASELINE V2 · SCORING ENGINE REBUILT<br />
          4 CATEGORIES: HEALTH · MOVEMENT · BUSINESS · MIND<br />
          BEST 3/4 SCORED · PEOPLE + HOME = BONUS POOL<br />
          B = BASICS COVERED · A = SOLID DAY · S = ELITE
        </div>
      </Panel>
    </div>
  )
}

// ============================================================
// ROOT
// ============================================================

function Baseline() {
  const [tab,      setTab]      = useState('Today')
  const [viewDate, setViewDate] = useState(todayISO())
  const [day,      setDay]      = useState(emptyDay())
  const [allDays,  setAllDays]  = useState([])
  const [config,   setConfig]   = useState({
    inkMonthlyTarget: 10000, heartwestMonthlyTarget: 10000,
    weightGoal: 145, cyclingWeeklyGoal: 35,
    deepWorkDailyGoal: 240, waterGoal: 48, redBullCap: 3, rolloverHour: 4,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      const today  = todayISO()
      if (userId) {
        const { data: remoteDays } = await supabase.from('days').select('data').eq('user_id', userId)
        if (remoteDays?.length > 0) {
          for (const row of remoteDays) {
            if (row.data?.date) localStorage.setItem(`baseline:day:${row.data.date}`, JSON.stringify(row.data))
          }
        }
        const { data: remoteConfig } = await supabase.from('config').select('data').eq('user_id', userId).single()
        if (remoteConfig?.data) localStorage.setItem('baseline:config', JSON.stringify(remoteConfig.data))
      }
      const cfg      = STORAGE.getConfig()
      const existing = STORAGE.getDay(today)
      setConfig(cfg)
      setViewDate(today)
      setAllDays(STORAGE.listDays())
      setDay(computeDay(existing || emptyDay(today)))
      setLoaded(true)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!loaded) return
    const existing = STORAGE.getDay(viewDate)
    setDay(computeDay(existing || emptyDay(viewDate)))
  }, [viewDate])

  useEffect(() => {
    if (!loaded) return
    if (day.date !== viewDate) return
    const computed = computeDay(day)
    if (computed.score !== day.score || computed.grade !== day.grade || JSON.stringify(computed.categoryScores) !== JSON.stringify(day.categoryScores)) {
      setDay(computed); return
    }
    STORAGE.saveDay(computed)
    setAllDays(STORAGE.listDays())
  }, [day, loaded])

  useEffect(() => {
    if (!loaded) return
    STORAGE.saveConfig(config)
  }, [config, loaded])

  useEffect(() => {
    if (!loaded) return
    const check = setInterval(() => {
      const newToday = todayISO()
      if (viewDate !== newToday && !day.closed) {
        if (viewDate === addDays(newToday, -1)) { /* no force-switch */ }
      }
    }, 60000)
    return () => clearInterval(check)
  }, [loaded, viewDate, day.closed])

  const goToDate  = iso => { if (isFuture(iso)) return; setViewDate(iso); setTab('Log') }
  const goToToday = ()  => setViewDate(todayISO())
  const prevDay   = ()  => setViewDate(addDays(viewDate, -1))
  const nextDay   = ()  => { const n = addDays(viewDate, 1); if (!isFuture(n)) setViewDate(n) }
  const closeDay  = ()  => setDay({ ...day, closed: true,  closedAt: new Date().toISOString() })
  const reopenDay = ()  => setDay({ ...day, closed: false, closedAt: null })

  if (!loaded) return <div style={{ minHeight: '100vh', background: s.bg, color: s.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: f.mono }}>LOADING BASELINE...</div>

  return (
    <Shell tab={tab} setTab={setTab} viewDate={viewDate} prevDay={prevDay} nextDay={nextDay} goToToday={goToToday} day={day}>
      {tab === 'Today'  && <TodayView  day={day} allDays={allDays} config={config} goToDate={goToDate} closeDay={closeDay} reopenDay={reopenDay} />}
      {tab === 'Log'    && <LogView    day={day} setDay={setDay} config={config} closeDay={closeDay} reopenDay={reopenDay} />}
      {tab === 'Week'   && <WeekView   allDays={allDays} config={config} goToDate={goToDate} />}
      {tab === 'Trends' && <TrendsView allDays={allDays} config={config} />}
      {tab === 'Config' && <ConfigView config={config} setConfig={setConfig} />}
    </Shell>
  )
}
