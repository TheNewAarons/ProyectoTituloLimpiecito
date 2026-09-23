const logicaDB = require('./logica')
const Schema = require('./schema');

const crearSector = async(req,res) => {
    let sector = req.body.sector
    try {
        await Schema.sectorSchemaCrear.validateAsync(sector);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.crearSectorDB(sector)
        return res.status(200).json({
            'sector':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const actualizarSector = async(req,res) => {
    let id = req.params.id
    let sector = req.body.sector
    try {
        await Schema.sectorSchemaEditar.validateAsync(sector);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.actualizarSectorDB(id, sector)
        return res.status(200).json({
            'sector':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const cambiarEstadorSector = async(req,res) => {
    let id = req.params.id
    let sector = req.body.sector
    try {
        await Schema.sectorSchemaCambiarEstado.validateAsync(sector);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoSectorDB(id, sector.estado)
        return res.status(200).json({
            'sector':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerSectoresActivosPaginados = async(req,res) => {
    let clienteId = req.params.id_cliente
    let page = req.params.page
    try{

        let respuesta = await logicaDB.obtenerSectoresActivosPaginadosDB(clienteId,page)
        res.status(200).json({
            'sectores_paginados':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerSectoresInactivosPaginados = async(req,res) => {
    let clienteId = req.params.id_cliente
    let page = req.params.page
    try{
        let respuesta = await logicaDB.obtenerSectoresInactivosPaginadosDB(clienteId,page)
        res.status(200).json({
            'sectores_paginados':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerSectoresPorEstado = async(req,res) => {
    let clienteId = req.params.id_cliente
    let estado = req.params.estado
    try{
        let respuesta = await logicaDB.obtenerSectoresPorEstadoDB(clienteId,estado)
        return res.status(200).json({
            'sectores':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerSectorPorId = async(req,res) => {
    let id = req.params.id
    try{
        let respuesta = await logicaDB.obtenerSectorPorIdDB(id)
        return res.status(200).json({
            'sector':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerSectoresPorCliente = async(req,res) => {

    let clienteId = req.params.id_cliente
    try{
        let respuesta = await logicaDB.obtenerSectoresPorClienteDB(clienteId)
        return res.status(200).json({
            'sectores':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerSectoresNormalPorCliente = async(req,res) => {
    let clienteId = req.params.id_cliente
    try{
        let respuesta = await logicaDB.obtenerSectoresNormalPorCliente(clienteId)
        return res.status(200).json({
            'sectores':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerSectoresActivoPorCliente = async(req,res) => {
    let clienteId = req.params.id_cliente
    try{
        let respuesta = await logicaDB.obtenerSectoresActivosPorClienteDB(clienteId)
        return res.status(200).json({
            'sectores':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}


const eliminarSectorPorId = async(req,res) => {
    let sectorId = req.params.id_sector
    try{
        let respuesta = await logicaDB.buscarSectorIdEnAreaDB(sectorId)
        if(respuesta.length > 0){
            return res.status(200).json({eliminado:false})
        }
        let respuesta_eliminado = await logicaDB.eliminarSectorPorIdDB(sectorId)
        if(respuesta_eliminado > 0){
            return res.status(200).json({eliminado:true})
        }else{
            return res.status(200).json({eliminado:false})
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

module.exports = {
    crearSector,
    actualizarSector,
    cambiarEstadorSector,
    obtenerSectoresActivosPaginados,
    obtenerSectoresInactivosPaginados,
    obtenerSectoresPorEstado,
    obtenerSectorPorId,
    obtenerSectoresPorCliente,
    obtenerSectoresNormalPorCliente,
    obtenerSectoresActivoPorCliente,
    eliminarSectorPorId
}