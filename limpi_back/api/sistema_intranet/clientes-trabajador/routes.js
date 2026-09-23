const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.get('/obtener-cronogramas/:id_trabajador',controlador.obtenerClientes)
router.get('/obtener-listas-pev/:n_empleado/:cronogramaId',controlador.obtenerListasPevTrabajador)
router.get('/obtener-lista-pev/:id',controlador.obtenerListaPevTrabajador)
router.get('/obtener-clientes-para-supervisor/:n_empleado/:search',controlador.obtenerClientesParaSupervisor)
router.get('/obtener-lista-supervisor/:id',controlador.obtenerListaSupervisor)
router.put('/cambiar-estado-lista-pev/:id',controlador.cambiarEstadoListaPev)
router.put('/cambiar-estado-lista-supervisor/:id',controlador.cambiarEstadoListaSupervisor)
router.put('/actualizar-linea-lista-pev/:id',controlador.actualizarLineaListaPevTrabajador)
router.put('/actualizar-linea-lista-supervisor/:id',controlador.actualizarLineaListaSuperTrabajador)
router.get('/obtener-cronograma-id/:id_cronograma',controlador.obtenerCronogramaId)
router.get('/obtener-trabajador/:n_empleado',controlador.obtenerDatosTrabajador)

module.exports = router