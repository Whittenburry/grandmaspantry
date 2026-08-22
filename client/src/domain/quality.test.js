import { describe, it, expect } from 'vitest'
import {
  qualityBand,
  qualityLabel,
  bandForItem,
  QUALITY_GOOD,
  QUALITY_USE_SOON,
  QUALITY_PAST_BEST,
} from './quality.js'
import {
  CATEGORY_CANNED,
  CATEGORY_FREEZER,
  CATEGORY_SUPPLY,
} from './categories.js'

const now = new Date(2026, 7, 22, 13, 30)

describe('qualityBand', () => {
  it('is good under twelve months', () => {
    expect(qualityBand('2026-08-01', now)).toBe(QUALITY_GOOD)
    expect(qualityBand('2025-09-22', now)).toBe(QUALITY_GOOD)
  })

  it('says use soon from twelve through eighteen months inclusive', () => {
    expect(qualityBand('2025-08-22', now)).toBe(QUALITY_USE_SOON)
    // Exactly eighteen months: still use soon, not past best.
    expect(qualityBand('2025-02-22', now)).toBe(QUALITY_USE_SOON)
  })

  it('is past best quality beyond eighteen months', () => {
    // Nineteen months. Anything in February 2025 is still eighteen whole
    // months from 22 August 2026, so the boundary case needs January.
    expect(qualityBand('2025-01-22', now)).toBe(QUALITY_PAST_BEST)
    expect(qualityBand('2023-01-01', now)).toBe(QUALITY_PAST_BEST)
  })
})

describe('qualityLabel', () => {
  it('describes quality, never safety', () => {
    expect(qualityLabel(QUALITY_GOOD)).toBe('Good')
    expect(qualityLabel(QUALITY_USE_SOON)).toBe('Use soon')
    expect(qualityLabel(QUALITY_PAST_BEST)).toBe('Past best quality')
  })

  it('never claims anything is unsafe, expired, or bad', () => {
    const forbidden = /unsafe|expired|spoiled|bad|do not eat|discard|toxic/i
    for (const band of [QUALITY_GOOD, QUALITY_USE_SOON, QUALITY_PAST_BEST]) {
      expect(qualityLabel(band)).not.toMatch(forbidden)
    }
  })
})

describe('bandForItem', () => {
  it('bands canned items', () => {
    const item = { category: CATEGORY_CANNED, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBe(QUALITY_PAST_BEST)
  })

  it('refuses to band freezer items, whose windows vary too much by food', () => {
    const item = { category: CATEGORY_FREEZER, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBeNull()
  })

  it('refuses to band supplies, which do not age', () => {
    const item = { category: CATEGORY_SUPPLY, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBeNull()
  })
})
