import { openDatabase } from './db.js'

function byOrder(a, b) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}

export async function listLocations() {
  const db = await openDatabase()
  const all = await db.getAll('locations')
  return all.sort(byOrder)
}

export async function addLocation(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) throw new Error('Location name is required')

  const db = await openDatabase()
  const existing = await db.getAll('locations')

  const clash = existing.some(
    (l) => l.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (clash) throw new Error(`A location named "${name}" already exists`)

  const location = {
    id: crypto.randomUUID(),
    name: trimmed,
    sortOrder: Math.max(0, ...existing.map((l) => l.sortOrder)) + 10,
    isSeeded: false,
    createdAt: new Date().toISOString(),
  }
  await db.add('locations', location)
  return location
}
