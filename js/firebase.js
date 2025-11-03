// Módulo helper para Firebase (Auth + Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged as fbOnAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, runTransaction, doc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functionsClient = getFunctions(app);

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    // Popup may be blocked or environment may not support popup. Fallback a redirect.
    console.warn('signInWithPopup failed, falling back to redirect:', err.code, err.message);
    try {
      await signInWithRedirect(auth, provider);
      // signInWithRedirect will redirect the page and the flow completes after redirect.
      return null;
    } catch (err2) {
      console.error('signInWithRedirect also failed:', err2);
      throw err2;
    }
  }
}

// Manejar el resultado después de un signInWithRedirect
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) return result.user;
    return null;
  } catch (err) {
    // Propaga el error para que el cliente lo muestre
    throw err;
  }
}

export function signOut() {
  return fbSignOut(auth);
}

export function onAuthStateChanged(cb) {
  return fbOnAuthStateChanged(auth, cb);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// Crear una reserva en Firestore
// reservation: { userId, vehicleId, pickup_date, return_date, price, notes }
export async function createReservation(reservation) {
  // Asegurarnos de escribir createdAt desde servidor
  const docRef = await addDoc(collection(db, 'reservations'), {
    ...reservation,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// Listar reservas de un usuario
export async function listReservationsByUser(userId) {
  const q = query(collection(db, 'reservations'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const results = [];
  snap.forEach(d => results.push({ id: d.id, ...d.data() }));
  return results;
}

// Comprobar disponibilidad básica (no atómica): busca reservas del mismo vehicleType con solapamiento de fechas
export async function isAvailable(vehicleType, pickupDate, returnDate) {
  // pickupDate/returnDate expected as ISO strings (YYYY-MM-DD)
  // Regla de solapamiento: (existing.start <= newEnd) && (existing.end >= newStart)
  const q = query(collection(db, 'reservations'), where('vehicleType', '==', vehicleType));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    const exStart = data.pickup_date;
    const exEnd = data.return_date;
    if (!exStart || !exEnd) continue;
    // Comparar como strings 'YYYY-MM-DD' funciona para comparaciones lexicográficas
    if (exStart <= returnDate && exEnd >= pickupDate) {
      return false; // solapa
    }
  }
  return true;
}

// Comprobar disponibilidad y crear reserva (no atómico). Recomendar Cloud Function para robustez.
export async function checkAndCreateReservation(reservation) {
  // Llamar a la Cloud Function callable para que la verificación y creación sean atómicas
  const callable = httpsCallable(functionsClient, 'checkCreateReservation');
  const resp = await callable(reservation);
  return resp.data.id;
}

// Crear reserva vía Cloud Function (fácil alias)
export async function createReservationRemote(reservation) {
  return await checkAndCreateReservation(reservation);
}

// Ejemplo de transacción si necesitaras comprobar disponibilidad atómicamente
export async function createReservationTransactional(vehicleDocPath, checkFn, reservation) {
  // vehicleDocPath: path to the vehicle doc e.g. 'vehicles/{id}'
  // checkFn: función que se ejecuta con el snapshot y debe lanzar si no está disponible
  const vehicleRef = doc(db, vehicleDocPath);
  return await runTransaction(db, async (t) => {
    const snap = await t.get(vehicleRef);
    await checkFn(snap);
    const newRef = collection(db, 'reservations');
    const resRef = await addDoc(newRef, {
      ...reservation,
      createdAt: serverTimestamp()
    });
    return resRef.id;
  });
}
