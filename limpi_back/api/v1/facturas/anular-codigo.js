/**
 * RNF-SEC-02 (retroalimentación) — Anular un ingreso o egreso pide motivo y un código por correo.
 * Anular es irreversible y, si estaba PAGADA, saca el monto de la caja para siempre: mismo flujo que
 * reabrir centro/liquidación y activar/desactivar proveedor (services/centro-costo/codigo-reapertura).
 *   POST /api/v1/{ingresos|egresos}/:id/anular/codigo { motivo }  -> envía el código (no cambia nada)
 *   POST /api/v1/{ingresos|egresos}/:id/anular        { codigo }  -> anula con el motivo ligado al código
 * Revertir un pago no pide código (es reversible: se vuelve a pagar) y queda en el historial con su motivo.
 */
const AppError = require('../../../libs/app-error');
const pagoService = require('../../../services/facturas/pago');
const codigoCorreo = require('../../../services/centro-costo/codigo-reapertura');
const Usuario = require('../../../modelos/sistema_base/Usuario');
const CcIngreso = require('../../../modelos/sistema_base/CcIngreso');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const { EGRESO_ANULADO, EGRESO_TIPO_LIQUIDACION, CAJA_ABIERTA } = require('../../../services/constantes');
const Caja = require('../../../modelos/sistema_base/Caja');
const egresoLegacy = () => require('../../apartado_base/egreso/logica');

// Misma configuración que controlador.js (CONFIG_INGRESOS / CONFIG_EGRESOS).
const TIPOS = {
  ingresos: { config: { modelo: CcIngreso, entidad: 'cc_ingresos', impactaCaja: false }, nombre: 'el ingreso', prefijo: 'ing' },
  egresos: { config: { modelo: Egreso, entidad: 'egresos', impactaCaja: true }, nombre: 'el egreso', prefijo: 'egr' }
};

const parsearId = (texto) => {
  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('ID_INVALIDO', 'id invalido', 400, { id: texto });
  return id;
};
const clave = (tipo, id) => TIPOS[tipo].prefijo + '-anular:' + id;

// AUT-030: los egresos sin documento (anteriores a RF-FAC-01) se anulan con estado = -1 (lógica legacy de
// "Eliminar", con sus reglas de caja cerrada y pago de liquidación); los de FACTURA con estado_pago = ANULADA.
const esEgresoLegacy = (tipo, fila) => tipo === 'egresos' && fila.tipo_documento !== 'FACTURA';
const yaAnulado = (tipo, fila) => fila.estado_pago === 'ANULADA' || (esEgresoLegacy(tipo, fila) && Number(fila.estado) === EGRESO_ANULADO);
const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

/** Texto del correo: "el egreso N° 12 (Factura 4567, $120.000)". */
function describir(tipo, fila) {
  const doc = fila.numero_documento ? (fila.tipo_documento || 'documento') + ' ' + fila.numero_documento + ', ' : '';
  return TIPOS[tipo].nombre + ' N° ' + fila.id + ' (' + doc + clp(fila.monto) + ')';
}

/**
 * Chequeo previo (sin bloqueo) antes de enviar el código, para no gastarlo en algo que se rechazará:
 * mismas reglas que eliminarEgresoDB / pago.anular, que las vuelven a revisar con bloqueo al confirmar.
 */
async function verificarAnulable(tipo, fila) {
  if (tipo !== 'egresos') return;
  const legacy = esEgresoLegacy(tipo, fila);
  if (legacy && Number(fila.tipo) === EGRESO_TIPO_LIQUIDACION) {
    throw new AppError('EGRESO_PAGO_LIQUIDACION', 'Este egreso es el pago de una liquidación: para deshacerlo, revierta el pago desde Liquidaciones.', 409);
  }
  const tocaCaja = legacy || fila.estado_pago === 'PAGADA';
  if (tocaCaja && fila.cajaId !== null && fila.cajaId !== undefined) {
    const caja = await Caja.findById(fila.cajaId);
    if (caja && Number(caja.estado) !== CAJA_ABIERTA) {
      throw new AppError('CAJA_CERRADA', 'La caja de ' + caja.periodo + ' está cerrada: reabra el mes para poder anular este egreso.', 409, { periodo: caja.periodo });
    }
  }
}

