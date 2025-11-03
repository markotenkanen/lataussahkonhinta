// The issue: Date objects are always in UTC internally. We can't create a Date that "is" in Finnish time.
// Solution: Keep dates in UTC, extract components in target timezone when needed for comparison

export function getDateInTimezone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value || "0"

  return {
    year: Number.parseInt(getValue("year")),
    month: Number.parseInt(getValue("month")) - 1, // months are 0-indexed
    day: Number.parseInt(getValue("day")),
    hour: Number.parseInt(getValue("hour")),
    minute: Number.parseInt(getValue("minute")),
    second: Number.parseInt(getValue("second")),
  }
}

export function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  const d1 = getDateInTimezone(date1, timezone)
  const d2 = getDateInTimezone(date2, timezone)
  return d1.year === d2.year && d1.month === d2.month && d1.day === d2.day
}

export function getHourInTimezone(date: Date, timezone: string): number {
  return getDateInTimezone(date, timezone).hour
}

export function getDateStringInTimezone(date: Date, timezone: string): string {
  const d = getDateInTimezone(date, timezone)
  return `${d.year}-${String(d.month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
}

export function formatTimeInTimezone(date: Date, timezone: string): string {
  return date.toLocaleTimeString("fi-FI", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Legacy functions for backward compatibility (Finnish timezone)
export function toFinnishTime(date: Date): Date {
  // This function is deprecated but kept for compatibility
  // It returns the original date since Date objects are always in UTC
  return date
}

export function getFinnishHour(date: Date): number {
  return getHourInTimezone(date, "Europe/Helsinki")
}

export function getFinnishDate(date: Date): string {
  return getDateStringInTimezone(date, "Europe/Helsinki")
}

export function isSameDayInFinland(date1: Date, date2: Date): boolean {
  return isSameDayInTimezone(date1, date2, "Europe/Helsinki")
}

export function formatFinnishTime(date: Date): string {
  return formatTimeInTimezone(date, "Europe/Helsinki")
}
