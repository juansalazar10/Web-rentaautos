// Servidor API mínimo para usar la conexión a PostgreSQL
const express = require('express');
const dotenv = require('dotenv');
const { query } = require('./db');

dotenv.config();

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Crear reserva (sin validaciones complejas)
app.post('/api/reservations', async (req, res) => {
  const { user_id, vehicle_type, pickup_date, return_date, price } = req.body;
  if (!user_id || !vehicle_type || !pickup_date || !return_date) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Comprobación simple de solapamiento para el mismo tipo de vehículo
    const overlapQ = `
      SELECT id FROM reservations
      WHERE vehicle_type = $1
        AND pickup_date <= $2
        AND return_date >= $3
      LIMIT 1
    `;
    const overlapRes = await query(overlapQ, [vehicle_type, return_date, pickup_date]);
    if (overlapRes.rowCount > 0) {
      return res.status(409).json({ error: 'No hay disponibilidad en esas fechas' });
    }

    const insertQ = `
      INSERT INTO reservations (user_id, vehicle_type, pickup_date, return_date, price, status, created_at)
      VALUES ($1,$2,$3,$4,$5,'confirmed',now())
      RETURNING id, created_at
    `;
    const r = await query(insertQ, [user_id, vehicle_type, pickup_date, return_date, price || null]);
    return res.status(201).json({ id: r.rows[0].id, createdAt: r.rows[0].created_at });
  } catch (err) {
    console.error('Error creando reserva', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar reservas por usuario
app.get('/api/reservations', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id requerido' });

  try {
    const q = 'SELECT id, user_id, vehicle_type, pickup_date, return_date, price, status, created_at FROM reservations WHERE user_id = $1 ORDER BY created_at DESC';
    const r = await query(q, [userId]);
    return res.json(r.rows);
  } catch (err) {
    console.error('Error listando reservas', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

const port = process.env.PORT_API || 4000;
app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
