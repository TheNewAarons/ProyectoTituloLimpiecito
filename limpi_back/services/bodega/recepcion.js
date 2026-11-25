/**
 * RF-BOD-04 — Recepción de una orden de compra (Docs/bodega-solicitudes.md, "RF-BOD-04").
 * Una sola transacción. Orden de locks (igual que crear/anular, para no cruzarse):
 *   orden de compra -> solicitudes FIFO (id ASC) -> productos (id ASC).
 * Recibido: stock += cantidad (ENTRADA_COMPRA) y costo_unitario = último costo real recibido.
 * RF-BOD-04b: cada llamada crea una recepción (recepciones_compra + recepcion_items); cantidad_recibida es caché.
 * RF-BOD-04 merma: por línea se pueden rechazar unidades (con motivo). No entran al stock y dejan de estar pendientes.
 * Asignación FIFO: el stock disponible cubre faltantes de solicitudes PARCIAL, la más antigua primero
 * (SALIDA_SOLICITUD); las que quedan sin faltante pasan a LISTA_ENTREGA. El excedente queda libre.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../modelos/sistema_bodega/Solicitud_item');
const kardex = require('./kardex');
const Producto = require('../../modelos/sistema_base/Producto');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../modelos/sistema_bodega/Orden_compra_item');
const Recepcion_compra = require('../../modelos/sistema_bodega/Recepcion_compra');
const Recepcion_item = require('../../modelos/sistema_bodega/Recepcion_item');
const { ESTADOS_SOLICITUD: E, TIPOS_MOVIMIENTO: M } = require('./constantes');

const ESTADOS_RECIBIBLES = ['ENVIADA', 'RECIBIDA_PARCIAL'];

const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const unicos = (lista) => Array.from(new Set(lista.filter((v) => v !== null && v !== undefined)));
const ascendente = (a, b) => a - b;
const nulo = (v) => v === null || v === undefined;
// Mismo criterio que cruceStock (D-054): stock NULL o negativo = 0 disponible.
const disponible = (p) => { const s = Number(p.stock); return Number.isFinite(s) && s > 0 ? s : 0; };

// RF-BOD-04 merma: lo rechazado tampoco queda pendiente
const pendiente = (l) => Math.max(Number(l.cantidad) - Number(l.cantidad_recibida || 0) - Number(l.cantidad_rechazada || 0), 0);

/**
 * Cantidades, rechazo y costo real a recibir por línea. Sin `entradas`, recibe todo lo pendiente de cada línea.
 * RF-BOD-04b: el costo real por línea es opcional; sin él se usa el costo de la OC.
 * @returns {{linea: object, cantidad: number, rechazada: number, motivo: string|null, costo: number|null}[]}
 */
function resolverCantidades(lineas, entradas) {
  const costoOc = (l) => nulo(l.costo_unitario) ? null : Number(l.costo_unitario);
  if (!entradas) return lineas.map((l) => ({ linea: l, cantidad: pendiente(l), rechazada: 0, motivo: null, costo: costoOc(l) }));
  const lineasPorId = porId(lineas);
  return entradas.map((e) => {
    const linea = lineasPorId[e.item_id];
    if (!linea) throw new AppError('ITEM_NO_PERTENECE', 'el item ' + e.item_id + ' no pertenece a la orden', 400, { item_id: e.item_id });
    const rechazada = e.cantidad_rechazada || 0;
    if (e.cantidad_recibida + rechazada > pendiente(linea)) {
      throw new AppError('CANTIDAD_EXCEDE_PENDIENTE', 'lo recibido mas lo rechazado supera lo pendiente de la linea', 400,
        { item_id: linea.id, pendiente: pendiente(linea), cantidad_recibida: e.cantidad_recibida, cantidad_rechazada: rechazada });
    }
    return {
      linea: linea, cantidad: e.cantidad_recibida, rechazada: rechazada, motivo: rechazada > 0 ? e.motivo_rechazo : null,
      costo: nulo(e.costo_unitario) ? costoOc(linea) : e.costo_unitario
    };
  });
}

/**
 * POST /ordenes-compra/:id/recepcion. RF-BOD-04b: cada llamada es una recepción (cabecera + líneas)
 * y cada línea genera su ENTRADA_COMPRA enlazada.
 * @param {number} ordenId
 * @param {{item_id:number, cantidad_recibida:number, costo_unitario?:number}[]|null} entradas validadas en el controlador (enteros >= 0, sin repetidos)
 * @param {{usuario:{id:number, contexto:string}, ip?:string}} contexto
 * @param {{documento_tipo?:string, documento_numero?:string, observacion?:string}} [documento]
 */
