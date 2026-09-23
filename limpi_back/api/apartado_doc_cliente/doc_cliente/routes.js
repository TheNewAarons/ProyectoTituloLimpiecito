const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/crear/:id_cliente/:ruta',controlador.crearDocumento)
router.get('/buscar-documentos/:id_carpeta/:busca?',controlador.busquedaDocumentos)
router.delete('/eliminar-documento/:id_carpeta/:id_documento/:nombre_archivo/:id_cliente',controlador.eliminarDocumento)

module.exports = router