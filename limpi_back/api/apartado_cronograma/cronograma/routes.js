const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear-cronograma',controlador.crearCronograma)
router.put('/editar-cronograma/:id_cronograma',controlador.editarCronograma)
router.post('/crear-linea-cronograma',controlador.crearLineaCronograma)
router.delete('/eliminar-linea-cronograma/:id_linea_cronograma/:tareaId/:cronogramaId/:sectoreId',controlador.eliminarLineaCronograma)
router.get('/obtener-cronograma/:id_cronograma',controlador.obtenerCronogramaId)
router.get('/obtener-tarea-turno-id-turno/:id_turno',controlador.obtenerTurnosTareasPorTurnoId)
router.get('/obtener-cronogramas-activos-cliente/:id_cliente',controlador.obtenerCronogramasActivosPorClienteId)
router.get('/obtener-cronogramas-inactivos-cliente/:id_cliente',controlador.obtenerCronogramasInactivosPorClienteId)
router.get('/obtener_turnos_clientes/:id_cliente',controlador.obtenerTurnosPorClienteId)
router.get('/obtener-cronogramas-activos-cliente-mes/:id_cliente/:mes',controlador.obtenerCronogramaActivosPorMesPorClienteId)
router.get('/obtener-cronogramas-activos-mes-anio/:id_cliente/:mes/:anio',controlador.obtenerCronogramasActivosPorMesAnioCliente)
router.get('/obtener-cronogramas-inactivos-mes-anio/:id_cliente/:mes/:anio',controlador.obtenerCronogramasInactivosPorMesAnioCliente)
router.delete('/finalizar-cronograma/:id_cronograma',controlador.finalizarCronograma)

router.delete('/eliminar-cronograma/:id_cronograma',controlador.eliminarCronograma)

module.exports = router