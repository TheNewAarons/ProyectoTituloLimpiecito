/**
 * RNF-SEC-02 S4 — Auditoría fail-open de logins (D-073). Tx propia corta (patrón
 * ordenesCompra.js#registrarIntentoFallido): si auditar() falla, el login responde igual
 * y aquí solo se loguea el error sin datos sensibles (nunca correo, password, hash ni token).
 */

const db = require('../../database/database');
const { auditar } = require('./index');

// M4: si en USUARIO_NO_EXISTE el usuario escribió su password en el campo correo, no lo guardamos.
function pareceCorreo(v) {
  return typeof v === 'string' && v.length <= 254 && /@/.test(v);
}

/**
 * @param {object} params
 * @param {string} params.contexto contexto_usuario válido ('usuarios', 'acceso_clientes', 'acceso_trabajadores', 'usuario_apps')
 * @param {string} params.entidad nombre real de la tabla consultada
 * @param {number|null} [params.usuarioId]
 * @param {string} [params.correo]
 * @param {boolean} params.ok true = LOGIN_OK, false = LOGIN_FALLIDO
 * @param {string} [params.motivo] USUARIO_NO_EXISTE | PASSWORD_INCORRECTA | CUENTA_DESHABILITADA
 * @param {string} [params.ip]
 */
async function registrarLogin({ contexto, entidad, usuarioId, correo, ok, motivo, ip }) {
  const accion = ok ? 'LOGIN_OK' : 'LOGIN_FALLIDO';
  const correoGuardado = motivo === 'USUARIO_NO_EXISTE' && !pareceCorreo(correo) ? '[no-correo]' : correo;
  try {
    await db.sequelize.transaction(function (t) {
      return auditar({
        transaction: t,
        usuario: { id: usuarioId, contexto: contexto },
        entidad: entidad,
        entidad_id: usuarioId,
        accion: accion,
        antes: null,
        despues: { correo: correoGuardado },
        motivo: motivo || null,
        ip: ip || null
      });
    });
  } catch (errorAuditoria) {
    // eslint-disable-next-line no-console
    console.error(
      '[RNF-SEC-02] no se pudo auditar login',
      { contexto: contexto, entidad: entidad, accion: accion, auditoriaError: { name: errorAuditoria && errorAuditoria.name, code: errorAuditoria && errorAuditoria.code } }
    );
  }
}

module.exports = {
  registrarLogin: registrarLogin
};
