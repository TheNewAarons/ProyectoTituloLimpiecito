/**
 * RF-CAJA-02/RF-CAJA-01 — Error de aplicación con código de negocio y status HTTP.
 * Usado por services/caja, services/liquidaciones y services/auditoria (TASK_PLAN §1-§3).
 */

class AppError extends Error {
  /**
   * @param {string} code código de negocio (ej. 'CAJA_NO_EXISTE')
   * @param {string} message mensaje legible
   * @param {number} [httpStatus=500] status HTTP sugerido para el middleware de errores
   * @param {object} [details] datos adicionales (ej. { periodo }, { liquidacion_id })
   */
  constructor(code, message, httpStatus, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus || 500;
    this.details = details || {};
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AppError);
    }
  }
}

module.exports = AppError;
