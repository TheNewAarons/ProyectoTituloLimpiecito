/**
 * RNF-SEC-02 — Servicio de auditoría (TASK_PLAN §3). Siempre corre DENTRO de la transacción del
 * llamador: si `auditar()` falla, la operación completa hace rollback.
 */

const Auditoria = require('../../modelos/sistema_base/Auditoria');
const AppError = require('../../libs/app-error');

const CONTEXTOS_VALIDOS = ['usuarios', 'acceso_clientes', 'acceso_trabajadores', 'usuario_apps', 'sistema'];
const CLAVES_SENSIBLES = ['password', 'contrasena', 'contrasenia', 'token', 'pass'];

/**
 * Quita claves sensibles de un objeto plano (no recursivo: suficiente para los modelos usados aquí).
 * @param {object|null} objeto
 * @returns {object|null}
 */
function limpiarSensibles(objeto) {
  if (!objeto || typeof objeto !== 'object') return objeto;
  const limpio = {};
  Object.keys(objeto).forEach(function (clave) {
    if (CLAVES_SENSIBLES.indexOf(clave.toLowerCase()) === -1) {
      limpio[clave] = objeto[clave];
    }
  });
  return limpio;
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
 * @param {string} params.accion 'CREAR' | 'EDITAR' | 'PAGO' | 'REVERSION_PAGO' | 'ANULAR' | 'CIERRE' | 'REAPERTURA' | 'RECALCULO' | 'LOGIN_OK' | 'LOGIN_FALLIDO'
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
  auditar: auditar
};
