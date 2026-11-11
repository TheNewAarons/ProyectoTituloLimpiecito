/**
 * RF-BOD-04 — Recepción de una orden de compra (Docs/bodega-solicitudes.md, "RF-BOD-04").
 * Una sola transacción. Orden de locks (igual que crear/anular, para no cruzarse):
 *   orden de compra -> solicitudes FIFO (id ASC) -> productos (id ASC).
 * Recibido: stock += cantidad (ENTRADA_COMPRA) y costo_unitario = último costo de la orden.
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
const Movimiento = require('../../modelos/sistema_bodega/Movimiento_bodega');
const Producto = require('../../modelos/sistema_base/Producto');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../modelos/sistema_bodega/Orden_compra_item');
const { ESTADOS_SOLICITUD: E, TIPOS_MOVIMIENTO: M } = require('./constantes');

const ESTADOS_RECIBIBLES = ['ENVIADA', 'RECIBIDA_PARCIAL'];

const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const unicos = (lista) => Array.from(new Set(lista.filter((v) => v !== null && v !== undefined)));
const ascendente = (a, b) => a - b;
// Mismo criterio que cruceStock (D-054): stock NULL o negativo = 0 disponible.
const disponible = (p) => { const s = Number(p.stock); return Number.isFinite(s) && s > 0 ? s : 0; };

/**
 * Cantidades a recibir por línea. Sin `entradas`, recibe todo lo pendiente de cada línea.
 * @returns {{linea: object, cantidad: number}[]}
 */
function resolverCantidades(lineas, entradas) {
  const pendiente = (l) => Math.max(Number(l.cantidad) - Number(l.cantidad_recibida || 0), 0);
  if (!entradas) return lineas.map((l) => ({ linea: l, cantidad: pendiente(l) }));
  const lineasPorId = porId(lineas);
  return entradas.map((e) => {
    const linea = lineasPorId[e.item_id];
    if (!linea) throw new AppError('ITEM_NO_PERTENECE', 'el item ' + e.item_id + ' no pertenece a la orden', 400, { item_id: e.item_id });
    if (e.cantidad_recibida > pendiente(linea)) {
      throw new AppError('CANTIDAD_EXCEDE_PENDIENTE', 'la cantidad recibida supera lo pendiente de la linea', 400,
        { item_id: linea.id, pendiente: pendiente(linea), cantidad_recibida: e.cantidad_recibida });
    }
    return { linea: linea, cantidad: e.cantidad_recibida };
  });
}

/**
 * POST /ordenes-compra/:id/recepcion
 * @param {number} ordenId
 * @param {{item_id:number, cantidad_recibida:number}[]|null} entradas validadas en el controlador (enteros >= 0, sin repetidos)
 * @param {{usuario:{id:number, contexto:string}, ip?:string}} contexto
 */
