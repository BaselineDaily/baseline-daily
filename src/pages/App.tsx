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

const CATEGORIES = [{
  id: 'health',
  name: 'Health',
  weight: 1.00
}, {
  id: 'business',
  name: 'Business',
  weight: 1.00
}, {
  id: 'wealth',
  name: 'Wealth',
  weight: 0.85
}, {
  id: 'hobbies',
  name: 'Hobbies',
  weight: 0.85
}, {
  id: 'relationships',
  name: 'People',
  weight: 0.85
}, {
  id: 'mind',
  name: 'Mind',
  weight: 0.85
}, {
  id: 'home',
  name: 'Home',
  weight: 0.85
}];
const THRESHOLDS = {
  health: 40,
  business: 35,
  wealth: 15,
  hobbies: 25,
  relationships: 25,
  mind: 20,
  home: 10
};
const DRINK_TYPES = ['Wine', 'Beer', 'Whiskey', 'Cocktail'];
const COMPANIES = ['Ink Imprints', 'HeartWest'];
const PROJECTS = ['Baseline app', 'Canfield archive', 'Junior Athletics', 'Art collection', 'Other'];
const GOLF_COMPANY = ['Solo', 'Friends', 'Family', 'Networking'];

// Get rollover hour from config (defaults to 4am) — stored separately so these helpers can access it
const getRolloverHour = () => {
  try {
    const c = JSON.parse(localStorage.getItem('baseline:config') || '{}');
    return typeof c.rolloverHour === 'number' ? c.rolloverHour : 4;
  } catch {
    return 4;
  }
};

// ISO date for "what day is it right now" — considers rollover hour
// If it's 1am and rollover is 4am, "today" is still yesterday
const todayISO = () => {
  const now = new Date();
  const roll = getRolloverHour();
  if (now.getHours() < roll) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
};

// Local ISO string helper for any Date
const isoFromDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const daysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoFromDate(d);
};
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return isoFromDate(dt);
};
const prettyDate = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};
const isToday = iso => iso === todayISO();
const isFuture = iso => iso > todayISO();
const emptyDay = (date = todayISO()) => ({
  date,
  stretched: false,
  waterOz: 0,
  redBulls: 0,
  drinks: {
    Wine: 0,
    Beer: 0,
    Whiskey: 0,
    Cocktail: 0
  },
  meals: {
    salad: false,
    healthy: false,
    smoothie: false,
    flexible: false,
    fastFood: false,
    fromScratch: false
  },
  sleepBedtime: '',
  sleepWakeTime: '',
  saunaMin: 0,
  hotTubMin: 0,
  recCenter: false,
  substituteCardio: false,
  weight: null,
  cardioMin: 0,
  cycling: [],
  golf: [],
  outdoor: [],
  indoor: [],
  gambling: [],
  projects: [],
  wallaceWalks: 0,
  wallaceMinutes: 0,
  deepWorkMinutes: 0,
  revenue: [],
  customers: [],
  contacts: [],
  dinnerWithDad: false,
  social: [],
  reading: [],
  booksFinished: 0,
  meditation: 0,
  natureMinutes: 0,
  homeTasks: [],
  vacationMode: false,
  journal: '',
  closed: false,
  closedAt: null,
  score: 0,
  grade: 'D',
  wl: 'L',
  categoryScores: {},
  categoriesHit: 0,
  balanceMultiplier: 0
});

// ============================================================
// SCORING ENGINE
// ============================================================

