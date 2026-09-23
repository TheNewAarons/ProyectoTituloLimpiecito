const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearEgreso)
router.delete('/eliminar/:id',controlador.eliminarEgreso)
router.get('/obtener',controlador.obtenerEgresos)
router.get('/obtener-caja/:id',controlador.obtenerEgresosCaja)

module.exports = router