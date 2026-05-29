import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAOeHbDs4pPKLl-y9Vk3uL-t_HtxpsveuQ",
  authDomain: "print-pro-d5e33.firebaseapp.com",
  projectId: "print-pro-d5e33",
  storageBucket: "print-pro-d5e33.firebasestorage.app",
  messagingSenderId: "350007196764",
  appId: "1:350007196764:web:51a91959a954634dccfa99",
  measurementId: "G-YXVW9KJ95P"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
}
