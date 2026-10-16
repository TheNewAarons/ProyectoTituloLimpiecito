const logicaDB = require('./logica')
const AppError = require('../../../libs/app-error')

const crearEgreso = async (req, res) => {
    const egreso = JSON.parse(req.body.egreso);
    const egresoData = {
        monto: egreso.monto,
        comentario: egreso.comentario,
        fecha: egreso.fecha,
        tipo: egreso.tipo,
        estado: egreso.estado,
        usuarioId: egreso.usuarioId,
        cajaId: egreso.cajaId
    };
    try {
        let egreso = await logicaDB.crearEgresoDB(egresoData)
        return res.json({mensaje:'Listo'})

    } catch (error) {
        return res.send('error' + error)
    }
}

const eliminarEgreso = async(req, res) => {
    try {
        const usuario = req.usuario ? { id: req.usuario.id, contexto: req.usuario.contexto } : undefined
        let resp = await logicaDB.eliminarEgresoDB(req.params.id, { usuario, ip: req.ip })
        return res.json({resp})
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.httpStatus).json({ ok: false, error: { code: error.code, message: error.message } })
        }
        console.error('[egreso] eliminarEgreso fallo:', error && error.name, error && error.code)
        return res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No se pudo anular el egreso' } })
    }
}

const obtenerEgresos = async(req, res) => {
    try {
        let egresos = await logicaDB.obtenerTodosEgresosDB()
        return res.json({egresos})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerEgresosCaja = async(req, res) => {
    try {
        let egresos = await logicaDB.obtenerEgresosCajaDB(req.params.id)
        return res.json({egresos})
    } catch (error) {
        return res.send('error' + error)
    }
}

module.exports = {
    crearEgreso,
    eliminarEgreso,
    obtenerEgresos,
    obtenerEgresosCaja
}
