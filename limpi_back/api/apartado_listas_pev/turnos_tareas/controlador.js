const logicaDB = require('./logica')
const Schema = require('./schema');

const asociarTurnoTarea = async(req,res) => {
    let turno_tarea = req.body.turno_tarea
    try {
        await Schema.turnotareaSchemaAsociar.validateAsync(turno_tarea);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.AsociarTurnoATareaDB(turno_tarea)
        return res.status(200).json({
            'turno_tarea':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}

const cambiarEstadorTurnoTares = async(req,res) => {
    let id = req.params.id
    let turnoTarea = req.body.turno_tarea
    console.log(turnoTarea)
    try {
        await Schema.turnotareaSchemaCambiarEstado.validateAsync(turnoTarea);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoTurnoATareaDB(id, turnoTarea.estado)
        return res.status(200).json({
            'turno_tarea':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

module.exports = {
    asociarTurnoTarea,
    cambiarEstadorTurnoTares
}