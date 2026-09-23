const logicaDB = require('./logica')

const obtenerClientes = async(req,res) => {
    let id_trabajador = req.params.id_trabajador
    try{
        let cronogramas = await logicaDB.obtenerClientesDB(id_trabajador)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerListasPevTrabajador = async(req,res) => {
    let n_empleado = req.params.n_empleado
    let cronogramaId = req.params.cronogramaId
    try{
        let listas = await logicaDB.obtenerListasPevTrabajadorDB(n_empleado,cronogramaId)
        return res.status(200).json({listas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerListaPevTrabajador = async(req,res) => {
    let id = req.params.id
    try{
        let lista = await logicaDB.obtenerListaPevTrabajadorDB(id)
        return res.status(200).json({lista})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerClientesParaSupervisor = async(req,res) => {
    let n_empleado = req.params.n_empleado
    let search = req.params.search
    try{
        let listas_clientes = await logicaDB.obtenerClientesParaSupervisorDB(n_empleado,search)
        return res.status(200).json({listas_clientes})
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}


const obtenerListaSupervisor = async(req,res) => {
    let id = req.params.id
    try{
        let lista = await logicaDB.obtenerListaSupervisorDB(id)
        return res.status(200).json({lista})
    }catch(error){
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

const cambiarEstadoListaSupervisor = async(req,res) => {
    let lista_super = req.body.lista_supervisor
    let id_lista_super = req.params.id
    try{
        let respuesta = await logicaDB.cambiarEstadoListaSupervisorDB(id_lista_super,lista_super)
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

//Actualizar linea lista pev
const actualizarLineaListaPevTrabajador = async(req,res) => {
    let linea_lista_pev = req.body.linea_lista_pev
    let id_linea_lista_pev = req.params.id
    try{
        let respuesta = await logicaDB.actualizarLineaListaPevTrabajadorDB(id_linea_lista_pev,linea_lista_pev)
        if(respuesta){
            return res.status(200).json({
                'estado':true,
                'linea_lista_pev':respuesta,
                'mensaje':"Datos Actualizada"
            })
        }else{
            return res.status(200).json({
                'estado':false,
                'linea_lista_pev':respuesta,
                'mensaje':"Datos Sin cambios o no Actualizados"
            })
        }

    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
//Cambiar estado lista PEB
const cambiarEstadoListaPev = async(req,res) => {
    let lista_pev = req.body.lista_pev
    let id_lista_pev = req.params.id
    try{
        let respuesta = await logicaDB.cambiarEstadoListaPevDB(id_lista_pev,lista_pev)
        if(respuesta){
            return res.status(200).json({
                'estado':true,
                'lista_pev':respuesta,
                'mensaje':"Lista Finalizada"
            })
        }else{
            return res.status(200).json({
                'estado':false,
                'lista_pev':respuesta,
                'mensaje':"Lista no Actualizada"
            })
        }

    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerCronogramaId = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    try{
        let cronograma = await logicaDB.obtenerCronogramaIdDB(id_cronograma)
        return res.status(200).json({cronograma})
    }catch(error){
        console.log(error)
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
    obtenerClientes,
    obtenerListasPevTrabajador,
    obtenerListaPevTrabajador,
    obtenerClientesParaSupervisor,
    obtenerListaSupervisor,
    actualizarLineaListaSuperTrabajador,
    cambiarEstadoListaSupervisor,
    actualizarLineaListaPevTrabajador,
    cambiarEstadoListaPev,
    obtenerCronogramaId,
    obtenerDatosTrabajador
}