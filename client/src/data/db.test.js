import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { openDatabase, resetDatabaseHandle, DB_NAME, DB_VERSION } from './db.js'
import { SEED_LOCATIONS } from './seeds/locations.js'
import { SEED_JAR_TYPES } from './seeds/jarTypes.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('openDatabase', () => {
  it('creates every object store', async () => {
    const db = await openDatabase()
    expect([...db.objectStoreNames].sort()).toEqual(
      ['jarTypes', 'locations', 'meta', 'photos', 'recipes', 'stock'].sort()
    )
  })

  it('indexes stock for the queries the shelf makes', async () => {
    const db = await openDatabase()
    const store = db.transaction('stock').objectStore('stock')
    expect([...store.indexNames].sort()).toEqual(
      ['by-category', 'by-date-stocked', 'by-location'].sort()
    )
  })

  it('opens at the declared version', async () => {
    const db = await openDatabase()
    expect(db.version).toBe(DB_VERSION)
  })

  it('seeds the storage locations', async () => {
    const db = await openDatabase()
    const stored = await db.getAll('locations')
    expect(stored).toHaveLength(SEED_LOCATIONS.length)
    expect(stored.map((l) => l.id)).toContain('basement-freezer')
  })

  it('seeds the full jar catalog', async () => {
    const db = await openDatabase()
    const stored = await db.getAll('jarTypes')
    expect(stored).toHaveLength(SEED_JAR_TYPES.length)
  })

  it('seeds both pints, which differ only by mouth', async () => {
    const db = await openDatabase()
    const regular = await db.get('jarTypes', 'pint-regular')
    const wide = await db.get('jarTypes', 'pint-wide')
    expect(regular.ounces).toBe(16)
    expect(wide.ounces).toBe(16)
    expect(regular.mouth).toBe('Regular')
    expect(wide.mouth).toBe('Wide')
  })

  it('returns the same connection on repeated calls', async () => {
    const first = await openDatabase()
    const second = await openDatabase()
    expect(first).toBe(second)
  })

  it('does not duplicate seeds when reopened', async () => {
    await openDatabase()
    await resetDatabaseHandle()
    const db = await openDatabase()
    expect(await db.getAll('jarTypes')).toHaveLength(SEED_JAR_TYPES.length)
  })
})
