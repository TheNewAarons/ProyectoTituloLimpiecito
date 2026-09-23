const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearStock)
router.delete('/eliminar/:id',controlador.eliminarStock)
router.get('/obtener',controlador.obtenerTodosStock)

module.exports = router