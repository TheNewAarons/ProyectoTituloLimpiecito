const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearSalud)
router.put('/editar',controlador.editarSalud)
router.get('/todos',controlador.obtenerTodosSalud)
router.get('/activos',controlador.obtenerSaludActivos)
router.get('/inactivos',controlador.obtenerSaludInactivos)
router.delete('/eliminar/:id',controlador.desactivarSalud)
router.delete('/activar/:id',controlador.activarSalud)

module.exports = router