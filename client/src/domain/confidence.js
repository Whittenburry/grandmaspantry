const MS_PER_DAY = 86_400_000

export const STALE_AFTER_DAYS = 90
export const CONFIDENCE_FRESH = 'fresh'
export const CONFIDENCE_STALE = 'stale'

const SINGULARS = {
  jars: 'jar',
  lbs: 'lb',
  packs: 'pack',
  packages: 'package',
  count: 'count',
}

function unitFor(quantity, unit) {
  if (quantity === 1) return SINGULARS[unit] ?? unit.replace(/s$/, '')
  return unit
}

function lastTouched(item) {
  const stamps = [item.lastVerifiedAt, item.updatedAt]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
  return stamps.length ? Math.max(...stamps) : null
}

export function countConfidence(item, now) {
  const touched = lastTouched(item)
  if (touched === null) return CONFIDENCE_STALE
  const days = (now.getTime() - touched) / MS_PER_DAY
  return days > STALE_AFTER_DAYS ? CONFIDENCE_STALE : CONFIDENCE_FRESH
}

/**
 * The honesty rule. A count we have not confirmed recently is presented as
 * an estimate with the date of the last check, never as a bare number. An
 * app that is confidently wrong once is not trusted again.
 */
export function formatCount(item, now) {
  const unit = unitFor(item.quantity, item.unit)
  if (countConfidence(item, now) === CONFIDENCE_FRESH) {
    return `${item.quantity} ${unit}`
  }
  const checked = new Date(lastTouched(item))
  const when = checked.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  return `about ${item.quantity} ${unit} · last checked in ${when}`
}
