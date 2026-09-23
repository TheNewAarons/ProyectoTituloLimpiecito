const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear-asociacion',controlador.crearAsociacionCentroTrabajador)
router.delete('/eliminar-asociacion/:id',controlador.eliminarAsociacionCentroTrabajador)
router.post('/crear-lista',controlador.crearListaInsumo)
router.delete('/aprobar-lista/:id/:id_usuario',controlador.aprobarListaInsumo)
router.delete('/eliminar-lista/:id',controlador.eliminarListaInsumo)
router.post('/crear-egreso',controlador.crearCCEgreso)
router.delete('/eliminar-egreso/:id',controlador.eliminarCCEgreso)
router.post('/crear-ingreso',controlador.crearCCIngreso)
router.delete('/eliminar-ingreso/:id',controlador.eliminarCCIngreso)

module.exports = router