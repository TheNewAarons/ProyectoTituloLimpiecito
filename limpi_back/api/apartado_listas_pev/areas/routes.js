const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearArea)
router.put('/actualizar/:id',controlador.actualizarArea)
router.put('/cambiar_estado/:id',controlador.cambiarEstadorArea)
router.get('/obtener_activos_paginados_sector/:id_sector/:page',controlador.obtenerAreasPorSectorActivosPaginados)
router.get('/obtener_inactivos_paginados_sector/:id_sector/:page',controlador.obtenerAreasPorSectorInactivosPaginados)
router.get('/obtener_por_estado_sector/:id_sector/:estado',controlador.obtenerAreasPorSectorYEstado)
router.get('/obtener_areas_por_sector/:id_sector',controlador.obtenerAreasPorSector)
router.get('/obtener_areas_activas_por_sector/:id_sector',controlador.obtenerAreasActivasPorSector)
router.get('/obtener_areas_activas_por_cliente/:id_cliente',controlador.obtenerAreasActivasPorCliente)
router.get('/obtener_area_por_id/:id',controlador.obtenerAreaPorId)

router.delete('/eliminar_area/:id_area',controlador.eliminarAreaPorId)
module.exports = router