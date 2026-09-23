const logicaDB = require('./logica')

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
        let resp = await logicaDB.eliminarEgresoDB(req.params.id)
        return res.json({resp})
    } catch (error) {
        return res.send('error' + error)
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
