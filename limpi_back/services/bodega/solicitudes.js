/**
 * RF-BOD-01 — Lógica de solicitudes de insumos/EPP (Docs/bodega-solicitudes.md).
 * Recibe datos ya validados por el controlador (api/v1/bodega). Escrituras en transacción + auditoría.
 * Propiedad: el creador se guarda en trabajador_id (contexto acceso_trabajadores) o usuario_id (contexto usuarios)
 * y solo se compara contra la columna de su mismo contexto. Sin asociaciones Sequelize: consultas explícitas.
 */

const Op = require('sequelize').Op;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../modelos/sistema_bodega/Solicitud_item');
const Producto = require('../../modelos/sistema_base/Producto');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const CentroTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const Cliente = require('../../modelos/sistema_base/Cliente');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const Usuario = require('../../modelos/sistema_base/Usuario');
const { ESTADOS_SOLICITUD: E, ETIQUETA_ESTADO, PRODUCTO_ACTIVO, CENTRO_ABIERTO } = require('./constantes');

const CONTEXTO_SUPERVISOR = 'acceso_trabajadores';
const CONTEXTO_USUARIO = 'usuarios';
const ESTADOS_FINALES = [E.ENTREGADA, E.ANULADA];

const esSupervisor = (u) => u.contexto === CONTEXTO_SUPERVISOR;
const columnaDueno = (u) => (esSupervisor(u) ? 'trabajador_id' : 'usuario_id');

function esDueno(solicitud, usuario) {
  if (usuario.contexto === CONTEXTO_SUPERVISOR) return solicitud.trabajador_id !== null && Number(solicitud.trabajador_id) === Number(usuario.id);
  if (usuario.contexto === CONTEXTO_USUARIO) return solicitud.usuario_id !== null && Number(solicitud.usuario_id) === Number(usuario.id);
  return false;
}

const actor = (usuario) => ({ id: usuario.id, contexto: usuario.contexto });
const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const unicos = (lista) => Array.from(new Set(lista.filter((v) => v !== null && v !== undefined)));

async function centrosAsignados(trabajadorId, transaction) {
  const filas = await CentroTrabajador.findAll({ where: { trabajadoreId: trabajadorId }, attributes: ['centroCostoId'], transaction: transaction });
  return unicos(filas.map((f) => f.centroCostoId));
}

async function etiquetasCentros(centros) {
  const clientes = porId(await Cliente.findAll({ where: { id: { [Op.in]: unicos(centros.map((c) => c.clienteId)) } }, attributes: ['id', 'representante'] }));
  return centros.map((c) => ({ id: c.id, numero_cc: c.numero_cc, cliente: clientes[c.clienteId] ? clientes[c.clienteId].representante : null }));
}

// Productos activos, sin stock ni precio (regla 6: el supervisor no los ve).
async function listarProductosSolicitables() {
  const filas = await Producto.findAll({ where: { estado: PRODUCTO_ACTIVO }, attributes: ['id', 'nombre', 'descripcion', 'tipo'], order: [['nombre', 'ASC']] });
  return filas.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo }));
}

// Supervisor: sus centros abiertos (centro_costo_trabajadores). Usuario intranet: todos los abiertos.
async function listarCentrosPermitidos(usuario) {
  const where = { estado: CENTRO_ABIERTO };
  if (esSupervisor(usuario)) {
    const ids = await centrosAsignados(usuario.id);
    if (ids.length === 0) return [];
    where.id = { [Op.in]: ids };
  }
  const centros = await Centro.findAll({ where: where, attributes: ['id', 'numero_cc', 'clienteId'], order: [['numero_cc', 'ASC']] });
  return etiquetasCentros(centros);
}

/**
 * @param {{centro_costo_id:number, items:Array<{producto_id:number,cantidad:number}>, observacion:(string|null)}} entrada
 *   items sin productos repetidos (el controlador suma cantidades, regla 4)
 */
