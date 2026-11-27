const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
// RNF-SEC-02 (AUT-020): cerrar exige sesión; mismos roles que hoy ven el botón Cerrar (todos menos APOYO_LVL_1).
const { autenticar, requerirRol } = require('../../../middleware/auth')
const PUEDEN_CERRAR = ['Administrador', 'RRHH', 'Supervisor', 'Operaciones']

router.post('/crear',controlador.crearCentroCosto)
router.put('/editar/:id',controlador.editarCentroCosto)
router.put('/cerrar/:id', autenticar, requerirRol.apply(null, PUEDEN_CERRAR), controlador.cerrarCentroCosto)
router.get('/obtener/:id',controlador.obtenerCentroCostoId)
router.get('/activo/:id',controlador.obtenerTodosCentrosActivosCaja)
router.get('/inactivo/:id',controlador.obtenerTodosCentrosInactivosCaja)
router.get('/obtener-cliente/:id',controlador.obtenerTodosCentrosCostosCliente)
router.get('/todos/:id',controlador.obtenerTodosCentrosCajas)
router.get('/busca-activo/:id/:busca?',controlador.buscarCentroCostoCajaActivos)
router.get('/busca-inactivo/:id/:busca?', controlador.buscarCentroCostoCajaInactivos)

module.exports = router