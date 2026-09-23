const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/asociar',controlador.asociarTurnoTarea)
router.put('/cambiar_estado/:id',controlador.cambiarEstadorTurnoTares)

module.exports = router