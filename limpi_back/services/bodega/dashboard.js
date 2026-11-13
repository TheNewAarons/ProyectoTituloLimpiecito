/**
 * RF-BOD-05 — Dashboard / home de bodega (Docs/bodega-solicitudes.md, "RF-BOD-05").
 * Una llamada con 4 bloques. Los CONTADORES salen siempre de COUNT/agregados en SQL; las listas se recortan
 * aparte (los topes no afectan a los contadores).
 * Alerta de stock: stock_minimo > 0 y stock <= stock_minimo (stock NULL cuenta como 0).
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Producto = require('../../modelos/sistema_base/Producto');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const cruceStock = require('./cruceStock');
const ordenesConsulta = require('./ordenesConsulta');
const { ESTADOS_SOLICITUD: E, ETIQUETA_ESTADO, PRODUCTO_ACTIVO } = require('./constantes');

const TOPE = { SOLICITUDES: 5, LISTA_COMPRA: 10, STOCK: 500, ORDENES: 10 };
const ESTADOS_ACTIVOS = [E.PENDIENTE, E.PARCIAL, E.LISTA_ENTREGA];
const ESTADOS_TRANSITO = ['ENVIADA', 'RECIBIDA_PARCIAL'];
// Misma regla en SQL (contador) y en JS (lista): mínimo definido y stock en o bajo el mínimo.
const SQL_BAJO_MINIMO = 'stock_minimo > 0 AND COALESCE(stock, 0) <= stock_minimo';
const bajoMinimo = (p) => Number(p.stock_minimo) > 0 && (Number(p.stock) || 0) <= Number(p.stock_minimo);

async function bloqueSolicitudes() {
  const filas = await Solicitud.findAll({
    attributes: ['estado', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'n']],
    where: { estado: { [Op.in]: ESTADOS_ACTIVOS } }, group: ['estado'], raw: true
  });
  const porEstado = ESTADOS_ACTIVOS.reduce((m, e) => { m[e] = 0; return m; }, {});
  filas.forEach((f) => { porEstado[f.estado] = Number(f.n); });

  // Las más antiguas que todavía esperan bodega (FIFO), recortadas.
  const antiguas = await Solicitud.findAll({
    where: { estado: { [Op.in]: [E.PENDIENTE, E.PARCIAL] } }, order: [['created_at', 'ASC'], ['id', 'ASC']], limit: TOPE.SOLICITUDES,
    attributes: ['id', 'estado', 'centro_costo_id', 'created_at']
  });
  const centros = antiguas.length
    ? (await Centro.findAll({ where: { id: { [Op.in]: antiguas.map((s) => s.centro_costo_id) } }, attributes: ['id', 'numero_cc'] }))
      .reduce((m, c) => { m[c.id] = c.numero_cc; return m; }, {})
    : {};
  return {
    por_estado: porEstado,
    total_activas: ESTADOS_ACTIVOS.reduce((a, e) => a + porEstado[e], 0),
    mas_antiguas: antiguas.map((s) => ({
      id: s.id, estado: s.estado, etiqueta_estado: ETIQUETA_ESTADO[s.estado], numero_cc: centros[s.centro_costo_id] || null, created_at: s.created_at
    }))
  };
}

async function bloqueListaCompra() {
  // listaCompra calcula la lista completa (no hay COUNT posible: es un neto por producto); el total sale de ahí.
  const filas = await cruceStock.listaCompra({});
  const top = filas.slice().sort((a, b) => b.cantidad_a_comprar - a.cantidad_a_comprar).slice(0, TOPE.LISTA_COMPRA);
  // Spec §7: la lista de compra va "con cantidad y proveedor": nombre solo para las filas mostradas.
  const idsProveedor = Array.from(new Set(top.map((f) => f.proveedor_id).filter((id) => id !== null && id !== undefined)));
  const proveedores = idsProveedor.length
    ? (await Proveedor.findAll({ where: { id: { [Op.in]: idsProveedor } }, attributes: ['id', 'nombre'] })).reduce((m, p) => { m[p.id] = p.nombre; return m; }, {})
    : {};
  return {
    total_productos: filas.length,
    total_unidades: filas.reduce((a, f) => a + f.cantidad_a_comprar, 0),
    sin_proveedor: filas.filter((f) => f.proveedor_id === null).length,
    productos: top.map((f) => ({
      producto_id: f.producto_id, producto: f.producto, cantidad_a_comprar: f.cantidad_a_comprar,
      proveedor_id: f.proveedor_id, proveedor: f.proveedor_id === null ? null : (proveedores[f.proveedor_id] || null)
    }))
  };
}

async function bloqueStock() {
  const whereActivo = { estado: PRODUCTO_ACTIVO };
  const [totalActivos, totalBajo] = await Promise.all([
    Producto.count({ where: whereActivo }),
    Producto.count({ where: Object.assign({}, whereActivo, { [Op.and]: db.sequelize.literal(SQL_BAJO_MINIMO) }) })
  ]);
  // Bajo mínimo primero, para que ninguna alerta quede fuera del recorte.
  const productos = await Producto.findAll({
    where: whereActivo, attributes: ['id', 'nombre', 'stock', 'stock_minimo'],
    order: [[db.sequelize.literal('CASE WHEN ' + SQL_BAJO_MINIMO + ' THEN 0 ELSE 1 END'), 'ASC'], ['nombre', 'ASC']],
    limit: TOPE.STOCK
  });
  return {
    total_activos: totalActivos,
    total_bajo_minimo: totalBajo,
    truncado: totalActivos > TOPE.STOCK,
    productos: productos.map((p) => ({
      id: p.id, nombre: p.nombre, stock: p.stock === null ? 0 : Number(p.stock), stock_minimo: Number(p.stock_minimo), bajo_minimo: bajoMinimo(p)
    }))
  };
}

async function bloqueOrdenes() {
  // listar usa findAndCountAll: meta.total es un COUNT, independiente del tope.
  const r = await ordenesConsulta.listar({ estados: ESTADOS_TRANSITO, page: 1, limit: TOPE.ORDENES });
  const porEstado = (await Orden_compra.findAll({
    attributes: ['estado', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'n']],
    where: { estado: { [Op.in]: ESTADOS_TRANSITO } }, group: ['estado'], raw: true
  })).reduce((m, f) => { m[f.estado] = Number(f.n); return m; }, { ENVIADA: 0, RECIBIDA_PARCIAL: 0 });
  return { total: r.meta.total, por_estado: porEstado, ordenes: r.data };
}

/** GET /dashboard — los 4 bloques en paralelo. */
async function obtener() {
  const inicio = Date.now();
  const [solicitudes, listaCompra, stock, ordenes] = await Promise.all([bloqueSolicitudes(), bloqueListaCompra(), bloqueStock(), bloqueOrdenes()]);
  return {
    data: { solicitudes: solicitudes, lista_compra: listaCompra, stock: stock, ordenes_transito: ordenes },
    meta: { generado_en: new Date().toISOString(), duracion_ms: Date.now() - inicio, topes: TOPE }
  };
}

