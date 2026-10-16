/**
 * RF-CAJA-02/RF-CAJA-01 — Helpers de fecha/periodo en America/Santiago sin dependencias nuevas
 * (Intl.DateTimeFormat). Sequelize guarda DATETIME en UTC (sin timezone configurado,
 * database/database.js); estos helpers convierten explícitamente a la zona de negocio.
 */

const ZONA = 'America/Santiago';
const RE_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const RE_FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Valida el formato 'YYYY-MM' (periodo de caja).
 * @param {string} periodo
 * @returns {boolean}
 */
function esPeriodoValido(periodo) {
  return typeof periodo === 'string' && RE_PERIODO.test(periodo);
}

/**
 * Valida el formato 'YYYY-MM-DD' (no verifica que el día exista en el mes, p.ej. 2024-02-30
 * pasaría el regex; Date la normaliza al convertir y ahí se detecta como fecha inválida aguas arriba).
 * @param {string} fecha
 * @returns {boolean}
 */
function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !RE_FECHA.test(fecha)) return false;
  const d = new Date(fecha + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

/**
 * Deriva el periodo 'YYYY-MM' de una fecha/Date en zona America/Santiago.
 * @param {Date|string} valor fecha (Date, DATETIME string de MySQL, o 'YYYY-MM-DD')
 * @returns {string|null} 'YYYY-MM' o null si valor es inválido
 */
function periodoSantiago(valor) {
  if (valor === null || valor === undefined) return null;
  let fecha = valor;
  if (!(fecha instanceof Date)) {
    const texto = String(valor);
    // 'YYYY-MM-DD' se interpreta como medianoche UTC; DATETIME de MySQL ('YYYY-MM-DD HH:mm:ss') también
    fecha = new Date(texto.indexOf('T') >= 0 ? texto : texto.replace(' ', 'T') + 'Z');
  }
  if (isNaN(fecha.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' })
    .formatToParts(fecha);
  const anio = partes.filter(function (p) { return p.type === 'year'; })[0].value;
  const mes = partes.filter(function (p) { return p.type === 'month'; })[0].value;
  return anio + '-' + mes;
}

/**
 * Fecha de hoy en America/Santiago, formato 'YYYY-MM-DD'.
 * @returns {string}
 */
function hoySantiago() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const anio = partes.filter(function (p) { return p.type === 'year'; })[0].value;
  const mes = partes.filter(function (p) { return p.type === 'month'; })[0].value;
  const dia = partes.filter(function (p) { return p.type === 'day'; })[0].value;
  return anio + '-' + mes + '-' + dia;
}

/**
 * Compara dos fechas 'YYYY-MM-DD' (orden lexicográfico == orden cronológico en este formato).
 * @param {string} a
 * @param {string} b
 * @returns {number} negativo si a < b, 0 si iguales, positivo si a > b
 */
function compararFechas(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

module.exports = {
  esPeriodoValido: esPeriodoValido,
  esFechaValida: esFechaValida,
  periodoSantiago: periodoSantiago,
  hoySantiago: hoySantiago,
  compararFechas: compararFechas
};
