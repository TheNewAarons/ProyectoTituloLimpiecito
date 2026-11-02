/**
 * RF-BOD-03 — CRUD de proveedores (baja lógica, no se borra físicamente). Auditoría CREAR/EDITAR
 * dentro de la transacción del llamador (RNF-SEC-02, ver services/auditoria).
 */

const db = require('../../database/database');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Largos máximos según la migración 20261102041711 (STRING(n) de cada columna).
const LARGO_MAXIMO = { nombre: 150, rut: 12, email: 150, telefono: 30, contacto: 150 };

/**
 * Valida y normaliza un campo de texto OPCIONAL: '' se trata como "sin valor" (-> null), y
 * `undefined` se deja pasar (campo no enviado, no se toca en editar()). Nunca permite tipos
 * distintos de string.
 * @param {string} campo nombre del campo (clave de LARGO_MAXIMO)
 * @param {*} valor
 * @returns {string|null|undefined}
 */
function normalizarOpcional(campo, valor) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== 'string') {
    throw new AppError('CAMPO_INVALIDO', campo + ' debe ser texto', 400, { campo: campo });
  }
  const limpio = valor.trim();
  if (limpio === '') return null;
  if (limpio.length > LARGO_MAXIMO[campo]) {
    throw new AppError('CAMPO_INVALIDO', campo + ' excede el largo maximo (' + LARGO_MAXIMO[campo] + ')', 400, {
      campo: campo,
      maximo: LARGO_MAXIMO[campo]
    });
  }
  return limpio;
}

/**
 * @param {string|null|undefined} email ya normalizado con normalizarOpcional('email', ...)
 */
function validarEmail(email) {
  if (email === undefined || email === null) return;
  if (!RE_EMAIL.test(email)) {
    throw new AppError('EMAIL_INVALIDO', 'email con formato invalido', 400, { email: email });
  }
}

/**
 * Nombre es requerido (nunca null): valida tipo, no vacío y largo máximo.
 * @param {*} nombre
 * @returns {string} nombre normalizado (trim)
 */
function validarNombre(nombre) {
  if (typeof nombre !== 'string' || !nombre.trim()) {
    throw new AppError('NOMBRE_REQUERIDO', 'nombre es requerido', 400);
  }
  const limpio = nombre.trim();
  if (limpio.length > LARGO_MAXIMO.nombre) {
    throw new AppError('CAMPO_INVALIDO', 'nombre excede el largo maximo (' + LARGO_MAXIMO.nombre + ')', 400, {
      campo: 'nombre',
      maximo: LARGO_MAXIMO.nombre
    });
  }
  return limpio;
}

/**
 * @param {number} id
 * @returns {Promise<object>} instancia Proveedor (lanza 404 si no existe)
 */
async function obtenerOFallar(id, transaction) {
  const proveedor = await Proveedor.findById(id, { transaction: transaction });
  if (!proveedor) {
    throw new AppError('PROVEEDOR_NO_ENCONTRADO', 'no existe el proveedor ' + id, 404, { id: id });
  }
  return proveedor;
}

/**
 * GET /proveedores — lista paginada.
 * @param {{pagina?: number, limite?: number, activo?: number}} opciones
 * @returns {Promise<{filas: object[], total: number}>}
 */
async function listar(opciones) {
  const o = opciones || {};
  const pagina = Number.isInteger(o.pagina) && o.pagina > 0 ? o.pagina : 1;
  const limite = Number.isInteger(o.limite) && o.limite > 0 && o.limite <= 100 ? o.limite : 20;
  const where = {};
  if (o.activo === 0 || o.activo === 1) where.activo = o.activo;

  const resultado = await Proveedor.findAndCountAll({
    where: where,
    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });
  return { filas: resultado.rows, total: resultado.count, pagina: pagina, limite: limite };
}

/**
 * @param {number} id
 * @returns {Promise<object>} instancia Proveedor
 */
async function obtener(id) {
  return obtenerOFallar(id, undefined);
}

/**
 * POST /proveedores
 * @param {{nombre: string, rut?: string, email?: string, telefono?: string, contacto?: string}} datos
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 */
async function crear(datos, contexto) {
  const d = datos || {};
  const nombre = validarNombre(d.nombre);
  const rut = normalizarOpcional('rut', d.rut);
  const email = normalizarOpcional('email', d.email);
  validarEmail(email);
  const telefono = normalizarOpcional('telefono', d.telefono);
  const contacto = normalizarOpcional('contacto', d.contacto);

  return db.sequelize.transaction(async function (t) {
    const proveedor = await Proveedor.create(
      {
        nombre: nombre,
        rut: rut || null,
        email: email || null,
        telefono: telefono || null,
        contacto: contacto || null
      },
      { transaction: t }
    );
    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'proveedores',
      entidad_id: proveedor.id,
      accion: 'CREAR',
      antes: null,
      despues: proveedor,
      ip: contexto.ip
    });
    return proveedor;
  });
}

/**
 * PATCH /proveedores/:id
 * @param {number} id
 * @param {{nombre?: string, rut?: string, email?: string, telefono?: string, contacto?: string}} cambios
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 */
async function editar(id, cambios, contexto) {
  const c = cambios || {};
  const datosActualizados = {};
  if (c.nombre !== undefined) datosActualizados.nombre = validarNombre(c.nombre);
  if (c.rut !== undefined) datosActualizados.rut = normalizarOpcional('rut', c.rut);
  if (c.email !== undefined) {
    const email = normalizarOpcional('email', c.email);
    validarEmail(email);
    datosActualizados.email = email;
  }
  if (c.telefono !== undefined) datosActualizados.telefono = normalizarOpcional('telefono', c.telefono);
  if (c.contacto !== undefined) datosActualizados.contacto = normalizarOpcional('contacto', c.contacto);

  return db.sequelize.transaction(async function (t) {
    const proveedor = await obtenerOFallar(id, t);
    const antes = proveedor.get({ plain: true });

    await proveedor.update(datosActualizados, { transaction: t });

    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'proveedores',
      entidad_id: proveedor.id,
      accion: 'EDITAR',
      antes: antes,
      despues: proveedor,
      ip: contexto.ip
    });
    return proveedor;
  });
}

/**
 * DELETE /proveedores/:id — baja lógica (activo = 0). No se borra físicamente.
 * @param {number} id
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 */
async function desactivar(id, contexto) {
  return db.sequelize.transaction(async function (t) {
    const proveedor = await obtenerOFallar(id, t);
    const antes = proveedor.get({ plain: true });
    await proveedor.update({ activo: 0 }, { transaction: t });
    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'proveedores',
      entidad_id: proveedor.id,
      accion: 'ANULAR',
      antes: antes,
      despues: proveedor,
      ip: contexto.ip
    });
    return proveedor;
  });
}

module.exports = {
  listar: listar,
  obtener: obtener,
  crear: crear,
  editar: editar,
  desactivar: desactivar
};
