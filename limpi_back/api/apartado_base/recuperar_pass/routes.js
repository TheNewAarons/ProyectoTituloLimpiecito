const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/recuperar-password',controlador.recuperarPassword)
router.post('/cambiar-password',controlador.cambiarPassword)

module.exports = router