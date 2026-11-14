const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { identificarOpcional } = require('../../../middleware/auth')

router.post('/crear/:idCentroTrabajador', identificarOpcional, controlador.crearLiquidacion)
router.put('/editar/:id', identificarOpcional, controlador.editarLiquidacion)
router.delete('/cerrar/:id', identificarOpcional, controlador.cerrarLiquidacion)
router.get('/obtener/:id',controlador.obtenerLiquidacionId)
router.get('/obtener-todos',controlador.obtenerTodasLiquidaciones)
router.get('/obtener-busca/:busca?',controlador.buscarLiquidaciones)

module.exports = router