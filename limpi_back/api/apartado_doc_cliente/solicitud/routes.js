const express = require('express')
const router = express.Router()
const controlador = require('./controlador')


router.post('/solicitud_cronograma',controlador.solicitudCronograma)


module.exports = router