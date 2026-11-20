/**
 * RF-WEB-01b — Vínculo del catálogo con la app de reservas (solo Admin; auth en index.js):
 * listar servicios de la app, vincular/desvincular un ítem e importar un servicio como ítem nuevo.
 */

const CatalogoItem = require('../../../../modelos/sistema_web/Catalogo_item');
const AppError = require('../../../../libs/app-error');
const { aAdmin } = require('../../../../services/web/catalogo');
const app = require('../../../../services/web/catalogo-app');
const { borrarImagen } = require('../../../../libs/multer_publicaciones');

async function buscarItem(texto) {
  if (typeof texto !== 'string' || !/^\d+$/.test(texto) || Number(texto) < 1) {
    throw new AppError('VALIDATION_ERROR', 'id debe ser un entero mayor que 0', 400, { campo: 'id' });
  }
  const item = await CatalogoItem.findById(Number(texto));
  if (!item) throw new AppError('NOT_FOUND', 'Ítem del catálogo no encontrado', 404);
  return item;
}

const unoEnriquecido = async (item) => (await app.enriquecer([item], aAdmin, { admin: true }))[0];

const listarServiciosApp = async (req, res) => {
  const data = await app.listarServiciosApp();
  res.json({ ok: true, data: data, meta: { total: data.length } });
};

// PUT /:id/servicio-app { servicio_id: n | null }. Al vincular se borra el precio propio (manda el de la app y no
// "reaparece" un precio viejo si después se desvincula).
const vincular = async (req, res) => {
  const item = await buscarItem(req.params.id);
  const valor = req.body ? req.body.servicio_id : undefined;
  if (valor === undefined) throw new AppError('VALIDATION_ERROR', 'servicio_id es obligatorio (número o null)', 400, { campo: 'servicio_id' });
  if (valor === null || valor === '') {
    await item.update({ servicio_id: null });
  } else {
    const servicio = await app.buscarServicio(valor);
    await item.update({ servicio_id: servicio.id, precio: null });
  }
  res.json({ ok: true, data: await unoEnriquecido(item), meta: {} });
};

// POST /importar-servicio { servicio_id }: crea un ítem en borrador, vinculado, al final del orden.
const importar = async (req, res) => {
  const campos = await app.camposDesdeServicio(req.body ? req.body.servicio_id : undefined);
  try {
    campos.orden = ((await CatalogoItem.max('orden')) || 0) + 1;
    const item = await CatalogoItem.create(campos);
    res.status(201).json({ ok: true, data: await unoEnriquecido(item), meta: {} });
  } catch (e) {
    if (campos.imagen) borrarImagen(campos.imagen);
    throw e;
  }
};

module.exports = { listarServiciosApp, vincular, importar };
