// ============================================================
// BASELINE DAILY — SCORING ENGINE v2
// ============================================================
//
// ARCHITECTURE
// ------------
// 4 scored categories: Health, Movement, Business, Mind
// Daily score = average of best 3 of 4 category scores
// Bonus pool (max +15 pts): People + Home stack on top
// Wealth: tracked on dashboard, never scored
//
// GRADE TARGETS
// -------------
// D  <50   bad day, skipped basics
// C  50–64  below baseline
// B  65–77  covered the bases
// A  78–89  solid day with extras
// S  90+    elite: client + deep work stack OR movement stack
//
// W/L: S/A = WIN, B = PUSH, C/D = LOSS
// ============================================================

// ------------------------------------------------------------
// HEALTH (0–100)
// Basics: hydration, no fast food, reasonable bedtime, low vices
// B floor: water + any real meal + ok bedtime + ≤3 red bulls
// A: above + healthy meal + low vices + sauna/hottub
// ------------------------------------------------------------
export function scoreHealth(h: any): number {
  if (!h) return 0
  let s = 0

  // Hydration — 48oz goal, worth 25 pts max
  const waterFrac = Math.min((h.waterOz || 0) / 48, 1)
  s += Math.round(waterFrac * 25)

  // Nutrition — healthy eating builds score, fast food penalizes
  const meals = h.meals || []
  if (meals.includes('salad')) s += 10
  if (meals.includes('healthy')) s += 10
  if (meals.includes('smoothie')) s += 5
  if (meals.includes('cooked')) s += 8      // cooked from scratch
  if (meals.includes('fastfood')) s -= 10   // harder penalty than before

  // Vices — Red Bull
  const rb = h.redBulls || 0
  if (rb === 0) s += 10
  else if (rb === 1) s += 8
  else if (rb === 2) s += 5
  else if (rb === 3) s += 2
  else s -= 8  // 4+ is a real hit

  // Alcohol — each drink is a small deduction
  const drinks = (h.wine || 0) + (h.beer || 0) + (h.whiskey || 0) + (h.cocktails || 0)
  if (drinks === 0) s += 5
  else if (drinks <= 2) s += 0
  else s -= Math.min(drinks * 3, 12)

  // Bedtime
  if (h.bedtime) {
    const [hh] = h.bedtime.split(':').map(Number)
    if (hh >= 20 && hh <= 23) s += 12      // before midnight: good
    else if (hh === 0) s += 6              // midnight: fine
    else if (hh >= 1 && hh <= 3) s -= 5   // 1–3am: penalty
    // 4am+ hits rollover anyway, no extra penalty
  }

  // Morning stretch — small bonus
  if (h.stretched) s += 8

  // Sauna / hot tub — bonus only, not required
  if ((h.saunaMinutes || 0) >= 10) s += 6
  if ((h.hotTubMinutes || 0) >= 10) s += 4

  // Vacation mode: floor at 50
  if (h.vacationMode) s = Math.max(s, 50)

  return Math.max(0, Math.min(100, s))
}

// ------------------------------------------------------------
// MOVEMENT (0–100)
// B floor: ANY one of rec center / bike ride / sub cardio / golf
// A: exercise + Wallace walk OR outdoor activity
// S: bike ride + Wallace walk + outdoor activity (full stack)
// ------------------------------------------------------------
export function scoreMovement(h: any, hobbies: any): number {
  if (!h && !hobbies) return 0
  let s = 0

  const rec = h?.recCenter || false
  const subCardio = h?.substituteCardio || false
  const cardioMin = h?.cardioMinutes || 0
  const cyclingMiles = hobbies?.cyclingMiles || 0
  const golfHoles = hobbies?.golfHoles || 0
  const wallaceWalks = hobbies?.wallaceWalks || 0
  const wallaceMin = hobbies?.wallaceMinutes || 0
  const outdoorMin = hobbies?.outdoorMinutes || 0
  const indoorMin = hobbies?.indoorMinutes || 0

  // Base exercise — any one of these satisfies "moved today"
  const exercised = rec || subCardio || cardioMin >= 20 || cyclingMiles >= 3 || golfHoles >= 9
  if (exercised) s += 35

  // Rec center specifically adds a bit more (structured workout)
  if (rec) s += 10

  // Cycling — miles contribute meaningfully, capped at 40 pts
  if (cyclingMiles > 0) {
    s += Math.min(Math.round(cyclingMiles * 3), 40)
  }

  // Golf — base credit, bonuses for walked/networking
  if (golfHoles >= 9) {
    s += 15
    if (hobbies?.golfWalked) s += 5
  }

  // Cardio minutes (non-cycling) — up to 10 pts
  if (cardioMin > 0 && !cyclingMiles) {
    s += Math.round(Math.min(cardioMin, 60) / 60 * 10)
  }

  // Wallace walks — contributes to movement
  if (wallaceWalks >= 1) s += 8
  if (wallaceWalks >= 2) s += 4
  if (wallaceMin >= 30) s += 3

  // Outdoor activity (hiking, paddleboard, fishing, ski, etc.)
  if (outdoorMin >= 20) s += 8
  if (outdoorMin >= 60) s += 7  // stacks

  // Indoor activity
  if (indoorMin >= 30) s += 5

  // S-TIER STACK: bike + Wallace + outdoor all in one day
  const hasStack = cyclingMiles >= 5 && wallaceWalks >= 1 && outdoorMin >= 20
  if (hasStack) s += 15  // pushes this into S territory

  return Math.max(0, Math.min(100, s))
}

