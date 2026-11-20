/**
 * RF-PEV-01 — /api/v1/pev/asignaciones-masivas (solo Admin; auth en index.js).
 * Opciones de la pantalla, vista previa (no escribe) y ejecución en una sola transacción.
 */

const servicio = require('../../../../services/pev/asignacion-masiva');

const contexto = (req) => ({ usuario: { id: req.usuario.id, contexto: req.usuario.contexto }, ip: req.ip });

// Funciones de services/pev con transacción externa (AUT-008). Si alguna faltara, ejecutar responde 503 NO_DISPONIBLE.
const deps = () => ({
  crearActividadEnTx: require('../../../../services/pev/actividades').crearEnTx,
  crearAsignacionEnTx: require('../../../../services/pev/asignaciones').crearEnTx
});

const opciones = async (req, res) => {
  res.json({ ok: true, data: await servicio.opciones(req.query.cliente_id || null), meta: { tope: servicio.TOPE } });
};

const previsualizar = async (req, res) => {
  res.json({ ok: true, data: await servicio.previsualizar(req.body), meta: { tope: servicio.TOPE } });
};

const ejecutar = async (req, res) => {
  const data = await servicio.ejecutar(req.body, contexto(req), deps());
  res.status(201).json({ ok: true, data: data, meta: { creadas: data.asignaciones_creadas.length } });
};

module.exports = { opciones, previsualizar, ejecutar };
