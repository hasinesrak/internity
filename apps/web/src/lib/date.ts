export const APP_TIMEZONE =
  import.meta.env.VITE_APP_TIMEZONE?.trim() || "Asia/Dhaka"

function partsFor(date: Date): Record<string, string> {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value
      return result
    }, {})
}

export function appDateKey(date = new Date()): string {
  const parts = partsFor(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function appMonthKey(date = new Date()): string {
  return appDateKey(date).slice(0, 7)
}

export function appDayNumber(date: Date): number {
  return Date.parse(`${appDateKey(date)}T00:00:00.000Z`)
}
