/**
 * RF-WEB-01 — Capa HTTP de /api/v1/web/catalogo (solo Admin). Lógica pura en services/web/catalogo.js;
 * imagen con libs/multer_publicaciones.js (misma carpeta que las publicaciones). Nunca borra: despublica.
 */

const db = require('../../../../database/database');
const CatalogoItem = require('../../../../modelos/sistema_web/Catalogo_item');
const AppError = require('../../../../libs/app-error');
const servicio = require('../../../../services/web/catalogo');
const { validarMagicBytes, borrarImagen } = require('../../../../libs/multer_publicaciones');
const { enriquecer } = require('../../../../services/web/catalogo-app');
// RF-WEB-01b: proyección de admin con los datos de la app (precio en vivo, servicio vinculado y aviso).
const aAdminConApp = (filas) => enriquecer(filas, servicio.aAdmin, { admin: true });

const ORDEN = [['orden', 'ASC'], ['id', 'ASC']];

function parsearId(texto) {
  if (typeof texto !== 'string' || !/^\d+$/.test(texto) || Number(texto) < 1) {
    throw new AppError('VALIDATION_ERROR', 'id debe ser un entero mayor que 0', 400, { campo: 'id' });
  }
  return Number(texto);
}

async function buscar(texto) {
  const item = await CatalogoItem.findById(parsearId(texto));
  if (!item) throw new AppError('NOT_FOUND', 'Ítem del catálogo no encontrado', 404);
  return item;
}

const listar = async (req, res) => {
  const filas = await CatalogoItem.findAll({ order: ORDEN });
  res.json({ ok: true, data: await aAdminConApp(filas), meta: { total: filas.length } });
};

const obtener = async (req, res) => {
  res.json({ ok: true, data: (await aAdminConApp([await buscar(req.params.id)]))[0], meta: {} });
};

const crear = async (req, res) => {
  try {
    const campos = servicio.validarPayload(req.body || {}, { parcial: false });
    // Sin orden explícito, el ítem nuevo va al final.
    // shortcut: max+1 fuera de transacción; dos altas simultáneas pueden empatar (desempata id ASC). Pasar a transacción si importa.
    if (campos.orden === undefined) campos.orden = ((await CatalogoItem.max('orden')) || 0) + 1;
    if (req.file) {
      await validarMagicBytes(req.file.path);
      campos.imagen = req.file.filename;
    }
    const item = await CatalogoItem.create(campos);
    res.status(201).json({ ok: true, data: servicio.aAdmin(item), meta: {} });
  } catch (e) {
    if (req.file) borrarImagen(req.file.filename);
    throw e;
  }
};

const editar = async (req, res) => {
  try {
    const item = await buscar(req.params.id);
    const campos = servicio.validarPayload(req.body || {}, { parcial: true });
    // RF-WEB-01b: el precio de un ítem vinculado viene de la app; no se acepta uno propio.
    if (item.servicio_id && campos.precio !== undefined && campos.precio !== null) {
      throw new AppError('PRECIO_DESDE_APP', 'el precio de este ítem viene de la app de reservas; desvincúlalo para fijar uno propio', 400, { campo: 'precio' });
    }
    const imagenAnterior = item.imagen;
    if (req.file) {
      await validarMagicBytes(req.file.path);
      campos.imagen = req.file.filename;
    } else if (req.body && (req.body.quitar_imagen === true || req.body.quitar_imagen === 'true')) {
      campos.imagen = null;
    }
    await item.update(campos);
    // La imagen anterior se borra solo después de guardar con éxito (best effort).
    if ((req.file || campos.imagen === null) && imagenAnterior) borrarImagen(imagenAnterior);
    res.json({ ok: true, data: servicio.aAdmin(item), meta: {} });
  } catch (e) {
    if (req.file) borrarImagen(req.file.filename);
    throw e;
  }
};

const despublicar = async (req, res) => {
  const item = await buscar(req.params.id);
  await item.update({ publicado: false });
  res.json({ ok: true, data: servicio.aAdmin(item), meta: {} });
};

// Reordena según la posición en `ids`; todos deben existir. Los ítems no incluidos conservan su orden.
const reordenar = async (req, res) => {
  const ids = servicio.validarOrden(req.body);
  await db.sequelize.transaction(async (t) => {
    const existentes = await CatalogoItem.count({ where: { id: ids }, transaction: t });
    if (existentes !== ids.length) throw new AppError('NOT_FOUND', 'Algún ítem del catálogo no existe', 404);
    for (let i = 0; i < ids.length; i++) {
      await CatalogoItem.update({ orden: i + 1 }, { where: { id: ids[i] }, transaction: t });
    }
  });
  const filas = await CatalogoItem.findAll({ order: ORDEN });
  res.json({ ok: true, data: await aAdminConApp(filas), meta: { total: filas.length } });
};

module.exports = { listar, obtener, crear, editar, despublicar, reordenar };
