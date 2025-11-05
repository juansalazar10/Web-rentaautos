#!/usr/bin/env node
// Script sencillo para comprobar la conexión a PostgreSQL usando server/db.js
const dotenv = require('dotenv');
dotenv.config();

const { pool } = require('../server/db');

(async () => {
  try {
    console.log('Comprobando conexión a PostgreSQL con estas variables de entorno (vacío = no definido):');
    console.log({
      DATABASE_URL: !!process.env.DATABASE_URL,
      PGHOST: process.env.PGHOST || null,
      PGUSER: process.env.PGUSER || null,
      PGDATABASE: process.env.PGDATABASE || null,
      PGPORT: process.env.PGPORT || null,
      DATABASE_SSL: process.env.DATABASE_SSL || null
    });

    const r = await pool.query('SELECT NOW() AS now');
    console.log('Conexión OK. Resultado de la consulta:', r.rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Fallo al conectar o consultar la DB:', err && err.message ? err.message : err);
    // Mostrar stack para diagnósticos si existe
    if (err && err.stack) console.error(err.stack);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
})();
