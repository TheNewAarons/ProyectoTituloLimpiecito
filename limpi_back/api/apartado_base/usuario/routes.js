const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { ROLES_GESTION_USUARIOS } = require('../../../config/roles')
const { propioOGestor } = require('../../../middleware/usuario-propio')

// RNF-SEC-01 (AUT-006): todo exige sesión salvo el login. Gestión = roles de config/roles.js;
// ver, editar y cambiar la contraseña también para el propio usuario (Editar perfil).
// middleware/auth se carga al llegar la petición: carga modelos, y los tests del login simulan la BD sin ellos.
const auth = () => require('../../../middleware/auth')
const autenticar = (req, res, next) => auth().autenticar(req, res, next)
const soloGestores = (req, res, next) => auth().requerirRol.apply(null, ROLES_GESTION_USUARIOS)(req, res, next)
const gestor = [autenticar, soloGestores]
const propio = [autenticar, propioOGestor]

router.post('/registro', gestor, controlador.crearUsuario)
router.put('/editar/:id', propio, controlador.editarUsuario)
router.put('/editar-password/:id', propio, controlador.cambiarContrasenaUsuario)
router.get('/rescatar/:id', propio, controlador.obtenerUsuarioId)
router.post('/login',controlador.login)
router.delete('/activar/:id', gestor, controlador.activarUsuario)
router.get('/obtener', gestor, controlador.obtenerUsuariosActivos)
router.get('/obtener-inactivo', gestor, controlador.obtenerUsuariosInactivos)
router.delete('/eliminar/:id', gestor, controlador.desactivarUsuario)
router.get('/busca-activo/:busca?', gestor, controlador.buscarUsuariosActivos)
router.get('/busca-inactivo/:busca?', gestor, controlador.buscarUsuariosInactivos)

module.exports = router