/**
 * PATCH /productos/:id/stock-minimo — entero >= 0 validado en el controlador; transacción + auditoría.
 * @param {number} id
 * @param {number} stockMinimo
 * @param {{id:number, contexto:string}} usuario
 * @param {string} [ip]
 */
async function actualizarStockMinimo(id, stockMinimo, usuario, ip) {
  return db.sequelize.transaction(async (t) => {
    const producto = await Producto.findById(id, { attributes: ['id', 'nombre', 'stock', 'stock_minimo', 'estado'], transaction: t, lock: t.LOCK.UPDATE });
    if (!producto) throw new AppError('PRODUCTO_NO_EXISTE', 'el producto no existe', 404, { id: id });
    // El dashboard solo muestra productos activos: no se cargan mínimos a productos que no se ven ni se piden.
    if (Number(producto.estado) !== PRODUCTO_ACTIVO) {
      throw new AppError('PRODUCTO_INACTIVO', 'el producto esta inactivo', 409, { id: producto.id });
    }
    const respuesta = { id: producto.id, nombre: producto.nombre, stock: Number(producto.stock) || 0, stock_minimo: stockMinimo, bajo_minimo: bajoMinimo({ stock: producto.stock, stock_minimo: stockMinimo }) };
    const antes = { stock_minimo: Number(producto.stock_minimo) };
    // Sin cambio: no se escribe ni se deja una auditoría vacía.
    if (antes.stock_minimo === stockMinimo) return respuesta;
    await producto.update({ stock_minimo: stockMinimo }, { transaction: t });
    await auditar({
      transaction: t, usuario: usuario, entidad: 'productos', entidad_id: producto.id, accion: 'STOCK_MINIMO',
      antes: antes, despues: { stock_minimo: stockMinimo }, ip: ip
    });
    return respuesta;
  });
}

module.exports = { obtener, actualizarStockMinimo, bajoMinimo, TOPE, SQL_BAJO_MINIMO };