async function crear(entrada, usuario, ip) {
  const id = await db.sequelize.transaction(async (t) => {
    const centro = await Centro.findById(entrada.centro_costo_id, { attributes: ['id', 'estado'], transaction: t });
    if (!centro || Number(centro.estado) !== CENTRO_ABIERTO) {
      throw new AppError('CENTRO_NO_DISPONIBLE', 'el centro de costo no existe o esta cerrado', 400, { centro_costo_id: entrada.centro_costo_id });
    }
    if (esSupervisor(usuario) && (await centrosAsignados(usuario.id, t)).indexOf(centro.id) === -1) {
      throw new AppError('CENTRO_NO_PERMITIDO', 'el centro de costo no esta asignado al supervisor', 403, { centro_costo_id: centro.id });
    }

    const pedidos = entrada.items.map((i) => i.producto_id);
    const activos = await Producto.findAll({ where: { id: { [Op.in]: pedidos }, estado: PRODUCTO_ACTIVO }, attributes: ['id'], transaction: t });
    const faltan = pedidos.filter((p) => !activos.some((a) => a.id === p));
    if (faltan.length) {
      throw new AppError('PRODUCTO_NO_SOLICITABLE', 'hay productos inexistentes o inactivos', 400, { producto_ids: faltan });
    }

    const datos = { centro_costo_id: centro.id, estado: E.PENDIENTE, observacion: entrada.observacion || null };
    datos[columnaDueno(usuario)] = usuario.id;
    const solicitud = await Solicitud.create(datos, { transaction: t });
    const items = [];
    for (const i of entrada.items) {
      items.push(await Item.create({ solicitud_id: solicitud.id, producto_id: i.producto_id, cantidad_pedida: i.cantidad }, { transaction: t }));
    }
    await auditar({
      transaction: t, usuario: actor(usuario), entidad: 'solicitudes_bodega', entidad_id: solicitud.id, accion: 'CREAR',
      antes: null, despues: { solicitud: solicitud.get({ plain: true }), items: items.map((x) => x.get({ plain: true })) }, ip: ip
    });
    return solicitud.id;
  });
  return obtener(id, usuario);
}

// Forma pública. El supervisor no ve asignado/faltante (dependen del stock, regla 6).
async function serializar(solicitudes, usuario, conItems) {
  const planas = solicitudes.map((s) => (s.get ? s.get({ plain: true }) : s));
  const ids = planas.map((s) => s.id);
  const items = ids.length ? await Item.findAll({ where: { solicitud_id: { [Op.in]: ids } }, order: [['id', 'ASC']] }) : [];
  const productos = conItems && items.length
    ? porId(await Producto.findAll({ where: { id: { [Op.in]: unicos(items.map((i) => i.producto_id)) } }, attributes: ['id', 'nombre'] }))
    : {};
  const centros = porId(await etiquetasCentros(await Centro.findAll({ where: { id: { [Op.in]: unicos(planas.map((s) => s.centro_costo_id)) } }, attributes: ['id', 'numero_cc', 'clienteId'] })));
  const trabajadores = porId(await Trabajadore.findAll({ where: { id: { [Op.in]: unicos(planas.map((s) => s.trabajador_id)) } }, attributes: ['id', 'nombre', 'apellido'] }));
  const usuarios = porId(await Usuario.findAll({ where: { id: { [Op.in]: unicos(planas.map((s) => s.usuario_id)) } }, attributes: ['id', 'nombre', 'apellido'] }));
  const nombre = (p) => (p ? [p.nombre, p.apellido].filter(Boolean).join(' ') : null);
  const verCruce = !esSupervisor(usuario);

  return planas.map((s) => {
    const propios = items.filter((i) => i.solicitud_id === s.id);
    const salida = {
      id: s.id,
      estado: s.estado,
      etiqueta_estado: ETIQUETA_ESTADO[s.estado] || s.estado,
      centro_costo: centros[s.centro_costo_id] || { id: s.centro_costo_id, numero_cc: null, cliente: null },
      solicitante: s.trabajador_id !== null
        ? { tipo: 'supervisor', id: s.trabajador_id, nombre: nombre(trabajadores[s.trabajador_id]) }
        : { tipo: 'usuario', id: s.usuario_id, nombre: nombre(usuarios[s.usuario_id]) },
      observacion: s.observacion,
      created_at: s.created_at,
      updated_at: s.updated_at,
      entregada_at: s.entregada_at,
      anulada_at: s.anulada_at,
      total_items: propios.length
    };
    if (conItems) {
      salida.items = propios.map((i) => {
        const fila = { id: i.id, producto_id: i.producto_id, producto: productos[i.producto_id] ? productos[i.producto_id].nombre : null, cantidad_pedida: i.cantidad_pedida };
        if (verCruce) { fila.cantidad_asignada = i.cantidad_asignada; fila.cantidad_faltante = i.cantidad_faltante; }
        return fila;
      });
    }
    return salida;
  });
}