function scoreHealth(d) {
  let s = 0;
  if (d.stretched) s += 15;
  s += Math.min(22, d.waterOz / 48 * 22);
  if (d.redBulls === 0) s += 8;else if (d.redBulls <= 2) s += 6;else if (d.redBulls === 3) s += 3;else s -= (d.redBulls - 3) * 3;
  const td = Object.values(d.drinks).reduce((a, b) => a + b, 0);
  if (td === 0) s += 4;else if (td <= 2) s += 2;else s -= (td - 2) * 2;
  const m = d.meals;
  if (m.salad) s += 10;
  if (m.healthy) s += 10;
  if (m.flexible) s += 5;
  if (m.smoothie) s += 5;
  if (m.fromScratch) s += 5;
  if (m.fastFood) s -= 6;
  if (d.recCenter || d.substituteCardio) s += 18;else s -= 6;
  s += Math.min(12, d.cardioMin / 30 * 12);
  s += Math.min(8, d.saunaMin / 15 * 5);
  s += Math.min(8, d.hotTubMin / 15 * 5);
  if (d.sleepBedtime) {
    const [h, mi] = d.sleepBedtime.split(':').map(Number);
    const bm = h < 12 ? (h + 24) * 60 + mi : h * 60 + mi;
    const mn = 24 * 60;
    if (bm <= mn) s += 12;else if (bm <= mn + 60) s += 6;else s -= 3;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}
function scoreBusiness(d) {
  let s = 0;
  s += Math.min(75, d.deepWorkMinutes / 60 / 4 * 75);
  const rev = d.revenue.reduce((t, r) => t + Number(r.amount || 0), 0);
  s += Math.min(20, rev / 500 * 20);
  const cust = d.customers.reduce((t, c) => t + Number(c.count || 0), 0);
  s += Math.min(15, cust * 5);
  return Math.max(0, Math.min(100, Math.round(s)));
}
function scoreWealth(d) {
  const rev = d.revenue.reduce((t, r) => t + Number(r.amount || 0), 0);
  if (rev === 0) return 0;
  // Any revenue day starts at 40; climbs to 100 at $2000 — more generous curve
  return Math.max(0, Math.min(100, Math.round(40 + Math.min(60, rev / 2000 * 60))));
}
function scoreHobbies(d) {
  let s = 0;
  for (const r of d.cycling) {
    // All bike miles count equal now
    s += Math.min(45, r.miles * 4);
  }
  for (const g of d.golf) {
    let r = 20;
    if (g.walked) r += 10;
    if (g.networking) r += 12;
    if (g.quality === 'both' || g.quality === 'productive') r += 6;
    if (g.drinks > 2) r -= (g.drinks - 2) * 3;
    s += Math.min(35, r);
  }
  for (const o of d.outdoor) s += Math.min(20, o.minutes / 30 * 12);
  for (const o of d.indoor) s += Math.min(20, o.minutes / 30 * 12);
  for (const p of d.projects) s += Math.min(25, p.minutes / 60 * 15);
  if (d.wallaceWalks > 0) s += Math.min(15, d.wallaceWalks * 8);
  for (const g of d.gambling) {
    if (g.pnl > 0) s += 4;else if (g.pnl < 0) s -= 2;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}
function scoreRelationships(d) {
  let s = 0;
  if (d.dinnerWithDad) s += 30;
  for (const c of d.contacts) {
    if (c.quality === 'in-person') s += 20;else if (c.quality === 'call') s += 14;else s += 8;
  }
  for (const sa of d.social || []) {
    // Social activity: 15 base + time-based bonus
    s += Math.min(30, 15 + sa.minutes / 60 * 10);
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}
function scoreMind(d) {
  let s = 0;
  const rm = d.reading.reduce((t, r) => t + Number(r.minutes || 0), 0);
  s += Math.min(55, rm / 25 * 55);
  if (d.booksFinished > 0) s += 25;
  s += Math.min(15, d.meditation / 10 * 15);
  s += Math.min(20, d.natureMinutes / 30 * 20);
  return Math.max(0, Math.min(100, Math.round(s)));
}
function scoreHome(d) {
  let s = 50; // baseline — dishes/bed/laundry already habitual
  s += d.homeTasks.length * 18;
  return Math.max(0, Math.min(100, Math.round(s)));
}
function computeDay(d) {
  const cs = {
    health: scoreHealth(d),
    business: scoreBusiness(d),
    wealth: scoreWealth(d),
    hobbies: scoreHobbies(d),
    relationships: scoreRelationships(d),
    mind: scoreMind(d),
    home: scoreHome(d)
  };

  // Top-5-only scoring: your daily score IS the average of your best 5 categories.
  // Bottom 2 don't drag down the daily score — they only affect the balance multiplier and weekly grade.
  // This is the pure implementation of "day can be lopsided, week must balance".
  const sorted = CATEGORIES.map(c => cs[c.id]).sort((a, b) => b - a);
  const raw = sorted.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  let hit = 0;
  for (const c of CATEGORIES) if (cs[c.id] >= THRESHOLDS[c.id]) hit++;

  // Softened balance multiplier — missing categories nudges score, doesn't nuke it
  const bm = d.vacationMode ? Math.max(0.90, hit / 7) : {
    0: 0.70,
    1: 0.78,
    2: 0.84,
    3: 0.88,
    4: 0.90,
    5: 0.95,
    6: 0.98,
    7: 1.00
  }[hit];
  const score = Math.round(raw * bm);

  // New grade bands — more generous, a solid day = A
  let grade, wl;
  if (score >= 90) {
    grade = 'S';
    wl = 'W';
  } else if (score >= 78) {
    grade = 'A';
    wl = 'W';
  } else if (score >= 65) {
    grade = 'B';
    wl = 'P';
  } else if (score >= 50) {
    grade = 'C';
    wl = 'L';
  } else {
    grade = 'D';
    wl = 'L';
  }
  return {
    ...d,
    categoryScores: cs,
    score,
    grade,
    wl,
    categoriesHit: hit,
    balanceMultiplier: bm
  };
}

// ============================================================
// STORAGE (localStorage)
// ============================================================

const STORAGE = {
  getDay(date) {
    try {
      const r = localStorage.getItem(`baseline:day:${date}`);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  },
  saveDay(day) {
    localStorage.setItem(`baseline:day:${day.date}`, JSON.stringify(day));
  },
  listDays() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('baseline:day:')) {
        try {
          out.push(JSON.parse(localStorage.getItem(k)));
        } catch {}
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  },
  getConfig() {
    try {
      const r = localStorage.getItem('baseline:config');
      if (r) return JSON.parse(r);
    } catch {}
    return {
      inkMonthlyTarget: 10000,
      heartwestMonthlyTarget: 10000,
      weightGoal: 145,
      cyclingWeeklyGoal: 35,
      deepWorkDailyGoal: 240,
      waterGoal: 48,
      redBullCap: 3,
      rolloverHour: 4
    };
  },
  saveConfig(c) {
    localStorage.setItem('baseline:config', JSON.stringify(c));
  },
  exportAll() {
    const data = {
      days: this.listDays(),
      config: this.getConfig(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },
  importAll(json) {
    const data = JSON.parse(json);
    if (data.days) for (const d of data.days) this.saveDay(d);
    if (data.config) this.saveConfig(data.config);
  }
};

// ============================================================
// DESIGN TOKENS
// ============================================================

const s = {
  bg: '#0a0a0a',
  panel: '#141414',
  panelRaised: '#1a1a1a',
  border: '#262626',
  borderLight: '#333',
  text: '#e8e8e8',
  textDim: '#888',
  textMuted: '#555',
  gold: '#c9a227',
  green: '#3ecf8e',
  red: '#ef4444',
  blue: '#6ba4ff',
  orange: '#ff9933'
};
const f = {
  display: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  ui: "'Inter', -apple-system, sans-serif"
};

// ============================================================
// SHARED COMPONENTS
// ============================================================

function Panel({
  children,
  label,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: s.panel,
      border: `1px solid ${s.border}`,
      padding: 20,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.2em',
      marginBottom: 12
    }
  }, label.toUpperCase()), children);
}
function Stat({
  label,
  value,
  sub,
  color = s.text,
  big = false
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 9,
      color: s.textDim,
      letterSpacing: '0.2em',
      marginBottom: 4
    }
  }, label.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: big ? 32 : 20,
      fontWeight: 700,
      color,
      lineHeight: 1
    }
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      marginTop: 4
    }
  }, sub));
}
function CheckRow({
  label,
  checked,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      cursor: 'pointer',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      border: `1.5px solid ${checked ? s.gold : s.borderLight}`,
      background: checked ? s.gold : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#000',
      fontSize: 13,
      fontWeight: 900
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: e => onChange(e.target.checked),
    style: {
      display: 'none'
    }
  }));
}
function NumberInput({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min = 0
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 6
    }
  }, label.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange(Math.max(min, Number(value) - step)),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      width: 36,
      height: 36,
      cursor: 'pointer',
      fontSize: 18,
      flexShrink: 0
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: value,
    onChange: e => onChange(Number(e.target.value)),
    style: {
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '8px 6px',
      width: 60,
      fontFamily: f.mono,
      fontSize: 14,
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange(Number(value) + step),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      width: 36,
      height: 36,
      cursor: 'pointer',
      fontSize: 18,
      flexShrink: 0
    }
  }, "+"), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      marginLeft: 4
    }
  }, unit)));
}
function Slider({
  label,
  value,
  onChange,
  max,
  unit
}) {
  const pct = Math.min(100, value / max * 100);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em'
    }
  }, label.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 12,
      color: s.gold
    }
  }, value, " / ", max, " ", unit)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: max,
    value: value,
    onChange: e => onChange(Number(e.target.value)),
    style: {
      width: '100%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 3,
      background: s.border,
      marginTop: -2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct}%`,
      background: s.gold,
      transition: 'width 0.2s'
    }
  })));
}
function Toggle({
  label,
  value,
  onChange,
  big = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => onChange(!value),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: big ? '16px 20px' : '10px 14px',
      border: `1px solid ${value ? s.gold : s.border}`,
      background: value ? 'rgba(201,162,39,0.08)' : s.panel,
      cursor: 'pointer',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: big ? 16 : 14,
      fontWeight: big ? 600 : 400
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 24,
      background: value ? s.gold : s.borderLight,
      borderRadius: 12,
      position: 'relative',
      transition: 'background 0.2s',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 2,
      left: value ? 22 : 2,
      width: 20,
      height: 20,
      background: '#000',
      borderRadius: 10,
      transition: 'left 0.2s'
    }
  })));
}
const btnGold = {
  background: s.gold,
  color: '#000',
  border: 'none',
  padding: '8px 14px',
  fontFamily: f.mono,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.1em'
};
const inp = {
  background: s.bg,
  border: `1px solid ${s.border}`,
  color: s.text,
  padding: '8px 10px',
  fontFamily: f.mono,
  fontSize: 13
};

// ============================================================
// SHELL
// ============================================================

function Shell({
  children,
  tab,
  setTab,
  viewDate,
  prevDay,
  nextDay,
  goToToday,
  day
}) {
  const showNav = tab === 'Today' || tab === 'Log';
  const viewingToday = viewDate === todayISO();
  const atFuture = viewDate >= todayISO();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: s.bg,
      color: s.text,
      fontFamily: f.ui,
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pad-header header-wrap",
    style: {
      borderBottom: `1px solid ${s.border}`,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: s.panel,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "logo-big",
    style: {
      fontFamily: f.display,
      fontSize: 28,
      fontWeight: 900,
      letterSpacing: '-0.02em'
    }
  }, "BASELINE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginTop: 2
    }
  }, "ESTABLISH YOURS \xB7 THEN BEAT IT")), /*#__PURE__*/React.createElement("div", {
    className: "tabs-row",
    style: {
      display: 'flex',
      gap: 4
    }
  }, ['Today', 'Log', 'Week', 'Trends', 'Config'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "tab-btn",
    onClick: () => setTab(t),
    style: {
      background: tab === t ? s.gold : 'transparent',
      color: tab === t ? '#000' : s.text,
      border: `1px solid ${tab === t ? s.gold : s.border}`,
      padding: '8px 14px',
      fontFamily: f.mono,
      fontSize: 11,
      letterSpacing: '0.1em',
      cursor: 'pointer',
      fontWeight: 600
    }
  }, t.toUpperCase())))), showNav && /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: `1px solid ${s.border}`,
      padding: '10px 24px',
      background: viewingToday ? s.panel : '#1a1510',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      position: 'sticky',
      top: 82,
      zIndex: 99
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: prevDay,
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '6px 12px',
      fontFamily: f.mono,
      fontSize: 14,
      cursor: 'pointer'
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 160,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 9,
      color: s.textDim,
      letterSpacing: '0.2em'
    }
  }, viewingToday ? 'TODAY' : day.closed ? 'CLOSED · VIEWING' : 'VIEWING · EDITABLE'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.display,
      fontSize: 18,
      fontWeight: 700,
      color: viewingToday ? s.gold : s.text,
      marginTop: 2
    }
  }, prettyDate(viewDate))), /*#__PURE__*/React.createElement("button", {
    onClick: nextDay,
    disabled: atFuture,
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: atFuture ? s.textMuted : s.text,
      padding: '6px 12px',
      fontFamily: f.mono,
      fontSize: 14,
      cursor: atFuture ? 'not-allowed' : 'pointer',
      opacity: atFuture ? 0.4 : 1
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, day.closed && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.green,
      letterSpacing: '0.15em',
      padding: '4px 10px',
      border: `1px solid ${s.green}`,
      background: 'rgba(62,207,142,0.08)'
    }
  }, "\u2713 CLOSED"), !viewingToday && /*#__PURE__*/React.createElement("button", {
    onClick: goToToday,
    style: {
      background: s.gold,
      color: '#000',
      border: 'none',
      padding: '7px 14px',
      fontFamily: f.mono,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.1em'
    }
  }, "JUMP TO TODAY"))), /*#__PURE__*/React.createElement("div", {
    className: "pad-main",
    style: {
      maxWidth: 1280,
      margin: '0 auto',
      padding: '24px'
    }
  }, children));
}

// ============================================================
// TODAY
// ============================================================

function TodayView({
  day,
  allDays,
  config,
  goToDate,
  closeDay,
  reopenDay
}) {
  const streak = useMemo(() => {
    let n = 0;
    const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date));
    for (const d of sorted) {
      if (d.categoriesHit === 7 || d.vacationMode && d.categoriesHit >= 4) n++;else break;
    }
    return n;
  }, [allDays]);
  const lifetime = useMemo(() => {
    const a = {
      redBulls: 0,
      wine: 0,
      beer: 0,
      whiskey: 0,
      cocktail: 0,
      stretches: 0,
      wallace: 0,
      books: 0,
      bikeMiles: 0,
      deepWorkHrs: 0
    };
    for (const d of allDays) {
      a.redBulls += d.redBulls || 0;
      a.wine += d.drinks?.Wine || 0;
      a.beer += d.drinks?.Beer || 0;
      a.whiskey += d.drinks?.Whiskey || 0;
      a.cocktail += d.drinks?.Cocktail || 0;
      if (d.stretched) a.stretches++;
      a.wallace += d.wallaceWalks || 0;
      a.books += d.booksFinished || 0;
      for (const r of d.cycling || []) {
        a.bikeMiles += Number(r.miles) || 0;
      }
      a.deepWorkHrs += (d.deepWorkMinutes || 0) / 60;
    }
    return a;
  }, [allDays]);
  const weekDays = useMemo(() => {
    const t = new Date();
    const dow = t.getDay();
    const mon = new Date(t);
    mon.setDate(t.getDate() - (dow + 6) % 7);
    const o = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      o.push({
        iso,
        day: d,
        data: allDays.find(x => x.date === iso)
      });
    }
    return o;
  }, [allDays]);
  const weekRevenue = weekDays.reduce((t, w) => t + (w.data?.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0);
  const monthRevenue = useMemo(() => {
    const m = todayISO().slice(0, 7);
    return allDays.filter(d => d.date.startsWith(m)).reduce((t, d) => t + (d.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0);
  }, [allDays]);
  const weekCycling = weekDays.reduce((a, w) => {
    for (const r of w.data?.cycling || []) a.miles += Number(r.miles) || 0;
    return a;
  }, {
    miles: 0
  });
  const weekDeepWork = weekDays.reduce((t, w) => t + (w.data?.deepWorkMinutes || 0) / 60, 0);
  const weekWallaceMin = weekDays.reduce((t, w) => t + (w.data?.wallaceMinutes || 0), 0);
  const weekCardioMin = weekDays.reduce((t, w) => t + (w.data?.cardioMin || 0), 0);
  const weekRecVisits = weekDays.filter(w => w.data?.recCenter).length;
  const weekSleep = (() => {
    const hrs = [];
    for (const w of weekDays) {
      const d = w.data;
      if (d?.sleepBedtime && d?.sleepWakeTime) {
        const [bh, bm] = d.sleepBedtime.split(':').map(Number);
        const [wh, wm] = d.sleepWakeTime.split(':').map(Number);
        const bed = bh < 12 ? (bh + 24) * 60 + bm : bh * 60 + bm;
        const wake = (wh < 12 ? wh + 24 : wh + 24) * 60 + wm;
        const diff = (wake - bed) / 60;
        if (diff > 0 && diff < 14) hrs.push(diff);
      }
    }
    return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  })();
  const dinnerDadWeek = weekDays.some(w => w.data?.dinnerWithDad);
  const gc = day.grade === 'S' ? s.gold : day.grade === 'A' ? s.green : day.grade === 'B' ? s.blue : day.grade === 'C' ? s.orange : s.red;
  const wc = day.wl === 'W' ? s.green : day.wl === 'P' ? s.blue : s.red;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Today"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 24,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grade-big",
    style: {
      fontFamily: f.display,
      fontSize: 140,
      fontWeight: 900,
      lineHeight: 1,
      color: gc,
      letterSpacing: '-0.05em'
    }
  }, day.grade), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "score-big",
    style: {
      fontFamily: f.mono,
      fontSize: 52,
      fontWeight: 700,
      color: s.text,
      lineHeight: 1
    }
  }, day.score), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.2em',
      marginTop: 8
    }
  }, "/ 100 DAILY SCORE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      marginTop: 14,
      padding: '6px 14px',
      background: wc,
      color: '#000',
      fontFamily: f.mono,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.2em'
    }
  }, day.wl === 'W' ? 'WIN' : day.wl === 'P' ? 'PUSH' : 'LOSS'))), /*#__PURE__*/React.createElement("div", {
    className: "grid-3",
    style: {
      marginTop: 20,
      paddingTop: 20,
      borderTop: `1px solid ${s.border}`,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Streak",
    value: streak,
    sub: streak === 1 ? 'day' : 'days',
    color: streak > 0 ? s.gold : s.textDim
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Cat. Hit",
    value: `${day.categoriesHit}/7`,
    color: day.categoriesHit === 7 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Balance",
    value: `${day.balanceMultiplier.toFixed(2)}x`,
    color: day.balanceMultiplier >= 0.9 ? s.green : day.balanceMultiplier >= 0.7 ? s.text : s.red
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 18,
      borderTop: `1px solid ${s.border}`
    }
  }, !day.closed ? /*#__PURE__*/React.createElement("button", {
    onClick: closeDay,
    style: {
      width: '100%',
      background: s.green,
      color: '#000',
      border: 'none',
      padding: '12px',
      fontFamily: f.mono,
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.2em'
    }
  }, "CLOSE DAY \xB7 LOCK IN THIS GRADE") : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.green,
      letterSpacing: '0.2em',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, "\u2713 DAY CLOSED ", day.closedAt ? '· ' + new Date(day.closedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }) : ''), /*#__PURE__*/React.createElement("button", {
    onClick: reopenDay,
    style: {
      width: '100%',
      background: 'transparent',
      color: s.textDim,
      border: `1px solid ${s.border}`,
      padding: '8px',
      fontFamily: f.mono,
      fontSize: 11,
      cursor: 'pointer',
      letterSpacing: '0.15em'
    }
  }, "REOPEN TO EDIT")))), /*#__PURE__*/React.createElement(Panel, {
    label: "Category Breakdown"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 8
    }
  }, CATEGORIES.map(c => {
    const sc = day.categoryScores[c.id] || 0;
    const hit = sc >= THRESHOLDS[c.id];
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        display: 'grid',
        gridTemplateColumns: '90px 1fr 36px',
        gap: 8,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: f.mono,
        fontSize: 11,
        color: s.textDim,
        letterSpacing: '0.1em'
      }
    }, c.name.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 10,
        background: s.bg,
        position: 'relative',
        border: `1px solid ${s.border}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: `${sc}%`,
        background: hit ? s.gold : s.textMuted,
        transition: 'width 0.3s'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: `${THRESHOLDS[c.id]}%`,
        width: 2,
        height: '100%',
        background: s.textDim
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: f.mono,
        fontSize: 12,
        fontWeight: 600,
        color: hit ? s.gold : s.textDim,
        textAlign: 'right'
      }
    }, sc));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 12,
      borderTop: `1px solid ${s.border}`,
      fontFamily: f.mono,
      fontSize: 9,
      color: s.textDim,
      letterSpacing: '0.1em'
    }
  }, "GOLD = HIT \xB7 TICK = THRESHOLD"))), /*#__PURE__*/React.createElement(Panel, {
    label: "This Week"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-7",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 8,
      marginBottom: 20
    }
  }, weekDays.map(w => {
    const isTodayCell = w.iso === todayISO();
    const isFutureCell = isFuture(w.iso);
    const sc = w.data?.score || 0;
    const g = w.data?.grade || '—';
    const col = !w.data ? s.textMuted : g === 'S' ? s.gold : g === 'A' ? s.green : g === 'B' ? s.blue : g === 'C' ? s.orange : s.red;
    return /*#__PURE__*/React.createElement("div", {
      key: w.iso,
      onClick: () => {
        if (!isFutureCell && goToDate) goToDate(w.iso);
      },
      style: {
        border: `1px solid ${isTodayCell ? s.gold : s.border}`,
        padding: '10px 4px',
        textAlign: 'center',
        background: isTodayCell ? 'rgba(201,162,39,0.05)' : 'transparent',
        cursor: isFutureCell ? 'default' : 'pointer',
        opacity: isFutureCell ? 0.3 : 1,
        transition: 'background 0.15s'
      },
      onMouseEnter: e => {
        if (!isFutureCell) e.currentTarget.style.background = 'rgba(201,162,39,0.1)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = isTodayCell ? 'rgba(201,162,39,0.05)' : 'transparent';
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: f.mono,
        fontSize: 9,
        color: s.textDim,
        letterSpacing: '0.15em'
      }
    }, w.day.toLocaleDateString('en-US', {
      weekday: 'short'
    }).toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: f.display,
        fontSize: 26,
        fontWeight: 700,
        color: col,
        marginTop: 4,
        lineHeight: 1
      }
    }, g), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: f.mono,
        fontSize: 10,
        color: s.textDim,
        marginTop: 2
      }
    }, w.data ? sc : '—'));
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid-4",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 20,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Miles Biked",
    value: `${weekCycling.miles.toFixed(1)}mi`,
    sub: `goal ${config.cyclingWeeklyGoal}`,
    color: weekCycling.miles >= config.cyclingWeeklyGoal ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Cardio",
    value: `${weekCardioMin}m`,
    sub: "this week"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Wallace Min",
    value: `${weekWallaceMin}m`,
    sub: "this week"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Deep Work",
    value: `${weekDeepWork.toFixed(1)}h`,
    sub: "goal 28h",
    color: weekDeepWork >= 28 ? s.green : s.text
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid-4",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Rec Visits",
    value: `${weekRecVisits}/7`,
    color: weekRecVisits >= 5 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Sleep Avg",
    value: weekSleep ? `${weekSleep.toFixed(1)}h` : '—',
    sub: "per night",
    color: weekSleep >= 7 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "DWD",
    value: dinnerDadWeek ? '✓' : '—',
    color: dinnerDadWeek ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Week Rev",
    value: `$${weekRevenue.toLocaleString()}`,
    color: s.gold
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.5fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Month to Date"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Revenue MTD",
    value: `$${monthRevenue.toLocaleString()}`,
    sub: `target $${(config.inkMonthlyTarget + config.heartwestMonthlyTarget).toLocaleString()}`,
    big: true,
    color: monthRevenue >= config.inkMonthlyTarget ? s.green : s.gold
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: s.bg,
      marginTop: 16,
      border: `1px solid ${s.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${Math.min(100, monthRevenue / (config.inkMonthlyTarget + config.heartwestMonthlyTarget) * 100)}%`,
      background: s.gold
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      paddingTop: 16,
      borderTop: `1px solid ${s.border}`,
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em'
    }
  }, "WEEK REV: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.text
    }
  }, "$", weekRevenue.toLocaleString()))), /*#__PURE__*/React.createElement(Panel, {
    label: "Lifetime Counters"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lifetime-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Red Bulls",
    value: lifetime.redBulls,
    color: s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Stretches",
    value: lifetime.stretches,
    color: s.gold
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Wallace Walks",
    value: lifetime.wallace,
    color: s.green
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Wine",
    value: lifetime.wine,
    color: s.textDim
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Beer",
    value: lifetime.beer,
    color: s.textDim
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Whiskey",
    value: lifetime.whiskey,
    color: s.textDim
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Cocktails",
    value: lifetime.cocktail,
    color: s.textDim
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Books",
    value: lifetime.books,
    color: s.blue
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Work Hrs",
    value: lifetime.deepWorkHrs.toFixed(0),
    color: s.gold
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Miles Biked",
    value: lifetime.bikeMiles.toFixed(0),
    color: s.green
  })))));
}

