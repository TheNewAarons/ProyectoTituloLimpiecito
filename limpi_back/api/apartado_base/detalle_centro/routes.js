const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { identificarOpcional } = require('../../../middleware/auth')

router.post('/crear-asociacion',controlador.crearAsociacionCentroTrabajador)
router.delete('/eliminar-asociacion/:id', identificarOpcional, controlador.eliminarAsociacionCentroTrabajador)
router.post('/crear-lista', identificarOpcional, controlador.crearListaInsumo)
router.delete('/aprobar-lista/:id/:id_usuario', identificarOpcional, controlador.aprobarListaInsumo)
router.delete('/eliminar-lista/:id', identificarOpcional, controlador.eliminarListaInsumo)
router.post('/crear-egreso', identificarOpcional, controlador.crearCCEgreso)
router.delete('/eliminar-egreso/:id', identificarOpcional, controlador.eliminarCCEgreso)
router.post('/crear-ingreso', identificarOpcional, controlador.crearCCIngreso)
router.delete('/eliminar-ingreso/:id', identificarOpcional, controlador.eliminarCCIngreso)

module.exports = router