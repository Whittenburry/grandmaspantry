import { openDB } from 'idb'
import { SEED_LOCATIONS } from './seeds/locations.js'
import { SEED_JAR_TYPES } from './seeds/jarTypes.js'

export const DB_NAME = 'grandmas-shop'
export const DB_VERSION = 1

let dbPromise = null

/**
 * Every schema change gets a new DB_VERSION and its own `if (oldVersion < n)`
 * block below. Blocks run in order for a user upgrading across several
 * versions at once, so each must stand alone and must never be edited after
 * it has shipped.
 */
export function openDatabase() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const stock = db.createObjectStore('stock', { keyPath: 'id' })
          stock.createIndex('by-category', 'category')
          stock.createIndex('by-location', 'locationId')
          stock.createIndex('by-date-stocked', 'dateStocked')

          db.createObjectStore('recipes', { keyPath: 'id' })
          db.createObjectStore('photos', { keyPath: 'id' })
          db.createObjectStore('meta', { keyPath: 'key' })

          const locations = db.createObjectStore('locations', { keyPath: 'id' })
          for (const location of SEED_LOCATIONS) locations.add(location)

          const jarTypes = db.createObjectStore('jarTypes', { keyPath: 'id' })
          for (const jarType of SEED_JAR_TYPES) jarTypes.add(jarType)
        }
      },
    })
  }
  return dbPromise
}

/**
 * Closes and drops the cached connection. Used by tests between cases.
 * The close is essential: `deleteDB` blocks indefinitely while any
 * connection to the database is still open.
 */
export async function resetDatabaseHandle() {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}