// ============================================================
// DEEP WORK TIMER
// ============================================================

function DeepWorkTimer({
  day,
  setDay
}) {
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);
  useEffect(() => {
    const saved = localStorage.getItem('baseline:timerStart');
    if (saved) {
      const start = Number(saved);
      if (!isNaN(start)) {
        setRunning(true);
        setStartedAt(start);
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }
    }
  }, []);
  useEffect(() => {
    if (running && startedAt) {
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, startedAt]);
  const start = () => {
    const now = Date.now();
    localStorage.setItem('baseline:timerStart', String(now));
    setStartedAt(now);
    setElapsed(0);
    setRunning(true);
  };
  const stop = () => {
    const minutes = Math.round(elapsed / 60);
    setDay({
      ...day,
      deepWorkMinutes: day.deepWorkMinutes + minutes
    });
    localStorage.removeItem('baseline:timerStart');
    setRunning(false);
    setStartedAt(null);
    setElapsed(0);
  };
  const manualAdd = m => setDay({
    ...day,
    deepWorkMinutes: Math.max(0, day.deepWorkMinutes + m)
  });
  const h = Math.floor(elapsed / 3600),
    m = Math.floor(elapsed % 3600 / 60),
    sec = elapsed % 60;
  const totalHrs = (day.deepWorkMinutes / 60).toFixed(2);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.2em',
      marginBottom: 4
    }
  }, "DEEP WORK TODAY"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 32,
      fontWeight: 700,
      color: s.gold,
      lineHeight: 1
    }
  }, totalHrs, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      color: s.textDim
    }
  }, "h"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 24,
      color: running ? s.green : s.textMuted,
      minWidth: 110
    }
  }, String(h).padStart(2, '0'), ":", String(m).padStart(2, '0'), ":", String(sec).padStart(2, '0')), !running ? /*#__PURE__*/React.createElement("button", {
    onClick: start,
    style: {
      background: s.green,
      color: '#000',
      border: 'none',
      padding: '10px 22px',
      fontFamily: f.mono,
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.15em'
    }
  }, "START") : /*#__PURE__*/React.createElement("button", {
    onClick: stop,
    style: {
      background: s.red,
      color: '#000',
      border: 'none',
      padding: '10px 18px',
      fontFamily: f.mono,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.15em'
    }
  }, "STOP \xB7 LOG ", Math.round(elapsed / 60), "m"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginLeft: 'auto',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => manualAdd(15),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '6px 10px',
      fontFamily: f.mono,
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "+15m"), /*#__PURE__*/React.createElement("button", {
    onClick: () => manualAdd(30),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '6px 10px',
      fontFamily: f.mono,
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "+30m"), /*#__PURE__*/React.createElement("button", {
    onClick: () => manualAdd(60),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '6px 10px',
      fontFamily: f.mono,
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "+1h"), /*#__PURE__*/React.createElement("button", {
    onClick: () => manualAdd(-15),
    style: {
      background: s.panelRaised,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '6px 10px',
      fontFamily: f.mono,
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "\u221215")));
}

// ============================================================
// LOG
// ============================================================

function LogView({
  day,
  setDay,
  config
}) {
  const upd = p => setDay({
    ...day,
    ...p
  });
  const updMeals = (k, v) => upd({
    meals: {
      ...day.meals,
      [k]: v
    }
  });
  const [newContact, setNewContact] = useState('');
  const [newContactQ, setNewContactQ] = useState('text');
  const [newRead, setNewRead] = useState({
    what: '',
    minutes: 20
  });
  const [newRev, setNewRev] = useState({
    company: COMPANIES[0],
    amount: ''
  });
  const [newCust, setNewCust] = useState({
    company: COMPANIES[0],
    count: 1
  });
  const [newRide, setNewRide] = useState({
    type: 'MTB',
    miles: '',
    minutes: '',
    hrAvg: '',
    hrMax: '',
    elevation: ''
  });
  const [newGolf, setNewGolf] = useState({
    holes: 18,
    score: '',
    walked: false,
    drinks: 0,
    company: 'Friends',
    networking: false,
    quality: 'fun'
  });
  const [newOut, setNewOut] = useState({
    type: 'Walk',
    otherName: '',
    minutes: 30
  });
  const [newIndoor, setNewIndoor] = useState({
    type: 'Basketball',
    otherName: '',
    minutes: 30
  });
  const [newProj, setNewProj] = useState({
    name: PROJECTS[0],
    minutes: 30
  });
  const [newGamble, setNewGamble] = useState({
    type: 'Blackjack',
    pnl: 0
  });
  const [newSocial, setNewSocial] = useState({
    type: '',
    minutes: 60
  });
  const [newTask, setNewTask] = useState('');
  const addContact = () => {
    if (!newContact.trim()) return;
    upd({
      contacts: [...day.contacts, {
        name: newContact.trim(),
        quality: newContactQ
      }]
    });
    setNewContact('');
  };
  const addReading = () => {
    const what = newRead.what.trim() || 'Reading session';
    upd({
      reading: [...day.reading, {
        what,
        minutes: newRead.minutes
      }]
    });
    setNewRead({
      what: '',
      minutes: 20
    });
  };
  const addRev = () => {
    if (!newRev.amount) return;
    upd({
      revenue: [...day.revenue, {
        ...newRev,
        amount: Number(newRev.amount)
      }]
    });
    setNewRev({
      company: COMPANIES[0],
      amount: ''
    });
  };
  const addCust = () => {
    if (!newCust.count) return;
    upd({
      customers: [...day.customers, {
        ...newCust
      }]
    });
    setNewCust({
      company: COMPANIES[0],
      count: 1
    });
  };
  const addRide = () => {
    if (!newRide.miles) return;
    upd({
      cycling: [...day.cycling, {
        ...newRide,
        miles: Number(newRide.miles),
        minutes: Number(newRide.minutes || 0),
        hrAvg: Number(newRide.hrAvg || 0),
        hrMax: Number(newRide.hrMax || 0),
        elevation: Number(newRide.elevation || 0)
      }]
    });
    setNewRide({
      type: 'MTB',
      miles: '',
      minutes: '',
      hrAvg: '',
      hrMax: '',
      elevation: ''
    });
  };
  const addGolf = () => {
    upd({
      golf: [...day.golf, {
        ...newGolf
      }]
    });
    setNewGolf({
      holes: 18,
      score: '',
      walked: false,
      drinks: 0,
      company: 'Friends',
      networking: false,
      quality: 'fun'
    });
  };
  const addOut = () => {
    const type = newOut.type === 'Other' ? newOut.otherName.trim() || 'Other' : newOut.type;
    upd({
      outdoor: [...day.outdoor, {
        type,
        minutes: newOut.minutes
      }]
    });
    setNewOut({
      type: 'Walk',
      otherName: '',
      minutes: 30
    });
  };
  const addIndoor = () => {
    const type = newIndoor.type === 'Other' ? newIndoor.otherName.trim() || 'Other' : newIndoor.type;
    upd({
      indoor: [...(day.indoor || []), {
        type,
        minutes: newIndoor.minutes
      }]
    });
    setNewIndoor({
      type: 'Basketball',
      otherName: '',
      minutes: 30
    });
  };
  const addProj = () => {
    upd({
      projects: [...day.projects, {
        name: newProj.name,
        minutes: newProj.minutes
      }]
    });
    setNewProj({
      name: PROJECTS[0],
      minutes: 30
    });
  };
  const addGamble = () => {
    upd({
      gambling: [...day.gambling, {
        type: newGamble.type,
        pnl: Number(newGamble.pnl)
      }]
    });
    setNewGamble({
      type: 'Blackjack',
      pnl: 0
    });
  };
  const addSocial = () => {
    if (!newSocial.type.trim()) return;
    upd({
      social: [...(day.social || []), {
        type: newSocial.type.trim(),
        minutes: newSocial.minutes
      }]
    });
    setNewSocial({
      type: '',
      minutes: 60
    });
  };
  const addTask = () => {
    if (!newTask.trim()) return;
    upd({
      homeTasks: [...day.homeTasks, {
        task: newTask.trim()
      }]
    });
    setNewTask('');
  };
  const rm = (k, i) => upd({
    [k]: day[k].filter((_, idx) => idx !== i)
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Morning Stretch (15 min)",
    value: day.stretched,
    onChange: v => upd({
      stretched: v
    }),
    big: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Vacation Mode \u2014 relaxed grading curve",
    value: day.vacationMode,
    onChange: v => upd({
      vacationMode: v
    })
  }), /*#__PURE__*/React.createElement(Panel, {
    label: "Health \xB7 Hydration & Vices"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Slider, {
    label: "Water",
    value: day.waterOz,
    onChange: v => upd({
      waterOz: v
    }),
    max: config.waterGoal * 2,
    unit: "oz"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(NumberInput, {
    label: `Red Bulls (cap ${config.redBullCap})`,
    value: day.redBulls,
    onChange: v => upd({
      redBulls: v
    })
  }), DRINK_TYPES.map(t => /*#__PURE__*/React.createElement(NumberInput, {
    key: t,
    label: t,
    value: day.drinks[t],
    onChange: v => upd({
      drinks: {
        ...day.drinks,
        [t]: v
      }
    })
  }))))), /*#__PURE__*/React.createElement(Panel, {
    label: "Health \xB7 Nutrition"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(CheckRow, {
    label: "Salad",
    checked: day.meals.salad,
    onChange: v => updMeals('salad', v)
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Healthy Meal",
    checked: day.meals.healthy,
    onChange: v => updMeals('healthy', v)
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Smoothie",
    checked: day.meals.smoothie,
    onChange: v => updMeals('smoothie', v)
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Flexible Meal",
    checked: day.meals.flexible,
    onChange: v => updMeals('flexible', v)
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Cooked From Scratch",
    checked: day.meals.fromScratch,
    onChange: v => updMeals('fromScratch', v)
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Fast Food (penalty)",
    checked: day.meals.fastFood,
    onChange: v => updMeals('fastFood', v)
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Health \xB7 Body & Recovery"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Rec Center",
    value: day.recCenter,
    onChange: v => upd({
      recCenter: v
    })
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Substitute Cardio",
    value: day.substituteCardio,
    onChange: v => upd({
      substituteCardio: v
    })
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Cardio",
    value: day.cardioMin,
    onChange: v => upd({
      cardioMin: v
    }),
    unit: "min",
    step: 5
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Sauna",
    value: day.saunaMin,
    onChange: v => upd({
      saunaMin: v
    }),
    unit: "min",
    step: 5
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Hot Tub",
    value: day.hotTubMin,
    onChange: v => upd({
      hotTubMin: v
    }),
    unit: "min",
    step: 5
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 6
    }
  }, "BEDTIME"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: day.sleepBedtime,
    onChange: e => upd({
      sleepBedtime: e.target.value
    }),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 6
    }
  }, "WAKE TIME"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: day.sleepWakeTime,
    onChange: e => upd({
      sleepWakeTime: e.target.value
    }),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 6
    }
  }, "WEIGHT (LB)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    value: day.weight || '',
    onChange: e => upd({
      weight: e.target.value ? Number(e.target.value) : null
    }),
    style: {
      ...inp,
      width: 100
    }
  })))), /*#__PURE__*/React.createElement(Panel, {
    label: "Business \xB7 Deep Work + Revenue"
  }, /*#__PURE__*/React.createElement(DeepWorkTimer, {
    day: day,
    setDay: setDay
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      marginTop: 20,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 10
    }
  }, "REVENUE TODAY"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newRev.company,
    onChange: e => setNewRev({
      ...newRev,
      company: e.target.value
    }),
    style: inp
  }, COMPANIES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    placeholder: "$",
    value: newRev.amount,
    onChange: e => setNewRev({
      ...newRev,
      amount: e.target.value
    }),
    style: {
      ...inp,
      width: 100
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addRev,
    style: btnGold
  }, "ADD")), day.revenue.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, r.company), /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, "$", Number(r.amount).toLocaleString()), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('revenue', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 10
    }
  }, "CUSTOMERS ACQUIRED"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newCust.company,
    onChange: e => setNewCust({
      ...newCust,
      company: e.target.value
    }),
    style: inp
  }, COMPANIES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: newCust.count,
    onChange: e => setNewCust({
      ...newCust,
      count: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 70
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addCust,
    style: btnGold
  }, "ADD")), day.customers.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, c.company), /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, c.count), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('customers', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      fontSize: 16
    }
  }, "\xD7")))))), /*#__PURE__*/React.createElement(Panel, {
    label: "Hobbies \xB7 Cycling"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newRide.type,
    onChange: e => setNewRide({
      ...newRide,
      type: e.target.value
    }),
    style: inp
  }, /*#__PURE__*/React.createElement("option", null, "MTB"), /*#__PURE__*/React.createElement("option", null, "Gravel"), /*#__PURE__*/React.createElement("option", null, "Road")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    placeholder: "miles",
    value: newRide.miles,
    onChange: e => setNewRide({
      ...newRide,
      miles: e.target.value
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "min",
    value: newRide.minutes,
    onChange: e => setNewRide({
      ...newRide,
      minutes: e.target.value
    }),
    style: {
      ...inp,
      width: 70
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "HR avg",
    value: newRide.hrAvg,
    onChange: e => setNewRide({
      ...newRide,
      hrAvg: e.target.value
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "HR max",
    value: newRide.hrMax,
    onChange: e => setNewRide({
      ...newRide,
      hrMax: e.target.value
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "elev ft",
    value: newRide.elevation,
    onChange: e => setNewRide({
      ...newRide,
      elevation: e.target.value
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addRide,
    style: btnGold
  }, "ADD RIDE")), day.cycling.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '8px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, r.type), /*#__PURE__*/React.createElement("span", null, r.miles, " mi"), /*#__PURE__*/React.createElement("span", null, r.minutes, " min"), r.hrAvg > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.textDim
    }
  }, "HR ", r.hrAvg, "/", r.hrMax), r.elevation > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.textDim
    }
  }, r.elevation, "ft"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('cycling', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement(Panel, {
    label: "Hobbies \xB7 Golf (post-round)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 4
    }
  }, "HOLES"), /*#__PURE__*/React.createElement("select", {
    value: newGolf.holes,
    onChange: e => setNewGolf({
      ...newGolf,
      holes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: 9
  }, "9"), /*#__PURE__*/React.createElement("option", {
    value: 18
  }, "18"), /*#__PURE__*/React.createElement("option", {
    value: 27
  }, "27"), /*#__PURE__*/React.createElement("option", {
    value: 36
  }, "36"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 4
    }
  }, "SCORE"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: newGolf.score,
    onChange: e => setNewGolf({
      ...newGolf,
      score: e.target.value
    }),
    style: {
      ...inp,
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 4
    }
  }, "DRINKS"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: newGolf.drinks,
    onChange: e => setNewGolf({
      ...newGolf,
      drinks: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 4
    }
  }, "PLAYED WITH"), /*#__PURE__*/React.createElement("select", {
    value: newGolf.company,
    onChange: e => setNewGolf({
      ...newGolf,
      company: e.target.value
    }),
    style: {
      ...inp,
      width: '100%'
    }
  }, GOLF_COMPANY.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 4
    }
  }, "QUALITY"), /*#__PURE__*/React.createElement("select", {
    value: newGolf.quality,
    onChange: e => setNewGolf({
      ...newGolf,
      quality: e.target.value
    }),
    style: {
      ...inp,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "fun"
  }, "Fun"), /*#__PURE__*/React.createElement("option", {
    value: "productive"
  }, "Productive"), /*#__PURE__*/React.createElement("option", {
    value: "both"
  }, "Both"), /*#__PURE__*/React.createElement("option", {
    value: "meh"
  }, "Meh")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(CheckRow, {
    label: "Walked",
    checked: newGolf.walked,
    onChange: v => setNewGolf({
      ...newGolf,
      walked: v
    })
  }), /*#__PURE__*/React.createElement(CheckRow, {
    label: "Networking",
    checked: newGolf.networking,
    onChange: v => setNewGolf({
      ...newGolf,
      networking: v
    })
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addGolf,
    style: {
      ...btnGold,
      marginLeft: 'auto',
      padding: '10px 18px'
    }
  }, "LOG ROUND")), day.golf.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '8px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, r.holes, "h"), r.score && /*#__PURE__*/React.createElement("span", null, "Score: ", r.score), /*#__PURE__*/React.createElement("span", null, r.walked ? 'Walked' : 'Cart'), /*#__PURE__*/React.createElement("span", null, r.drinks, " \uD83C\uDF7A"), /*#__PURE__*/React.createElement("span", null, r.company), r.networking && /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.green
    }
  }, "NET"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('golf', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement(Panel, {
    label: "Hobbies \xB7 Wallace, Outdoors, Projects, Gambling"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(NumberInput, {
    label: "Wallace Walks",
    value: day.wallaceWalks,
    onChange: v => upd({
      wallaceWalks: v
    })
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Wallace Minutes",
    value: day.wallaceMinutes,
    onChange: v => upd({
      wallaceMinutes: v
    }),
    unit: "min",
    step: 5
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8,
      marginTop: 16
    }
  }, "OUTDOOR ACTIVITY"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newOut.type,
    onChange: e => setNewOut({
      ...newOut,
      type: e.target.value
    }),
    style: inp
  }, /*#__PURE__*/React.createElement("option", null, "Walk"), /*#__PURE__*/React.createElement("option", null, "Paddleboard"), /*#__PURE__*/React.createElement("option", null, "Fishing"), /*#__PURE__*/React.createElement("option", null, "Hiking"), /*#__PURE__*/React.createElement("option", null, "Ski"), /*#__PURE__*/React.createElement("option", null, "Other")), newOut.type === 'Other' && /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "what activity?",
    value: newOut.otherName,
    onChange: e => setNewOut({
      ...newOut,
      otherName: e.target.value
    }),
    style: {
      ...inp,
      flex: 1,
      minWidth: 140
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: newOut.minutes,
    onChange: e => setNewOut({
      ...newOut,
      minutes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      alignSelf: 'center'
    }
  }, "min"), /*#__PURE__*/React.createElement("button", {
    onClick: addOut,
    style: btnGold
  }, "ADD")), day.outdoor.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.green
    }
  }, o.type), /*#__PURE__*/React.createElement("span", null, o.minutes, " min"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('outdoor', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8,
      marginTop: 16
    }
  }, "INDOOR ACTIVITY"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newIndoor.type,
    onChange: e => setNewIndoor({
      ...newIndoor,
      type: e.target.value
    }),
    style: inp
  }, /*#__PURE__*/React.createElement("option", null, "Basketball"), /*#__PURE__*/React.createElement("option", null, "Pickleball"), /*#__PURE__*/React.createElement("option", null, "Racquetball"), /*#__PURE__*/React.createElement("option", null, "Yoga"), /*#__PURE__*/React.createElement("option", null, "Weights"), /*#__PURE__*/React.createElement("option", null, "Swim"), /*#__PURE__*/React.createElement("option", null, "Climbing"), /*#__PURE__*/React.createElement("option", null, "Other")), newIndoor.type === 'Other' && /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "what activity?",
    value: newIndoor.otherName,
    onChange: e => setNewIndoor({
      ...newIndoor,
      otherName: e.target.value
    }),
    style: {
      ...inp,
      flex: 1,
      minWidth: 140
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: newIndoor.minutes,
    onChange: e => setNewIndoor({
      ...newIndoor,
      minutes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      alignSelf: 'center'
    }
  }, "min"), /*#__PURE__*/React.createElement("button", {
    onClick: addIndoor,
    style: btnGold
  }, "ADD")), (day.indoor || []).map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.blue
    }
  }, o.type), /*#__PURE__*/React.createElement("span", null, o.minutes, " min"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('indoor', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8,
      marginTop: 16
    }
  }, "PERSONAL PROJECT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newProj.name,
    onChange: e => setNewProj({
      ...newProj,
      name: e.target.value
    }),
    style: inp
  }, PROJECTS.map(p => /*#__PURE__*/React.createElement("option", {
    key: p
  }, p))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "min",
    value: newProj.minutes,
    onChange: e => setNewProj({
      ...newProj,
      minutes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 100
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      alignSelf: 'center'
    }
  }, "min"), /*#__PURE__*/React.createElement("button", {
    onClick: addProj,
    style: btnGold
  }, "ADD")), day.projects.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, p.name), /*#__PURE__*/React.createElement("span", null, p.minutes, " min"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('projects', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8,
      marginTop: 16
    }
  }, "GAMBLING"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: newGamble.type,
    onChange: e => setNewGamble({
      ...newGamble,
      type: e.target.value
    }),
    style: inp
  }, /*#__PURE__*/React.createElement("option", null, "Blackjack"), /*#__PURE__*/React.createElement("option", null, "Roulette"), /*#__PURE__*/React.createElement("option", null, "Sports Bet"), /*#__PURE__*/React.createElement("option", null, "Poker"), /*#__PURE__*/React.createElement("option", null, "Other")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    placeholder: "net $",
    value: newGamble.pnl,
    onChange: e => setNewGamble({
      ...newGamble,
      pnl: e.target.value
    }),
    style: {
      ...inp,
      width: 120
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addGamble,
    style: btnGold
  }, "ADD")), day.gambling.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, g.type), /*#__PURE__*/React.createElement("span", {
    style: {
      color: Number(g.pnl) > 0 ? s.green : Number(g.pnl) < 0 ? s.red : s.textDim
    }
  }, Number(g.pnl) > 0 ? '+' : '', "$", Number(g.pnl).toLocaleString()), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('gambling', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement(Panel, {
    label: "People"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "DWD",
    value: day.dinnerWithDad,
    onChange: v => upd({
      dinnerWithDad: v
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8
    }
  }, "ADD CONTACT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Name",
    value: newContact,
    onChange: e => setNewContact(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addContact(),
    style: {
      ...inp,
      flex: 1,
      minWidth: 140
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: newContactQ,
    onChange: e => setNewContactQ(e.target.value),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "text"
  }, "Text / DM"), /*#__PURE__*/React.createElement("option", {
    value: "call"
  }, "Call"), /*#__PURE__*/React.createElement("option", {
    value: "in-person"
  }, "In-person")), /*#__PURE__*/React.createElement("button", {
    onClick: addContact,
    style: btnGold
  }, "ADD")), day.contacts.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.textDim
    }
  }, c.quality), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('contacts', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8,
      marginTop: 16
    }
  }, "SOCIAL ACTIVITY"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textMuted,
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Dinner with friends, poker night, coffee with a cousin \u2014 custom type + minutes."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Dinner with friends",
    value: newSocial.type,
    onChange: e => setNewSocial({
      ...newSocial,
      type: e.target.value
    }),
    onKeyDown: e => e.key === 'Enter' && addSocial(),
    style: {
      ...inp,
      flex: 1,
      minWidth: 180
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "min",
    value: newSocial.minutes,
    onChange: e => setNewSocial({
      ...newSocial,
      minutes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 80
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addSocial,
    style: btnGold
  }, "ADD")), (day.social || []).map((sa, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.gold
    }
  }, sa.type), /*#__PURE__*/React.createElement("span", null, sa.minutes, " min"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('social', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement(Panel, {
    label: "Mind \xB7 Reading & Recovery"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      letterSpacing: '0.15em',
      marginBottom: 8
    }
  }, "READING SESSION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textMuted,
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Tap ADD to log. Title is optional \u2014 leave blank if you just want to credit the time."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "What did you read? (optional)",
    value: newRead.what,
    onChange: e => setNewRead({
      ...newRead,
      what: e.target.value
    }),
    onKeyDown: e => e.key === 'Enter' && addReading(),
    style: {
      ...inp,
      flex: 1,
      minWidth: 160
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: "min",
    value: newRead.minutes,
    onChange: e => setNewRead({
      ...newRead,
      minutes: Number(e.target.value)
    }),
    style: {
      ...inp,
      width: 70
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addReading,
    style: btnGold
  }, "ADD")), day.reading.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.blue
    }
  }, r.what), /*#__PURE__*/React.createElement("span", null, r.minutes, " min"), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('reading', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 14,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(NumberInput, {
    label: "Books Finished Today",
    value: day.booksFinished,
    onChange: v => upd({
      booksFinished: v
    })
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Meditation",
    value: day.meditation,
    onChange: v => upd({
      meditation: v
    }),
    unit: "min",
    step: 5
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Nature Time",
    value: day.natureMinutes,
    onChange: v => upd({
      natureMinutes: v
    }),
    unit: "min",
    step: 10
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Home \xB7 Bonus Tasks"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      marginBottom: 12
    }
  }, "Dishes / bed / laundry assumed habitual \u2014 bonus for bigger tasks."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Task completed",
    value: newTask,
    onChange: e => setNewTask(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addTask(),
    style: {
      ...inp,
      flex: 1,
      minWidth: 160
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addTask,
    style: btnGold
  }, "ADD")), day.homeTasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      padding: '6px 10px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      marginBottom: 4,
      fontFamily: f.mono,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, t.task), /*#__PURE__*/React.createElement("button", {
    onClick: () => rm('homeTasks', i),
    style: {
      background: 'none',
      border: 'none',
      color: s.textDim,
      cursor: 'pointer',
      marginLeft: 'auto',
      fontSize: 16
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement(Panel, {
    label: "Journal"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 10,
      color: s.textDim,
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "Freeform notes for the day \u2014 wins, reflections, things to remember. Saves automatically."), /*#__PURE__*/React.createElement("textarea", {
    value: day.journal || '',
    onChange: e => upd({
      journal: e.target.value
    }),
    placeholder: "What happened today? What's on your mind?",
    style: {
      ...inp,
      width: '100%',
      minHeight: 160,
      fontFamily: f.mono,
      fontSize: 13,
      lineHeight: 1.6,
      resize: 'vertical'
    }
  })));
}

// ============================================================
// WEEK
// ============================================================

function WeekView({
  allDays,
  config
}) {
  const t = new Date();
  const dow = t.getDay();
  const mon = new Date(t);
  mon.setDate(t.getDate() - (dow + 6) % 7);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    weekDays.push({
      iso,
      day: d,
      data: allDays.find(x => x.date === iso)
    });
  }
  const logged = weekDays.filter(w => w.data);
  const avg = logged.length ? Math.round(logged.reduce((t, w) => t + w.data.score, 0) / logged.length) : 0;
  const wins = logged.filter(w => w.data.wl === 'W').length;
  const losses = logged.filter(w => w.data.wl === 'L').length;
  const pushes = logged.filter(w => w.data.wl === 'P').length;
  const rev = logged.reduce((t, w) => t + (w.data.revenue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0), 0);
  const cust = logged.reduce((t, w) => t + (w.data.customers?.reduce((s, c) => s + Number(c.count || 0), 0) || 0), 0);
  const cyc = logged.reduce((a, w) => {
    for (const r of w.data.cycling || []) a.miles += Number(r.miles) || 0;
    return a;
  }, {
    miles: 0
  });
  const dw = logged.reduce((t, w) => t + (w.data.deepWorkMinutes || 0) / 60, 0);
  const stretches = logged.filter(w => w.data.stretched).length;
  const waterAvg = logged.length ? Math.round(logged.reduce((t, w) => t + (w.data.waterOz || 0), 0) / logged.length) : 0;
  const rb = logged.reduce((t, w) => t + (w.data.redBulls || 0), 0);
  const drinks = logged.reduce((t, w) => t + Object.values(w.data.drinks || {}).reduce((s, v) => s + v, 0), 0);
  const sau = logged.reduce((t, w) => t + (w.data.saunaMin || 0), 0);
  const ht = logged.reduce((t, w) => t + (w.data.hotTubMin || 0), 0);
  const cardio = logged.reduce((t, w) => t + (w.data.cardioMin || 0), 0);
  const wallaceMin = logged.reduce((t, w) => t + (w.data.wallaceMinutes || 0), 0);
  const recVisits = logged.filter(w => w.data.recCenter).length;
  const sleepHrs = (() => {
    const hrs = [];
    for (const w of logged) {
      const d = w.data;
      if (d?.sleepBedtime && d?.sleepWakeTime) {
        const [bh, bm] = d.sleepBedtime.split(':').map(Number);
        const [wh, wm] = d.sleepWakeTime.split(':').map(Number);
        const bed = bh < 12 ? (bh + 24) * 60 + bm : bh * 60 + bm;
        const wake = (wh < 12 ? wh + 24 : wh + 24) * 60 + wm;
        const diff = (wake - bed) / 60;
        if (diff > 0 && diff < 14) hrs.push(diff);
      }
    }
    return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  })();
  const dad = weekDays.some(w => w.data?.dinnerWithDad);
  const holes = logged.reduce((t, w) => t + (w.data.golf?.reduce((s, g) => s + g.holes, 0) || 0), 0);
  const readMin = logged.reduce((t, w) => t + (w.data.reading?.reduce((s, r) => s + Number(r.minutes || 0), 0) || 0), 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Week Scorecard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-4",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Avg Score",
    value: avg,
    big: true,
    color: avg >= 85 ? s.green : avg >= 70 ? s.blue : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "W / P / L",
    value: `${wins}-${pushes}-${losses}`,
    big: true,
    color: wins > losses ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Days Logged",
    value: `${logged.length}/7`,
    big: true
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "DWD",
    value: dad ? '✓' : 'MISSING',
    big: true,
    color: dad ? s.green : s.red
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Health Week"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-3",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Stretches",
    value: `${stretches}/7`,
    color: stretches >= 5 ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Avg Water",
    value: `${waterAvg} oz`,
    color: waterAvg >= config.waterGoal ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Red Bulls",
    value: rb,
    color: rb <= 14 ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Drinks",
    value: drinks
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Cardio",
    value: `${cardio}m`
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Rec Visits",
    value: `${recVisits}/7`,
    color: recVisits >= 5 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Sauna",
    value: `${sau}m`,
    sub: "goal 50",
    color: sau >= 50 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Hot Tub",
    value: `${ht}m`,
    sub: "goal 50",
    color: ht >= 50 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Sleep Avg",
    value: sleepHrs ? `${sleepHrs.toFixed(1)}h` : '—',
    sub: "per night",
    color: sleepHrs >= 7 ? s.green : s.text
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Business Week"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Revenue",
    value: `$${rev.toLocaleString()}`,
    color: s.gold
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "New Cust.",
    value: cust,
    color: s.gold
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Deep Work",
    value: `${dw.toFixed(1)}h`,
    sub: "goal 28h",
    color: dw >= 28 ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Avg / Day",
    value: `${(dw / 7).toFixed(1)}h`,
    sub: "goal 4h"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Hobbies Week"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Miles Biked",
    value: cyc.miles.toFixed(1),
    sub: `goal ${config.cyclingWeeklyGoal}`,
    color: cyc.miles >= config.cyclingWeeklyGoal ? s.green : s.red
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Wallace Min",
    value: `${wallaceMin}m`,
    color: s.green
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Holes",
    value: holes,
    sub: "max 54",
    color: holes > 54 ? s.red : s.green
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Cardio",
    value: `${cardio}m`
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Mind Week"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Reading Min",
    value: readMin,
    sub: "goal 150",
    color: readMin >= 150 ? s.green : s.text
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Reading Days",
    value: logged.filter(w => (w.data.reading?.length || 0) > 0).length,
    sub: "goal 5"
  })))));
}

