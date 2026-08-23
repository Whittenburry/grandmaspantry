import { describe, it, expect } from 'vitest'
import { describeJarType } from './jars.js'

describe('describeJarType', () => {
  it('names the jar with its volume and mouth', () => {
    expect(
      describeJarType({ name: 'Quart', ounces: 32, mouth: 'Wide' })
    ).toBe('Quart (32 oz) · Wide mouth')
  })

  it('distinguishes the two pints, which differ only by mouth', () => {
    const regular = describeJarType({ name: 'Pint', ounces: 16, mouth: 'Regular' })
    const wide = describeJarType({ name: 'Pint', ounces: 16, mouth: 'Wide' })
    expect(regular).not.toBe(wide)
  })

  it('returns an empty string for a missing jar type', () => {
    expect(describeJarType(null)).toBe('')
  })
})
