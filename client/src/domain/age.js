const MS_PER_DAY = 86_400_000

/**
 * Normalises a YYYY-MM-DD string or a Date to local midnight, so that
 * comparisons are between calendar days rather than instants.
 */
function toCalendarDate(value) {
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function daysBetween(from, to) {
  // Rounded, not floored: a DST transition makes the span 23 or 25 hours.
  return Math.round((toCalendarDate(to) - toCalendarDate(from)) / MS_PER_DAY)
}

export function monthsBetween(from, to) {
  const start = toCalendarDate(from)
  const end = toCalendarDate(to)
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  return months
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function formatAge(from, to) {
  const days = daysBetween(from, to)
  if (days < 0) return 'dated in the future'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'

  const months = monthsBetween(from, to)
  if (months < 1) return `${days} days ago`
  if (months < 24) return `${plural(months, 'month')} ago`

  const years = Math.floor(months / 12)
  const remainder = months % 12
  if (remainder === 0) return `${plural(years, 'year')} ago`
  return `${plural(years, 'year')}, ${plural(remainder, 'month')} ago`
}
