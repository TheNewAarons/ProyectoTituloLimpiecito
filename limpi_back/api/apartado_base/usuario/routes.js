const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/registro', controlador.crearUsuario)
router.put('/editar/:id',controlador.editarUsuario)
router.put('/editar-password/:id', controlador.cambiarContrasenaUsuario)
router.get('/rescatar/:id',controlador.obtenerUsuarioId)
router.post('/login',controlador.login)
router.delete('/activar/:id',controlador.activarUsuario)
router.get('/obtener',controlador.obtenerUsuariosActivos)
router.get('/obtener-inactivo', controlador.obtenerUsuariosInactivos)
router.delete('/eliminar/:id',controlador.desactivarUsuario)
router.get('/busca-activo/:busca?',controlador.buscarUsuariosActivos)
router.get('/busca-inactivo/:busca?',controlador.buscarUsuariosInactivos)

module.exports = router