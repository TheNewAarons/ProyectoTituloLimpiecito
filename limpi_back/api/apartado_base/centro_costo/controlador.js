const logicaDB = require('./logica');

const crearCentroCosto = async (req, res) => {
    const centro_costo = JSON.parse(req.body.centro_costo);
    const centroData = {
        fecha_inicio: new Date(centro_costo.fecha_inicio),
        //fecha_cierre: centro_costo.fecha_cierre,
        precio_servicio: centro_costo.precio_servicio,
        total_costos: centro_costo.total_costos,
        utilidad: centro_costo.utilidad,
        numero_cc: centro_costo.numero_cc,
        estado: centro_costo.estado,
        clienteId: centro_costo.clienteId,
        cajaId: centro_costo.cajaId
    };
    try {
        let max = await logicaDB.obtenerNumeroCCCentroCostoDB()
        if (!max) {
            centroData.numero_cc = 1;
        } else {
            centroData.numero_cc = max + 1;
        }
        let centro = await logicaDB.crearCentroCostoDB(centroData)
        return res.json({ centro });
    }
    catch (error) {
        return res.send('error: ' + error);
    }

}

const editarCentroCosto = async (req, res) => {
    const centro_costo = JSON.parse(req.body.centro_costo);
    const centroData = {
        fecha_inicio: new Date(centro_costo.fecha_inicio),
        fecha_cierre: centro_costo.fecha_cierre,
        precio_servicio: centro_costo.precio_servicio,
        total_costos: centro_costo.total_costos,
        utilidad: centro_costo.utilidad,
        numero_cc: centro_costo.numero_cc,
        estado: centro_costo.estado,
        clienteId: centro_costo.clienteId,
        cajaId: centro_costo.cajaId
    };
    try {
        let centro = await logicaDB.obtenerCentroCostoIdDB(req.params.id)
        if (centro) {
            filas = await logicaDB.editarCentroCostoDB(req.params.id, centroData)
            return res.json({ filas });
        } else {
            return res.send('error: ' + error);
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const cerrarCentroCosto = async (req, res) => {
    const centro_costo = JSON.parse(req.body.centro_costo);
    const centroData = {
        fecha_inicio: centro_costo.fecha_inicio,
        fecha_cierre: new Date(centro_costo.fecha_cierre),
        precio_servicio: centro_costo.precio_servicio,
        total_costos: centro_costo.total_costos,
        utilidad: centro_costo.utilidad,
        numero_cc: centro_costo.numero_cc,
        estado: centro_costo.estado,
        clienteId: centro_costo.clienteId,
        cajaId: centro_costo.cajaId
    };
    try {
        let centro = await logicaDB.obtenerCentroCostoIdDB(req.params.id)
        if (centro) {
            filas = await logicaDB.editarCentroCostoDB(req.params.id, centroData)
            return res.json({ filas });
        } else {
            return res.send('error: ' + error);
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerCentroCostoId = async(req,res) => {
    try{
        let centro = await logicaDB.obtenerCentroCostoIdDB(req.params.id)
        return res.json({centro})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerTodosCentrosActivosCaja = async(req,res) => {
    try{
        let centros = await logicaDB.obtenerCentroCostoActivosCajaDB(req.params.id)
        return res.json({centros})
    }catch(error){
        return res.send('error: '+erroor)
    }
}

const obtenerTodosCentrosInactivosCaja = async(req,res) => {
    try{
        let centros = await logicaDB.obtenerCentroCostoInactivosCajaDB(req.params.id)
        return res.json({centros})
    }catch(error){
        return res.send('error: '+erroor)
    }
}

const obtenerTodosCentrosCostosCliente = async(req,res) => {
    try{
        let centros = await logicaDB.obtenerCentroCostoClienteDB(req.params.id)
        return res.json({centros})
    }catch(error){
        return res.send('error:' +error)
    }
}

const obtenerTodosCentrosCajas = async(req,res) => {
    try{
        let centros = await logicaDB.obtenerTodosCentroCostoCajaDB(req.params.id)
        return res.json({centros})
    }catch(error){
        return res.send('error:' +error)
    }
}

const buscarCentroCostoCajaActivos = async(req,res) => {
    try{
        if(req.params.busca != null){
            let centros = await logicaDB.buscarCentroCostoCajaActivosDB(req.params.id,req.params.busca)
            return res.json({centros})
        }else{
            let centros = await logicaDB.obtenerCentroCostoActivosCajaDB(req.params.id)
            return res.json({centros})
        }
    }catch(error){
        return res.send('error:' +error)
    }
}

const buscarCentroCostoCajaInactivos = async(req,res) => {
    try{
        if(req.params.busca != null){
            let centros = await logicaDB.buscarCentroCostoCajaInactivosDB(req.params.id,req.params.busca)
            return res.json({centros})
        }else{
            let centros = await logicaDB.obtenerCentroCostoInactivosCajaDB(req.params.id)
            return res.json({centros})
        }
    }catch(error){
        return res.send('error:' +error)
    }
}

module.exports = {
    crearCentroCosto,
    editarCentroCosto,
    cerrarCentroCosto,
    obtenerCentroCostoId,
    obtenerTodosCentrosActivosCaja,
    obtenerTodosCentrosInactivosCaja,
    obtenerTodosCentrosCostosCliente,
    obtenerTodosCentrosCajas,
    buscarCentroCostoCajaActivos,
    buscarCentroCostoCajaInactivos
}