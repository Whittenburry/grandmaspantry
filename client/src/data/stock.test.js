import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import {
  createStock,
  getStock,
  listStock,
  updateStock,
  useOne,
  verifyCount,
  SUPPLY_EMPTY_JAR,
} from './stock.js'
import {
  CATEGORY_CANNED,
  CATEGORY_FREEZER,
  CATEGORY_SUPPLY,
} from '../domain/categories.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

const jam = (overrides) => ({
  category: CATEGORY_CANNED,
  name: 'Strawberry jam',
  quantity: 12,
  unit: 'jars',
  dateStocked: '2026-07-04',
  jarTypeId: 'half-pint',
  locationId: 'basement-shelf',
  ...overrides,
})

describe('createStock', () => {
  it('stores an item and returns it with generated fields', async () => {
    const item = await createStock(jam())
    expect(item.id).toBeTruthy()
    expect(item.quantity).toBe(12)
    expect(item.initialQuantity).toBe(12)
    expect(item.archivedAt).toBeNull()
    expect(item.createdAt).toBe(item.updatedAt)
  })

  it('treats creation as a verification, since she just counted them', async () => {
    const item = await createStock(jam())
    expect(item.lastVerifiedAt).toBe(item.createdAt)
  })

  it('trims the name', async () => {
    const item = await createStock(jam({ name: '  Peach butter  ' }))
    expect(item.name).toBe('Peach butter')
  })

  it('defaults the optional fields rather than leaving them undefined', async () => {
    const item = await createStock(jam())
    expect(item.notes).toBe('')
    expect(item.method).toBe('')
    expect(item.useByDate).toBeNull()
    expect(item.recipeId).toBeNull()
  })

  it('rejects invalid input with every problem at once', async () => {
    await expect(
      createStock(jam({ name: '', quantity: -3 }))
    ).rejects.toThrow(/Name is required.*Quantity cannot be negative/)
  })

  it('persists the item so it can be fetched again', async () => {
    const item = await createStock(jam())
    expect((await getStock(item.id)).name).toBe('Strawberry jam')
  })
})

describe('listStock', () => {
  beforeEach(async () => {
    await createStock(jam({ name: 'Old jam', dateStocked: '2024-01-01' }))
    await createStock(jam({ name: 'New jam', dateStocked: '2026-08-01' }))
    await createStock({
      category: CATEGORY_FREEZER,
      name: 'Ground beef',
      quantity: 8,
      unit: 'lbs',
      dateStocked: '2026-05-01',
      locationId: 'basement-freezer',
    })
  })

  it('returns everything oldest first, because that is what to open next', async () => {
    const names = (await listStock()).map((i) => i.name)
    expect(names).toEqual(['Old jam', 'Ground beef', 'New jam'])
  })

  it('filters by category', async () => {
    const items = await listStock({ category: CATEGORY_FREEZER })
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Ground beef')
  })

  it('filters by location, since stock is spread across several places', async () => {
    const items = await listStock({ locationId: 'basement-freezer' })
    expect(items.map((i) => i.name)).toEqual(['Ground beef'])
  })

  it('hides archived items by default', async () => {
    const [oldest] = await listStock()
    await updateStock(oldest.id, { archivedAt: new Date().toISOString() })
    expect((await listStock()).map((i) => i.name)).toEqual([
      'Ground beef',
      'New jam',
    ])
  })

  it('includes archived items on request', async () => {
    const [oldest] = await listStock()
    await updateStock(oldest.id, { archivedAt: new Date().toISOString() })
    expect(await listStock({ includeArchived: true })).toHaveLength(3)
  })
})

describe('updateStock', () => {
  it('applies a patch and advances updatedAt', async () => {
    const item = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = await updateStock(item.id, { notes: 'Extra sweet' })
    expect(updated.notes).toBe('Extra sweet')
    expect(updated.updatedAt > item.updatedAt).toBe(true)
  })

  it('moves an item to another location without touching anything else', async () => {
    const item = await createStock(jam())
    const moved = await updateStock(item.id, { locationId: 'pantry' })
    expect(moved.locationId).toBe('pantry')
    expect(moved.quantity).toBe(12)
  })

  it('refuses to patch an id that does not exist', async () => {
    await expect(updateStock('missing', { notes: 'x' })).rejects.toThrow(
      'No stock item with id missing'
    )
  })

  it('revalidates, so a patch cannot make an item invalid', async () => {
    const item = await createStock(jam())
    await expect(updateStock(item.id, { quantity: -1 })).rejects.toThrow(
      'Quantity cannot be negative'
    )
  })

  it('never lets a patch rewrite the id', async () => {
    const item = await createStock(jam())
    const updated = await updateStock(item.id, { id: 'hijacked' })
    expect(updated.id).toBe(item.id)
  })
})

