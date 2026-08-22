import { openDatabase } from './db.js'

const MOUTHS = ['Regular', 'Wide']

function byOrder(a, b) {
  return a.sortOrder - b.sortOrder
}

export async function listJarTypes() {
  const db = await openDatabase()
  const all = await db.getAll('jarTypes')
  return all.sort(byOrder)
}

export async function getJarType(id) {
  if (!id) return undefined
  const db = await openDatabase()
  return db.get('jarTypes', id)
}

export async function addJarType({ name, ounces, millilitres, mouth }) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) throw new Error('Jar name is required')
  if (!MOUTHS.includes(mouth)) throw new Error('Mouth must be Regular or Wide')

  const db = await openDatabase()
  const existing = await db.getAll('jarTypes')

  const jarType = {
    id: crypto.randomUUID(),
    name: trimmed,
    ounces,
    millilitres,
    mouth,
    isSeeded: false,
    sortOrder: Math.max(0, ...existing.map((j) => j.sortOrder)) + 10,
  }
  await db.add('jarTypes', jarType)
  return jarType
}
