const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { identificarOpcional } = require('../../../middleware/auth')

router.post('/crear', identificarOpcional, controlador.crearEgreso)
router.delete('/eliminar/:id', identificarOpcional, controlador.eliminarEgreso)
router.get('/obtener',controlador.obtenerEgresos)
router.get('/obtener-caja/:id',controlador.obtenerEgresosCaja)

module.exports = router