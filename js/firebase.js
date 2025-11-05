// Stub local que reemplaza las dependencias de Firebase para desarrollo sin backend
// Provee las mismas funciones que importaba `js/script.js` pero usando localStorage.

let currentUser = null;
const authListeners = new Set();

function emitAuth(user) {
  authListeners.forEach(cb => {
    try { cb(user); } catch (e) { console.error('auth listener error', e); }
  });
}

// Persistir usuario en sessionStorage para mantener sesión por pestaña
function saveUser(u) {
  currentUser = u;
  if (u) sessionStorage.setItem('renta_user', JSON.stringify(u));
  else sessionStorage.removeItem('renta_user');
  emitAuth(currentUser);
}

function loadUser() {
  try {
    const s = sessionStorage.getItem('renta_user');
    if (s) currentUser = JSON.parse(s);
    else currentUser = null;
  } catch (e) {
    currentUser = null;
  }
}

loadUser();

// Auth API
export async function loginWithGoogle() {
  // Simula un flujo de login con Google.
  const user = { uid: 'local-' + Date.now(), email: 'usuario_local@example.com' };
  saveUser(user);
  return user;
}

export function onAuthStateChanged(cb) {
  if (typeof cb !== 'function') return () => {};
  authListeners.add(cb);
  // llamar inmediatamente con estado actual
  cb(currentUser);
  // devolver función para quitar listener
  return () => authListeners.delete(cb);
}

export function getCurrentUser() {
  return currentUser;
}

export async function signOut() {
  saveUser(null);
  return true;
}

export async function handleRedirectResult() {
  // No-op para el stub
  return null;
}

// Reservations API (almacenar en localStorage)
const STORAGE_KEY = 'renta_reservations_v1';

function readReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo reservas localmente', e);
    return [];
  }
}

function writeReservations(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (e) {
    console.error('Error guardando reservas localmente', e);
  }
}

function generateId() {
  return 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
}

export async function createReservation(reservation) {
  const rows = readReservations();
  const id = generateId();
  const now = new Date().toISOString();
  const doc = Object.assign({}, reservation, { id, createdAt: now, status: 'confirmed' });
  rows.push(doc);
  writeReservations(rows);
  return id;
}

// Emula la Cloud Function: comprueba solapamiento para vehicleType y crea la reserva atómicamente
export async function createReservationRemote(data) {
  // Validaciones mínimas
  const vehicleType = data.vehicleType;
  const pickup = data.pickup_date;
  const ret = data.return_date;
  if (!vehicleType || !pickup || !ret) {
    const e = new Error('Faltan campos obligatorios.');
    e.code = 'invalid-argument';
    throw e;
  }

  const rows = readReservations();
  for (const r of rows) {
    if (r.vehicleType !== vehicleType) continue;
    if (!r.pickup_date || !r.return_date) continue;
    // comparar como strings YYYY-MM-DD o ISO; soporte simple
    if (r.pickup_date <= ret && r.return_date >= pickup) {
      const e = new Error('No disponible en las fechas seleccionadas.');
      e.code = 'already-exists';
      throw e;
    }
  }

  const id = generateId();
  const now = new Date().toISOString();
  const doc = {
    id,
    userId: (currentUser && currentUser.uid) || 'anon',
    vehicleType,
    pickup_date: pickup,
    return_date: ret,
    price: data.price || null,
    notes: data.notes || null,
    status: 'confirmed',
    createdAt: now
  };
  rows.push(doc);
  writeReservations(rows);
  return id;
}

export async function checkAndCreateReservation() {
  // placeholder si algún código lo llama
  return null;
}

export async function listReservationsByUser(uid) {
  const rows = readReservations();
  return rows.filter(r => (r.userId || 'anon') === uid).map(r => r);
}

// Exponer algunos utilitarios para debugging
export const __internal = {
  readReservations,
  writeReservations
};
