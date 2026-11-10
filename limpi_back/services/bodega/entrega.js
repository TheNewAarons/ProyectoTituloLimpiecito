/**
 * RF-BOD-04 — Entrega de una solicitud y formato imprimible (Docs/bodega-solicitudes.md, "RF-BOD-04").
 * Entregar NO mueve stock (ya se descontó en el cruce o en la recepción): registra el consumo en el
 * centro de costo con los modelos Lista_insumo/Linea_insumo, sin disminuirCantidadProductoDB del legacy.
 * La lista nace aprobada (estado 1): una lista en 0 impide cerrar el centro de costo (ver-centro.verificarCierre).
 * `solicitudes_bodega.lista_insumo_id` se lee/escribe con SQL parametrizado: no está en el modelo para no
 * romper consultas en ambientes sin la migración 20261110000953 (ni el test del modelo).
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const solicitudes = require('./solicitudes');
const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../modelos/sistema_bodega/Solicitud_item');
const Producto = require('../../modelos/sistema_base/Producto');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const Usuario = require('../../modelos/sistema_base/Usuario');
const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../modelos/sistema_base/Linea_insumo');
const Auditoria = require('../../modelos/sistema_base/Auditoria');
const { ESTADOS_SOLICITUD: E, CENTRO_ABIERTO } = require('./constantes');

const EMPRESA = 'Aseo Limpiecito';
const ORIGEN = { COSTO: 'COSTO', ESTIMADO: 'ESTIMADO', SIN_COSTO: 'SIN_COSTO' };
const LISTA_APROBADA = 1;

// Costo por unidad: último costo de compra; si no hay, productos.precio (lo que usa la carga manual), marcado "estimado".
function precioDe(producto) {
  if (producto && producto.costo_unitario !== null && producto.costo_unitario !== undefined) {
    return { precio: Math.round(Number(producto.costo_unitario)), origen: ORIGEN.COSTO };
  }
  if (producto && producto.precio !== null && producto.precio !== undefined) {
    return { precio: Math.round(Number(producto.precio)), origen: ORIGEN.ESTIMADO };
  }
  return { precio: 0, origen: ORIGEN.SIN_COSTO };
}

async function lineasConPrecio(items, transaction) {
  const ids = Array.from(new Set(items.map((i) => i.producto_id)));
  const productos = (await Producto.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'nombre', 'costo_unitario', 'precio'], transaction: transaction }))
    .reduce((m, p) => { m[p.id] = p; return m; }, {});
  return items
    .filter((i) => Number(i.cantidad_asignada) > 0)
    .map((i) => {
      const p = precioDe(productos[i.producto_id]);
      const cantidad = Number(i.cantidad_asignada);
      return { producto_id: i.producto_id, producto: productos[i.producto_id] ? productos[i.producto_id].nombre : null, cantidad: cantidad, precio: p.precio, origen: p.origen, total: cantidad * p.precio };
    });
}

async function listaInsumoId(id, transaction) {
  const filas = await db.sequelize.query('SELECT lista_insumo_id FROM solicitudes_bodega WHERE id = :id',
    { replacements: { id: id }, type: Sequelize.QueryTypes.SELECT, transaction: transaction });
  return filas.length ? filas[0].lista_insumo_id : null;
}

/**
 * POST /solicitudes/:id/entregar — LISTA_ENTREGA -> ENTREGADA y consumo en el centro de costo.
 * @param {number} id
 * @param {{id:number, contexto:string}} usuario solo `usuarios` (Lista_insumo.usuarioCreaId es FK a usuarios)
 * @param {string} [ip]
 */
