/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — POST /api/v1/public/contacto (sin auth, bajo el rate limit del router público).
 */

const contacto = require('../../../services/web/contacto');

const enviar = async (req, res) => {
  return res.json({ ok: true, data: await contacto.enviar(req.body), meta: {} });
};

module.exports = { enviar: enviar };
