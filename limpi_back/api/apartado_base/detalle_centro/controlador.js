const logicaDB = require('./logica')

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
            await logicaDB.eliminarLiquidacionDB(req.params.id)
            let eliminado = await logicaDB.eliminarCentroTrabajadorDB(req.params.id)
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
        let lista = await logicaDB.crearListaInsumoDB(listaData)
        if (lista) {
            for (i = 0; lineasInsumos.length > i; i++) {
                const lineaData = {
                    cantidad: lineasInsumos[i].cantidad,
                    precio: lineasInsumos[i].precio,
                    total_linea: lineasInsumos[i].total_linea,
                    listaInsumoId: lista.id,
                    productoId: lineasInsumos[i].productoId
                };
                await logicaDB.disminuirCantidadProductoDB(lineasInsumos[i].productoId, lineasInsumos[i].cantidad)
                await logicaDB.crearLineaInsumoDB(lineaData)
            }
            return res.json({ lista });
        }
        else {
            return res.send('error, no se creo lista insumo')
        }

    } catch (error) {
        return res.send('error:' + error)
    }
}
const aprobarListaInsumo = async (req, res) => {
    try {
        let filas = await logicaDB.aprobarListaInsumoDB(req.params.id,req.params.id_usuario)
        return res.json({ mensaje: 'Lista Aprobada' });
    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarListaInsumo = async (req, res) => {
    try {
        let lineas = await logicaDB.obtenerLineasInsumoDB(req.params.id)
        if (lineas) {
            for (i = 0; lineas.length > i; i++) {
                await logicaDB.aumentarCantidadProductoDB(lineas[i].productoId, lineas[i].cantidad)
            }
            await logicaDB.eliminarLineaInsumoDB(req.params.id)
            let numero_eliminado = await logicaDB.eliminarListaInsumoDB(req.params.id)
            return res.json({ numero_eliminado })
        } else {
            return res.send('error, no existen las filas')
        }
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
        let egreso = await logicaDB.crearCCEgresoDB(egresoData)
        return res.json({ egreso })
    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarCCEgreso = async (req, res) => {
    try {
        let numero_eliminado = await logicaDB.eliminarCCEgresoDB(req.params.id)
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
        let ingreso = await logicaDB.crearCCIngresoDB(ingresoData)
        await logicaDB.aumentarPrecioServicioCentroCostoDB(ingreso.centroCostoId,ingreso.monto)
        return res.json({ingreso})

    } catch (error) {
        return res.send('error:' + error)
    }
}
const eliminarCCIngreso = async (req, res) => {
    try {
        let ingreso = await logicaDB.obtenerCCIngresoIdDB(req.params.id)
        if(ingreso){
            let n_eliminado = await logicaDB.eliminarCCIngresoDB(req.params.id)
            await logicaDB.disminuirPrecioServicioCentroCostoDB(ingreso.centroCostoId,ingreso.monto)
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