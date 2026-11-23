/**
 * RF-BOD-07 — Conteo físico de inventario y ajustes aprobados (retroalimentación Sumativa 2).
 * Flujo: crear (snapshot de cantidad_teorica = stock) -> capturar lo contado -> aprobar (solo Admin, ver routes.js) | anular.
 * Al aprobar, en una transacción y con lock de productos (id ASC): la diferencia se recalcula contra el stock ACTUAL
 * (pudo moverse desde el snapshot) y cada diferencia ≠ 0 genera un AJUSTE vía kardex.registrar a costo promedio.
 * Nunca se escribe productos.stock directo. Ítems sin contar no se ajustan.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const kardex = require('./kardex');
const Producto = require('../../modelos/sistema_base/Producto');
const Conteo = require('../../modelos/sistema_bodega/Inventario_conteo');
const ConteoItem = require('../../modelos/sistema_bodega/Inventario_conteo_item');
const { TIPOS_MOVIMIENTO: M, PRODUCTO_ACTIVO } = require('./constantes');

const ESTADOS = { BORRADOR: 'BORRADOR', APROBADO: 'APROBADO', ANULADO: 'ANULADO' };

const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const nulo = (v) => v === null || v === undefined;
const stockDe = (p) => { const s = Number(p.stock); return Number.isFinite(s) ? s : 0; };

/** KPI exactitud de inventario: ítems contados sin diferencia / ítems contados (null si no hay contados). */
function exactitud(items) {
  const contados = items.filter((i) => !nulo(i.cantidad_contada));
  if (!contados.length) return null;
  return Math.round(contados.filter((i) => Number(i.diferencia) === 0).length * 10000 / contados.length) / 100;
}

function resumen(conteo, items) {
  return {
    id: conteo.id, fecha: conteo.fecha, estado: conteo.estado, observacion: conteo.observacion,
    responsable_id: conteo.responsable_id, aprobado_por: conteo.aprobado_por, aprobado_at: conteo.aprobado_at,
    items_total: items.length, items_contados: items.filter((i) => !nulo(i.cantidad_contada)).length,
    exactitud: exactitud(items)
  };
}

async function bloquearBorrador(id, t) {
  const conteo = await Conteo.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!conteo) throw new AppError('CONTEO_NO_ENCONTRADO', 'no existe el conteo ' + id, 404, { id: id });
  if (conteo.estado !== ESTADOS.BORRADOR) {
    throw new AppError('CONTEO_NO_EDITABLE', 'solo se modifica un conteo en BORRADOR', 409, { estado: conteo.estado });
  }
  return conteo;
}

/**
 * POST /conteos. Sin producto_ids cuenta todos los productos activos.
 * @param {{producto_ids:number[]|null, observacion:string|null}} datos validados en el controlador
 * @param {{usuario:{id:number, contexto:string}, ip?:string}} contexto
 */
async function crear(datos, contexto) {
  const usuario = contexto.usuario;
  return db.sequelize.transaction(async (t) => {
    const where = datos.producto_ids ? { id: { [Op.in]: datos.producto_ids } } : { estado: PRODUCTO_ACTIVO };
    const productos = await Producto.findAll({ where: where, attributes: ['id', 'stock'], order: [['id', 'ASC']], transaction: t });
    if (datos.producto_ids) {
      const encontrados = productos.map((p) => p.id);
      const faltan = datos.producto_ids.filter((id) => encontrados.indexOf(id) === -1);
      if (faltan.length) throw new AppError('PRODUCTO_NO_EXISTE', 'productos inexistentes', 400, { producto_ids: faltan });
    }
    if (!productos.length) throw new AppError('SIN_PRODUCTOS', 'no hay productos para contar', 400);
    const conteo = await Conteo.create({
      fecha: new Date(), responsable_id: usuario.id, contexto_usuario: usuario.contexto, estado: ESTADOS.BORRADOR,
      observacion: datos.observacion
    }, { transaction: t });
    for (const p of productos) {
      await ConteoItem.create({ conteo_id: conteo.id, producto_id: p.id, cantidad_teorica: stockDe(p) }, { transaction: t });
    }
    await auditar({
      transaction: t, usuario: usuario, entidad: 'inventario_conteos', entidad_id: conteo.id, accion: 'CREAR',
      antes: null, despues: { estado: conteo.estado, productos: productos.length }, ip: contexto.ip
    });
    return { id: conteo.id, estado: conteo.estado, items_total: productos.length };
  });
}

/** @param {{estado?:string, page:number, limit:number}} filtros */
async function listar(filtros) {
  const where = filtros.estado ? { estado: filtros.estado } : {};
  const r = await Conteo.findAndCountAll({ where: where, order: [['id', 'DESC']], limit: filtros.limit, offset: (filtros.page - 1) * filtros.limit });
  const ids = r.rows.map((c) => c.id);
  const items = ids.length
    ? await ConteoItem.findAll({ where: { conteo_id: { [Op.in]: ids } }, attributes: ['conteo_id', 'cantidad_contada', 'diferencia'] })
    : [];
  return {
    data: r.rows.map((c) => resumen(c, items.filter((i) => i.conteo_id === c.id))),
    meta: { page: filtros.page, limit: filtros.limit, total: r.count }
  };
}

