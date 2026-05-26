import type { Memory } from './supabase'

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  totalSharedDays: number
}

// Compute streak from memories list
// A "streak day" = a date where BOTH anthony and yeon uploaded
export function computeStreak(memories: Memory[]): StreakInfo {
  // Group memories by date
  const byDate: Record<string, Set<string>> = {}
  for (const m of memories) {
    if (!byDate[m.date]) byDate[m.date] = new Set()
    byDate[m.date].add(m.identity)
  }

  // Find all dates where both uploaded
  const sharedDates = Object.entries(byDate)
    .filter(([, identities]) => identities.has('anthony') && identities.has('yeon'))
    .map(([date]) => date)
    .sort()

  const totalSharedDays = sharedDates.length

  if (sharedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalSharedDays: 0 }
  }

  // Compute current streak (consecutive days ending today or yesterday)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const lastDate = sharedDates[sharedDates.length - 1]
  let currentStreak = 0

  if (lastDate === todayStr || lastDate === yesterdayStr) {
    // Walk back from lastDate counting consecutive days
    let checkDate = new Date(lastDate + 'T00:00:00Z')
    const sharedSet = new Set(sharedDates)

    while (true) {
      const ds = checkDate.toISOString().split('T')[0]
      if (sharedSet.has(ds)) {
        currentStreak++
        checkDate.setUTCDate(checkDate.getUTCDate() - 1)
      } else {
        break
      }
    }
  }

  // Compute longest streak
  let longestStreak = 0
  let runStreak = 1

  for (let i = 1; i < sharedDates.length; i++) {
    const prev = new Date(sharedDates[i - 1] + 'T00:00:00Z')
    const curr = new Date(sharedDates[i] + 'T00:00:00Z')
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      runStreak++
    } else {
      longestStreak = Math.max(longestStreak, runStreak)
      runStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, runStreak)

  return { currentStreak, longestStreak, totalSharedDays }
}

// Garden growth level based on streak
export function getGardenLevel(streak: number): 0 | 1 | 2 {
  if (streak >= 14) return 2
  if (streak >= 7) return 1
  return 0
}

export function getTodayUTC(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}
