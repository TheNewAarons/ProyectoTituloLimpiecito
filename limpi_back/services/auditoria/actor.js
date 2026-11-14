/**
 * RNF-SEC-02 — Extrae el actor de una petición legacy para alimentar `auditar()`.
 * Los endpoints legacy no exigen token (D-074): si no hay usuario autenticado se registra
 * como `sistema` y se marca `motivoSinToken = 'LEGACY_SIN_TOKEN'` para no confundirlo con
 * una acción de cron.
 */

function actorDeRequest(req) {
  const r = req || {};
  if (r.usuario && r.usuario.id) {
    return {
      usuario: { id: r.usuario.id, contexto: r.usuario.contexto || 'usuarios' },
      ip: r.ip || null,
      motivoSinToken: null
    };
  }
  return {
    usuario: { id: null, contexto: 'sistema' },
    ip: r.ip || null,
    motivoSinToken: 'LEGACY_SIN_TOKEN'
  };
}

module.exports = { actorDeRequest };
