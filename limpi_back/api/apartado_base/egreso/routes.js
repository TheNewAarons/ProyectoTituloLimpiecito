const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const { identificarOpcional } = require('../../../middleware/auth')

router.post('/crear', identificarOpcional, controlador.crearEgreso)
// AUT-030 (RNF-SEC-02): "eliminar" anulaba sin motivo, sin código y sin exigir sesión; ahora es anular con código (solo Admin).
router.delete('/eliminar/:id', (req, res) => res.status(410).json({ ok: false, error: {
    code: 'RUTA_REEMPLAZADA',
    message: 'para anular un egreso usa POST /api/v1/egresos/:id/anular/codigo { motivo } y luego POST /api/v1/egresos/:id/anular { codigo }',
    details: { codigo: 'POST /api/v1/egresos/:id/anular/codigo', confirmar: 'POST /api/v1/egresos/:id/anular' }
} }))
router.get('/obtener',controlador.obtenerEgresos)
router.get('/obtener-caja/:id',controlador.obtenerEgresosCaja)

module.exports = router