async function recibir(ordenId, entradas, contexto) {
  const usuario = contexto.usuario;
  return reintentarTransaccion(() => db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async (t) => {
    // 1) Orden de compra
    const orden = await Orden_compra.findById(ordenId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!orden) throw new AppError('ORDEN_NO_ENCONTRADA', 'no existe la orden de compra ' + ordenId, 404, { id: ordenId });
    if (ESTADOS_RECIBIBLES.indexOf(orden.estado) === -1) {
      throw new AppError('ORDEN_NO_RECIBIBLE', 'solo se recibe una orden ENVIADA o RECIBIDA_PARCIAL', 409, { estado: orden.estado });
    }
    const lineas = await Orden_compra_item.findAll({ where: { orden_id: orden.id }, order: [['id', 'ASC']], transaction: t });
    const recepcion = resolverCantidades(lineas, entradas).filter((r) => r.cantidad > 0);
    if (!recepcion.length) throw new AppError('SIN_CANTIDADES', 'no hay cantidades para recibir', 400);

    const recibidoPorProducto = {};
    const costoPorProducto = {};
    recepcion.forEach((r) => {
      recibidoPorProducto[r.linea.producto_id] = (recibidoPorProducto[r.linea.producto_id] || 0) + r.cantidad;
      if (r.linea.costo_unitario !== null && r.linea.costo_unitario !== undefined) costoPorProducto[r.linea.producto_id] = Number(r.linea.costo_unitario);
    });
    const productoIds = Object.keys(recibidoPorProducto).map(Number).sort(ascendente);

    // 2) Solicitudes FIFO con faltante de estos productos (la lectura previa solo decide qué bloquear)
    const candidatas = await Item.findAll({
      where: { producto_id: { [Op.in]: productoIds }, cantidad_faltante: { [Op.gt]: 0 } }, attributes: ['solicitud_id'], transaction: t
    });
    const idsCandidatas = unicos(candidatas.map((i) => i.solicitud_id)).sort(ascendente);
    // Se re-verifica el estado DESPUÉS del lock: una anulación concurrente pudo cerrarla mientras se esperaba
    // (anular no toca cantidad_faltante, así que sin este filtro se asignaría stock a una solicitud ANULADA).
    const solicitudes = (idsCandidatas.length
      ? await Solicitud.findAll({ where: { id: { [Op.in]: idsCandidatas }, estado: E.PARCIAL }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t })
      : []).filter((s) => s.estado === E.PARCIAL);

    // 3) Productos
    const productos = porId(await Producto.findAll({
      where: { id: { [Op.in]: productoIds } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t
    }));

    // Entrada de lo recibido
    const ordenAntes = { estado: orden.estado, items: lineas.map((l) => ({ id: l.id, cantidad_recibida: l.cantidad_recibida })) };
    for (const r of recepcion) {
      await r.linea.update({ cantidad_recibida: Number(r.linea.cantidad_recibida || 0) + r.cantidad }, { transaction: t });
    }
    for (const id of productoIds) {
      const producto = productos[id];
      if (!producto) throw new AppError('PRODUCTO_NO_EXISTE', 'el producto ' + id + ' de la orden no existe', 409, { producto_id: id });
      const cambios = { stock: Number(producto.stock || 0) + recibidoPorProducto[id] };
      if (costoPorProducto[id] !== undefined) cambios.costo_unitario = costoPorProducto[id];
      await producto.update(cambios, { transaction: t });
      await Movimiento.create({
        producto_id: id, tipo: M.ENTRADA_COMPRA, cantidad: recibidoPorProducto[id],
        referencia_tipo: 'ordenes_compra', referencia_id: orden.id, usuario_id: usuario.id, contexto_usuario: usuario.contexto
      }, { transaction: t });
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
          await producto.update({ stock: Number(producto.stock) - asignar }, { transaction: t });
          await Movimiento.create({
            producto_id: producto.id, tipo: M.SALIDA_SOLICITUD, cantidad: -asignar,
            referencia_tipo: 'solicitudes_bodega', referencia_id: solicitud.id, usuario_id: usuario.id, contexto_usuario: usuario.contexto
          }, { transaction: t });
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
    const total = lineasActuales.every((l) => Number(l.cantidad_recibida) >= Number(l.cantidad));
    await orden.update({ estado: total ? 'RECIBIDA' : 'RECIBIDA_PARCIAL' }, { transaction: t });

    const recibidos = productoIds.map((id) => ({ producto_id: id, cantidad: recibidoPorProducto[id], costo_unitario: costoPorProducto[id] !== undefined ? costoPorProducto[id] : null }));
    await auditar({
      transaction: t, usuario: usuario, entidad: 'ordenes_compra', entidad_id: orden.id, accion: 'RECEPCION',
      antes: ordenAntes, despues: { estado: orden.estado, recibidos: recibidos, asignaciones: asignaciones }, ip: contexto.ip
    });

    return { orden_id: orden.id, estado: orden.estado, recibidos: recibidos, asignaciones: asignaciones, solicitudes_listas: completas };
  }));
}

module.exports = { recibir };