// ------------------------------------------------------------
// BUSINESS (0–100)
// B floor: 4 hours deep work (240 min)
// A: 5hrs deep work OR any revenue
// S: new client acquired
// ------------------------------------------------------------
export function scoreBusiness(b: any): number {
  if (!b) return 0
  let s = 0

  const dwMin = b.deepWorkMinutes || 0
  const revenue = b.totalRevenue || 0
  const customers = b.totalCustomers || 0

  // Deep work — 4hrs = B tier base, 5hrs = A tier push
  if (dwMin >= 300) {
    // 5+ hours: S-tier work day
    s += 75
  } else if (dwMin >= 240) {
    // 4 hours: solid B
    s = Math.round((dwMin / 300) * 75)
  } else if (dwMin > 0) {
    // Partial credit below 4hrs
    s = Math.round((dwMin / 300) * 55)
  }

  // Revenue — A tier push
  if (revenue > 0) {
    // Any revenue is meaningful, scales up to $500 for full A contribution
    s += Math.round(Math.min(revenue / 500, 1) * 20)
  }

  // New client — S-tier flag, big points
  if (customers > 0) {
    s += Math.min(customers * 15, 25)
  }

  return Math.max(0, Math.min(100, s))
}

// ------------------------------------------------------------
// MIND (0–100)
// B floor: 2+ min reading
// A: 20+ min reading
// Outdoor activities (bike, golf, Wallace, hike) passively credit this
// Meditation and nature time add on top
// ------------------------------------------------------------
export function scoreMind(m: any, hobbies: any): number {
  if (!m && !hobbies) return 0
  let s = 0

  const readingMin = m?.readingMinutes || 0
  const booksFinished = m?.booksFinished || 0
  const meditationMin = m?.meditationMinutes || 0
  const natureMin = m?.natureMinutes || 0

  // Reading — core of Mind score
  // 2min = B floor entry, 20min = A tier, 45min+ = maxes this component
  if (readingMin >= 2) {
    if (readingMin >= 45) s += 55
    else if (readingMin >= 20) s += 45
    else s += 25  // 2–19 min: B floor credit
  }

  // Books finished — big bonus
  s += Math.min(booksFinished, 1) * 20

  // Meditation
  if (meditationMin >= 5) s += 10
  if (meditationMin >= 15) s += 8  // stacks

  // Nature time (dedicated)
  if (natureMin >= 20) s += 8
  if (natureMin >= 60) s += 7  // stacks

  // Passive credit from outdoor movement — bike, golf, Wallace, hike all count
  const cyclingMiles = hobbies?.cyclingMiles || 0
  const golfHoles = hobbies?.golfHoles || 0
  const wallaceWalks = hobbies?.wallaceWalks || 0
  const outdoorMin = hobbies?.outdoorMinutes || 0

  let outdoorCredit = 0
  if (cyclingMiles >= 5) outdoorCredit += 12
  else if (cyclingMiles >= 1) outdoorCredit += 6
  if (golfHoles >= 9) outdoorCredit += 8
  if (wallaceWalks >= 1) outdoorCredit += 6
  if (outdoorMin >= 30) outdoorCredit += 6

  // Cap outdoor credit so it can't carry Mind on its own — max 20 pts passive
  s += Math.min(outdoorCredit, 20)

  return Math.max(0, Math.min(100, s))
}

