import { describe, it, expect } from 'vitest'
import {
  countConfidence,
  formatCount,
  CONFIDENCE_FRESH,
  CONFIDENCE_STALE,
} from './confidence.js'

const now = new Date(2026, 7, 22, 13, 30)
const iso = (y, m, d) => new Date(y, m - 1, d, 9, 0).toISOString()

const item = (overrides) => ({
  quantity: 6,
  unit: 'jars',
  updatedAt: iso(2026, 8, 1),
  lastVerifiedAt: null,
  ...overrides,
})

describe('countConfidence', () => {
  it('is fresh when recently verified', () => {
    expect(countConfidence(item({ lastVerifiedAt: iso(2026, 7, 1) }), now))
      .toBe(CONFIDENCE_FRESH)
  })

  it('is fresh when recently updated even without a verification', () => {
    expect(countConfidence(item({ updatedAt: iso(2026, 8, 20) }), now))
      .toBe(CONFIDENCE_FRESH)
  })

  it('goes stale past ninety days', () => {
    expect(
      countConfidence(
        item({ updatedAt: iso(2026, 1, 1), lastVerifiedAt: iso(2026, 1, 1) }),
        now
      )
    ).toBe(CONFIDENCE_STALE)
  })

  it('uses the most recent of the two timestamps', () => {
    expect(
      countConfidence(
        item({ updatedAt: iso(2026, 1, 1), lastVerifiedAt: iso(2026, 8, 10) }),
        now
      )
    ).toBe(CONFIDENCE_FRESH)
  })
})

describe('formatCount', () => {
  it('states a fresh count plainly', () => {
    expect(formatCount(item({ lastVerifiedAt: iso(2026, 8, 10) }), now))
      .toBe('6 jars')
  })

  it('singularises a count of one', () => {
    expect(
      formatCount(item({ quantity: 1, lastVerifiedAt: iso(2026, 8, 10) }), now)
    ).toBe('1 jar')
  })

  it('singularises pounds and packs', () => {
    const fresh = { updatedAt: iso(2026, 8, 10) }
    expect(formatCount(item({ quantity: 1, unit: 'lbs', ...fresh }), now))
      .toBe('1 lb')
    expect(formatCount(item({ quantity: 1, unit: 'packs', ...fresh }), now))
      .toBe('1 pack')
  })

  it('hedges a stale count and says when it was last checked', () => {
    const stale = item({
      updatedAt: iso(2026, 3, 3),
      lastVerifiedAt: iso(2026, 3, 3),
    })
    expect(formatCount(stale, now)).toBe(
      'about 6 jars · last checked in March 2026'
    )
  })

  it('never states a stale count as though it were certain', () => {
    const stale = item({ updatedAt: iso(2025, 1, 1) })
    expect(formatCount(stale, now)).toMatch(/^about /)
  })
})
