const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearRol)
router.put('/editar/:id',controlador.editarRol)
router.delete('/eliminar/:id',controlador.desactivarRol)
router.get('/obtener',controlador.obtenerRolesActivos)
router.get('/obtener-inactivo',controlador.obtenerRolesInactivos)

module.exports = router