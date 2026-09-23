const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearTrabajador)
router.put('/editar/:id',controlador.editarTrabajador)
router.get('/todos',controlador.obtenerTodosTrabajadores)
router.get('/activos',controlador.obtenerTrabajadoresActivos)
router.get('/inactivos',controlador.obtenerTrabajadoresInactivos)
router.delete('/eliminar/:id',controlador.desactivarTrabajador)
router.delete('/activar/:id',controlador.activarTrabajador)
router.get('/obtener/:id', controlador.obtenerTrabajadorId)
router.get('/busca-activos/:busca?',controlador.buscarTrabajadoresActivosDB)
router.get('/busca-inactivos/:busca?',controlador.buscarTrabajadoresInactivosDB)

module.exports = router