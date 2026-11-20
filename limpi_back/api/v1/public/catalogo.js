/**
 * RF-WEB-01 — GET /api/v1/public/catalogo: solo ítems publicados, en el orden definido por el Admin.
 * Caché corta para que despublicar se note en a lo más un minuto.
 */

const CatalogoItem = require('../../../modelos/sistema_web/Catalogo_item');
const { aPublico } = require('../../../services/web/catalogo');
const { enriquecer } = require('../../../services/web/catalogo-app');

const listarCatalogo = async (req, res) => {
  const filas = await CatalogoItem.findAll({ where: { publicado: true }, order: [['orden', 'ASC'], ['id', 'ASC']] });
  res.set('Cache-Control', 'public, max-age=60');
  // RF-WEB-01b: ítems vinculados a la app muestran su precio en vivo y si son reservables.
  return res.json({ ok: true, data: await enriquecer(filas, aPublico), meta: { total: filas.length } });
};

module.exports = { listarCatalogo };
