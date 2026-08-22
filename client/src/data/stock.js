import { openDatabase } from './db.js'
import { validateStockInput } from '../domain/validation.js'

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
