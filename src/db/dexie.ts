import Dexie, { type Table } from 'dexie'

export interface Session {
  id?: number
  week: number
  day: string
  original_day: string | null
  type: 'run' | 'strength' | 'rest' | 'mobility'
  title: string
  duration_min: number | null
  zone: string | null
  pace: string | null
  intervals: { rounds: number; workSec: number; restSec: number } | null
  phase: string
  notes: string | null
}

export interface Exercise {
  id?: number
  session_id: number
  name: string
  sets: number
  reps: number
  hint: string | null
}

export interface LoggedSet {
  id?: number
  exercise_id: number
  log_date: string
  set_number: number
  reps_done: number | null
  weight_kg: number | null
  completed: number
}

export interface SessionLog {
  id?: number
  session_id: number
  log_date: string
  rpe: number | null
  duration_actual_min: number | null
  distance_km: number | null
  notes: string | null
}

export interface HrvLog {
  id?: number
  log_date: string
  hrv_ms: number
}

export interface UserMeta {
  key: string
  value: string
}

export interface IntervalSplit {
  id?: number
  session_log_id: number
  round_number: number
  time_sec: number | null
  distance_km: number | null
}

class Sub75DB extends Dexie {
  sessions!: Table<Session>
  exercises!: Table<Exercise>
  logged_sets!: Table<LoggedSet>
  session_logs!: Table<SessionLog>
  hrv_logs!: Table<HrvLog>
  user_meta!: Table<UserMeta>
  interval_splits!: Table<IntervalSplit>

  constructor() {
    super('sub75')
    this.version(1).stores({
      sessions: '++id, week, day, [week+day]',
      exercises: '++id, session_id',
      logged_sets: '++id, [exercise_id+log_date+set_number], exercise_id, log_date',
      session_logs: '++id, session_id, log_date, [session_id+log_date]',
      user_meta: 'key',
    })
    this.version(2).stores({
      sessions: '++id, week, day, [week+day]',
      exercises: '++id, session_id',
      logged_sets: '++id, [exercise_id+log_date+set_number], exercise_id, log_date',
      session_logs: '++id, session_id, log_date, [session_id+log_date]',
      hrv_logs: '++id, log_date',
      user_meta: 'key',
    })
    this.version(3).stores({
      sessions: '++id, week, day, [week+day]',
      exercises: '++id, session_id',
      logged_sets: '++id, [exercise_id+log_date+set_number], exercise_id, log_date',
      session_logs: '++id, session_id, log_date, [session_id+log_date]',
      hrv_logs: '++id, log_date',
      user_meta: 'key',
      interval_splits: '++id, session_log_id, [session_log_id+round_number]',
    })
  }
}

export const db = new Sub75DB()