// ============================================================
// TRENDS
// ============================================================

function TrendsView({
  allDays,
  config
}) {
  const last30 = useMemo(() => {
    const o = [];
    for (let i = 29; i >= 0; i--) {
      const iso = daysAgo(i);
      const d = allDays.find(x => x.date === iso);
      o.push({
        date: iso.slice(5),
        score: d?.score || 0,
        weight: d?.weight || null,
        deepWork: d ? d.deepWorkMinutes / 60 : 0
      });
    }
    return o;
  }, [allDays]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "30-Day Score Trend"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: 250
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(AreaChart, {
    data: last30
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: s.gold,
    stopOpacity: 0.5
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: s.gold,
    stopOpacity: 0
  }))), /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "2 4",
    stroke: s.border
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    domain: [0, 100],
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: s.panel,
      border: `1px solid ${s.border}`,
      fontFamily: f.mono,
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Area, {
    type: "monotone",
    dataKey: "score",
    stroke: s.gold,
    strokeWidth: 2,
    fill: "url(#sg)"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: `Weight Trend (goal ${config.weightGoal} lb)`
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: 200
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(LineChart, {
    data: last30.filter(d => d.weight)
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "2 4",
    stroke: s.border
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    domain: ['dataMin - 2', 'dataMax + 2'],
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: s.panel,
      border: `1px solid ${s.border}`,
      fontFamily: f.mono,
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "weight",
    stroke: s.green,
    strokeWidth: 2,
    dot: {
      fill: s.green,
      r: 3
    }
  }))))), /*#__PURE__*/React.createElement(Panel, {
    label: "Deep Work Hours (30d)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: 200
    }
  }, /*#__PURE__*/React.createElement(ResponsiveContainer, null, /*#__PURE__*/React.createElement(LineChart, {
    data: last30
  }, /*#__PURE__*/React.createElement(CartesianGrid, {
    strokeDasharray: "2 4",
    stroke: s.border
  }), /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(YAxis, {
    stroke: s.textDim,
    tick: {
      fill: s.textDim,
      fontSize: 10,
      fontFamily: f.mono
    }
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: s.panel,
      border: `1px solid ${s.border}`,
      fontFamily: f.mono,
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "deepWork",
    stroke: s.gold,
    strokeWidth: 2,
    dot: false
  })))))));
}

