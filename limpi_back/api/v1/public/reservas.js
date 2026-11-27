/**
 * RF-BI-05 — Reservas desde la web (sin auth, bajo el rate limit del router público). Ver services/reservas/web.js.
 *   GET  /api/v1/public/reservas/catalogo
 *   GET  /api/v1/public/reservas/disponibilidad?categoria_id=&fecha=YYYY-MM-DD
 *   POST /api/v1/public/reservas { servicio_id, fecha, bloque_id, cantidad?, cliente{...}, vehiculo? }
 */
const web = require('../../../services/reservas/web');

module.exports = {
  catalogo: async (req, res) => res.json({ ok: true, data: await web.catalogo(), meta: {} }),
  disponibilidad: async (req, res) => res.json({ ok: true, data: await web.disponibilidad(req.query), meta: {} }),
  crear: async (req, res) => res.status(201).json({ ok: true, data: await web.crear(req.body, { ip: req.ip }), meta: {} })
};
