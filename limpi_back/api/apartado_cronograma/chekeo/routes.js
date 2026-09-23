const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearCheckeo)
router.put('/editar/:id_checkeo',controlador.editarCheckeo)
router.delete('/eliminar/:id_checkeo',controlador.eliminarChekeo)

module.exports = router