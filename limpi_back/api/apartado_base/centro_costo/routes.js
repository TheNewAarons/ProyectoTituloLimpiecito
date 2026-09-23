const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearCentroCosto)
router.put('/editar/:id',controlador.editarCentroCosto)
router.put('/cerrar/:id',controlador.cerrarCentroCosto)
router.get('/obtener/:id',controlador.obtenerCentroCostoId)
router.get('/activo/:id',controlador.obtenerTodosCentrosActivosCaja)
router.get('/inactivo/:id',controlador.obtenerTodosCentrosInactivosCaja)
router.get('/obtener-cliente/:id',controlador.obtenerTodosCentrosCostosCliente)
router.get('/todos/:id',controlador.obtenerTodosCentrosCajas)
router.get('/busca-activo/:id/:busca?',controlador.buscarCentroCostoCajaActivos)
router.get('/busca-inactivo/:id/:busca?', controlador.buscarCentroCostoCajaInactivos)

module.exports = router