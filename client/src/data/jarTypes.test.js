import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import { listJarTypes, getJarType, addJarType } from './jarTypes.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('listJarTypes', () => {
  it('returns the catalog smallest first', async () => {
    const ounces = (await listJarTypes()).map((j) => j.ounces)
    expect(ounces).toEqual([4, 8, 8, 12, 16, 16, 24, 32, 32, 64])
  })
})

describe('getJarType', () => {
  it('fetches a seeded jar by its stable slug', async () => {
    const jar = await getJarType('quart-wide')
    expect(jar.name).toBe('Quart')
    expect(jar.mouth).toBe('Wide')
  })

  it('returns undefined for an unknown id', async () => {
    expect(await getJarType('nope')).toBeUndefined()
  })
})

describe('addJarType', () => {
  it('adds a jar the catalog is missing', async () => {
    const added = await addJarType({
      name: 'Twelve-ounce squat',
      ounces: 12,
      millilitres: 355,
      mouth: 'Wide',
    })
    expect(added.isSeeded).toBe(false)
    expect(await getJarType(added.id)).toBeTruthy()
  })

  it('rejects a jar with no name', async () => {
    await expect(
      addJarType({ name: '', ounces: 12, millilitres: 355, mouth: 'Wide' })
    ).rejects.toThrow('Jar name is required')
  })

  it('rejects an unknown mouth type', async () => {
    await expect(
      addJarType({ name: 'Odd', ounces: 12, millilitres: 355, mouth: 'Square' })
    ).rejects.toThrow('Mouth must be Regular or Wide')
  })
})
