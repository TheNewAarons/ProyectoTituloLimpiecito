/**
 * RF-PEV-02 (AUT-016, obs. 12) — GET /api/v1/pev/cronogramas/:id/asignaciones: panel "Asignaciones" de Ver Cronograma.
 * Mismo gate que el resto de /api/v1/pev (index.js).
 */
const AppError = require('../../../libs/app-error');
const servicio = () => require('../../../services/pev/cronograma-asignacion');

const asignacionesDelCronograma = async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'id de cronograma inválido', 400, { id: req.params.id });
  }
  const r = await servicio().listarPorCronograma(id);
  if (!r) throw new AppError('NO_ENCONTRADO', 'El cronograma no existe', 404, { id: id });
  return res.json({ ok: true, data: r.asignaciones, meta: { cronograma: r.cronograma, total: r.asignaciones.length } });
};

module.exports = { asignacionesDelCronograma: asignacionesDelCronograma };
