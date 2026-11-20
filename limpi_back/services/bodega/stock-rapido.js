/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — Stock rápido en /api/v1, equivalente de /stock/obtener y /stock/crear
 * (api/apartado_base/stock_rapido). Mismo efecto que el legacy: crea la fila en stock_rapidos, suma la cantidad a
 * productos.stock con las filas bloqueadas en orden de id y audita CREAR (stock_rapidos) + AJUSTE (productos) en la
 * misma transacción. Además valida la entrada (JSON real, no texto a parsear) y exige productos activos.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const db = require('../../database/database');
const Producto = require('../../modelos/sistema_base/Producto');
const Stock = require('../../modelos/sistema_base/Stock_rapido');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');

const TOPE_ITEMS = 100;
const LARGO_COMENTARIO = 255;

/** GET — todas las entradas, más recientes primero, con el nombre del producto. */
async function listar() {
  const filas = await Stock.findAll({ order: [['id', 'DESC']], raw: true });
  const ids = Array.from(new Set(filas.map(function (f) { return f.productoId; }).filter(Boolean)));
  const nombres = {};
  if (ids.length) {
    (await Producto.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'nombre'], raw: true }))
      .forEach(function (p) { nombres[p.id] = p.nombre; });
  }
  return filas.map(function (f) {
    return { id: f.id, producto_id: f.productoId, producto: nombres[f.productoId] || null, cantidad: f.cantidad, comentario: f.comentario, fecha: f.fecha };
  });
}

/** Valida [{ producto_id, cantidad, comentario?, fecha? 'YYYY-MM-DD' }] (1..100). */
function normalizar(body) {
  const items = body && body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > TOPE_ITEMS) {
    throw new AppError('CAMPO_INVALIDO', 'items debe ser una lista de 1 a ' + TOPE_ITEMS + ' entradas', 400, { campo: 'items' });
  }
  const errores = {};
  const r = items.map(function (it, i) {
    const x = it || {};
    const pid = Number(x.producto_id);
    const cant = Number(x.cantidad);
    if (!Number.isSafeInteger(pid) || pid <= 0 || typeof x.producto_id === 'boolean') errores['items.' + i + '.producto_id'] = 'entero mayor a 0';
    if (!Number.isSafeInteger(cant) || cant <= 0 || typeof x.cantidad === 'boolean') errores['items.' + i + '.cantidad'] = 'entero mayor a 0';
    let comentario = null;
    if (x.comentario !== undefined && x.comentario !== null) {
      if (typeof x.comentario !== 'string' || x.comentario.trim().length > LARGO_COMENTARIO) errores['items.' + i + '.comentario'] = 'texto de hasta ' + LARGO_COMENTARIO;
      else comentario = x.comentario.trim() || null;
    }
    const f = x.fecha === undefined || x.fecha === null || x.fecha === '' ? fecha.hoySantiago() : x.fecha;
    if (!fecha.esFechaValida(f)) errores['items.' + i + '.fecha'] = 'formato YYYY-MM-DD';
    return { producto_id: pid, cantidad: cant, comentario: comentario, fecha: f };
  });
  if (Object.keys(errores).length) throw new AppError('CAMPO_INVALIDO', 'revise las entradas de stock', 400, errores);
  return r;
}

/** POST — una sola transacción para todas las entradas (todo o nada). */
async function crear(body, ctx) {
  const items = normalizar(body);
  const ids = Array.from(new Set(items.map(function (i) { return i.producto_id; }))).sort(function (a, b) { return a - b; });
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const bloqueados = await Producto.findAll({ where: { id: { [Op.in]: ids } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t });
      const previo = {};
      bloqueados.forEach(function (p) { previo[p.id] = p; });
      const invalidos = ids.filter(function (id) { return !previo[id] || Number(previo[id].estado) !== 1; });
      if (invalidos.length) throw new AppError('PRODUCTO_NO_DISPONIBLE', 'hay productos inexistentes o no activos', 409, { producto_ids: invalidos });

      const creadas = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        // Medianoche en Santiago ≈ 03:00/04:00 UTC: se guarda el mediodía UTC para que la fecha no cambie de día al mostrarla.
        const s = await Stock.create({ cantidad: it.cantidad, comentario: it.comentario, fecha: new Date(it.fecha + 'T12:00:00Z'), productoId: it.producto_id }, { transaction: t });
        await Producto.increment('stock', { by: it.cantidad, where: { id: it.producto_id }, transaction: t });
        await auditar({ transaction: t, usuario: ctx.usuario, entidad: 'stock_rapidos', entidad_id: s.id, accion: 'CREAR', antes: null, despues: s, ip: ctx.ip });
        creadas.push(s.id);
      }
      const releidos = await Producto.findAll({ where: { id: { [Op.in]: ids } }, order: [['id', 'ASC']], transaction: t });
      for (let i = 0; i < releidos.length; i++) {
        const p = releidos[i];
        await auditar({
          transaction: t, usuario: ctx.usuario, entidad: 'productos', entidad_id: p.id, accion: 'AJUSTE',
          antes: { id: p.id, stock: previo[p.id].stock }, despues: { id: p.id, stock: p.stock }, ip: ctx.ip
        });
      }
      return { entradas_creadas: creadas, productos: releidos.map(function (p) { return { id: p.id, nombre: p.nombre, stock: Number(p.stock) || 0 }; }) };
    });
  });
}

module.exports = { listar: listar, normalizar: normalizar, crear: crear, TOPE_ITEMS: TOPE_ITEMS };
