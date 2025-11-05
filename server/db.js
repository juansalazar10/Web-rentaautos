// Conexión a PostgreSQL usando pg Pool (CommonJS)
const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const { Pool } = pg;

const useUrl = !!process.env.DATABASE_URL;
const sslEnabled = (process.env.DATABASE_SSL === 'true');

const pool = useUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('pg: executed query', { text: text.replace(/\s+/g, ' ').trim(), duration, rows: res.rowCount });
  return res;
}

module.exports = {
  pool,
  query
};
