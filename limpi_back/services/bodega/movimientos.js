/**
 * RF-BOD-04 — Consulta de movimientos_bodega (GET /movimientos). Solo lectura.
 * desde/hasta son días calendario en America/Santiago; created_at se guarda en UTC.
 */

const Op = require('sequelize').Op;

const Movimiento = require('../../modelos/sistema_bodega/Movimiento_bodega');
const Producto = require('../../modelos/sistema_base/Producto');

const ZONA = 'America/Santiago';

// Minutos que Santiago está desplazado de UTC en ese instante (negativo: -180 o -240 según horario).
function desfaseMinutos(ms) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).reduce((m, x) => { m[x.type] = Number(x.value); return m; }, {});
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms) / 60000;
}

// 'YYYY-MM-DD' del instante en Santiago.
function fechaSantiago(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

/**
 * Primer instante (UTC) del día 'YYYY-MM-DD' (+ diasExtra) en Santiago. El día que empieza el horario de
 * verano las 00:00 no existen (el reloj salta a 01:00): se ajusta por horas hasta el primer instante de ese día.
 */
function inicioDiaSantiago(fecha, diasExtra) {
  const [y, m, d] = fecha.split('-').map(Number);
  const local = Date.UTC(y, m - 1, d + (diasExtra || 0));
  const objetivo = new Date(local).toISOString().slice(0, 10);
  let ms = local - desfaseMinutos(local) * 60000;
  ms = local - desfaseMinutos(ms) * 60000;
  while (fechaSantiago(ms) < objetivo) ms += 3600000;
  while (fechaSantiago(ms - 3600000) >= objetivo) ms -= 3600000;
  return new Date(ms);
}

/**
 * @param {{producto_id?:number, tipo?:string, desde?:string, hasta?:string, page:number, limit:number}} filtros validados
 */
async function listar(filtros) {
  const where = {};
  if (filtros.producto_id) where.producto_id = filtros.producto_id;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.desde || filtros.hasta) {
    where.created_at = {};
    if (filtros.desde) where.created_at[Op.gte] = inicioDiaSantiago(filtros.desde);
    if (filtros.hasta) where.created_at[Op.lt] = inicioDiaSantiago(filtros.hasta, 1);
  }
  const r = await Movimiento.findAndCountAll({
    where: where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: filtros.limit, offset: (filtros.page - 1) * filtros.limit
  });
  const ids = Array.from(new Set(r.rows.map((m) => m.producto_id)));
  const productos = ids.length
    ? (await Producto.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'nombre'] })).reduce((acc, p) => { acc[p.id] = p.nombre; return acc; }, {})
    : {};
  return {
    data: r.rows.map((m) => ({
      id: m.id, producto_id: m.producto_id, producto: productos[m.producto_id] || null, tipo: m.tipo, cantidad: m.cantidad,
      referencia_tipo: m.referencia_tipo, referencia_id: m.referencia_id, contexto_usuario: m.contexto_usuario, usuario_id: m.usuario_id, created_at: m.created_at
    })),
    meta: { page: filtros.page, limit: filtros.limit, total: r.count }
  };
}

module.exports = { listar, inicioDiaSantiago };