async function paginar(where, filtros, usuario) {
  const r = await Solicitud.findAndCountAll({ where: where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: filtros.limit, offset: (filtros.page - 1) * filtros.limit });
  return { data: await serializar(r.rows, usuario, false), meta: { page: filtros.page, limit: filtros.limit, total: r.count } };
}

// Administración: todas, con filtros opcionales.
async function listar(filtros, usuario) {
  const where = {};
  if (filtros.estados) where.estado = { [Op.in]: filtros.estados };
  if (filtros.centro_costo_id) where.centro_costo_id = filtros.centro_costo_id;
  return paginar(where, filtros, usuario);
}

// Solo las creadas por quien consulta, en la columna de su propio contexto.
async function listarMias(filtros, usuario) {
  const where = {};
  where[columnaDueno(usuario)] = usuario.id;
  if (filtros.estados) where.estado = { [Op.in]: filtros.estados };
  return paginar(where, filtros, usuario);
}

// El supervisor que no es dueño recibe 404 (no se revela que existe).
async function obtener(id, usuario) {
  const s = await Solicitud.findById(id);
  if (!s || (esSupervisor(usuario) && !esDueno(s, usuario))) {
    throw new AppError('SOLICITUD_NO_EXISTE', 'la solicitud no existe', 404, { id: id });
  }
  return (await serializar([s], usuario, true))[0];
}

async function bloquear(id, usuario, t) {
  const s = await Solicitud.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!s || (esSupervisor(usuario) && !esDueno(s, usuario))) {
    throw new AppError('SOLICITUD_NO_EXISTE', 'la solicitud no existe', 404, { id: id });
  }
  return s;
}

// Supervisor: la propia y solo PENDIENTE. Admin: cualquiera no finalizada.
async function anular(id, motivo, usuario, ip) {
  await db.sequelize.transaction(async (t) => {
    const s = await bloquear(id, usuario, t);
    const permitido = esSupervisor(usuario) ? s.estado === E.PENDIENTE : ESTADOS_FINALES.indexOf(s.estado) === -1;
    if (!permitido) {
      throw new AppError('ESTADO_NO_PERMITE_ANULAR', 'la solicitud no se puede anular en estado ' + s.estado, 409, { estado: s.estado });
    }
    const antes = s.get({ plain: true });
    await s.update({ estado: E.ANULADA, anulada_at: new Date() }, { transaction: t });
    await auditar({ transaction: t, usuario: actor(usuario), entidad: 'solicitudes_bodega', entidad_id: s.id, accion: 'ANULAR', antes: antes, despues: s, motivo: motivo || null, ip: ip });
  });
  return obtener(id, usuario);
}

module.exports = {
  listarProductosSolicitables,
  listarCentrosPermitidos,
  crear,
  listar,
  listarMias,
  obtener,
  anular,
  esDueno
};
