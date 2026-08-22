import { describe, it, expect } from 'vitest'
import { validateStockInput } from './validation.js'
import { CATEGORY_CANNED, CATEGORY_FREEZER, CATEGORY_SUPPLY } from './categories.js'

const valid = (overrides) => ({
  category: CATEGORY_FREEZER,
  name: 'Ground beef',
  quantity: 5,
  unit: 'lbs',
  dateStocked: '2026-08-01',
  ...overrides,
})

describe('validateStockInput', () => {
  it('accepts a valid item', () => {
    expect(validateStockInput(valid())).toEqual([])
  })

  it('requires a name', () => {
    expect(validateStockInput(valid({ name: '   ' }))).toContain('Name is required')
  })

  it('rejects an unknown category', () => {
    expect(validateStockInput(valid({ category: 'pickled' })))
      .toContain('Category must be one of: canned, freezer, supply')
  })

  it('rejects a negative quantity', () => {
    expect(validateStockInput(valid({ quantity: -1 })))
      .toContain('Quantity cannot be negative')
  })

  it('rejects a non-integer jar count', () => {
    expect(validateStockInput(valid({ category: CATEGORY_CANNED, unit: 'jars', quantity: 2.5, jarTypeId: 'pint-regular' })))
      .toContain('Jars must be a whole number')
  })

  it('allows fractional pounds', () => {
    expect(validateStockInput(valid({ unit: 'lbs', quantity: 2.5 }))).toEqual([])
  })

  it('requires a unit', () => {
    expect(validateStockInput(valid({ unit: '' }))).toContain('Unit is required')
  })

  it('requires a calendar date in YYYY-MM-DD form', () => {
    expect(validateStockInput(valid({ dateStocked: '08/01/2026' })))
      .toContain('Date must be in YYYY-MM-DD form')
  })

  it('requires a jar type on canned items', () => {
    expect(validateStockInput(valid({ category: CATEGORY_CANNED, unit: 'jars', jarTypeId: null })))
      .toContain('Canned items need a jar type')
  })

  it('requires a supply type on supplies', () => {
    expect(validateStockInput(valid({ category: CATEGORY_SUPPLY, unit: 'count', supplyType: null })))
      .toContain('Supplies need a supply type')
  })

  it('reports every problem at once rather than only the first', () => {
    const problems = validateStockInput({ category: 'nope', name: '', quantity: -2, unit: '', dateStocked: 'x' })
    expect(problems.length).toBeGreaterThanOrEqual(5)
  })
})