// ============================================================
// CONFIG + DATA EXPORT
// ============================================================

function ConfigView({
  config,
  setConfig
}) {
  const upd = (k, v) => setConfig({
    ...config,
    [k]: v
  });
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const doExport = () => {
    const blob = new Blob([STORAGE.exportAll()], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseline-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = () => {
    try {
      STORAGE.importAll(importText);
      alert('Imported. Refresh to see data.');
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
  };
  const nuke = () => {
    if (!confirm('Delete ALL Baseline data? This cannot be undone.')) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('baseline:')) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    alert('Wiped. Refresh.');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    label: "Day Handling"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      marginBottom: 14,
      lineHeight: 1.6
    }
  }, "Your \"day\" ends at this hour, not at midnight. If you log something between midnight and your rollover hour, it goes on the previous day. Default: 4 AM \u2014 covers late nights without misattributing activity."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(NumberInput, {
    label: "Day Rollover Hour (0-23)",
    value: config.rolloverHour,
    onChange: v => upd('rolloverHour', Math.max(0, Math.min(23, v))),
    unit: ":00"
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Configuration"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(NumberInput, {
    label: "Ink Imprints Monthly Target",
    value: config.inkMonthlyTarget,
    onChange: v => upd('inkMonthlyTarget', v),
    unit: "$",
    step: 500
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "HeartWest Monthly Target",
    value: config.heartwestMonthlyTarget,
    onChange: v => upd('heartwestMonthlyTarget', v),
    unit: "$",
    step: 500
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Weight Goal",
    value: config.weightGoal,
    onChange: v => upd('weightGoal', v),
    unit: "lb"
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Cycling Weekly Goal",
    value: config.cyclingWeeklyGoal,
    onChange: v => upd('cyclingWeeklyGoal', v),
    unit: "mi"
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Deep Work Daily Goal",
    value: config.deepWorkDailyGoal,
    onChange: v => upd('deepWorkDailyGoal', v),
    unit: "min",
    step: 15
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Water Daily Goal",
    value: config.waterGoal,
    onChange: v => upd('waterGoal', v),
    unit: "oz",
    step: 4
  }), /*#__PURE__*/React.createElement(NumberInput, {
    label: "Red Bull Daily Cap",
    value: config.redBullCap,
    onChange: v => upd('redBullCap', v)
  }))), /*#__PURE__*/React.createElement(Panel, {
    label: "Data \u2014 Backup & Restore"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      marginBottom: 14,
      lineHeight: 1.6
    }
  }, "Your data is stored locally in this browser. Export a backup periodically \u2014 especially before switching devices or upgrading to v2 (Supabase sync)."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: doExport,
    style: btnGold
  }, "EXPORT BACKUP (.json)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImport(!showImport),
    style: {
      ...btnGold,
      background: s.panelRaised,
      color: s.text,
      border: `1px solid ${s.border}`
    }
  }, "IMPORT"), /*#__PURE__*/React.createElement("button", {
    onClick: nuke,
    style: {
      ...btnGold,
      background: s.red
    }
  }, "WIPE ALL DATA")), showImport && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => setImportText(e.target.value),
    placeholder: "Paste exported JSON here...",
    style: {
      ...inp,
      width: '100%',
      minHeight: 120,
      fontFamily: f.mono,
      fontSize: 11
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: doImport,
    style: {
      ...btnGold,
      marginTop: 8
    }
  }, "IMPORT DATA"))), /*#__PURE__*/React.createElement(Panel, {
    label: "About"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: f.mono,
      fontSize: 11,
      color: s.textDim,
      lineHeight: 1.8
    }
  }, "BASELINE V1 \xB7 LOCAL-ONLY BUILD", /*#__PURE__*/React.createElement("br", null), "DATA LIVES IN THIS BROWSER ONLY \xB7 BACK UP REGULARLY", /*#__PURE__*/React.createElement("br", null), "V2 (MULTI-DEVICE SYNC + STRAVA + APPLE HEALTH) COMING SOON")));
}

