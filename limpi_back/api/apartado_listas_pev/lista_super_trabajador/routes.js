const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear_lista_super',controlador.crearListasSuperTrabajador)
router.get('/obtener_lista_super/:id',controlador.obtenerListasSuperTrabajadorConLineas)
router.put('/actualizar_linea_lista_super/:id',controlador.actualizarLineaListaSuperTrabajador)
router.put('/cambiar_estado_lista_super/:id',controlador.cambiarEstado)
router.get('/obtener_trabajadores_supervisor', controlador.obtenerTrabajadoresSupervisor)
router.get('/obtener_trabajador/:n_empleado',controlador.obtenerDatosTrabajador)

module.exports = router