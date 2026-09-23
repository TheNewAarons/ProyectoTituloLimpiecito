const express = require('express')
const router = express.Router()
const controlador = require('./controlador')

router.post('/inicio_sesion',controlador.inicioSesion)
router.get('/obtener_sub_carpetas/:id_cliente',controlador.obtenerSubCarpetas)
router.get('/obtener_carpetas_hijos/:id_carpeta_padre',controlador.obtenerCarpetasHijos)
router.get('/buscar_documentos/:id_carpeta/:busca?',controlador.buscarEnDocumentos)
router.get('/obtener_datos_inicio/:id_cliente',controlador.obtenerDatosParaInicio)
router.get('/obtener_cronogramas/:id_cliente',controlador.obtenerCronogramas)
router.get('/obtener_cronograma/:id_cronograma',controlador.obtenerCronograma)
router.post('/enviar_mail_cliente_cronograma',controlador.enviarMailClienteCronograma)
module.exports = router