const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.get('/obtener-reservas-proceso/:idCate',controlador.obtenerReservaProceso)
router.get('/obtener-reservas-aprobada/:idCate',controlador.obtenerReservaAprobada)
router.get('/obtener-reservas-finalizada/:idCate',controlador.obtenerReservaFinalizada)
router.get('/obtener-reservas-rechazada/:idCate',controlador.obtenerReservaRechazada)
router.get('/obtener-reserva/:idReserva',controlador.obtenerReservaId)
router.delete('/aprobar-reserva/:idReserva',controlador.aprobarReserva)
router.delete('/rechazar-reserva/:idReserva', controlador.rechazarReserva)
router.delete('/finalizar-reserva/:idReserva',controlador.finalizarReserva)
router.get('/obtener-reservas-usuario/:idUsuario/:estado?',controlador.obtenerReservasUsuarioEstado)

module.exports = router