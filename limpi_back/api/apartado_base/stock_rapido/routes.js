const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { identificarOpcional } = require('../../../middleware/auth')

router.post('/crear', identificarOpcional, controlador.crearStock)
router.delete('/eliminar/:id', identificarOpcional, controlador.eliminarStock)
router.get('/obtener',controlador.obtenerTodosStock)

module.exports = router