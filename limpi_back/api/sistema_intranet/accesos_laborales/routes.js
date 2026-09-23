const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearAccesoLaboral)
router.put('/actualizar/:id',controlador.actualizarAccesoLaboral)
router.put('/cambiar_estado/:id',controlador.cambiarEstadoAccesoLaboral)
router.get('/obtener_acceso_laboral_por_idtrabajador/:id_trabajador',controlador.obtenerAccesoLaboralPorIdTrabajador)
router.get('/existe_acceso_laboral/:id_trabajador',controlador.existeAccesoLaboral)
router.post('/login',controlador.login)

module.exports = router