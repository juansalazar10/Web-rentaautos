const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Función callable para comprobar disponibilidad y crear reserva de forma atómica
exports.checkCreateReservation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La petición requiere autenticación.');
  }
  const uid = context.auth.uid;
  const vehicleType = data.vehicleType;
  const pickup_date = data.pickup_date;
  const return_date = data.return_date;
  const price = data.price || null;
  const notes = data.notes || null;

  if (!vehicleType || !pickup_date || !return_date) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan campos obligatorios.');
  }

  try {
    // Transacción: comprobar solapamientos y crear la reserva
    const reservationsRef = db.collection('reservations');
    const newId = await db.runTransaction(async (t) => {
      const qSnap = await t.get(reservationsRef.where('vehicleType', '==', vehicleType));
      for (const doc of qSnap.docs) {
        const d = doc.data();
        if (!d.pickup_date || !d.return_date) continue;
        // comparar como strings YYYY-MM-DD
        if (d.pickup_date <= return_date && d.return_date >= pickup_date) {
          throw new Error('conflict');
        }
      }
      const newDocRef = reservationsRef.doc();
      t.set(newDocRef, {
        userId: uid,
        vehicleType,
        pickup_date,
        return_date,
        price,
        notes,
        status: 'confirmed',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return newDocRef.id;
    });

    return { id: newId };
  } catch (err) {
    if (err.message === 'conflict') {
      throw new functions.https.HttpsError('already-exists', 'No disponible en las fechas seleccionadas.');
    }
    console.error('Error in checkCreateReservation:', err);
    throw new functions.https.HttpsError('internal', 'Error interno al crear la reserva.');
  }
});
