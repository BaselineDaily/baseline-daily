// ============================================================
// BASELINE DAILY — SCORING ENGINE
// ============================================================

export function scoreHealth(h: any): number {
  if (!h) return 0
  let s = 0
  if (h.stretched) s += 15
  const waterGoal = 48
  const waterFrac = Math.min((h.waterOz || 0) / waterGoal, 2)
  s += Math.round(waterFrac * 22)
  const rb = h.redBulls || 0
  if (rb === 0) s += 8
  else if (rb === 1) s += 7
  else if (rb === 2) s += 5
  else if (rb === 3) s += 3
  else s -= 5
  const meals = h.meals || []
  if (meals.includes('salad')) s += 10
  if (meals.includes('healthy')) s += 10
  if (meals.includes('smoothie')) s += 5
  if (meals.includes('fastfood')) s -= 6
  if (h.recCenter) s += 18
  else if (!h.substituteCardio) s -= 6
  const cardio = Math.min(h.cardioMinutes || 0, 60)
  s += Math.round((cardio / 60) * 12)
  const sauna = Math.min(h.saunaMinutes || 0, 30)
  s += Math.round((sauna / 30) * 8)
  const hotTub = Math.min(h.hotTubMinutes || 0, 30)
  s += Math.round((hotTub / 30) * 8)
  if (h.bedtime) {
    const [hh] = h.bedtime.split(':').map(Number)
    if (hh < 24 && hh >= 20) s += 12
    else if (hh >= 1 && hh <= 3) s -= 3
  }
  return Math.max(0, Math.min(100, s))
}

export function scoreBusiness(b: any): number {
  if (!b) return 0
  let s = 0
  const dw = Math.min(b.deepWorkMinutes || 0, 240)
  s += Math.round((dw / 240) * 75)
  const rev = Math.min(b.totalRevenue || 0, 500)
  s += Math.round((rev / 500) * 20)
  const customers = Math.min(b.totalCustomers || 0, 3)
  s += Math.round((customers / 3) * 15)
  return Math.max(0, Math.min(100, s))
}

export function scoreWealth(w: any): number {
  if (!w) return 0
  const rev = w.totalRevenue || 0
  if (rev <= 0) return 0
  if (rev >= 2000) return 100
  return Math.round(40 + ((rev / 2000) * 60))
}

export function scoreHobbies(h: any): number {
  if (!h) return 0
  let s = 0
  const miles = Math.min(h.cyclingMiles || 0, 45 / 4)
  s += Math.round(miles * 4)
  if (h.golfHoles) {
    s += 20
    if (h.golfWalked) s += 5
    if (h.golfNetworking) s += 5
  }
  const outdoor = Math.min(h.outdoorMinutes || 0, 120)
  s += Math.round((outdoor / 120) * 20)
  const indoor = Math.min(h.indoorMinutes || 0, 120)
  s += Math.round((indoor / 120) * 20)
  const project = Math.min(h.projectMinutes || 0, 60)
  s += Math.round((project / 60) * 15)
  const walks = Math.min(h.wallaceWalks || 0, 2)
  s += walks * 8
  return Math.max(0, Math.min(100, s))
}

export function scorePeople(p: any): number {
  if (!p) return 0
  let s = 0
  if (p.dwd) s += 30
  const contacts = p.contacts || []
  for (const c of contacts) {
    if (c.type === 'inperson') s += 20
    else if (c.type === 'call') s += 14
    else if (c.type === 'text') s += 8
  }
  if (p.socialMinutes) {
    s += 15
    const bonus = Math.min(p.socialMinutes, 120)
    s += Math.round((bonus / 120) * 10)
  }
  return Math.max(0, Math.min(100, s))
}

export function scoreMind(m: any): number {
  if (!m) return 0
  let s = 0
  const reading = Math.min(m.readingMinutes || 0, 25)
  s += Math.round((reading / 25) * 55)
  s += Math.min(m.booksFinished || 0, 1) * 25
  const med = Math.min(m.meditationMinutes || 0, 20)
  s += Math.round((med / 20) * 15)
  const nature = Math.min(m.natureMinutes || 0, 60)
  s += Math.round((nature / 60) * 20)
  return Math.max(0, Math.min(100, s))
}

export function scoreHome(h: any): number {
  if (!h) return 50
  const tasks = h.bonusTasks || []
  return Math.min(100, 50 + tasks.length * 18)
}

export const THRESHOLDS = {
  health: 40,
  business: 35,
  wealth: 15,
  hobbies: 25,
  people: 25,
  mind: 20,
  home: 10
}

export function calculateDayScore(day: any): {
  scores: Record<string, number>
  raw: number
  balanceMultiplier: number
  final: number
  grade: string
  result: string
  categoriesHit: number
} {
  const scores = {
    health: scoreHealth(day.health),
    business: scoreBusiness(day.business),
    wealth: scoreWealth(day.wealth),
    hobbies: scoreHobbies(day.hobbies),
    people: scorePeople(day.people),
    mind: scoreMind(day.mind),
    home: scoreHome(day.home)
  }

  const sorted = Object.values(scores).sort((a, b) => b - a)
  const raw = Math.round(sorted.slice(0, 5).reduce((a, b) => a + b, 0) / 5)

  const categoriesHit = Object.entries(scores).filter(
    ([key, val]) => val >= THRESHOLDS[key as keyof typeof THRESHOLDS]
  ).length

  const multipliers = [0.70, 0.78, 0.84, 0.88, 0.90, 0.95, 0.98, 1.00]
  const vacationMode = day.health?.vacationMode
  let balanceMultiplier = multipliers[categoriesHit]
  if (vacationMode) balanceMultiplier = Math.max(balanceMultiplier, 0.90)

  const final = Math.round(raw * balanceMultiplier)

  let grade = 'D'
  if (final >= 90) grade = 'S'
  else if (final >= 78) grade = 'A'
  else if (final >= 65) grade = 'B'
  else if (final >= 50) grade = 'C'

  const result = grade === 'S' || grade === 'A' ? 'WIN' : grade === 'B' ? 'PUSH' : 'LOSS'

  return { scores, raw, balanceMultiplier, final, grade, result, categoriesHit }
}