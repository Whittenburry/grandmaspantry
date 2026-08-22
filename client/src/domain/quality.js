import { monthsBetween } from './age.js'
import { CATEGORY_CANNED } from './categories.js'

export const QUALITY_GOOD = 'good'
export const QUALITY_USE_SOON = 'use-soon'
export const QUALITY_PAST_BEST = 'past-best'

/**
 * USDA guidance: home-canned foods are best used within a year, and
 * high-acid goods hold their quality for 12 to 18 months. These bands
 * describe QUALITY ONLY. The app never asserts that food is safe or
 * unsafe to eat — that judgement belongs to the person holding the jar.
 */
export function qualityBand(dateStocked, now) {
  const months = monthsBetween(dateStocked, now)
  if (months < 12) return QUALITY_GOOD
  if (months <= 18) return QUALITY_USE_SOON
  return QUALITY_PAST_BEST
}

export function qualityLabel(band) {
  switch (band) {
    case QUALITY_GOOD:
      return 'Good'
    case QUALITY_USE_SOON:
      return 'Use soon'
    case QUALITY_PAST_BEST:
      return 'Past best quality'
    default:
      return ''
  }
}

export function bandForItem(item, now) {
  if (item.category !== CATEGORY_CANNED) return null
  return qualityBand(item.dateStocked, now)
}
