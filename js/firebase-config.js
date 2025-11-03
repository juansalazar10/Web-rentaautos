// Configuración pública de Firebase proporcionada por el usuario.
// Obtén estas mismas credenciales desde Firebase Console -> Project settings
export const firebaseConfig = {
  // The API key may be provided at runtime by defining `window.__FIREBASE_API_KEY__`
  // (create a local file that sets this variable, see README/instructions below).
  // Fallback is intentionally REDACTED to avoid leaking a real key in the repo.
  apiKey: (typeof window !== 'undefined' && window.__FIREBASE_API_KEY__) || "REDACTED_GOOGLE_API_KEY",
  authDomain: "rentaauto-bd32b.firebaseapp.com",
  projectId: "rentaauto-bd32b",
  storageBucket: "rentaauto-bd32b.firebasestorage.app",
  messagingSenderId: "512692215609",
  appId: "1:512692215609:web:adb3452d2cd848295992e8",
  measurementId: "G-9H7D4NTMVD"
};

// Nota: esta configuración es pública (cliente). Asegúrate de habilitar
// en Firebase Console los proveedores de Auth que usarás (Google, etc.) y
// de añadir 'localhost' a las Authorized domains si pruebas localmente.
