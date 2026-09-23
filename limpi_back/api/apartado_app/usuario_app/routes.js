const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.get('/usuarios-activos',controlador.obtenerUsuariosAppActivos)
router.get('/usuarios-inactivos',controlador.obtenerUsuariosAppInactivos)
router.delete('/activar/:idUsuario',controlador.activarUsuarioApp)
router.delete('/desactivar/:idUsuario',controlador.desactivarUsuarioApp)
router.get('/obtener/:idUsuario',controlador.obtenerUsuarioApp)
router.get('/busca-activo/:busca?',controlador.buscaUsuarioAppActivo)
router.get('/busca-inactivo/:busca?',controlador.buscaUsuarioAppInactivoDB)

module.exports = router