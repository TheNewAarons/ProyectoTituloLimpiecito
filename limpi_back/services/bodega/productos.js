/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — Productos de bodega en /api/v1, equivalente de /producto/* (api/apartado_base/producto).
 * Mismas reglas que el legacy: nombre único entre productos no borrados, estados 1 activo / 0 inactivo / 2 borrado
 * (borrado lógico), listados por id DESC y búsqueda por nombre, precio o stock. Diferencias (Docs/MIGRACION_RUTAS.md):
 * validación de campos, transacción + auditoría, y el stock no se edita aquí (se mueve con stock rápido o recepción).
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require('../../database/database');
const Producto = require('../../modelos/sistema_base/Producto');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');

const ESTADO = { inactivo: 0, activo: 1, borrado: 2 };
const LARGO = { nombre: 255, descripcion: 255, busca: 100 };

function entero(campo, valor, min) {
  const n = Number(valor);
  if (valor === null || valor === '' || typeof valor === 'boolean' || !Number.isSafeInteger(n) || n < min) {
    throw new AppError('CAMPO_INVALIDO', campo + ' debe ser un entero mayor o igual a ' + min, 400, { campo: campo });
  }
  return n;
}

function texto(campo, valor, requerido) {
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) {
    if (requerido) throw new AppError('CAMPO_INVALIDO', campo + ' es obligatorio', 400, { campo: campo });
    return valor === undefined ? undefined : null;
  }
  if (typeof valor !== 'string') throw new AppError('CAMPO_INVALIDO', campo + ' debe ser texto', 400, { campo: campo });
  const limpio = valor.trim();
  if (limpio.length > LARGO[campo]) {
    throw new AppError('CAMPO_INVALIDO', campo + ' excede el largo maximo (' + LARGO[campo] + ')', 400, { campo: campo, maximo: LARGO[campo] });
  }
  return limpio;
}

/** Campos editables comunes a crear/editar; undefined = no enviado. */
function camposProducto(body, requerirNombre) {
  const b = body || {};
  const c = {
    nombre: texto('nombre', b.nombre, requerirNombre),
    descripcion: texto('descripcion', b.descripcion, false),
    tipo: b.tipo === undefined || b.tipo === null ? b.tipo : entero('tipo', b.tipo, 0),
    precio: b.precio === undefined || b.precio === null ? b.precio : entero('precio', b.precio, 0)
  };
  Object.keys(c).forEach(function (k) { if (c[k] === undefined) delete c[k]; });
  return c;
}

// shortcut: unicidad del nombre verificada en la aplicación (igual que el legacy, sin índice UNIQUE); agregar un índice
// si aparecen duplicados por altas simultáneas.
async function verificarNombreLibre(nombre, idPropio, t) {
  // findAll: si ya hubiera duplicados históricos, findOne podría devolver el propio y ocultar el otro.
  const mismos = await Producto.findAll({ where: { nombre: nombre, estado: { [Op.ne]: ESTADO.borrado } }, attributes: ['id'], transaction: t });
  const otro = mismos.find(function (p) { return p.id !== idPropio; });
  if (otro) {
    throw new AppError('PRODUCTO_DUPLICADO', 'Este nombre de producto ya esta registrado en el sistema', 409, { nombre: nombre, id: otro.id });
  }
}

async function bloquearVigente(id, t) {
  const p = await Producto.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!p || Number(p.estado) === ESTADO.borrado) throw new AppError('PRODUCTO_NO_EXISTE', 'el producto no existe', 404, { id: id });
  return p;
}

/**
 * GET — estado activo (defecto) | inactivo | todos (activos + inactivos, sin borrados); busca opcional; con_stock=1 solo stock > 0.
 * @returns {Promise<object[]>}
 */
