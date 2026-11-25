/**
 * Primer periodo con datos de cada dashboard de Analytics: el filtro de fechas no ofrece meses anteriores
 * (meses vacíos alteran promedios y tendencias).
 */

const db = require('../../database/database');
const fecha = require('../../libs/fecha');
const { ESTADOS_SOLICITUD: E } = require('../bodega/constantes');

function primero(sql, replacements) {
  return db.sequelize.query(sql, { replacements: replacements || {}, type: db.sequelize.QueryTypes.SELECT })
    .then(function (filas) { return filas.length ? filas[0].minimo : null; });
}

/**
 * @returns {Promise<{financiero: string|null, rentabilidad: string|null, bodega: string|null, productividad: string|null}>}
 */
async function primerosPeriodos() {
  const [caja, bodega, pev] = await Promise.all([
    primero('SELECT MIN(periodo) AS minimo FROM v_bi_caja_mensual'),
    primero('SELECT MIN(created_at) AS minimo FROM solicitudes_bodega WHERE estado <> :anulada', { anulada: E.ANULADA }),
    primero('SELECT MIN(fecha_chequeo) AS minimo FROM listas_pev_trabajadores')
  ]);
  return {
    financiero: caja || null,
    rentabilidad: caja || null,
    bodega: fecha.periodoSantiago(bodega),
    productividad: fecha.periodoSantiago(pev)
  };
}

module.exports = { primerosPeriodos: primerosPeriodos };
