const logicaDB = require('./logica')
const Schema = require('./schema');

const crearTurno = async(req,res) => {
    let turno = req.body.turno
    try {
        await Schema.turnoSchemaCrear.validateAsync(turno);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.crearTurnoDB(turno)
        return res.status(200).json({
            'turno':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
//Por lote
const crearTurnos = async(req,res) => {
    let turno = req.body.turno
    console.log(turno.clienteId)
    try{
        let respuesta = await logicaDB.crearTurnosDB(turno.clienteId)
        return res.status(200).json({
            'turno':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const actualizarTurno = async(req,res) => {
    let id = req.params.id
    let turno = req.body.turno
    try {
        await Schema.turnoSchemaEditar.validateAsync(turno);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.actualizarTurnoDB(id, turno)
        return res.status(200).json({
            'turno':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const cambiarEstadorTurno = async(req,res) => {
    let id = req.params.id
    let turno = req.body.turno
    try {
        await Schema.turnoSchemaCambiarEstado.validateAsync(turno);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoTurnoDB(id, turno.estado)
        return res.status(200).json({
            'turno':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerTurnosPorEstado = async(req,res) => {
    let clienteId = req.params.id_cliente
    let estado = req.params.estado    
    try{
        let respuesta = await logicaDB.obtenerTurnosPorEstadoDB(clienteId,estado)
        return res.status(200).json({
            'turnos':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerTurnoPorId = async(req,res) => {
    let id = req.params.id
    try{
        let respuesta = await logicaDB.obtenerTurnoPorIdDB(id)
        return res.status(200).json({
            'turno':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerTurnosPorCliente = async(req,res) => {
    let clienteId = req.params.id_cliente    
    try{
        let respuesta = await logicaDB.obtenerTurnosPorClienteDB(clienteId)
        if(respuesta != ''){
            return res.status(200).json({
                'turnos':respuesta
            })
        }else{
            return res.status(200).json({
                'turnos':false
            })
        }
        
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

module.exports = {
    crearTurno,
    crearTurnos,
    actualizarTurno,
    cambiarEstadorTurno,
    obtenerTurnosPorEstado,
    obtenerTurnoPorId,
    obtenerTurnosPorCliente
}