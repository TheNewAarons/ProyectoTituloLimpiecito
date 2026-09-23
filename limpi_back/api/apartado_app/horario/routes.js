const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear',controlador.crearHorario)
router.put('/editar/:idHorario',controlador.editarHorario)
router.get('/obtener-horario-solo/:idHorario',controlador.obtenerHorarioSinBloque)
router.delete('/desactivar/:idHorario',controlador.desactivarHorario)
router.delete('/activar/:idHorario',controlador.activarHorario)
router.get('/obtener-dia-bloques/:idDia',controlador.obtenerDiaConBloque)
router.delete('/desactivar-dia/:idDia',controlador.desactivarDia)
router.delete('/activar-dia/:idDia',controlador.activarDia)

module.exports = router