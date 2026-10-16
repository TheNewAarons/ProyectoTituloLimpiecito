const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { autenticar, requerirRol } = require('../../../middleware/auth')
const { ROL_ADMIN_NOMBRES } = require('../../../services/constantes')

router.post('/crear',controlador.crearCaja)
router.put('/editar/:id', controlador.editarCaja)
router.put('/editar-cierre/:id', controlador.editarCierraCaja)
router.get('/obtener',controlador.obtenerTodasCajasDetalle)
router.get('/obtener-cajas',controlador.obtenerTodasCajas)
router.get('/obtener-activa',controlador.obtenerCajaActiva)
router.get('/obtener-unico/:id',controlador.obtenerCajaId)
// RF-CAJA-01: el cierre exige token y rol Admin tambien en el prefijo legacy (cerrada_por/auditoria con el usuario real).
router.put('/cerrar/:idCaja', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), controlador.cerrarCaja)

module.exports = router