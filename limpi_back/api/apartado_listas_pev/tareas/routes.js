const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearTarea)
router.put('/actualizar/:id',controlador.actualizarTarea)
router.put('/cambiar_estado/:id',controlador.cambiarEstadorTarea)
router.get('/obtener_activos_paginados_area/:id_area/:page',controlador.obtenerTareasPorAreaActivosPaginados)
router.get('/obtener_inactivos_paginados_area/:id_area/:page',controlador.obtenerTareasPorAreaInactivosPaginados)
router.get('/obtener_por_estado_area/:id_area/:estado',controlador.obtenerTareasPorAreaYEstado)
router.get('/obtener_tareas_por_area/:id_area',controlador.obtenerTareasPorArea)
router.get('/obtener_tarea_por_id/:id',controlador.obtenerTareaPorId)
router.delete('/eliminar_tarea/:id_tarea',controlador.eliminarTareaPorId)
module.exports = router