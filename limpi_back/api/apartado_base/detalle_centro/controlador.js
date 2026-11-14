const logicaDB = require('./logica')
const { actorDeRequest } = require('../../../services/auditoria/actor')

const crearAsociacionCentroTrabajador = async (req, res) => {
    const asociacion = JSON.parse(req.body.asociacion);
    const asociacionData = {
        trabajadoreId: asociacion.trabajadoreId,
        centroCostoId: asociacion.centroCostoId,
        liquidacioneId: asociacion.liquidacioneId
    };
    try {
        let asociacion = await logicaDB.crearCentroTrabajadorDB(asociacionData)
        return res.json({ asociacion })
    } catch (error) {
        return res.send('error:' + error)
    }
}

const eliminarAsociacionCentroTrabajador = async (req, res) => {
    try {
        let centro_trabajador = await logicaDB.obtenerCentroTrabajadorIdDB(req.params.id)
        if (centro_trabajador) {
            let eliminado = await logicaDB.eliminarAsociacionCentroTrabajadorDB(req.params.id, actorDeRequest(req))
            return res.json({ numero_eliminado: eliminado });
        } else {
            return res.send('error no existe la asociación')
        }
    } catch (error) {
        return res.send('error:' + error)
    }
}

const crearListaInsumo = async (req, res) => {
    const lista_insumo = JSON.parse(req.body.lista_insumo);
    const lineasInsumos = JSON.parse(req.body.lineasInsumos);

    const listaData = {
        fecha: new Date(lista_insumo.fecha),
        total: lista_insumo.total,
        estado: lista_insumo.estado,
        centroCostoId: lista_insumo.centroCostoId,
        usuarioCreaId: lista_insumo.usuarioCreaId,
        usuarioApruebaId: lista_insumo.usuarioApruebaId

    };
    try {
        let lista = await logicaDB.crearListaInsumoCompletoDB(listaData, lineasInsumos, actorDeRequest(req))
        return res.json({ lista });
    } catch (error) {
        return res.send('error:' + error)
    }
}
const aprobarListaInsumo = async (req, res) => {
    try {
        let filas = await logicaDB.aprobarListaInsumoDB(req.params.id,req.params.id_usuario,actorDeRequest(req))
        return res.json({ mensaje: 'Lista Aprobada' });
    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarListaInsumo = async (req, res) => {
    try {
        let numero_eliminado = await logicaDB.eliminarListaInsumoCompletoDB(req.params.id, actorDeRequest(req))
        return res.json({ numero_eliminado })
    } catch (error) {
        return res.send('error:' + error)
    }
}
const crearCCEgreso = async (req, res) => {
    const egreso = JSON.parse(req.body.egreso);
    const egresoData = {
        fecha: new Date(egreso.fecha),
        monto: egreso.monto,
        comentario: egreso.comentario,
        centroCostoId: egreso.centroCostoId
    };
    try {
        let egreso = await logicaDB.crearCCEgresoDB(egresoData, actorDeRequest(req))
        return res.json({ egreso })
    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarCCEgreso = async (req, res) => {
    try {
        let numero_eliminado = await logicaDB.eliminarCCEgresoDB(req.params.id, actorDeRequest(req))
        return res.json({ numero_eliminado });
    } catch (error) {
        return res.send('error:' + error)
    }
}
const crearCCIngreso = async (req, res) => {
    const ingreso = JSON.parse(req.body.ingreso);
    const ingresoData = {
        fecha: new Date(ingreso.fecha),
        monto: ingreso.monto,
        comentario: ingreso.comentario,
        centroCostoId: ingreso.centroCostoId
    };
    try {
        let ingreso = await logicaDB.crearCCIngresoDB(ingresoData, actorDeRequest(req))
        return res.json({ingreso})

    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarCCIngreso = async (req, res) => {
    try {
        let ingreso = await logicaDB.obtenerCCIngresoIdDB(req.params.id)
        if(ingreso){
            let n_eliminado = await logicaDB.eliminarCCIngresoDB(req.params.id, actorDeRequest(req))
            return res.json({n_eliminado})
        }else{
            return res.send('error, no existe ese ingreso')
        }

    } catch (error) {
        return res.send('error:' + error)
    }
}

module.exports = {
    crearAsociacionCentroTrabajador,
    eliminarAsociacionCentroTrabajador,
    crearListaInsumo,
    aprobarListaInsumo,
    eliminarListaInsumo,
    crearCCEgreso,
    eliminarCCEgreso,
    crearCCIngreso,
    eliminarCCIngreso
}