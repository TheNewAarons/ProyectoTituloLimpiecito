const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { autenticar, requerirRol, identificarOpcional } = require('../../../middleware/auth')
const { ROL_ADMIN_NOMBRES } = require('../../../services/constantes')

const soloAdmin = [autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES)]

// El modulo Caja es solo para Administrador (el front envia el token via TokenSesionInterceptor).
router.post('/crear', soloAdmin, controlador.crearCaja)
router.put('/editar/:id', soloAdmin, controlador.editarCaja)
router.put('/editar-cierre/:id', soloAdmin, controlador.editarCierraCaja)
router.get('/obtener', soloAdmin, controlador.obtenerTodasCajasDetalle)
router.get('/obtener-cajas', soloAdmin, controlador.obtenerTodasCajas)
// Sin rol: Centro de Costo, Egresos y Dashboard (otros roles) necesitan saber cual es la caja activa.
router.get('/obtener-activa', identificarOpcional, controlador.obtenerCajaActiva)
router.get('/obtener-unico/:id', soloAdmin, controlador.obtenerCajaId)
// RF-CAJA-01: el cierre exige token y rol Admin tambien en el prefijo legacy (cerrada_por/auditoria con el usuario real).
router.put('/cerrar/:idCaja', soloAdmin, controlador.cerrarCaja)

module.exports = router