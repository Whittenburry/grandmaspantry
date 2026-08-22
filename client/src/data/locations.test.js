import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import { listLocations, addLocation } from './locations.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('listLocations', () => {
  it('returns the seeded locations in order', async () => {
    const names = (await listLocations()).map((l) => l.name)
    expect(names).toEqual([
      'Basement freezer',
      'Kitchen freezer',
      'Basement shelf',
      'Pantry',
    ])
  })
})

describe('addLocation', () => {
  it('adds a location at the end of the order', async () => {
    const added = await addLocation('Garage shelf')
    expect(added.name).toBe('Garage shelf')
    expect(added.isSeeded).toBe(false)
    const names = (await listLocations()).map((l) => l.name)
    expect(names[names.length - 1]).toBe('Garage shelf')
  })

  it('trims surrounding whitespace', async () => {
    const added = await addLocation('  Spare fridge  ')
    expect(added.name).toBe('Spare fridge')
  })

  it('rejects a blank name', async () => {
    await expect(addLocation('   ')).rejects.toThrow('Location name is required')
  })

  it('rejects a duplicate name regardless of case', async () => {
    await expect(addLocation('basement FREEZER')).rejects.toThrow(
      'A location named "basement FREEZER" already exists'
    )
  })
})
