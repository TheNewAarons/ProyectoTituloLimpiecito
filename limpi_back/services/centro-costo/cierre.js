/**
 * RNF-SEC-02 (AUT-020, revisión de requerimientos) — Cerrar un centro de costo queda en la auditoría.
 * Misma escritura que el legacy (`Centro.update(datos, { where: { id } })`), pero dentro de una transacción con
 * bloqueo de la fila y `auditar(CIERRE)` con los valores antes/después: si la auditoría falla, no se cierra.
 */
const db = require('../../database/database');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const { auditar } = require('../auditoria');
const Caja = require('../../modelos/sistema_base/Caja');
const AppError = require('../../libs/app-error');
const { CAJA_ABIERTA } = require('../constantes');

// Lo que cambia al cerrar y sirve para responder "quién cerró y con qué valores".
// cajaId y numero_cc: el payload legacy también los escribe; si cambian (el centro pasa a otro mes de caja), queda registrado.
const CAMPOS = ['estado', 'fecha_cierre', 'precio_servicio', 'total_costos', 'utilidad', 'cajaId', 'numero_cc'];
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

/**
 * Reabre un centro de costo cerrado por error (estado 0 -> 1). Solo si la caja de su mes sigue abierta:
 * reabrir en un mes cerrado cambiaría montos ya cerrados (rentabilidad/analytics leen estado 0).
 * Limpia fecha_cierre/total_costos/utilidad (se recalculan al volver a cerrar); los valores previos quedan
 * en la auditoría REAPERTURA junto al motivo.
 * @param {number|string} id
 * @param {{usuario:{id,contexto}, motivo:string, ip}} opciones
 * @returns {Promise<object>} el centro reabierto
 */
// Reglas de reapertura: el centro existe, está cerrado y la caja de su mes sigue abierta.
async function cargarReabrible(id, opcionesConsulta) {
  const centro = await Centro.findById(id, opcionesConsulta);
  if (!centro) throw new AppError('CENTRO_NO_EXISTE', 'el centro de costo no existe', 404, { id: Number(id) });
  if (Number(centro.estado) !== 0) throw new AppError('CENTRO_NO_CERRADO', 'el centro de costo no está cerrado', 409, { id: Number(id) });
  const caja = await Caja.findById(centro.cajaId, opcionesConsulta);
  if (!caja || Number(caja.estado) !== CAJA_ABIERTA) {
    const periodo = caja ? caja.periodo : null;
    throw new AppError('MES_CERRADO', 'la caja de ' + periodo + ' está cerrada, reabrir el mes primero', 409, { periodo: periodo });
  }
  return centro;
}

// Chequeo previo sin bloqueo (antes de enviar el código por correo); reabrirCentroCosto lo repite con bloqueo.
const verificarReabrible = (id) => cargarReabrible(id, {});

async function reabrirCentroCosto(id, opciones) {
  const o = opciones || {};
  return db.sequelize.transaction(async (t) => {
    const centro = await cargarReabrible(id, { transaction: t, lock: t.LOCK.UPDATE });
    const antes = recorte(centro);
    const datos = { estado: 1, fecha_cierre: null, total_costos: null, utilidad: null };
    await Centro.update(datos, { where: { id: id }, transaction: t });
    await auditar({
      transaction: t,
      usuario: o.usuario,
      entidad: 'centro_costos',
      entidad_id: Number(id),
      accion: 'REAPERTURA',
      antes: antes,
      despues: recorte(Object.assign({}, antes, datos)),
      motivo: o.motivo,
      ip: o.ip || null
    });
    return Object.assign(centro.get({ plain: true }), datos);
  });
}

module.exports = { cerrarCentroCostoAuditado, reabrirCentroCosto, verificarReabrible };