// ------------------------------------------------------------
// BONUS POOL (0–15 pts added to final score)
// People: DWD, contacts, social
// Home: bonus tasks
// Cap: 15 pts total — can push B→A but can't manufacture A from nothing
// ------------------------------------------------------------
export function calcBonus(people: any, home: any): number {
  let bonus = 0

  // DWD — meaningful bump
  if (people?.dwd) bonus += 6

  // Contacts — small per contact
  const contacts = people?.contacts || []
  for (const c of contacts) {
    if (c.type === 'inperson') bonus += 3
    else if (c.type === 'call') bonus += 2
    else if (c.type === 'text') bonus += 1
  }

  // Social activity
  if ((people?.socialMinutes || 0) > 0) bonus += 3

  // Home bonus tasks
  const tasks = home?.bonusTasks || []
  bonus += Math.min(tasks.length * 2, 4)

  return Math.min(bonus, 15)
}

// ------------------------------------------------------------
// THRESHOLDS — minimum score for a category to count as "hit"
// Used for the balance multiplier
// ------------------------------------------------------------
export const THRESHOLDS = {
  health: 35,
  movement: 35,
  business: 40,
  mind: 25,
}

// ------------------------------------------------------------
// BALANCE MULTIPLIER
// Based on how many of the 4 scored categories hit their threshold
// Softer than before — missing one category still gives a good day
// ------------------------------------------------------------
export function getBalanceMultiplier(categoriesHit: number, vacationMode: boolean): number {
  const multipliers = [0.72, 0.82, 0.90, 0.96, 1.00]
  let mult = multipliers[Math.min(categoriesHit, 4)]
  if (vacationMode) mult = Math.max(mult, 0.90)
  return mult
}

// ------------------------------------------------------------
// WEALTH — tracked only, never scored
// Returns a display value for the dashboard
// ------------------------------------------------------------
export function calcWealth(business: any): { revenue: number; label: string } {
  const revenue = business?.totalRevenue || 0
  let label = 'No revenue'
  if (revenue >= 2000) label = 'Strong day'
  else if (revenue >= 500) label = 'Good day'
  else if (revenue > 0) label = 'Some revenue'
  return { revenue, label }
}

// ------------------------------------------------------------
// MAIN CALCULATOR
// ------------------------------------------------------------
export function calculateDayScore(day: any): {
  scores: Record<string, number>
  raw: number
  bonus: number
  balanceMultiplier: number
  final: number
  grade: string
  result: string
  categoriesHit: number
  wealth: { revenue: number; label: string }
} {
  const scores = {
    health: scoreHealth(day.health),
    movement: scoreMovement(day.health, day.hobbies),
    business: scoreBusiness(day.business),
    mind: scoreMind(day.mind, day.hobbies),
  }

  // Best 3 of 4
  const sorted = Object.values(scores).sort((a, b) => b - a)
  const raw = Math.round(sorted.slice(0, 3).reduce((a, b) => a + b, 0) / 3)

  // Balance multiplier
  const categoriesHit = Object.entries(scores).filter(
    ([key, val]) => val >= THRESHOLDS[key as keyof typeof THRESHOLDS]
  ).length
  const vacationMode = day.health?.vacationMode || false
  const balanceMultiplier = getBalanceMultiplier(categoriesHit, vacationMode)

  // Bonus
  const bonus = calcBonus(day.people, day.home)

  // Final
  const final = Math.min(100, Math.round(raw * balanceMultiplier) + bonus)

  // Grade
  let grade = 'D'
  if (final >= 90) grade = 'S'
  else if (final >= 78) grade = 'A'
  else if (final >= 65) grade = 'B'
  else if (final >= 50) grade = 'C'

  const result = grade === 'S' || grade === 'A' ? 'WIN' : grade === 'B' ? 'PUSH' : 'LOSS'

  const wealth = calcWealth(day.business)

  return {
    scores,
    raw,
    bonus,
    balanceMultiplier,
    final,
    grade,
    result,
    categoriesHit,
    wealth,
  }
}
