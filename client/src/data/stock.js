import { openDatabase } from './db.js'
import { validateStockInput } from '../domain/validation.js'
import { CATEGORY_CANNED, CATEGORY_SUPPLY } from '../domain/categories.js'

function assertValid(item) {
  const problems = validateStockInput(item)
  if (problems.length) throw new Error(problems.join('; '))
}

export async function createStock(input) {
  const now = new Date().toISOString()
  const item = {
    id: crypto.randomUUID(),
    category: input.category,
    name: (input.name ?? '').trim(),
    quantity: input.quantity,
    initialQuantity: input.quantity,
    unit: input.unit,
    dateStocked: input.dateStocked,
    locationId: input.locationId ?? null,
    // Creating an item is itself a count, so it starts fully verified.
    lastVerifiedAt: now,
    useByDate: input.useByDate ?? null,
    notes: input.notes ?? '',
    recipeId: input.recipeId ?? null,
    jarTypeId: input.jarTypeId ?? null,
    method: input.method ?? '',
    supplyType: input.supplyType ?? null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  assertValid(item)

  const db = await openDatabase()
  await db.add('stock', item)
  return item
}

export async function getStock(id) {
  const db = await openDatabase()
  return db.get('stock', id)
}

export async function listStock({
  category,
  locationId,
  includeArchived = false,
} = {}) {
  const db = await openDatabase()
  let items = await db.getAll('stock')

  if (category) items = items.filter((i) => i.category === category)
  if (locationId) items = items.filter((i) => i.locationId === locationId)
  if (!includeArchived) items = items.filter((i) => !i.archivedAt)

  // Oldest first: the shelf's whole job is answering "what do I open next?"
  return items.sort(
    (a, b) =>
      a.dateStocked.localeCompare(b.dateStocked) || a.name.localeCompare(b.name)
  )
}

export async function updateStock(id, patch) {
  const db = await openDatabase()
  const existing = await db.get('stock', id)
  if (!existing) throw new Error(`No stock item with id ${id}`)

  const updated = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  assertValid(updated)

  await db.put('stock', updated)
  return updated
}

export const SUPPLY_EMPTY_JAR = 'empty-jar'

/**
 * Finds the open empty-jar record for this jar type and adds one, creating
 * the record if she has never had empties of this type before. Matching is
 * on jarTypeId, not size, so a wide-mouth quart returns a wide-mouth quart.
 *
 * Runs inside the caller's transaction so the decrement and the return
 * either both land or neither does.
 */
async function returnEmptyJar(store, jarTypeId, now) {
  const all = await store.getAll()
  const existing = all.find(
    (i) =>
      i.category === CATEGORY_SUPPLY &&
      i.supplyType === SUPPLY_EMPTY_JAR &&
      i.jarTypeId === jarTypeId &&
      !i.archivedAt
  )

  if (existing) {
    const updated = { ...existing, quantity: existing.quantity + 1, updatedAt: now }
    await store.put(updated)
    return updated
  }

  const created = {
    id: crypto.randomUUID(),
    category: CATEGORY_SUPPLY,
    name: 'Empty jars',
    quantity: 1,
    initialQuantity: 1,
    unit: 'jars',
    dateStocked: now.slice(0, 10),
    locationId: null,
    lastVerifiedAt: now,
    useByDate: null,
    notes: '',
    recipeId: null,
    jarTypeId,
    method: '',
    supplyType: SUPPLY_EMPTY_JAR,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await store.put(created)
  return created
}

export async function useOne(id) {
  const db = await openDatabase()
  const tx = db.transaction('stock', 'readwrite')
  const store = tx.objectStore('stock')

  const existing = await store.get(id)
  if (!existing) throw new Error(`No stock item with id ${id}`)
  if (existing.quantity <= 0) {
    throw new Error(`${existing.name} is already used up`)
  }

  const now = new Date().toISOString()
  const quantity = existing.quantity - 1
  const item = {
    ...existing,
    quantity,
    // Handling an item is evidence of its count, so this counts as a check.
    lastVerifiedAt: now,
    updatedAt: now,
    archivedAt: quantity === 0 ? now : existing.archivedAt,
  }
  await store.put(item)

  let returnedJar = null
  if (item.category === CATEGORY_CANNED && item.jarTypeId) {
    returnedJar = await returnEmptyJar(store, item.jarTypeId, now)
  }

  await tx.done
  return { item, returnedJar }
}

export async function verifyCount(id, quantity) {
  const db = await openDatabase()
  const existing = await db.get('stock', id)
  if (!existing) throw new Error(`No stock item with id ${id}`)

  const now = new Date().toISOString()
  const updated = {
    ...existing,
    quantity,
    lastVerifiedAt: now,
    updatedAt: now,
    archivedAt: quantity === 0 ? (existing.archivedAt ?? now) : null,
  }
  assertValid(updated)

  await db.put('stock', updated)
  return updated
}
