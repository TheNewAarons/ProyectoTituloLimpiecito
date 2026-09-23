const logicaDB = require('./logica')
const Schema = require('./schema');

const crearTarea = async(req,res) => {

    let tarea = req.body.tarea;
    let turnos = req.body.turnos;
    try {
        await Schema.tareaSchemaCrear.validateAsync(tarea);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{

        let respuesta = await logicaDB.crearTareaDB(tarea, turnos)
        return res.status(200).json({
            'tarea':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const actualizarTarea = async(req,res) => {
    let id = req.params.id
    let tarea = req.body.tarea
    try {
        await Schema.tareaSchemaEditar.validateAsync(tarea);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.actualizarTareaDB(id, tarea)
        return res.status(200).json({
            'tarea':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const cambiarEstadorTarea = async(req,res) => {
    let id = req.params.id
    let tarea = req.body.tarea
    try {
        await Schema.tareaSchemaCambiarEstado.validateAsync(tarea);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoTareaDB(id, tarea.estado)
        return res.status(200).json({
            'tarea':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const obtenerTareasPorAreaActivosPaginados = async(req,res) => {
    let areaId = req.params.id_area
    let page = req.params.page
    try{
        let respuesta = await logicaDB.obtenerTareasPorArearActivosPaginadosDB(areaId,page)        
        res.status(200).json({
            'tareas_paginadas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerTareasPorAreaInactivosPaginados = async(req,res) => {
    let areaId = req.params.id_area
    let page = req.params.page
    try{
        let respuesta = await logicaDB.obtenerTareasPorArearInactivosPaginadosDB(areaId,page)        
        res.status(200).json({
            'tareas_paginadas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerTareasPorAreaYEstado = async(req,res) => {
    let areaId = req.params.id_area
    let estado = req.params.estado
    try{
        let respuesta = await logicaDB.obtenerTareasPorAreaYEstadoDB(areaId,estado)
        return res.status(200).json({
            'tareas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerTareaPorId = async(req,res) => {
    let id = req.params.id
    try{
        let respuesta = await logicaDB.obtenerTareaPorIdDB(id)
        return res.status(200).json({
            'tarea':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerTareasPorArea = async(req,res) => {
    let areaId = req.params.id_area
    try{
        let respuesta = await logicaDB.obtenerTareasPorAreaDB(areaId)
        return res.status(200).json({
            'tareas':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const eliminarTareaPorId = async(req,res) => {
    let tareaId = req.params.id_tarea
    try{
        let respuesta = await logicaDB.buscarExistenciasTareaIdDB(tareaId)
        if(respuesta.linea_cronograma & respuesta.linea_lista_pev & respuesta.linea_lista_super){
            return res.status(200).json({eliminado:false})
        }
        let respuesta_eliminado = await logicaDB.eliminarTareaPorIdDB(tareaId)
            if(respuesta_eliminado > 0){
                return res.status(200).json({eliminado:true})
            }else{
                return res.status(200).json({eliminado:false})
            }
    }catch(error){
        console.log(error)
        return res.status(200).json({error})
    }
}

module.exports = {
    crearTarea,
    actualizarTarea,
    cambiarEstadorTarea,
    obtenerTareasPorAreaActivosPaginados,
    obtenerTareasPorAreaInactivosPaginados,
    obtenerTareasPorAreaYEstado,
    obtenerTareaPorId,
    obtenerTareasPorArea,
    eliminarTareaPorId
}