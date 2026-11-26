/**
 * RNF-SEC-02 (AUT-020, revisión de requerimientos) — Cerrar un centro de costo queda en la auditoría.
 * Misma escritura que el legacy (`Centro.update(datos, { where: { id } })`), pero dentro de una transacción con
 * bloqueo de la fila y `auditar(CIERRE)` con los valores antes/después: si la auditoría falla, no se cierra.
 */
const db = require('../../database/database');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const { auditar } = require('../auditoria');

// Lo que cambia al cerrar y sirve para responder "quién cerró y con qué valores".
const CAMPOS = ['estado', 'fecha_cierre', 'precio_servicio', 'total_costos', 'utilidad'];
const recorte = (fila) => {
  const plano = fila && fila.get ? fila.get({ plain: true }) : (fila || {});
  const r = {};
  CAMPOS.forEach((k) => { if (plano[k] !== undefined) r[k] = plano[k]; });
  return r;
};

/**
 * @param {number|string} id
 * @param {object} datos los mismos campos que arma el controlador legacy
 * @param {{usuario:{id,contexto}, ip, motivoSinToken}} actor services/auditoria/actor
 * @returns {Promise<Array<number>>} el mismo formato que `Model.update` (filas afectadas)
 */
async function cerrarCentroCostoAuditado(id, datos, actor) {
  const a = actor || {};
  return db.sequelize.transaction(async (t) => {
    const centro = await Centro.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!centro) return [0];
    const antes = recorte(centro);
    const filas = await Centro.update(datos, { where: { id: id }, transaction: t });
    await auditar({
      transaction: t,
      usuario: a.usuario,
      entidad: 'centro_costos',
      entidad_id: Number(id),
      accion: 'CIERRE',
      antes: antes,
      despues: recorte(Object.assign({}, antes, datos)),
      motivo: a.motivoSinToken || null,
      ip: a.ip || null
    });
    return filas;
  });
}

module.exports = { cerrarCentroCostoAuditado };
