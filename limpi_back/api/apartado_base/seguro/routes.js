const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearSeguro)
router.put('/editar/:id',controlador.editarSeguro)
router.get('/todos',controlador.obtenerTodosSeguros)
router.get('/activos',controlador.obtenerSegurosActivos)
router.get('/inactivos',controlador.obtenerSegurosInactivos)
router.get('/eliminar/:id',controlador.desactivarSeguro)
router.get('/activar/:id',controlador.activarSeguro)

module.exports = router