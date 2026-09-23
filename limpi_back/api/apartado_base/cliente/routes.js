const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearCliente)
router.put('/editar/:id',controlador.editarCliente)
router.get('/ver-activo',controlador.obtenerClientesActivos)
router.get('/ver-inactivo',controlador.obtenerClientesInactivos)
router.delete('/eliminar/:id',controlador.desactivarCliente)
router.delete('/activar/:id',controlador.activarCliente)
router.get('/obtener-cliente/:id',controlador.obtenerClienteId)
router.get('/busca-activo/:busca?',controlador.buscarClientesActivos)
router.get('/busca-inactivo/:busca?',controlador.buscarClientesInactivos)
router.get('/obtener-clientes-carpeta',controlador.obtenerClientesCarpeta)
router.get('/buscar-clientes-carpeta/:busca?',controlador.buscarClientesCarpeta)

module.exports = router