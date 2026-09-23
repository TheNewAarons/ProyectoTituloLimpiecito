const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear', controlador.crearInstitutoPrevision)
router.put('/editar/:id',controlador.editarInstitutoPrevision)
router.get('/todos',controlador.obtenerTodosInstitutoPrevision)
router.get('/activos',controlador.obtenerInstitutoPrevisionActivos)
router.get('/inactivos',controlador.obtenerInstitutoPrevisionInactivos)
router.delete('/eliminar/:id',controlador.desactivarInstitutoPrevisionDB)
router.delete('/activar/:id',controlador.activarInstitutoPrevisionDB)

module.exports = router