import { describe, it, expect } from 'vitest'
import { daysBetween, monthsBetween, formatAge } from './age.js'

const at = (y, m, d) => new Date(y, m - 1, d, 13, 30)

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-08-01', at(2026, 8, 22))).toBe(21)
  })

  it('returns 0 for the same day regardless of time of day', () => {
    expect(daysBetween('2026-08-22', at(2026, 8, 22))).toBe(0)
  })

  it('survives a daylight-saving transition', () => {
    expect(daysBetween('2026-03-07', at(2026, 3, 9))).toBe(2)
  })

  it('is negative for future dates', () => {
    expect(daysBetween('2026-09-01', at(2026, 8, 22))).toBe(-10)
  })
})

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2025-08-22', at(2026, 8, 22))).toBe(12)
  })

  it('does not count a month until the day-of-month is reached', () => {
    expect(monthsBetween('2025-08-23', at(2026, 8, 22))).toBe(11)
  })

  it('handles multi-year spans', () => {
    expect(monthsBetween('2024-02-10', at(2026, 8, 22))).toBe(30)
  })
})

describe('formatAge', () => {
  it.each([
    ['2026-08-22', 'today'],
    ['2026-08-21', 'yesterday'],
    ['2026-08-17', '5 days ago'],
    ['2026-07-20', '1 month ago'],
    ['2026-02-22', '6 months ago'],
    ['2025-06-22', '14 months ago'],
    ['2024-08-22', '2 years ago'],
    ['2024-05-22', '2 years, 3 months ago'],
  ])('renders %s as "%s"', (date, expected) => {
    expect(formatAge(date, at(2026, 8, 22))).toBe(expected)
  })

  it('does not pretend a future date is old', () => {
    expect(formatAge('2026-12-01', at(2026, 8, 22))).toBe('dated in the future')
  })
})
