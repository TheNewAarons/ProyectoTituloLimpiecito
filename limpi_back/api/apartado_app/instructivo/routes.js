const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const multer = require('../../../libs/multer-instructivo');

router.post('/crear', mutler.single('image') ,controlador.crearInstructivo)
router.put('/editar/:idInstructivo',multer.single('image'),controlador.editarInstructivo)
router.get('/obtener-instructivo/:idInstructivo',controlador.obtenerInstructivoId)
router.get('/obtener-instructivos',controlador.obtenerInstructivos)
router.delete('/eliminar-instructivo/:idInstructivo',controlador.eliminarInstructivo)

module.exports = router