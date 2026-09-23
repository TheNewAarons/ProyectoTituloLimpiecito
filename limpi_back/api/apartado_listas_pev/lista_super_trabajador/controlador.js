const logicaDB = require('./logica')

const Schema = require('./schema')

const crearListasSuperTrabajador = async(req,res) => {
    let n_empleado = req.body.n_empleado
    let listasPevTrabajadoreId = req.body.listasPevTrabajadoreId
    let tareas = req.body.tareas
    try{
        let respuesta = await logicaDB.crearListasSuperTrabajadorDB(listasPevTrabajadoreId,n_empleado,tareas)
        return res.status(200).json({
            'id_lista_super_trabajador':respuesta,
            'estado':true
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerListasSuperTrabajadorConLineas = async(req,res) => {
    let id_lista_super_trabajadores = req.params.id
    try{
        let respuesta = await logicaDB.obtenerListasSuperTrabajadorConLineasDB(id_lista_super_trabajadores)
        let cronograma = await logicaDB.obtenerEstadoCronogramaDB(respuesta.dataValues.listasPevTrabajadore.cronogramaId)
        return res.status(200).json({
            'lista_super_trabajador':respuesta,
            'cronograma':cronograma
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const actualizarLineaListaSuperTrabajador = async(req,res) => {
    let linea_lista_super = req.body.linea_lista_supervisor
    let id_linea_lista_super = req.params.id
    try{
        let respuesta = await logicaDB.actualizarLineaListaSuperTrabajadorDB(id_linea_lista_super,linea_lista_super)
        if(respuesta){
            return res.status(200).json({
                'estado':true,
                'cant_afectado':respuesta,
                'mensaje':'Datos actualizados'
            })
        }else{
            return res.status(200).json({
                'estado':false,
                'cant_afectado':respuesta,
                'mensaje':'Sin cambios o actualización'
            })
        }
    }catch(error){
        return res.status(500).json({error})
    }
}

const cambiarEstado = async(req,res) => {
    let lista_super = req.body.lista_supervisor
    let id_lista_super = req.params.id
    try{
        let respuesta = await logicaDB.cambiarEstadoDB(id_lista_super,lista_super)
        if(respuesta){
            return res.status(200).json({
                'estado':true,
                'cant_afectado':respuesta,
                'mensaje':'Lista actualizada'
            })
        }else{
            return res.status(200).json({
                'estado':false,
                'cant_afectado':respuesta,
                'mensaje':'Lista no actualizada'
            })
        }
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerTrabajadoresSupervisor = async(req,res) => {
    try{
        let respuesta = await logicaDB.obtenerTrabajadorSupervisorDB()
        return res.status(200).json({'trabajadores':respuesta})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerDatosTrabajador = async(req,res) => {
    let n_empleado = req.params.n_empleado
    try{
        let respuesta = await logicaDB.obtenerTrabajadorDB(n_empleado)
        return res.status(200).json({'trabajador':respuesta})
    }catch(error){
        return res.status(500).json({error})
    }
}

module.exports = {
    crearListasSuperTrabajador,
    obtenerListasSuperTrabajadorConLineas,
    actualizarLineaListaSuperTrabajador,
    cambiarEstado,
    obtenerTrabajadoresSupervisor,
    obtenerDatosTrabajador
}