describe('useOne', () => {
  it('decrements the count', async () => {
    const created = await createStock(jam())
    const { item } = await useOne(created.id)
    expect(item.quantity).toBe(11)
  })

  it('counts using a jar as verifying it, so the count stays trustworthy', async () => {
    const created = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const { item } = await useOne(created.id)
    expect(item.lastVerifiedAt > created.lastVerifiedAt).toBe(true)
  })

  it('archives the item when the last one is used', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    const { item } = await useOne(created.id)
    expect(item.quantity).toBe(0)
    expect(item.archivedAt).not.toBeNull()
  })

  it('returns an empty jar of the same type to supplies', async () => {
    const created = await createStock(jam({ jarTypeId: 'quart-wide' }))
    const { returnedJar } = await useOne(created.id)
    expect(returnedJar.category).toBe(CATEGORY_SUPPLY)
    expect(returnedJar.supplyType).toBe(SUPPLY_EMPTY_JAR)
    expect(returnedJar.jarTypeId).toBe('quart-wide')
    expect(returnedJar.quantity).toBe(1)
  })

  it('adds to the existing empty jar record rather than creating a second', async () => {
    const created = await createStock(jam({ jarTypeId: 'pint-wide', quantity: 3 }))
    await useOne(created.id)
    await useOne(created.id)
    const supplies = await listStock({ category: CATEGORY_SUPPLY })
    expect(supplies).toHaveLength(1)
    expect(supplies[0].quantity).toBe(2)
  })

  it('keeps the two pints apart, since they are different jars', async () => {
    const regular = await createStock(jam({ jarTypeId: 'pint-regular' }))
    const wide = await createStock(jam({ name: 'Salsa', jarTypeId: 'pint-wide' }))
    await useOne(regular.id)
    await useOne(wide.id)
    const supplies = await listStock({ category: CATEGORY_SUPPLY })
    expect(supplies).toHaveLength(2)
    expect(supplies.map((s) => s.jarTypeId).sort()).toEqual([
      'pint-regular',
      'pint-wide',
    ])
  })

  it('does not return a jar for freezer items', async () => {
    const beef = await createStock({
      category: CATEGORY_FREEZER,
      name: 'Ground beef',
      quantity: 8,
      unit: 'lbs',
      dateStocked: '2026-05-01',
    })
    const { returnedJar } = await useOne(beef.id)
    expect(returnedJar).toBeNull()
  })

  it('refuses to use an item that is already gone', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    await useOne(created.id)
    await expect(useOne(created.id)).rejects.toThrow(
      'Strawberry jam is already used up'
    )
  })

  it('refuses an unknown id', async () => {
    await expect(useOne('missing')).rejects.toThrow(
      'No stock item with id missing'
    )
  })
})

describe('verifyCount', () => {
  it('sets the count and marks it verified', async () => {
    const created = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const checked = await verifyCount(created.id, 9)
    expect(checked.quantity).toBe(9)
    expect(checked.lastVerifiedAt > created.lastVerifiedAt).toBe(true)
  })

  it('archives an item found to be empty', async () => {
    const created = await createStock(jam())
    const checked = await verifyCount(created.id, 0)
    expect(checked.archivedAt).not.toBeNull()
  })

  it('un-archives an item found on the shelf after all', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    await useOne(created.id)
    const checked = await verifyCount(created.id, 4)
    expect(checked.quantity).toBe(4)
    expect(checked.archivedAt).toBeNull()
  })

  it('rejects a negative count', async () => {
    const created = await createStock(jam())
    await expect(verifyCount(created.id, -1)).rejects.toThrow(
      'Quantity cannot be negative'
    )
  })
})
