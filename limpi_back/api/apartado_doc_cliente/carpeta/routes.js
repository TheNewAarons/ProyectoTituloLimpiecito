const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearCarpeta)
router.get('/obtener-sub-carpetas/:id_padre',controlador.obtenerCarpetasIdPadre)
router.get('/obtener-carpetas-hijos/:id_carpeta_padre',controlador.obtenerCarpetaDeCarpeta)
router.get('/eliminar-carpeta-hijo/:id_carpeta/id_carpeta_padre',controlador.eliminarCarpeta)

module.exports = router