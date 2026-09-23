const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearProducto)
router.put('/editar/:id',controlador.editarProducto)
router.delete('/eliminar/:id',controlador.desactivarProducto)
router.delete('/activar/:id',controlador.activarProducto)
router.delete('/borrar/:id',controlador.borrarProducto)
router.get('/activo',controlador.obtenerProductosActivos)
router.get('/stock_activo',controlador.obtenerProductosActivosConStock)
router.get('/inactivo',controlador.obtenerProductosInactivos)
router.get('/todos',controlador.obtenerTodosProductos)
router.get('/busca-activo/:busca?',controlador.buscarProductosActivos)
router.get('/busca-inactivo/:busca?',controlador.buscarProductosInactivos)

module.exports = router