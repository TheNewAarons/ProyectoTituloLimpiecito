/**
 * RF-BOD-03 — Edición y envío de órdenes de compra. No implementa (depende de otras tareas en
 * curso de otro integrante): generación `/desde-lista`, asignación proveedor↔producto ni el
 * bloqueo "producto sin proveedor no puede enviarse" (regla 3 del spec).
 */

const db = require('../../database/database');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../modelos/sistema_bodega/Orden_compra_item');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { enviarCorreoOrdenCompra } = require('./correoOrdenCompra');

const ESTADOS_NO_ENVIABLES = ['ANULADA', 'RECIBIDA', 'RECIBIDA_PARCIAL'];

/**
 * @param {number} id
 * @param {object} [transaction]
 * @param {*} [lock] p.ej. `t.LOCK.UPDATE` (ver services/caja/cierre.js para el mismo patrón)
 * @returns {Promise<object>} instancia Orden_compra con proveedor e items (lanza 404 si no existe)
 */
async function obtenerConDetalle(id, transaction, lock) {
  const opciones = {
    include: [
      { model: Proveedor, as: 'proveedor' },
      { model: Orden_compra_item, as: 'items' }
    ],
    transaction: transaction
  };
  if (lock) opciones.lock = lock;
  const orden = await Orden_compra.findById(id, opciones);
  if (!orden) {
    throw new AppError('ORDEN_NO_ENCONTRADA', 'no existe la orden de compra ' + id, 404, { id: id });
  }
  return orden;
}

/**
 * GET /ordenes-compra/:id
 * @param {number} id
 */
async function obtener(id) {
  return obtenerConDetalle(id, undefined);
}

/**
 * PATCH /ordenes-compra/:id — solo en BORRADOR. body: { items: [{id, cantidad}], eliminar: [itemId,...] }
 * @param {number} id
 * @param {{items?: {id: number, cantidad: number}[], eliminar?: number[]}} cambios
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 */
async function actualizar(id, cambios, contexto) {
  const c = cambios || {};
  const ajustes = Array.isArray(c.items) ? c.items : [];
  const aEliminar = Array.isArray(c.eliminar) ? c.eliminar.map(Number) : [];

  ajustes.forEach(function (item) {
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new AppError('CANTIDAD_INVALIDA', 'cantidad debe ser un entero mayor a 0', 400, { id: item.id });
    }
  });

  return db.sequelize.transaction(async function (t) {
    const orden = await obtenerConDetalle(id, t);
    if (orden.estado !== 'BORRADOR') {
      throw new AppError('ORDEN_NO_EDITABLE', 'solo se puede editar una orden en BORRADOR', 409, { estado: orden.estado });
    }
    const antes = { estado: orden.estado, items: orden.items.map(function (i) { return i.get({ plain: true }); }) };

    for (const item of orden.items) {
      const ajuste = ajustes.filter(function (a) { return Number(a.id) === item.id; })[0];
      if (ajuste) await item.update({ cantidad: ajuste.cantidad }, { transaction: t });
    }
    if (aEliminar.length) {
      await Orden_compra_item.destroy({ where: { id: aEliminar, orden_id: orden.id }, transaction: t });
    }

    const itemsRestantes = await Orden_compra_item.count({ where: { orden_id: orden.id }, transaction: t });
    if (itemsRestantes === 0) {
      throw new AppError('ORDEN_SIN_ITEMS', 'la orden no puede quedar sin items', 409);
    }

    const ordenActualizada = await obtenerConDetalle(id, t);
    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'ordenes_compra',
      entidad_id: id,
      accion: 'EDITAR',
      antes: antes,
      despues: { estado: ordenActualizada.estado, items: ordenActualizada.items.map(function (i) { return i.get({ plain: true }); }) },
      ip: contexto.ip
    });
    return ordenActualizada;
  });
}

/**
 * Auditoría best-effort de un intento de envío fallido (transacción propia, sin tocar el estado
 * de la orden). Si esta auditoría falla, NUNCA oculta el AppError de envío original: solo se
 * registra en log y se descarta.
 * @param {number} id
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 * @param {Error} errorOriginal
 */
