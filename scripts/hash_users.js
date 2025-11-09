// Script de migración: convierte contraseñas en texto plano a hashes bcrypt
// Uso: node scripts/hash_users.js
// IMPORTANTE: haz un backup de la base de datos antes de ejecutar.

const bcrypt = require('bcryptjs');
const { query, pool } = require('../server/db');

async function run() {
  console.log('Migración: buscando contraseñas no-hasheadas en la tabla usuarios...');

  // Buscamos filas cuya contraseña no empieza por el prefijo típico de bcrypt ('$2a$'|'$2b$'|'$2y$')
  const res = await query('SELECT id, "contraseña" FROM usuarios WHERE "contraseña" NOT LIKE $1', ['$2%']);

  if (res.rowCount === 0) {
    console.log('No se encontraron contraseñas en texto plano. Nada que hacer.');
    await pool.end();
    return;
  }

  console.log(`Encontradas ${res.rowCount} filas a migrar.`);

  for (const row of res.rows) {
    const id = row.id;
    const plain = row.contraseña;
    if (!plain) continue;
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(plain.toString(), salt);
      await query('UPDATE usuarios SET "contraseña" = $1 WHERE id = $2', [hash, id]);
      console.log(`Actualizado usuario id=${id}`);
    } catch (err) {
      console.error(`Error actualizando id=${id}:`, err);
    }
  }

  console.log('Migración finalizada. Cierra este script y verifica logins.');
  await pool.end();
}

run().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
