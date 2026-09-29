// 로그인 상태, 역할(guide/admin), 접속 이력
import {
  auth, db, doc, getDoc, addDoc, collection, serverTimestamp,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
  sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from './firebase.js';
import { $, $$, ROOT, toast } from './ui.js';

// 현재 편집자 정보 { uid, email, name, role } 또는 null
export let editor = null;
const listeners = new Set();

export function onEditorChange(cb) {
  listeners.add(cb);
  cb(editor);
  return () => listeners.delete(cb);
}

function applyToDom() {
  // data-auth="editor" 요소는 편집자에게만, data-auth="admin"은 운영자에게만 보입니다.
  $$('[data-auth]').forEach((el) => {
    const need = el.getAttribute('data-auth');
    const ok = editor && (need === 'editor' || (need === 'admin' && editor.role === 'admin'));
    el.hidden = !ok;
  });
  $$('.user-chip .user-name').forEach((el) => (el.textContent = editor?.name || ''));
  $$('.user-chip .role').forEach((el) => (el.textContent = editor ? (editor.role === 'admin' ? '운영자' : '가이드') : ''));
}

async function resolveEditor(user) {
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, 'editors', user.uid));
    if (!snap.exists()) return null; // 계정은 있지만 편집자 명단에 없음
    const d = snap.data();
    return { uid: user.uid, email: user.email, name: d.name || user.email, role: d.role || 'guide' };
  } catch (e) {
    console.warn('editor lookup failed', e);
    return null;
  }
}

let ready;
export function watchAuth() {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      editor = await resolveEditor(user);
      applyToDom();
      listeners.forEach((cb) => cb(editor));
      resolve(editor);
    });
  });
  return ready;
}

// 관리 화면 진입 보호: 편집자가 아니면 로그인으로 보냅니다.
export async function requireEditor({ admin = false } = {}) {
  const e = await watchAuth();
  if (!e || (admin && e.role !== 'admin')) {
    const back = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    location.replace(`${ROOT}admin/login.html?next=${back}`);
    return null;
  }
  return e;
}

export async function login(email, password, { remember = true } = {}) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const e = await resolveEditor(cred.user);
  if (!e) {
    await signOut(auth);
    throw new Error('편집자 명단에 없는 계정입니다. 운영자에게 등록을 요청해 주세요.');
  }
  // 접속 이력
  try {
    await addDoc(collection(db, 'loginLogs'), {
      uid: e.uid, name: e.name, email: e.email, role: e.role,
      at: serverTimestamp(), ua: navigator.userAgent.slice(0, 200),
    });
  } catch (err) {
    console.warn('login log failed', err);
  }
  return e;
}

export async function logout() {
  await signOut(auth);
  toast('로그아웃했습니다');
}

document.addEventListener('pw:logout', async () => {
  await logout();
  if (location.pathname.includes('/admin/')) location.href = `${ROOT}index.html`;
});

export const authErrorMessage = (err) => {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return '아이디 또는 비밀번호가 맞지 않습니다.';
  if (code.includes('too-many-requests')) return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (code.includes('network')) return '네트워크 연결을 확인해 주세요.';
  return err?.message || '로그인에 실패했습니다.';
};

// ---- 비밀번호 ----
// 다른 사람의 비밀번호는 브라우저에서 직접 바꿀 수 없습니다(Firebase 규칙). 대신 그 사람 메일로 재설정 링크를 보냅니다.
export async function sendResetMail(email) {
  await sendPasswordResetEmail(auth, email);
}
// 내 비밀번호 변경: 현재 비밀번호로 다시 확인한 뒤 새 비밀번호로 교체
export async function changeMyPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('로그인 상태가 아닙니다');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}
