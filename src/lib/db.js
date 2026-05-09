import { openDB } from 'idb'

const DB_NAME = 'bookkeeping_db'
const DB_VERSION = 1
const STORE_NAME = 'records'

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('date', 'date')
        store.createIndex('type', 'type')
        store.createIndex('category', 'category')
        store.createIndex('platform', 'platform')
      }
    }
  })
}

export async function addRecord(record) {
  const db = await getDB()
  return db.add(STORE_NAME, {
    ...record,
    createdAt: new Date().toISOString()
  })
}

export async function updateRecord(id, updates) {
  const db = await getDB()
  const record = await db.get(STORE_NAME, id)
  if (record) {
    return db.put(STORE_NAME, { ...record, ...updates })
  }
  return null
}

export async function deleteRecord(id) {
  const db = await getDB()
  return db.delete(STORE_NAME, id)
}

export async function getAllRecords() {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

export async function getRecordsByDateRange(startDate, endDate) {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter(r => {
    const d = new Date(r.date)
    return d >= new Date(startDate) && d <= new Date(endDate)
  })
}

export async function getRecordsByDate(date) {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter(r => r.date === date)
}

export async function clearAllRecords() {
  const db = await getDB()
  return db.clear(STORE_NAME)
}

export async function importRecords(records) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const record of records) {
    await tx.store.add(record)
  }
  await tx.done
}
