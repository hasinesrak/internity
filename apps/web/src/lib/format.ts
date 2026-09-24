const DAY = 86_400_000

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function formatDateLong(value: string | number | Date): string {
  return toDate(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function formatTime(value: string | number | Date): string {
  return toDate(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTimeRange(start: string | number | Date, end: string | number | Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
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

/** "Due tomorrow", "Due in 3 days", "Due Friday", "Closed 2 weeks ago". */
export function relativeDue(value: string | number | Date): string {
  const days = daysUntil(value)
  if (days < -1) return `Closed ${formatDate(value)}`
  if (days === -1) return "Closed yesterday"
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  if (days <= 6) return `Due ${formatDate(value)}`
  return `Due ${formatDate(value)}`
}

export function dueInLabel(value: string | number | Date): string {
  const days = daysUntil(value)
  if (days < 0) return "Past"
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}

export function isDueWithin(value: string | number | Date | null, days: number): boolean {
  if (!value) return false
  const remaining = daysUntil(value)
  return remaining >= 0 && remaining <= days
}

export function formatScore(score: number | null, maxScore: number): string {
  if (score === null) return `— / ${maxScore}`
  return `${score} / ${maxScore}`
}
