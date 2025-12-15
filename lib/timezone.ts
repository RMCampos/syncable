// Time zone utilities for consistent handling of dates and times

// Default time zone identifier
export const DEFAULT_TIMEZONE = "America/Sao_Paulo"

// Brazilian time zone identifier (for backwards compatibility)
export const BRAZIL_TIMEZONE = "America/Sao_Paulo"

// Time zone offset for Brazil (UTC-3)
export const BRAZIL_TIMEZONE_OFFSET = "-03:00"

/**
 * Converts a date to a specific time zone
 */
export function toTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  // Create a new date object with the specified time zone
  return new Date(date.toLocaleString("en-US", { timeZone: timezone }))
}

/**
 * Converts a date to Brazilian time zone (backwards compatibility)
 */
export function toBrazilianTime(date: Date): Date {
  return toTimezone(date, BRAZIL_TIMEZONE)
}

/**
 * Formats a date for display in DD/MM/YYYY format
 */
export function formatDateBR(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formats time for display in 24-hour format
 */
export function formatTimeBR(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Formats a date string for HTML date input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const tzDate = toTimezone(date, timezone)
  const year = tzDate.getFullYear()
  const month = String(tzDate.getMonth() + 1).padStart(2, "0")
  const day = String(tzDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Formats a time string for HTML time input (HH:MM in 24-hour format)
 */
export function formatTimeForInput(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const tzDate = toTimezone(date, timezone)
  const hours = String(tzDate.getHours()).padStart(2, "0")
  const minutes = String(tzDate.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

/**
 * Creates a Date object from date and time strings in a specific time zone
 * Input: "2025-12-15", "09:00", "Europe/London"
 * Output: Date object representing 9:00 AM London time
 */
export function createDateInTimezone(dateStr: string, timeStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  // Parse the components
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  // Create a date formatter for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  // Start with a UTC date using the input values
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

  // See what this UTC time looks like when displayed in the target timezone
  const parts = formatter.formatToParts(utcGuess)
  const displayYear = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const displayMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0')
  const displayDay = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const displayHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const displayMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')

  // Calculate the offset: difference between what we want and what we got
  const inputTime = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const displayTime = Date.UTC(displayYear, displayMonth - 1, displayDay, displayHour, displayMinute, 0)
  const offset = inputTime - displayTime

  // Apply the offset to get the correct UTC time
  return new Date(utcGuess.getTime() + offset)
}

/**
 * Creates a Date object from date and time strings in Brazilian time zone (backwards compatibility)
 */
export function createBrazilianDate(dateStr: string, timeStr: string): Date {
  // Create a date string with explicit Brazilian time zone offset
  return new Date(`${dateStr}T${timeStr}:00${BRAZIL_TIMEZONE_OFFSET}`)
}

/**
 * Gets the current date and time in a specific time zone
 */
export function getNowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toTimezone(new Date(), timezone)
}

/**
 * Gets the current date and time in Brazilian time zone (backwards compatibility)
 */
export function getNowInBrazil(): Date {
  return getNowInTimezone(BRAZIL_TIMEZONE)
}

/**
 * Checks if two dates are on the same day in a specific time zone
 */
export function isSameDayBR(date1: Date, date2: Date, timezone: string = DEFAULT_TIMEZONE): boolean {
  const d1 = toTimezone(date1, timezone)
  const d2 = toTimezone(date2, timezone)

  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

/**
 * Gets the start of day for a given date in a specific time zone
 */
export function getStartOfDayBR(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const tzDate = toTimezone(date, timezone)
  tzDate.setHours(0, 0, 0, 0)
  return tzDate
}

/**
 * Gets the end of day for a given date in a specific time zone
 */
export function getEndOfDayBR(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const tzDate = toTimezone(date, timezone)
  tzDate.setHours(23, 59, 59, 999)
  return tzDate
}
