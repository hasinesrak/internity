import type { ActivityDay } from "./types"

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateShort(value: string | number | Date): string {
  return toDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function formatTime(value: string | number | Date): string {
  return toDate(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function startOfDay(value: Date): number {
  const copy = new Date(value)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

/** Whole days from today until the value. Negative when the value has passed. */
export function daysUntil(value: string | number | Date): number {
  return Math.round((startOfDay(toDate(value)) - startOfDay(new Date())) / DAY)
}

/** "2 hours ago", "Yesterday", "3 days ago", "on 12 Mar 2026". */
export function relativeTime(value: string | number | Date): string {
  const delta = Date.now() - toDate(value).getTime()
  if (delta < MINUTE) return "just now"
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} minutes ago`
  if (delta < DAY) {
    const hours = Math.floor(delta / HOUR)
    return hours === 1 ? "an hour ago" : `${hours} hours ago`
  }
  const days = Math.floor(delta / DAY)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return `on ${formatDate(value)}`
}

/** "Expires tomorrow", "Expires in 3 days", "Expired 2 days ago". */
export function expiryLabel(value: string | number | Date): string {
  const days = daysUntil(value)
  if (days < -1) return `Expired ${Math.abs(days)} days ago`
  if (days === -1) return "Expired yesterday"
  if (days === 0) return "Expires today"
  if (days === 1) return "Expires tomorrow"
  return `Expires in ${days} days`
}

/** True when a pending invitation lapses within `days` days. */
export function expiresWithin(value: string | number | Date, days: number): boolean {
  const remaining = daysUntil(value)
  return remaining >= 0 && remaining <= days
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB")
}

/** `values[week][day]` intensities for the heat calendar, Monday first. */
export function heatValues(days: ActivityDay[], weeks: number): number[][] {
  const max = Math.max(1, ...days.map((day) => day.count))
  const values: number[][] = Array.from({ length: weeks }, () =>
    Array.from({ length: 7 }, () => 0),
  )
  const end = new Date()
  const monday = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  )
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const first = new Date(monday)
  first.setUTCDate(first.getUTCDate() - (weeks - 1) * 7)

  for (const day of days) {
    const stamp = Date.parse(`${day.date}T00:00:00Z`)
    const offset = Math.round((stamp - first.getTime()) / 86_400_000)
    const week = Math.floor(offset / 7)
    const weekday = offset % 7
    if (week < 0 || week >= weeks || weekday < 0 || weekday > 6) continue
    values[week][weekday] = day.count / max
  }
  return values
}
