/**
 * Configuración de sequelize-cli. Reutiliza las mismas variables que database/database.js
 * (DATABASE_NAME, DATABASE_SERVER, DATABASE_USER, DATABASE_USER_PASSWORD); nada hardcodeado.
 *
 * Salvaguarda: si el host no es local, la CLI se niega a ejecutar salvo que se defina
 * MIGRACION_REMOTA_CONFIRMADA=SI en la línea de comandos (despliegue manual con respaldo previo,
 * ver .claude/skills/deploy-skill). Nunca dejar esa variable en .env.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1'];
const host = process.env.DATABASE_SERVER || 'localhost';

if (HOSTS_LOCALES.indexOf(host) === -1 && process.env.MIGRACION_REMOTA_CONFIRMADA !== 'SI') {
  throw new Error(
    'config/config.js: DATABASE_SERVER no es local. Para migrar una BD remota define ' +
    'MIGRACION_REMOTA_CONFIRMADA=SI solo en el comando, con respaldo previo.'
  );
}

const base = {
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_USER_PASSWORD || null,
  database: process.env.DATABASE_NAME,
  host: host,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
  dialect: 'mysql',
  operatorsAliases: false,
  logging: false,
  migrationStorageTableName: 'SequelizeMeta'
};

module.exports = {
  development: base,
  test: base,
  production: base
};
