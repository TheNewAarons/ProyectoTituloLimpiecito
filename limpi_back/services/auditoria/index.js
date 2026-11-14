/**
 * RNF-SEC-02 — Servicio de auditoría (TASK_PLAN §3). Siempre corre DENTRO de la transacción del
 * llamador: si `auditar()` falla, la operación completa hace rollback.
 */

const Auditoria = require('../../modelos/sistema_base/Auditoria');
const AppError = require('../../libs/app-error');

const CONTEXTOS_VALIDOS = ['usuarios', 'acceso_clientes', 'acceso_trabajadores', 'usuario_apps', 'sistema'];

// D-077: detección por SEGMENTO de clave (no coincidencia exacta de primer nivel). Antes de probar
// se separa camelCase (passwordHash -> password_Hash) y se normalizan guiones/espacios como '_'
// (x-access-token -> x_access_token). El límite derecho también admite dígitos para cubrir
// password1/resetToken2; por eso 'password1' y 'tokens2' quedan protegidos.
const PATRON_SENSIBLE = /(^|_)(pass|password|passwd|pwd|contrasena|contrasenia|contraseña|token|tokens|secret|clave|hash|authorization|jwt|apikey|key|resettoken)(_|[0-9]|$)/i;

/**
 * Inserta `_` entre segmentos camelCase para que el patrón por segmento detecte claves compuestas
 * (passwordHash -> password_Hash, resetToken -> reset_Token, HTTPToken -> HTTP_Token).
 * @param {string} clave
 * @returns {string}
 */
function separarCamelCase(clave) {
  return String(clave)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2');
}

/**
 * @param {string} clave
 * @returns {boolean} true si la clave (por segmento) es sensible
 */
function claveSensible(clave) {
  return PATRON_SENSIBLE.test(separarCamelCase(clave).replace(/[-\s]/g, '_'));
}

/**
 * Quita claves sensibles de un objeto/array en CUALQUIER profundidad (D-077). Detecta ciclos
 * (reemplaza por '[Circular]', sin lanzar), conserva Date y tipos no-objeto, aplana instancias
 * Sequelize anidadas con `.get({ plain: true })` y tolera null/undefined.
 * @param {*} valor
 * @param {Set} [enCamino] objetos ya visitados en el camino actual (detección de ciclos)
 * @returns {*}
 */
function limpiarSensibles(valor, enCamino) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor !== 'object') return valor;
  if (valor instanceof Date) return valor;
  if (typeof valor.get === 'function') {
    valor = valor.get({ plain: true });
    if (valor === null || valor === undefined) return valor;
    if (typeof valor !== 'object') return valor;
  }
  enCamino = enCamino || new Set();
  if (enCamino.has(valor)) return '[Circular]';
  enCamino.add(valor);

  const resultado = Array.isArray(valor)
    ? valor.map(function (item) { return limpiarSensibles(item, enCamino); })
    : Object.keys(valor).reduce(function (acc, clave) {
        if (!claveSensible(clave)) acc[clave] = limpiarSensibles(valor[clave], enCamino);
        return acc;
      }, {});

  enCamino.delete(valor);
  return resultado;
}

/**
 * Obtiene un objeto plano y limpio a partir de una instancia Sequelize, un objeto plano, o null.
 * @param {object|null} valor instancia Sequelize (con `.get`) u objeto plano
 * @returns {object|null}
 */
function aPlanoLimpio(valor) {
  if (valor === null || valor === undefined) return null;
  const plano = typeof valor.get === 'function' ? valor.get({ plain: true }) : valor;
  return limpiarSensibles(plano);
}

/**
 * Registra una fila de auditoría inmutable. Exige `transaction` (si la auditoría falla, la
 * transacción del llamador debe hacer rollback: RNF-SEC-02).
 * @param {object} params
 * @param {object} params.transaction transacción Sequelize activa (obligatoria)
 * @param {{id: (number|null), contexto: string}} params.usuario usuario que ejecuta la acción (id null = sistema/cron)
 * @param {string} params.entidad nombre real de la tabla afectada (ej. 'cajas', 'liquidaciones')
 * @param {string|number} [params.entidad_id] id o periodo de la fila afectada
 * @param {string} params.accion acción registrada. Conjunto usado hoy por el código:
 *   'CREAR' | 'EDITAR' | 'ANULAR' | 'PAGO' | 'REVERSION_PAGO' | 'CIERRE' | 'REAPERTURA' |
 *   'RECALCULO' | 'RECALCULO_CASCADA' | 'CRUCE_STOCK' | 'REVERSA_STOCK' | 'RECEPCION' |
 *   'ASIGNACION_RECEPCION' | 'ENTREGA' | 'ENVIAR' | 'REENVIAR' | 'ENVIAR_FALLIDO' | 'AJUSTE'.
 *   De auth (services/auditoria/login.js): 'LOGIN_OK' | 'LOGIN_FALLIDO'.
 *   (No hay validación de valor: la lista es solo documentación de convención.)
 * @param {object|null} [params.antes] instancia u objeto plano previo al cambio
 * @param {object|null} [params.despues] instancia u objeto plano posterior al cambio
 * @param {string} [params.motivo]
 * @param {string} [params.ip]
 * @returns {Promise<object>} fila de auditoría creada
 */
async function auditar(params) {
  const p = params || {};
  const transaction = p.transaction;
  const usuario = p.usuario || {};

  if (!transaction) {
    throw new AppError('AUDITORIA_SIN_TRANSACCION', 'auditar() requiere una transaccion activa del llamador', 500);
  }
  if (!p.entidad) {
    throw new AppError('AUDITORIA_ENTIDAD_REQUERIDA', 'auditar() requiere entidad', 500);
  }
  if (!p.accion) {
    throw new AppError('AUDITORIA_ACCION_REQUERIDA', 'auditar() requiere accion', 500);
  }
  if (!usuario.contexto || CONTEXTOS_VALIDOS.indexOf(usuario.contexto) === -1) {
    throw new AppError(
      'AUDITORIA_CONTEXTO_INVALIDO',
      'contexto_usuario invalido: ' + usuario.contexto,
      500,
      { contextos_validos: CONTEXTOS_VALIDOS }
    );
  }

  const antesLimpio = aPlanoLimpio(p.antes);
  const despuesLimpio = aPlanoLimpio(p.despues);

  return Auditoria.create(
    {
      usuario_id: usuario.id === undefined ? null : usuario.id,
      contexto_usuario: usuario.contexto,
      entidad: p.entidad,
      entidad_id: p.entidad_id === undefined || p.entidad_id === null ? null : String(p.entidad_id),
      accion: p.accion,
      valores_antes: antesLimpio === null ? null : JSON.stringify(antesLimpio),
      valores_despues: despuesLimpio === null ? null : JSON.stringify(despuesLimpio),
      motivo: p.motivo || null,
      ip: p.ip || null
    },
    { transaction: transaction }
  );
}

module.exports = {
  auditar: auditar,
  limpiarSensibles: limpiarSensibles,
  CONTEXTOS_VALIDOS: CONTEXTOS_VALIDOS
};