/**
 * GET /{ingresos|egresos}/:id/anulable — antes de pedir el motivo: si no se puede anular (ya anulado, caja
 * cerrada, pago de liquidación) responde el error y la pantalla solo muestra el mensaje.
 */
// "¿Se puede anular?" con respuesta "no" es un resultado válido, no un error: 200 { anulable: false, code, mensaje }
// (así el navegador no lo registra como fallo). Id inválido o registro inexistente sí son errores (400/404).
const verificar = (tipo) => async (req, res) => {
  const id = parsearId(req.params.id);
  const fila = await TIPOS[tipo].config.modelo.findById(id);
  if (!fila) throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id, 404, { id: id });
  try {
    if (yaAnulado(tipo, fila)) throw new AppError('ESTADO_PAGO_INVALIDO', 'Este registro ya está anulado.', 409, { id: id });
    await verificarAnulable(tipo, fila);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    return res.json({ ok: true, data: { id: id, anulable: false, code: e.code, mensaje: e.message }, meta: {} });
  }
  return res.json({ ok: true, data: { id: id, anulable: true }, meta: {} });
};

const pedirCodigo = (tipo) => async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < 5 || motivo.length > 500) {
    throw new AppError('MOTIVO_REQUERIDO', 'motivo obligatorio (entre 5 y 500 caracteres)', 400);
  }
  const fila = await TIPOS[tipo].config.modelo.findById(id);
  if (!fila) throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id, 404, { id: id });
  if (yaAnulado(tipo, fila)) throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' ya esta ANULADA', 409, { id: id });
  await verificarAnulable(tipo, fila);
  const usuario = await Usuario.findById(req.usuario.id, { attributes: ['id', 'nombre', 'correo'] });
  const envio = await codigoCorreo.emitirCodigo(
    { id: req.usuario.id, nombre: usuario && usuario.nombre, correo: usuario && usuario.correo },
    { clave: clave(tipo, id), descripcion: describir(tipo, fila), accion: 'anular' },
    motivo
  );
  return res.json({ ok: true, data: envio, meta: {} });
};

const anular = (tipo) => async (req, res) => {
  const id = parsearId(req.params.id);
  // Valida el código (usuario + registro) y devuelve el motivo con que se pidió; lanza 400/429 si no sirve.
  const motivo = codigoCorreo.consumirCodigo(req.usuario.id, clave(tipo, id), req.body && req.body.codigo);
  const datos = {
    motivo: motivo + ' [confirmado con código por correo]',
    usuario: { id: req.usuario.id, contexto: req.usuario.contexto },
    ip: req.ip
  };
  const actual = tipo === 'egresos' ? await Egreso.findById(id) : null;
  if (actual && esEgresoLegacy(tipo, actual)) {
    // Lanza 409 CAJA_CERRADA / EGRESO_PAGO_LIQUIDACION; devuelve 0 si no existe o ya estaba anulado.
    const filas = await egresoLegacy().eliminarEgresoDB(id, datos);
    if (!filas) throw new AppError('ESTADO_PAGO_INVALIDO', 'el egreso ' + id + ' no existe o ya estaba anulado', 409, { id: id });
    return res.json({ ok: true, data: { id: id, estado: EGRESO_ANULADO }, meta: {} });
  }
  const fila = await pagoService.anular(TIPOS[tipo].config, id, datos);
  return res.json({ ok: true, data: fila, meta: {} });
};

// Reemplaza PATCH /:id/anular (sin código): no deja un atajo que se salte la confirmación.
const rutaReemplazada = (tipo) => (req, res) => res.status(410).json({ ok: false, error: {
  code: 'RUTA_REEMPLAZADA',
  message: 'para anular usa POST /' + tipo + '/:id/anular/codigo { motivo } y luego POST /' + tipo + '/:id/anular { codigo }',
  details: { codigo: 'POST /api/v1/' + tipo + '/:id/anular/codigo', confirmar: 'POST /api/v1/' + tipo + '/:id/anular' }
} });

module.exports = { verificar, pedirCodigo, anular, rutaReemplazada, _clave: clave, _describir: describir };
