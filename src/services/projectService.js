import { db } from '../utils/firebase'
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { idbCreate, idbRead, idbUpdate, idbDelete, idbList } from './indexedDB'

const PROJECTS_COL = 'projects'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function makeStorage(user) {
  if (user) {
    // Firebase Firestore
    return {
      async create(id, data) {
        const ref = doc(db, 'users', user.uid, PROJECTS_COL, id)
        await setDoc(ref, data)
      },
      async read(id) {
        const ref = doc(db, 'users', user.uid, PROJECTS_COL, id)
        const snap = await getDoc(ref)
        return snap.exists() ? { id: snap.id, ...snap.data() } : null
      },
      async update(id, data) {
        const ref = doc(db, 'users', user.uid, PROJECTS_COL, id)
        await setDoc(ref, data, { merge: true })
      },
      async remove(id) {
        const ref = doc(db, 'users', user.uid, PROJECTS_COL, id)
        await deleteDoc(ref)
      },
      async list() {
        const q = query(
          collection(db, 'users', user.uid, PROJECTS_COL),
          orderBy('updatedAt', 'desc')
        )
        const snap = await getDocs(q)
        const items = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
        return items
      },
      async removeAll() {
        const q = query(collection(db, 'users', user.uid, PROJECTS_COL))
        const snap = await getDocs(q)
        const batch = writeBatch(db)
        snap.forEach((d) => batch.delete(d.ref))
        await batch.commit()
      },
    }
  }

  // IndexedDB fallback
  return {
    async create(id, data) {
      await idbCreate(id, data)
    },
    async read(id) {
      return idbRead(id)
    },
    async update(id, data) {
      await idbUpdate(id, data)
    },
    async remove(id) {
      await idbDelete(id)
    },
    async list() {
      const all = await idbList()
      all.sort((a, b) => {
        const da = a.updatedAt || a.createdAt || ''
        const db = b.updatedAt || b.createdAt || ''
        return da < db ? 1 : da > db ? -1 : 0
      })
      return all
    },
    async removeAll() {
      const all = await idbList()
      for (const p of all) {
        await idbDelete(p.id)
      }
    },
  }
}

export function getStorage(user) {
  return makeStorage(user)
}

export { generateId }
