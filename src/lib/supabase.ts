import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export interface DayData {
  health: any
  business: any
  wealth: any
  hobbies: any
  people: any
  mind: any
  home: any
  journal: string
  closed: boolean
  closedAt?: string
}

export interface Config {
  rolloverHour: number
  inkImprintsTarget: number
  heartWestTarget: number
  weightGoal: number
  cyclingWeeklyGoal: number
  deepWorkDailyGoal: number
  waterDailyGoal: number
  redBullDailyCap: number
}

export interface User {
  id: string
  email: string
}
