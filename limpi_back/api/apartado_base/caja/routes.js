const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearCaja)
router.put('/editar/:id', controlador.editarCaja)
router.put('/editar-cierre/:id', controlador.editarCierraCaja)
router.get('/obtener',controlador.obtenerTodasCajasDetalle)
router.get('/obtener-cajas',controlador.obtenerTodasCajas)
router.get('/obtener-activa',controlador.obtenerCajaActiva)
router.get('/obtener-unico/:id',controlador.obtenerCajaId)
router.put('/cerrar/:idCaja',controlador.cerrarCaja)

module.exports = router