/** GET /conteos/:id: cabecera, KPI y líneas con nombre de producto. */
async function obtener(id) {
  const conteo = await Conteo.findById(id);
  if (!conteo) throw new AppError('CONTEO_NO_ENCONTRADO', 'no existe el conteo ' + id, 404, { id: id });
  const items = await ConteoItem.findAll({ where: { conteo_id: id }, order: [['id', 'ASC']] });
  const productos = porId(await Producto.findAll({ where: { id: { [Op.in]: items.map((i) => i.producto_id) } }, attributes: ['id', 'nombre'] }));
  return Object.assign(resumen(conteo, items), {
    items: items.map((i) => ({
      item_id: i.id, producto_id: i.producto_id, producto: productos[i.producto_id] ? productos[i.producto_id].nombre : null,
      cantidad_teorica: i.cantidad_teorica, cantidad_contada: i.cantidad_contada, diferencia: i.diferencia,
      motivo: i.motivo, movimiento_id: i.movimiento_id
    }))
  });
}

/**
 * PATCH /conteos/:id/items. cantidad_contada null limpia la captura de la línea.
 * @param {{item_id:number, cantidad_contada:number|null, motivo:string|null}[]} entradas validadas en el controlador
 */
async function capturar(id, entradas, contexto) {
  await db.sequelize.transaction(async (t) => {
    await bloquearBorrador(id, t);
    const items = porId(await ConteoItem.findAll({ where: { conteo_id: id }, transaction: t }));
    for (const e of entradas) {
      const item = items[e.item_id];
      if (!item) throw new AppError('ITEM_NO_PERTENECE', 'el item ' + e.item_id + ' no pertenece al conteo', 400, { item_id: e.item_id });
      await item.update({
        cantidad_contada: e.cantidad_contada,
        diferencia: nulo(e.cantidad_contada) ? null : e.cantidad_contada - Number(item.cantidad_teorica),
        motivo: e.motivo
      }, { transaction: t });
    }
  });
  return obtener(id);
}

/** PATCH /conteos/:id/anular: solo BORRADOR (un conteo aprobado ya movió el kardex). */
async function anular(id, motivo, contexto) {
  await db.sequelize.transaction(async (t) => {
    const conteo = await bloquearBorrador(id, t);
    await conteo.update({ estado: ESTADOS.ANULADO }, { transaction: t });
    await auditar({
      transaction: t, usuario: contexto.usuario, entidad: 'inventario_conteos', entidad_id: conteo.id, accion: 'ANULAR',
      antes: { estado: ESTADOS.BORRADOR }, despues: { estado: ESTADOS.ANULADO }, motivo: motivo, ip: contexto.ip
    });
  });
  return obtener(id);
}

/**
 * POST /conteos/:id/aprobar. Lock: conteo -> productos (id ASC), mismo orden que el resto de bodega.
 * @returns {Promise<{conteo:object, ajustes:object[], recalculados:object[]}>}
 */
async function aprobar(id, contexto) {
  const usuario = contexto.usuario;
  const r = await reintentarTransaccion(() => db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async (t) => {
    const conteo = await bloquearBorrador(id, t);
    const contados = (await ConteoItem.findAll({ where: { conteo_id: id }, order: [['id', 'ASC']], transaction: t }))
      .filter((i) => !nulo(i.cantidad_contada));
    if (!contados.length) throw new AppError('SIN_CONTADOS', 'el conteo no tiene productos contados', 400);
    const productos = porId(await Producto.findAll({
      where: { id: { [Op.in]: contados.map((i) => i.producto_id) } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t
    }));

    const ajustes = [];
    const recalculados = [];
    for (const item of contados) {
      const producto = productos[item.producto_id];
      if (!producto) throw new AppError('PRODUCTO_NO_EXISTE', 'el producto ' + item.producto_id + ' del conteo no existe', 409, { producto_id: item.producto_id });
      const stockActual = stockDe(producto);
      const teorica = Number(item.cantidad_teorica);
      if (stockActual !== teorica) recalculados.push({ item_id: item.id, producto_id: producto.id, cantidad_teorica: teorica, stock_actual: stockActual });
      const diferencia = Number(item.cantidad_contada) - stockActual;
      let movimientoId = null;
      if (diferencia !== 0) {
        const mov = await kardex.registrar({
          transaction: t, producto: producto, tipo: M.AJUSTE, cantidad: diferencia,
          referenciaTipo: 'inventario_conteos', referenciaId: conteo.id, referenciaLineaId: item.id,
          motivo: item.motivo || 'Conteo físico N° ' + conteo.id, usuario: usuario
        });
        movimientoId = mov.id;
        ajustes.push({ item_id: item.id, producto_id: producto.id, cantidad: diferencia, movimiento_id: mov.id });
      }
      await item.update({ diferencia: diferencia, movimiento_id: movimientoId }, { transaction: t });
    }

    await conteo.update({ estado: ESTADOS.APROBADO, aprobado_por: usuario.id, aprobado_at: new Date() }, { transaction: t });
    await auditar({
      transaction: t, usuario: usuario, entidad: 'inventario_conteos', entidad_id: conteo.id, accion: 'APROBAR',
      antes: { estado: ESTADOS.BORRADOR }, despues: { estado: ESTADOS.APROBADO, ajustes: ajustes, recalculados: recalculados },
      motivo: recalculados.length ? 'STOCK_CAMBIO_DESDE_SNAPSHOT' : null, ip: contexto.ip
    });
    return { ajustes: ajustes, recalculados: recalculados };
  }));
  return Object.assign({ conteo: await obtener(id) }, r);
}

module.exports = { crear, listar, obtener, capturar, anular, aprobar, exactitud, ESTADOS };
