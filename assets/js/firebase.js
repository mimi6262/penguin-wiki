// Firebase 초기화 — 웹 키는 원래 브라우저에 공개되는 값이며, 실제 보호는 firestore.rules가 담당합니다.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDVsk_z73AMxG3g-RNWy0XX_7AdmhSyFDw',
  authDomain: 'penguin-wiki.firebaseapp.com',
  projectId: 'penguin-wiki',
  storageBucket: 'penguin-wiki.firebasestorage.app',
  messagingSenderId: '854268431027',
  appId: '1:854268431027:web:719289f8c8985a8d167ec6',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firestore SDK 재export — 각 화면에서 이 파일 하나만 import하면 됩니다.
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