async function recibir(ordenId, entradas, contexto, documento) {
  const usuario = contexto.usuario;
  const doc = documento || {};
  return reintentarTransaccion(() => db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async (t) => {
    // 1) Orden de compra
    const orden = await Orden_compra.findById(ordenId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!orden) throw new AppError('ORDEN_NO_ENCONTRADA', 'no existe la orden de compra ' + ordenId, 404, { id: ordenId });
    if (ESTADOS_RECIBIBLES.indexOf(orden.estado) === -1) {
      throw new AppError('ORDEN_NO_RECIBIBLE', 'solo se recibe una orden ENVIADA o RECIBIDA_PARCIAL', 409, { estado: orden.estado });
    }
    const lineas = await Orden_compra_item.findAll({ where: { orden_id: orden.id }, order: [['id', 'ASC']], transaction: t });
    const recepcion = resolverCantidades(lineas, entradas).filter((r) => r.cantidad > 0 || r.rechazada > 0);
    if (!recepcion.length) throw new AppError('SIN_CANTIDADES', 'no hay cantidades para recibir ni rechazar', 400);

    const recibidoPorProducto = {};
    const costoPorProducto = {};
    const diferencias = [];
    recepcion.filter((r) => r.cantidad > 0).forEach((r) => {
      recibidoPorProducto[r.linea.producto_id] = (recibidoPorProducto[r.linea.producto_id] || 0) + r.cantidad;
      if (r.costo !== null) costoPorProducto[r.linea.producto_id] = r.costo;
      if (r.costo !== null && !nulo(r.linea.costo_unitario) && r.costo !== Number(r.linea.costo_unitario)) {
        diferencias.push({ item_id: r.linea.id, producto_id: r.linea.producto_id, costo_oc: Number(r.linea.costo_unitario), costo_real: r.costo });
      }
    });
    const productoIds = Object.keys(recibidoPorProducto).map(Number).sort(ascendente);

    // 2) Solicitudes FIFO con faltante de estos productos (la lectura previa solo decide qué bloquear)
    const candidatas = !productoIds.length ? [] : await Item.findAll({
      where: { producto_id: { [Op.in]: productoIds }, cantidad_faltante: { [Op.gt]: 0 } }, attributes: ['solicitud_id'], transaction: t
    });
    const idsCandidatas = unicos(candidatas.map((i) => i.solicitud_id)).sort(ascendente);
    // Se re-verifica el estado DESPUÉS del lock: una anulación concurrente pudo cerrarla mientras se esperaba
    // (anular no toca cantidad_faltante, así que sin este filtro se asignaría stock a una solicitud ANULADA).
    const solicitudes = (idsCandidatas.length
      ? await Solicitud.findAll({ where: { id: { [Op.in]: idsCandidatas }, estado: E.PARCIAL }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t })
      : []).filter((s) => s.estado === E.PARCIAL);

    // 3) Productos
    const productos = porId(!productoIds.length ? [] : await Producto.findAll({
      where: { id: { [Op.in]: productoIds } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t
    }));

    // Entrada de lo recibido
    const ordenAntes = { estado: orden.estado, items: lineas.map((l) => ({ id: l.id, cantidad_recibida: l.cantidad_recibida, cantidad_rechazada: l.cantidad_rechazada })) };
    for (const r of recepcion) {
      await r.linea.update({
        cantidad_recibida: Number(r.linea.cantidad_recibida || 0) + r.cantidad,
        cantidad_rechazada: Number(r.linea.cantidad_rechazada || 0) + r.rechazada
      }, { transaction: t });
    }
    for (const id of productoIds) {
      const producto = productos[id];
      if (!producto) throw new AppError('PRODUCTO_NO_EXISTE', 'el producto ' + id + ' de la orden no existe', 409, { producto_id: id });
    }
    // RF-BOD-04b: la recepción como evento; RF-BOD-06: una entrada por línea al costo real (sin costo: promedio vigente)
    const cabecera = await Recepcion_compra.create({
      orden_id: orden.id, fecha_recepcion: new Date(), documento_tipo: doc.documento_tipo || null,
      documento_numero: doc.documento_numero || null, observacion: doc.observacion || null, estado: 'CONFIRMADA',
      historica: false, created_by: usuario.id, contexto_usuario: usuario.contexto
    }, { transaction: t });
    for (const r of recepcion) {
      const linea = await Recepcion_item.create({
        recepcion_id: cabecera.id, orden_item_id: r.linea.id, producto_id: r.linea.producto_id, cantidad: r.cantidad, costo_unitario: r.costo,
        cantidad_rechazada: r.rechazada, motivo_rechazo: r.motivo
      }, { transaction: t });
      if (r.cantidad === 0) continue; // solo rechazo: no entra stock
      const mov = await kardex.registrar({
        transaction: t, producto: productos[r.linea.producto_id], tipo: M.ENTRADA_COMPRA, cantidad: r.cantidad,
        costoUnitario: r.costo === null ? undefined : r.costo,
        referenciaTipo: 'recepciones_compra', referenciaId: cabecera.id, referenciaLineaId: linea.id, usuario: usuario
      });
      await linea.update({ movimiento_id: mov.id }, { transaction: t });
    }
    // QA-01 T2: el costo se actualiza después del kardex; antes, un SALDO_INICIAL automático se valorizaba al costo nuevo
    for (const id of productoIds) {
      if (costoPorProducto[id] !== undefined) await productos[id].update({ costo_unitario: costoPorProducto[id] }, { transaction: t });
    }

    // Asignación FIFO a faltantes
    const asignaciones = [];
    const completas = [];
    if (solicitudes.length) {
      const items = await Item.findAll({
        where: { solicitud_id: { [Op.in]: solicitudes.map((s) => s.id) } }, order: [['solicitud_id', 'ASC'], ['id', 'ASC']], transaction: t
      });
      for (const solicitud of solicitudes) {
        const propios = items.filter((i) => i.solicitud_id === solicitud.id);
        for (const item of propios) {
          const producto = productos[item.producto_id];
          const faltante = Number(item.cantidad_faltante) || 0;
          if (!producto || faltante <= 0) continue;
          const asignar = Math.min(disponible(producto), faltante);
          if (asignar <= 0) continue;
          await item.update({ cantidad_asignada: Number(item.cantidad_asignada) + asignar, cantidad_faltante: faltante - asignar }, { transaction: t });
          await kardex.registrar({
            transaction: t, producto: producto, tipo: M.SALIDA_SOLICITUD, cantidad: -asignar,
            referenciaTipo: 'solicitudes_bodega', referenciaId: solicitud.id, referenciaLineaId: item.id, usuario: usuario
          });
          asignaciones.push({ solicitud_id: solicitud.id, producto_id: producto.id, cantidad: asignar });
        }
        if (propios.every((i) => (Number(i.cantidad_faltante) || 0) === 0)) {
          const antes = solicitud.get({ plain: true });
          await solicitud.update({ estado: E.LISTA_ENTREGA }, { transaction: t });
          await auditar({
            transaction: t, usuario: usuario, entidad: 'solicitudes_bodega', entidad_id: solicitud.id,
            accion: 'ASIGNACION_RECEPCION', antes: antes, despues: solicitud, motivo: 'ORDEN_COMPRA ' + orden.id, ip: contexto.ip
          });
          completas.push(solicitud.id);
        }
      }
    }

    // Estado de la orden
    const lineasActuales = await Orden_compra_item.findAll({ where: { orden_id: orden.id }, transaction: t });
    const total = lineasActuales.every((l) => pendiente(l) === 0);
    await orden.update({ estado: total ? 'RECIBIDA' : 'RECIBIDA_PARCIAL' }, { transaction: t });

    const rechazos = recepcion.filter((r) => r.rechazada > 0)
      .map((r) => ({ item_id: r.linea.id, producto_id: r.linea.producto_id, cantidad: r.rechazada, motivo: r.motivo }));
    const recibidos = productoIds.map((id) => ({ producto_id: id, cantidad: recibidoPorProducto[id], costo_unitario: costoPorProducto[id] !== undefined ? costoPorProducto[id] : null }));
    await auditar({
      transaction: t, usuario: usuario, entidad: 'ordenes_compra', entidad_id: orden.id, accion: 'RECEPCION',
      antes: ordenAntes,
      despues: { estado: orden.estado, recepcion_id: cabecera.id, recibidos: recibidos, rechazos: rechazos, diferencias_precio: diferencias, asignaciones: asignaciones },
      motivo: [diferencias.length ? 'DIFERENCIA_PRECIO' : null, rechazos.length ? 'MERMA' : null].filter(Boolean).join(',') || null, ip: contexto.ip
    });

    return {
      orden_id: orden.id, recepcion_id: cabecera.id, estado: orden.estado, recibidos: recibidos, rechazos: rechazos,
      diferencias_precio: diferencias, asignaciones: asignaciones, solicitudes_listas: completas
    };
  }));
}

module.exports = { recibir };
