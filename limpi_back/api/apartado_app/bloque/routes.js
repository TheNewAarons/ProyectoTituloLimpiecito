const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearBloques)
router.delete('/eliminar/:idBloque',controlador.eliminarBloque)
router.delete('/desactivar/:idBloque',controlador.desactivarBloque)
router.delete('/activar/:idBloque',controlador.activarBloque)

module.exports = router