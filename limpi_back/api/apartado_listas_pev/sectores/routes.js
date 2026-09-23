const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearSector)
router.put('/actualizar/:id',controlador.actualizarSector)
router.put('/cambiar_estado/:id',controlador.cambiarEstadorSector)
router.get('/obtener_activos_paginados_cliente/:id_cliente/:page',controlador.obtenerSectoresActivosPaginados)
router.get('/obtener_inactivos_paginados_cliente/:id_cliente/:page',controlador.obtenerSectoresInactivosPaginados)
router.get('/obtener_por_estado_cliente/:id_cliente/:estado',controlador.obtenerSectoresPorEstado)
router.get('/obtener_por_id/:id',controlador.obtenerSectorPorId)
router.get('/obtener_sectores_por_cliente/:id_cliente',controlador.obtenerSectoresPorCliente)
router.get('/obtener_sectores_normal_por_cliente/:id_cliente',controlador.obtenerSectoresNormalPorCliente)
router.get('/obtener_sectores_activo_por_cliente/:id_cliente',controlador.obtenerSectoresActivoPorCliente)
router.delete('/eliminar_sector/:id_sector',controlador.eliminarSectorPorId)

module.exports = router