const logicaDB = require('./logica')
const Schema = require('./schema');

const crearArea = async(req,res) => {
    let area = req.body.area
    try {
        await Schema.areaSchemaCrear.validateAsync(area);
    }

    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.crearArearDB(area)
        return res.status(200).json({
            'area':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const actualizarArea = async(req,res) => {
    let id = req.params.id
    let area = req.body.area
    try {
        await Schema.areaSchemaEditar.validateAsync(area);
    }

    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.actualizarArearDB(id, area)
        return res.status(200).json({
            'area':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const cambiarEstadorArea = async(req,res) => {
    let id = req.params.id
    let area = req.body.area
    try {
        await Schema.areaSchemaCambiarEstado.validateAsync(area);
    }

    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoAreaDB(id, area.estado)
        return res.status(200).json({
            'area':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const obtenerAreasPorSectorActivosPaginados = async(req,res) => {
    let sectoreId = req.params.id_sector
    let page = req.params.page
    try{

        let respuesta = await logicaDB.obtenerAreasPorSectorActivosPaginadosDB(sectoreId,page)
        res.status(200).json({
            'areas_paginadas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreasPorSectorInactivosPaginados = async(req,res) => {
    let sectoreId = req.params.id_sector
    let page = req.params.page
    try{

        let respuesta = await logicaDB.obtenerAreasPorSectorInactivosPaginadosDB(sectoreId,page)
        res.status(200).json({
            'areas_paginadas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreasPorSectorYEstado = async(req,res) => {
    let sectoreId = req.params.id_sector

    let estado = req.params.estado
    try{
        let respuesta = await logicaDB.obtenerAreasPorSectorYEstadoDB(sectoreId,estado)
        return res.status(200).json({
            'areas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreaPorId = async(req,res) => {
    let id = req.params.id
    try{
        let respuesta = await logicaDB.obtenerAreaPorIdDB(id)
        return res.status(200).json({
            'area':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreasPorSector = async(req,res) => {

    let sectoreId = req.params.id_sector
    try{
        let respuesta = await logicaDB.obtenerAreasPorSectorDB(sectoreId)
        return res.status(200).json({
            'areas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreasActivasPorSector = async(req,res) => {

    let sectoreId = req.params.id_sector
    try{
        let respuesta = await logicaDB.obtenerAreasActivasPorSectorDB(sectoreId)
        return res.status(200).json({
            'areas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAreasActivasPorCliente = async(req,res) => {

    let clienteId = req.params.id_cliente
    try{
        let respuesta = await logicaDB.obtenerAreasActivasPorClienteDB(clienteId)
        return res.status(200).json({
            'areas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const eliminarAreaPorId = async(req,res) => {
    let areaId = req.params.id_area
    try{
        let respuesta = await logicaDB.buscarAreaIdEnTareaDB(areaId)
        if(respuesta.length > 0){
            return res.status(200).json({eliminado:false})
        }
        let respuesta_eliminado = await logicaDB.eliminarAreaPorIdDB(areaId)
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
    crearArea,
    actualizarArea,
    cambiarEstadorArea,
    obtenerAreasPorSectorActivosPaginados,
    obtenerAreasPorSectorInactivosPaginados,
    obtenerAreasPorSectorYEstado,
    obtenerAreaPorId,
    obtenerAreasPorSector,
    obtenerAreasActivasPorSector,
    obtenerAreasActivasPorCliente,
    eliminarAreaPorId
}