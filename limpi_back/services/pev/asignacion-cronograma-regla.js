/**
 * Retroalimentación (asignación masiva PEV): la asignación se ancla a un cronograma vigente del cliente y turno.
 * "Desde" ya no es una fecha libre: debe caer dentro de un cronograma activo que no haya terminado (D-PEV-01-5).
 */
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { cronogramasDestino } = require('./cronograma-asignacion');

const idPositivo = (v, campo) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new AppError('CAMPO_INVALIDO', campo + ' debe ser un entero positivo', 400, { campo: campo });
  return n;
};

/** Cronogramas activos del cliente y turno que terminan hoy o después (los que se pueden elegir). */
async function vigentes(clienteId, turnoId) {
  return cronogramasDestino(idPositivo(clienteId, 'cliente_id'), idPositivo(turnoId, 'turno_id'), fecha.hoySantiago(), null);
}

/**
 * Lanza 400 FECHA_FUERA_DE_CRONOGRAMA si `fechaDesde` (YYYY-MM-DD) no está dentro de un cronograma vigente.
 * @returns {Promise<object>} el cronograma que la contiene
 */
async function validarDesde(clienteId, turnoId, fechaDesde) {
  const lista = await vigentes(clienteId, turnoId);
  const c = lista.find((x) => fechaDesde >= x.inicio && fechaDesde <= x.fin);
  if (!c) {
    throw new AppError('FECHA_FUERA_DE_CRONOGRAMA',
      lista.length ? 'La fecha "Desde" debe estar dentro de un cronograma vigente del cliente y turno.'
        : 'El cliente no tiene cronogramas vigentes para ese turno: cree uno en Cronograma antes de asignar.',
      400, { fecha_desde: fechaDesde, cronogramas: lista });
  }
  return c;
}

module.exports = { vigentes, validarDesde };
