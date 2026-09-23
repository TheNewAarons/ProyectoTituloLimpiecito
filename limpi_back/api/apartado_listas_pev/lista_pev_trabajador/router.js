const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/asociar_trabajadores_seleccionados_cronograma/:id_cronograma',controlador.AsociarTrabajadoresSeleccionadosCronograma)
router.post('/crear_lista_pev',controlador.crearListaPevTrabajadorDB)
router.get('/obtener_lista_pev/:id',controlador.obtenerListasPevTrabajadorConLineasPevPorCronograma)
router.get('/obtener_trabajadores_centro_costo_activo/:id_cliente',controlador.obtenerTrabajadoresCentroCosto)
router.get('/obtener_todas_listas_pev_por_cronograma/:id_cronograma',controlador.obtenerTodasLasListasPorCronograma)
router.get('/obtener_tareas_cronograma/:id_cronograma',controlador.obtenerTareasCronograma)
router.get('/obtener_trabajadores_cronograma/:id_cronograma',controlador.obtenerTrabajadoresCronograma)
router.get('/obtener_listas_pev_trabajador/:id_cronograma/:n_empleado',controlador.obtenerListaPevTrabajador)
router.get('/obtener_trabajadores_no_asociados_cronograma/:id_cliente/:id_cronograma',controlador.obtenerTrabajadoresNoAsociadosalCronograma)
router.get('/obtener_trabajador_n_empleado/:n_empleado',controlador.obtenerTrabajadorPorNumeroEmpleado)
router.post('/actualizar_linea_lista_pev/:id',controlador.actualizarLineaListaPevTrabajador)
router.put('/cambiar_estado_lista_pev/:id',controlador.cambiarEstado)
router.delete('/eliminar_trabajador/:id/:n_empleado',controlador.eliminarTrabajadorCronograma)

module.exports = router