// ============================================================
// ROOT
// ============================================================

function Baseline() {
  const [tab, setTab] = useState('Today');
  const [viewDate, setViewDate] = useState(todayISO());
  const [day, setDay] = useState(emptyDay());
  const [allDays, setAllDays] = useState([]);
  const [config, setConfig] = useState({
    inkMonthlyTarget: 10000,
    heartwestMonthlyTarget: 10000,
    weightGoal: 145,
    cyclingWeeklyGoal: 35,
    deepWorkDailyGoal: 240,
    waterGoal: 48,
    redBullCap: 3,
    rolloverHour: 4
  });
  const [loaded, setLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const cfg = STORAGE.getConfig();
    setConfig(cfg);
    const today = todayISO();
    setViewDate(today);
    const existing = STORAGE.getDay(today);
    setAllDays(STORAGE.listDays());
    setDay(computeDay(existing || emptyDay(today)));
    setLoaded(true);
  }, []);

  // When viewDate changes, load that day
  useEffect(() => {
    if (!loaded) return;
    const existing = STORAGE.getDay(viewDate);
    setDay(computeDay(existing || emptyDay(viewDate)));
  }, [viewDate]);

  // Auto-save & recompute day
  useEffect(() => {
    if (!loaded) return;
    if (day.date !== viewDate) return; // stale update, ignore
    const computed = computeDay(day);
    if (computed.score !== day.score || computed.grade !== day.grade || JSON.stringify(computed.categoryScores) !== JSON.stringify(day.categoryScores)) {
      setDay(computed);
      return;
    }
    STORAGE.saveDay(computed);
    setAllDays(STORAGE.listDays());
  }, [day, loaded]);
  useEffect(() => {
    if (!loaded) return;
    STORAGE.saveConfig(config);
  }, [config, loaded]);

  // Auto-detect rollover while app is open — if you pass the rollover boundary
  // with the app still open, shift viewDate to the new today
  useEffect(() => {
    if (!loaded) return;
    const check = setInterval(() => {
      const newToday = todayISO();
      if (viewDate !== newToday && !day.closed) {
        // only auto-advance if user was on today AND hasn't closed it
        if (viewDate === addDays(newToday, -1)) {
          // was on yesterday-relative-to-new-today = viewing the now-old "today"
          // Don't force-switch; just let Week view and streaks reflect new day.
        }
      }
    }, 60000);
    return () => clearInterval(check);
  }, [loaded, viewDate, day.closed]);
  const goToDate = iso => {
    if (isFuture(iso)) return;
    setViewDate(iso);
    setTab('Log'); // jump to log view when picking a past day
  };
  const goToToday = () => {
    setViewDate(todayISO());
  };
  const prevDay = () => setViewDate(addDays(viewDate, -1));
  const nextDay = () => {
    const n = addDays(viewDate, 1);
    if (!isFuture(n)) setViewDate(n);
  };
  const closeDay = () => {
    setDay({
      ...day,
      closed: true,
      closedAt: new Date().toISOString()
    });
  };
  const reopenDay = () => {
    setDay({
      ...day,
      closed: false,
      closedAt: null
    });
  };
  if (!loaded) return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: s.bg,
      color: s.textDim,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: f.mono
    }
  }, "LOADING BASELINE...");
  return /*#__PURE__*/React.createElement(Shell, {
    tab: tab,
    setTab: setTab,
    viewDate: viewDate,
    prevDay: prevDay,
    nextDay: nextDay,
    goToToday: goToToday,
    day: day
  }, tab === 'Today' && /*#__PURE__*/React.createElement(TodayView, {
    day: day,
    allDays: allDays,
    config: config,
    goToDate: goToDate,
    closeDay: closeDay,
    reopenDay: reopenDay
  }), tab === 'Log' && /*#__PURE__*/React.createElement(LogView, {
    day: day,
    setDay: setDay,
    config: config,
    closeDay: closeDay,
    reopenDay: reopenDay
  }), tab === 'Week' && /*#__PURE__*/React.createElement(WeekView, {
    allDays: allDays,
    config: config,
    goToDate: goToDate
  }), tab === 'Trends' && /*#__PURE__*/React.createElement(TrendsView, {
    allDays: allDays,
    config: config
  }), tab === 'Config' && /*#__PURE__*/React.createElement(ConfigView, {
    config: config,
    setConfig: setConfig
  }));
}


