// Servidor API mínimo para usar la conexión a PostgreSQL
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { query } = require('./db');

dotenv.config();

const app = express();
app.use(express.json());
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// API health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Crear usuario (registro)
app.post('/api/usuarios', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const userRole = rol || 'cliente';

  try {
    // hash password with bcryptjs
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // note: column name uses non-ascii 'contraseña' in the DB schema provided
    const insertQ = `INSERT INTO usuarios (nombre, email, "contraseña", rol) VALUES ($1,$2,$3,$4) RETURNING id, fecha_registro`;
    const r = await query(insertQ, [nombre, email, hash, userRole]);
    return res.status(201).json({ id: r.rows[0].id, createdAt: r.rows[0].fecha_registro });
  } catch (err) {
    console.error('Error creando usuario', err);
    // unique violation code in Postgres
    if (err.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar usuarios (útil para debug local)
app.get('/api/usuarios', async (req, res) => {
  try {
    const q = 'SELECT id, nombre, email, fecha_registro FROM usuarios ORDER BY id DESC LIMIT 100';
    const r = await query(q, []);
    return res.json(r.rows);
  } catch (err) {
    console.error('Error listando usuarios', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Login: verificar credenciales y emitir JWT
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const q = 'SELECT id, nombre, email, "contraseña", rol FROM usuarios WHERE email = $1 LIMIT 1';
    const r = await query(q, [email]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = r.rows[0];
    const match = bcrypt.compareSync(password, user.contraseña);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // devolver token y usuario (frontend lo guardará en sessionStorage)
    return res.json({ token, user: payload });
  } catch (err) {
    console.error('Error en login', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener información del usuario a partir del token (Authorization: Bearer <token>)
app.get('/api/me', (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'No autorizado' });
    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// Logout (cliente puede simplemente eliminar token). Añadimos endpoint opcional por conveniencia.
app.post('/api/logout', (req, res) => {
  return res.json({ ok: true });
});

// Servir archivos estáticos del frontend (raíz del proyecto)
const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));
// Redirigir root a index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

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
