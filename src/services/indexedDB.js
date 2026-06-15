const DB_NAME = 'printpro'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, callback) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', mode)
    const store = tx.objectStore('projects')
    callback(store, resolve, reject)
    tx.oncomplete = () => {
      db.close()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function idbCreate(id, data) {
  return withStore('readwrite', (store, resolve, reject) => {
    const req = store.put({ id, ...data })
    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
  })
}

export async function idbRead(id) {
  return withStore('readonly', (store, resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function idbUpdate(id, data) {
  return withStore('readwrite', (store, resolve, reject) => {
    const req = store.put({ id, ...data })
    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
  })
}

export async function idbDelete(id) {
  return withStore('readwrite', (store, resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function idbList() {
  return withStore('readonly', (store, resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}
