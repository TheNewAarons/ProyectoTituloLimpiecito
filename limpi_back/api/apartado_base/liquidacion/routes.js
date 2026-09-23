const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear/:idCentroTrabajador',controlador.crearLiquidacion)
router.put('/editar/:id',controlador.editarLiquidacion)
router.delete('/cerrar/:id',controlador.cerrarLiquidacion)
router.get('/obtener/:id',controlador.obtenerLiquidacionId)
router.get('/obtener-todos',controlador.obtenerTodasLiquidaciones)
router.get('/obtener-busca/:busca?',controlador.buscarLiquidaciones)

module.exports = router