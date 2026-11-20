/**
 * RF-WEB-01b — Vínculo del catálogo web con los servicios de la app de reservas (solo lectura sobre la app).
 * - Ítem vinculado a un servicio ACTIVO: precio en vivo del servicio y reservable en la app (D-WEB-01-6).
 * - Servicio inactivo: sin precio y no reservable (el admin ve un aviso). Servicio borrado: la FK deja servicio_id en NULL.
 * - Nunca modifica `servicios` ni sus archivos: importar COPIA nombre, descripción e imagen.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../../libs/app-error');
const Servicio = require('../../modelos/sist_app/Servicio');
const { validarMagicBytes } = require('../../libs/multer_publicaciones');
const { validarPayload } = require('./catalogo');

const ACTIVO = 1;
// Misma carpeta que libs/multer_publicaciones.js (no exporta DIR). shortcut: si esa librería cambia de carpeta, cambiar aquí.
const DIR_IMAGENES = path.resolve('uploads_limpiecitoweb', 'publicaciones');
const DIR_APP = path.resolve('uploads');
const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];

const plano = (f) => (f && f.get ? f.get({ plain: true }) : f);

/**
 * Proyecta los ítems y les agrega los datos de la app (una sola consulta para toda la lista).
 * @param {object[]} filas instancias o planos de catalogo_items
 * @param {function} proyectar aPublico o aAdmin de services/web/catalogo
 * @param {{admin?: boolean}} [opciones] admin agrega servicio_id, servicio_app y aviso_app
 */
async function enriquecer(filas, proyectar, opciones) {
  const admin = !!(opciones && opciones.admin);
  const planas = filas.map(plano);
  const ids = Array.from(new Set(planas.map((f) => f.servicio_id).filter(Boolean)));
  const servicios = ids.length ? await Servicio.findAll({ where: { id: ids }, attributes: ['id', 'nombre', 'precio', 'estado'] }) : [];
  const porId = {};
  servicios.forEach((s) => { porId[s.id] = plano(s); });
  const url = process.env.APP_RESERVAS_URL || null;

  return planas.map((f) => {
    const salida = proyectar(f);
    const s = f.servicio_id ? porId[f.servicio_id] : null;
    const activo = !!s && Number(s.estado) === ACTIVO;
    // Solo los ítems vinculados llevan los campos de la app: los propios de la web conservan la forma de RF-WEB-01.
    // Reservable solo con enlace configurado: la app móvil aún no está operativa (fuera de alcance, D-WEB-01-7).
    if (f.servicio_id) {
      const reservable = activo && !!url;
      salida.precio = activo && s.precio !== null && s.precio !== undefined ? Number(s.precio) : null;
      salida.reservable_en_app = reservable;
      salida.reserva_url = reservable ? url : null;
    }
    if (admin) {
      salida.servicio_id = f.servicio_id || null;
      salida.servicio_app = s ? { id: s.id, nombre: s.nombre, precio: s.precio === null ? null : Number(s.precio), activo: activo } : null;
      salida.aviso_app = f.servicio_id && !activo ? 'El servicio de la app está inactivo o no existe: no se muestra precio ni se puede reservar' : null;
    }
    return salida;
  });
}

/** Servicios de la app para elegir en el admin (sin rutas de archivo ni datos internos). */
async function listarServiciosApp() {
  const filas = await Servicio.findAll({ attributes: ['id', 'nombre', 'precio', 'estado'], order: [['nombre', 'ASC']] });
  return filas.map(plano).map((s) => ({ id: s.id, nombre: s.nombre, precio: s.precio === null ? null : Number(s.precio), activo: Number(s.estado) === ACTIVO }));
}

async function buscarServicio(id) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1) {
    throw new AppError('VALIDATION_ERROR', 'servicio_id debe ser un entero mayor que 0', 400, { campo: 'servicio_id' });
  }
  const s = await Servicio.findById(Number(id));
  if (!s) throw new AppError('NOT_FOUND', 'Servicio de la app no encontrado', 404);
  return s;
}

/**
 * Copia la imagen del servicio a la carpeta del catálogo. Best effort: si falta, está fuera de uploads/
 * o no es una imagen real, el ítem se importa sin imagen.
 * @returns {Promise<string|null>} nombre del archivo copiado
 */
async function copiarImagen(rutaApp) {
  if (!rutaApp) return null;
  const origen = path.resolve(String(rutaApp));
  const ext = path.extname(origen).toLowerCase();
  if (!origen.startsWith(DIR_APP + path.sep) || EXTENSIONES.indexOf(ext) === -1 || !fs.existsSync(origen)) return null;
  try {
    await validarMagicBytes(origen);
  } catch (e) {
    return null;
  }
  const nombre = uuidv4() + (ext === '.jpeg' ? '.jpg' : ext);
  await fs.promises.mkdir(DIR_IMAGENES, { recursive: true });
  await fs.promises.copyFile(origen, path.join(DIR_IMAGENES, nombre));
  return nombre;
}

/**
 * Campos de un ítem nuevo a partir de un servicio de la app (en borrador y vinculado; el precio viene de la app).
 * @returns {Promise<object>}
 */
async function camposDesdeServicio(servicioId) {
  const s = plano(await buscarServicio(servicioId));
  const campos = validarPayload({ nombre: s.nombre, descripcion: s.descripcion || '' }, { parcial: false });
  campos.servicio_id = s.id;
  campos.precio = null;
  campos.imagen = await copiarImagen(s.imagen);
  return campos;
}

module.exports = { enriquecer, listarServiciosApp, buscarServicio, camposDesdeServicio, copiarImagen };