async function registrarIntentoFallido(id, contexto, errorOriginal) {
  try {
    await db.sequelize.transaction(function (t) {
      return auditar({
        transaction: t,
        usuario: contexto.usuario,
        entidad: 'ordenes_compra',
        entidad_id: id,
        accion: 'ENVIAR_FALLIDO',
        antes: null,
        despues: null,
        motivo: errorOriginal && errorOriginal.code ? String(errorOriginal.code) : 'ENVIO_FALLIDO',
        ip: contexto.ip
      });
    });
  } catch (errorAuditoria) {
    // eslint-disable-next-line no-console
    console.error(
      '[RF-BOD-03] no se pudo auditar ENVIAR_FALLIDO de la orden ' + id,
      { ordenId: id, auditoriaError: errorAuditoria && errorAuditoria.message }
    );
  }
}

/**
 * POST /ordenes-compra/:id/enviar — envía la orden por correo al proveedor. El correo se envía
 * ANTES de confirmar el estado en BD (no se mantiene la transacción abierta durante el SMTP);
 * el estado solo pasa a ENVIADA si `sendMail` tuvo éxito. Permite reenviar una orden ya ENVIADA
 * (spec regla 6): en ese caso se audita 'REENVIAR' en vez de 'ENVIAR'.
 * @param {number} id
 * @param {{usuario: {id: number, contexto: string}, ip?: string, transporte?: object}} contexto
 */
async function enviar(id, contexto) {
  const orden = await obtenerConDetalle(id, undefined);

  if (ESTADOS_NO_ENVIABLES.indexOf(orden.estado) !== -1) {
    throw new AppError('ORDEN_NO_ENVIABLE', 'la orden no se puede enviar en estado ' + orden.estado, 409, { estado: orden.estado });
  }
  if (!orden.proveedor || orden.proveedor.activo !== 1) {
    throw new AppError('PROVEEDOR_INACTIVO', 'el proveedor de la orden esta inactivo', 409);
  }
  if (!orden.proveedor.email) {
    throw new AppError('PROVEEDOR_SIN_EMAIL', 'el proveedor no tiene email registrado', 400);
  }
  if (!orden.items || orden.items.length === 0) {
    throw new AppError('ORDEN_SIN_ITEMS', 'la orden no tiene items, no se puede enviar', 409);
  }
  // TODO(RF-BOD-03/RF-BOD-05): acá debe ir el bloqueo "producto sin proveedor asignado no puede
  // enviarse" (spec regla 3) una vez exista la asignación proveedor↔producto (otra tarea).

  const emailDestino = orden.proveedor.email;
  const accion = orden.estado === 'ENVIADA' ? 'REENVIAR' : 'ENVIAR';

  try {
    await enviarCorreoOrdenCompra(orden, emailDestino, contexto.transporte);
  } catch (errorEnvio) {
    await registrarIntentoFallido(id, contexto, errorEnvio);
    throw errorEnvio;
  }

  return db.sequelize.transaction(async function (t) {
    // Se relee con lock por si el estado cambió mientras se esperaba el SMTP (el correo ya salió).
    const ordenFresca = await obtenerConDetalle(id, t, t.LOCK.UPDATE);
    if (ESTADOS_NO_ENVIABLES.indexOf(ordenFresca.estado) !== -1) {
      // eslint-disable-next-line no-console
      console.error(
        '[RF-BOD-03] la orden ' + id + ' cambio a ' + ordenFresca.estado + ' mientras se enviaba el correo; ' +
          'el correo ya fue enviado a ' + emailDestino + ' pero no se marca ENVIADA',
        { ordenId: id, estado: ordenFresca.estado }
      );
      throw new AppError('ORDEN_NO_ENVIABLE', 'la orden cambio de estado mientras se enviaba el correo', 409, { estado: ordenFresca.estado });
    }

    const antes = ordenFresca.get({ plain: true });
    await ordenFresca.update(
      { estado: 'ENVIADA', enviada_at: new Date(), enviada_a_email: emailDestino },
      { transaction: t }
    );
    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'ordenes_compra',
      entidad_id: id,
      accion: accion,
      antes: antes,
      despues: ordenFresca,
      ip: contexto.ip
    });
    return ordenFresca;
  });
}

module.exports = {
  obtener: obtener,
  actualizar: actualizar,
  enviar: enviar
};
