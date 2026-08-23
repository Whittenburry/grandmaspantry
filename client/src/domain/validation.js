import { CATEGORIES, CATEGORY_CANNED, CATEGORY_SUPPLY } from './categories.js'

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Returns every problem with the input, not just the first, so a form can
 * show all of them at once instead of making the user resubmit repeatedly.
 */
export function validateStockInput(input) {
  const problems = []

  if (!input.name || !input.name.trim()) {
    problems.push('Name is required')
  }

  if (!CATEGORIES.includes(input.category)) {
    problems.push(`Category must be one of: ${CATEGORIES.join(', ')}`)
  }

  if (typeof input.quantity !== 'number' || Number.isNaN(input.quantity)) {
    problems.push('Quantity must be a number')
  } else if (input.quantity < 0) {
    problems.push('Quantity cannot be negative')
  } else if (input.unit === 'jars' && !Number.isInteger(input.quantity)) {
    problems.push('Jars must be a whole number')
  }

  if (!input.unit) {
    problems.push('Unit is required')
  }

  if (!input.dateStocked || !CALENDAR_DATE.test(input.dateStocked)) {
    problems.push('Date must be in YYYY-MM-DD form')
  }

  if (input.category === CATEGORY_CANNED && !input.jarTypeId) {
    problems.push('Canned items need a jar type')
  }

  if (input.category === CATEGORY_SUPPLY && !input.supplyType) {
    problems.push('Supplies need a supply type')
  }

  return problems
}