async function listar(q) {
  const e = q.estado === undefined ? 'activo' : q.estado;
  if (['activo', 'inactivo', 'todos'].indexOf(e) === -1) {
    throw new AppError('CAMPO_INVALIDO', 'estado debe ser activo, inactivo o todos', 400, { estado: q.estado });
  }
  const where = { estado: e === 'todos' ? { [Op.in]: [ESTADO.activo, ESTADO.inactivo] } : ESTADO[e] };
  const busca = texto('busca', q.busca, false);
  if (busca) {
    const like = { [Op.like]: '%' + busca + '%' };
    where[Op.or] = [{ nombre: like }, { precio: like }, { stock: like }];
  }
  if (q.con_stock !== undefined) {
    if (['0', '1'].indexOf(String(q.con_stock)) === -1) throw new AppError('CAMPO_INVALIDO', 'con_stock debe ser 0 o 1', 400, { con_stock: q.con_stock });
    if (String(q.con_stock) === '1') where.stock = { [Op.gt]: 0 };
  }
  return Producto.findAll({ where: where, order: [['id', 'DESC']], raw: true });
}

/** POST — alta (activo); stock inicial opcional (>= 0, defecto 0), como el legacy. */
async function crear(body, ctx) {
  const datos = camposProducto(body, true);
  datos.stock = body && body.stock !== undefined && body.stock !== null ? entero('stock', body.stock, 0) : 0;
  datos.estado = ESTADO.activo;
  return db.sequelize.transaction(async function (t) {
    await verificarNombreLibre(datos.nombre, null, t);
    const p = await Producto.create(datos, { transaction: t });
    await auditar({ transaction: t, usuario: ctx.usuario, entidad: 'productos', entidad_id: p.id, accion: 'CREAR', antes: null, despues: p, ip: ctx.ip });
    return p.get({ plain: true });
  });
}

/** PUT — edita nombre, descripción, tipo y precio. El stock y el estado tienen sus propios caminos. */
async function editar(id, body, ctx) {
  if (body && (body.stock !== undefined || body.estado !== undefined)) {
    throw new AppError('CAMPO_NO_EDITABLE', 'stock y estado no se editan aqui: use stock rapido / PATCH estado', 400, {
      campos: ['stock', 'estado'].filter(function (k) { return body[k] !== undefined; })
    });
  }
  const datos = camposProducto(body, false);
  if (datos.nombre === null) throw new AppError('CAMPO_INVALIDO', 'nombre es obligatorio', 400, { campo: 'nombre' });
  if (Object.keys(datos).length === 0) {
    throw new AppError('SIN_CAMBIOS', 'no se envio ningun campo editable (nombre, descripcion, tipo, precio)', 400);
  }
  return db.sequelize.transaction(async function (t) {
    const p = await bloquearVigente(id, t);
    if (datos.nombre !== undefined) await verificarNombreLibre(datos.nombre, p.id, t);
    // Copia: en Sequelize v4 get({ plain: true }) comparte los dataValues que update() modifica.
    const antes = Object.assign({}, p.get({ plain: true }));
    await p.update(datos, { transaction: t });
    await auditar({ transaction: t, usuario: ctx.usuario, entidad: 'productos', entidad_id: p.id, accion: 'EDITAR', antes: antes, despues: p, ip: ctx.ip });
    return p.get({ plain: true });
  });
}

async function fijarEstado(id, estado, accion, ctx) {
  return db.sequelize.transaction(async function (t) {
    const p = await bloquearVigente(id, t);
    const antes = { id: p.id, estado: Number(p.estado) };
    if (antes.estado !== estado) {
      await p.update({ estado: estado }, { transaction: t });
      await auditar({ transaction: t, usuario: ctx.usuario, entidad: 'productos', entidad_id: p.id, accion: accion, antes: antes, despues: { id: p.id, estado: estado }, ip: ctx.ip });
    }
    return p.get({ plain: true });
  });
}

/** PATCH estado — 'activo' | 'inactivo' (legacy /activar y /eliminar). Sin cambio no audita. */
function cambiarEstado(id, valor, ctx) {
  if (valor !== 'activo' && valor !== 'inactivo') {
    throw new AppError('CAMPO_INVALIDO', 'estado debe ser activo o inactivo', 400, { estado: valor });
  }
  return fijarEstado(id, ESTADO[valor], 'EDITAR', ctx);
}

/** DELETE — borrado lógico (estado 2), como el legacy /borrar. El registro no se elimina. */
function borrar(id, ctx) {
  return fijarEstado(id, ESTADO.borrado, 'ANULAR', ctx);
}

module.exports = { ESTADO: ESTADO, listar: listar, crear: crear, editar: editar, cambiarEstado: cambiarEstado, borrar: borrar };
