/**
 * RNF-SEC-01: revisa las variables de entorno del backend SIN mostrar sus valores.
 * Uso (desde limpi_back): node scripts/verificar-entorno.js
 * Sale con código 1 si falta una obligatoria. Ver Docs/guia-variables-entorno.md.
 */
require('dotenv').config();

const e = process.env;
const filas = [];
let faltan = 0;
const fila = (variable, estado, nota) => {
  if (estado === 'FALTA' || estado === 'INVÁLIDA') faltan++;
  filas.push({ variable, estado, nota });
};
const hay = (v) => Boolean(e[v] && String(e[v]).trim());

['DATABASE_NAME', 'DATABASE_SERVER', 'DATABASE_USER'].forEach((v) => fila(v, hay(v) ? 'OK' : 'FALTA', 'conexión a la BD'));
fila('DATABASE_USER_PASSWORD', e.DATABASE_USER_PASSWORD !== undefined ? 'OK' : 'FALTA', 'puede ir vacía en local');

if (!hay('SECRET_KEY')) fila('SECRET_KEY', 'FALTA', 'obligatoria: sin ella el backend no arranca');
else fila('SECRET_KEY', e.SECRET_KEY.length >= 32 ? 'OK' : 'AVISO', `largo ${e.SECRET_KEY.length}${e.SECRET_KEY.length < 32 ? ' (usar 64 aleatorios)' : ''}`);

fila('JWT_EXPIRES_IN', hay('JWT_EXPIRES_IN') ? 'OK' : 'AVISO', hay('JWT_EXPIRES_IN') ? `valor ${e.JWT_EXPIRES_IN}` : 'vacía: se usa 8h');

const amb = e.TRANSBANK_ENV;
if (!amb) fila('TRANSBANK_ENV', 'FALTA', 'obligatoria desde AUT-005 parte 2: integration (local) o production (servidor)');
else if (!['integration', 'production'].includes(amb)) fila('TRANSBANK_ENV', 'INVÁLIDA', 'debe ser integration o production');
else fila('TRANSBANK_ENV', 'OK', `modo ${amb}`);
['TRANSBANK_COMMERCE_CODE', 'TRANSBANK_API_KEY'].forEach((v) => {
  if (amb === 'production') fila(v, hay(v) ? 'OK' : 'FALTA', 'obligatoria con TRANSBANK_ENV=production');
  else fila(v, hay(v) ? 'AVISO' : 'OK', hay(v) ? 'con integration no se usa' : 'no hace falta con integration');
});

const smtp = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((v) => !hay(v));
fila('SMTP_HOST/USER/PASS', smtp.length ? 'AVISO' : 'OK', smtp.length ? `faltan ${smtp.join(', ')}: el backend arranca pero no envía correos` : 'correo configurado');

fila('ROLES_GESTION_USUARIOS', 'OK', hay('ROLES_GESTION_USUARIOS') ? `roles: ${e.ROLES_GESTION_USUARIOS}` : 'vacía: solo Administrador');

console.table(filas);
console.log(faltan ? `\n${faltan} variable(s) obligatoria(s) faltan o son inválidas: el backend no arrancará.` : '\nTodo lo obligatorio está configurado.');
process.exit(faltan ? 1 : 0);
