const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearTurno)
router.post('/crear-lote',controlador.crearTurnos)
router.put('/actualizar/:id',controlador.actualizarTurno)
router.put('/cambiar_estado/:id',controlador.cambiarEstadorTurno)
router.get('/obtener_por_estado_cliente/:id_cliente/:estado',controlador.obtenerTurnosPorEstado)
router.get('/obtener_por_id/:id',controlador.obtenerTurnoPorId)
router.get('/obtener_turnos_por_cliente/:id_cliente',controlador.obtenerTurnosPorCliente)
module.exports = router