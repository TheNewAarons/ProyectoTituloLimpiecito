/**
 * RF-BI-01a — Router /api/v1/analytics (solo GET, envueltos en asyncHandler cuando se agreguen).
 * `autenticar` se monta en index.js; los roles se aplican aquí por sub-recurso (D-145), deny-by-default.
 * Sin endpoints stub (D-146): el rol autorizado recibe 404 JSON, el no autorizado 403.
 */

const express = require('express');
const router = express.Router();
const { requerirRol, revalidarUsuario } = require('../../../middleware/auth');
const { noEncontrado, asyncHandler } = require('../../../middleware/errores');
const financiero = require('./financiero');
const rentabilidad = require('./rentabilidad');
const consumoBodega = require('./bodega');
const { ROL_ADMIN_NOMBRES, ROL_OPERACIONES_NOMBRES } = require('../../../services/constantes');

const ADMIN = requerirRol.apply(null, ROL_ADMIN_NOMBRES);
const ADMIN_Y_OPS = requerirRol.apply(null, ROL_ADMIN_NOMBRES.concat(ROL_OPERACIONES_NOMBRES));

const bodega = express.Router(); // RF-BI-03: sus GET se agregan aquí
const productividad = express.Router(); // RF-BI-04: sus GET se agregan aquí
bodega.get('/top-productos', asyncHandler(consumoBodega.topProductos));
bodega.get('/consumo', asyncHandler(consumoBodega.consumo));
bodega.get('/frecuencia-compra', asyncHandler(consumoBodega.frecuenciaCompra));
bodega.get('/stock-critico', asyncHandler(consumoBodega.stockCritico));
bodega.get('/merma', asyncHandler(consumoBodega.merma)); // RF-BOD-04: unidades rechazadas en recepciones
const productividadPev = require('./productividad'); // RF-BI-04
productividad.get('/trabajadores', asyncHandler(productividadPev.trabajadores));
productividad.get('/supervisores', asyncHandler(productividadPev.supervisores));
productividad.get('/sectores', asyncHandler(productividadPev.sectores));
// Retroalimentación de la revisión: el texto de las observaciones de un sector (antes solo se veía el número).
productividad.get('/observaciones', asyncHandler(async (req, res) => {
  const r = await require('../../../services/analytics/observaciones-pev').listar(req.query);
  return res.json({ ok: true, data: r.data, meta: r.meta });
}));

// Solo meses límite (sin montos): visible para Admin y Operaciones.
router.get('/periodos', ADMIN_Y_OPS, asyncHandler(require('./periodos').listar));

// noEncontrado corta aquí para que Operaciones no caiga en el gate de solo Admin de abajo.
router.use('/bodega', ADMIN_Y_OPS, bodega, noEncontrado);
router.use('/productividad', ADMIN_Y_OPS, productividad, noEncontrado);

router.use(ADMIN, revalidarUsuario); // D-153: revalida el usuario en BD antes de datos financieros; RF-BI-01 /financiero, RF-BI-02 /rentabilidad, RF-BI-05 /demanda y cualquier otra subruta
// los GET de BI-01/02/05 se agregan debajo de esta línea
router.get('/financiero/resumen', asyncHandler(financiero.resumen));
router.get('/financiero/tendencia', asyncHandler(financiero.tendencia));
router.get('/financiero/proyeccion', asyncHandler(financiero.proyeccion));
router.get('/rentabilidad', asyncHandler(rentabilidad.listar));
router.get('/rentabilidad/:centroCostoId/detalle', asyncHandler(rentabilidad.detalle));
// RF-BI-05: agenda de un día (ocupación por bloque y reservas). Antes de '/demanda' por claridad; son rutas distintas.
router.get('/demanda/dia', asyncHandler(async (req, res) => {
  const r = await require('../../../services/analytics/demanda').delDia(req.query);
  return res.json({ ok: true, data: r.data, meta: r.meta });
}));
// RF-BI-05: demanda de reservas (mapa de calor, ranking, temporada, proyección 4 semanas y alerta de cupos).
router.get('/demanda', asyncHandler(async (req, res) => {
  const r = await require('../../../services/analytics/demanda').demanda(req.query);
  return res.json({ ok: true, data: r.data, meta: r.meta });
}));

module.exports = router;
