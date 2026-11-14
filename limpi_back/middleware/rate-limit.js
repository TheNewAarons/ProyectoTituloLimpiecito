/**
 * RF-WEB-02 — Rate limit de ventana fija por IP, en memoria. Sin variables de entorno.
 */

const AppError = require('../libs/app-error');

/**
 * @param {{ventanaMs?: number, max?: number}} opciones
 * @returns {function} middleware
 */
function crearLimitePorIp(opciones) {
  const o = opciones || {};
  const ventanaMs = o.ventanaMs || 60000;
  const max = o.max || 60;
  // shortcut: memoria por proceso (1 instancia EC2), migrar a store compartido si se escala horizontalmente
  const contadores = new Map();
  let ultimoBarrido = Date.now();

  return function (req, res, next) {
    const ahora = Date.now();
    // Barrido una vez por ventana (no por request) para que el Map no crezca sin límite.
    if (ahora - ultimoBarrido >= ventanaMs) {
      ultimoBarrido = ahora;
      contadores.forEach(function (entrada, ip) {
        if (ahora - entrada.inicio >= ventanaMs) contadores.delete(ip);
      });
    }

    const ip = req.ip || 'desconocido';
    const entrada = contadores.get(ip);
    if (!entrada) {
      contadores.set(ip, { inicio: ahora, cuenta: 1 });
      return next();
    }

    entrada.cuenta += 1;
    if (entrada.cuenta > max) {
      const segundos = Math.ceil((entrada.inicio + ventanaMs - ahora) / 1000);
      res.set('Retry-After', String(segundos));
      return next(new AppError('RATE_LIMITED', 'Demasiadas solicitudes, intente mas tarde', 429));
    }
    return next();
  };
}

module.exports = { crearLimitePorIp: crearLimitePorIp };