async function entregar(id, usuario, ip) {
  if (usuario.contexto !== 'usuarios') {
    throw new AppError('FORBIDDEN', 'la entrega la registra un usuario de administracion', 403);
  }
  await db.sequelize.transaction(async (t) => {
    const s = await Solicitud.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!s) throw new AppError('SOLICITUD_NO_EXISTE', 'la solicitud no existe', 404, { id: id });
    if (s.estado !== E.LISTA_ENTREGA) {
      throw new AppError('ESTADO_NO_PERMITE_ENTREGA', 'solo se entrega una solicitud LISTA_ENTREGA (esta en ' + s.estado + ')', 409, { estado: s.estado });
    }
    if (await listaInsumoId(s.id, t)) {
      throw new AppError('YA_ENTREGADA', 'la solicitud ya tiene su consumo registrado', 409, { id: s.id });
    }
    const centro = await Centro.findById(s.centro_costo_id, { attributes: ['id', 'estado'], transaction: t, lock: t.LOCK.SHARE });
    if (!centro || Number(centro.estado) !== CENTRO_ABIERTO) {
      throw new AppError('CENTRO_CERRADO', 'el centro de costo esta cerrado: no se puede cargar el consumo', 409, { centro_costo_id: s.centro_costo_id });
    }

    const items = await Item.findAll({ where: { solicitud_id: s.id }, order: [['id', 'ASC']], transaction: t });
    const lineas = await lineasConPrecio(items, t);
    const total = lineas.reduce((acc, l) => acc + l.total, 0);
    const ahora = new Date();

    const lista = await Lista_insumo.create({
      fecha: ahora, total: total, estado: LISTA_APROBADA, centroCostoId: s.centro_costo_id, usuarioCreaId: usuario.id, usuarioApruebaId: usuario.id
    }, { transaction: t });
    for (const l of lineas) {
      await Linea_insumo.create({ cantidad: l.cantidad, precio: l.precio, total_linea: l.total, productoId: l.producto_id, listaInsumoId: lista.id }, { transaction: t });
    }

    const antes = s.get({ plain: true });
    await s.update({ estado: E.ENTREGADA, entregada_at: ahora }, { transaction: t });
    await db.sequelize.query('UPDATE solicitudes_bodega SET lista_insumo_id = :lista WHERE id = :id',
      { replacements: { lista: lista.id, id: s.id }, transaction: t });
    await auditar({
      transaction: t, usuario: usuario, entidad: 'solicitudes_bodega', entidad_id: s.id, accion: 'ENTREGA',
      antes: antes, despues: { estado: E.ENTREGADA, entregada_at: ahora, lista_insumo_id: lista.id, total: total, lineas: lineas }, ip: ip
    });
  });
  return solicitudes.obtener(id, usuario);
}

/**
 * GET /solicitudes/:id/formato-entrega — datos del formato imprimible.
 * ENTREGADA: lo registrado al entregar (precios y origen guardados en la auditoría ENTREGA).
 * LISTA_ENTREGA: vista previa con los costos actuales.
 */
async function formatoEntrega(id, usuario) {
  const s = await solicitudes.obtener(id, usuario);
  if (s.estado !== E.LISTA_ENTREGA && s.estado !== E.ENTREGADA) {
    throw new AppError('ESTADO_SIN_FORMATO', 'el formato de entrega existe solo para LISTA_ENTREGA o ENTREGADA', 409, { estado: s.estado });
  }

  let lineas;
  let entregadoPor = null;
  if (s.estado === E.ENTREGADA) {
    const registro = await Auditoria.findOne({ where: { entidad: 'solicitudes_bodega', entidad_id: String(id), accion: 'ENTREGA' }, order: [['id', 'DESC']] });
    const despues = registro && registro.valores_despues ? (typeof registro.valores_despues === 'string' ? JSON.parse(registro.valores_despues) : registro.valores_despues) : null;
    lineas = despues && Array.isArray(despues.lineas) ? despues.lineas : [];
    const quien = registro && registro.usuario_id ? await Usuario.findById(registro.usuario_id, { attributes: ['nombre', 'apellido'] }) : null;
    entregadoPor = quien ? [quien.nombre, quien.apellido].filter(Boolean).join(' ') : null;
  } else {
    lineas = await lineasConPrecio(await Item.findAll({ where: { solicitud_id: id }, order: [['id', 'ASC']] }));
  }

  const items = lineas.map((l) => ({
    producto: l.producto, cantidad: l.cantidad, precio_unitario: l.precio, total: l.total,
    costo_estimado: l.origen === ORIGEN.ESTIMADO, sin_costo: l.origen === ORIGEN.SIN_COSTO
  }));
  return {
    empresa: EMPRESA,
    numero: s.id,
    estado: s.estado,
    vista_previa: s.estado !== E.ENTREGADA,
    fecha_entrega: s.entregada_at,
    centro_costo: s.centro_costo,
    solicitante: s.solicitante,
    entregado_por: entregadoPor,
    observacion: s.observacion,
    items: items,
    total: items.reduce((acc, i) => acc + i.total, 0),
    hay_costo_estimado: items.some((i) => i.costo_estimado),
    hay_sin_costo: items.some((i) => i.sin_costo)
  };
}

module.exports = { entregar, formatoEntrega, precioDe, ORIGEN };
