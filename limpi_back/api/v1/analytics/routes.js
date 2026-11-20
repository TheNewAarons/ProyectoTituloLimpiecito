/**
 * RF-BI-01a — Router /api/v1/analytics (solo GET, envueltos en asyncHandler cuando se agreguen).
 * `autenticar` se monta en index.js; los roles se aplican aquí por sub-recurso (D-145), deny-by-default.
 * Sin endpoints stub (D-146): el rol autorizado recibe 404 JSON, el no autorizado 403.
 */

const express = require('express');
const router = express.Router();
const { requerirRol } = require('../../../middleware/auth');
const { noEncontrado } = require('../../../middleware/errores');
const { ROL_ADMIN_NOMBRES, ROL_OPERACIONES_NOMBRES } = require('../../../services/constantes');

const ADMIN = requerirRol.apply(null, ROL_ADMIN_NOMBRES);
const ADMIN_Y_OPS = requerirRol.apply(null, ROL_ADMIN_NOMBRES.concat(ROL_OPERACIONES_NOMBRES));

const bodega = express.Router(); // RF-BI-03: sus GET se agregan aquí
const productividad = express.Router(); // RF-BI-04: sus GET se agregan aquí

// noEncontrado corta aquí para que Operaciones no caiga en el gate de solo Admin de abajo.
router.use('/bodega', ADMIN_Y_OPS, bodega, noEncontrado);
router.use('/productividad', ADMIN_Y_OPS, productividad, noEncontrado);

router.use(ADMIN); // RF-BI-01 /financiero, RF-BI-02 /rentabilidad, RF-BI-05 /demanda y cualquier otra subruta
// los GET de BI-01/02/05 se agregan debajo de esta línea

module.exports = router;
