const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

const multer = require('../../../libs/multer-servicio');

router.post('/crear',multer.single('image'),controlador.crearServicio)
router.put('/editar/:idServicio',multer.single('image'),controlador.editarServicio)
router.get('/obtener-servicio/:idServicio',controlador.obtenerServicioId)
router.delete('/desactivar-servicio/:idServicio',controlador.desactivarServicio)
router.delete('/activar-servicio/:idServicio',controlador.activarServicio)
router.get('/obtener-servicios-activos',controlador.obtenerServiciosActivos)
router.get('/obtener-servicios-inactivos',controlador.obtenerServiciosInactivos)

module.exports = router