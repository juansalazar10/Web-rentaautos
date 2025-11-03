// Módulo helper para Firebase (Auth + Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged as fbOnAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, runTransaction, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
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
