const sector = require('../../../modelos/apartado_listas_pev/sector');
const logicaDB = require('./logica')

const Schema = require('./schema');

//Asocia a los trabajadores del centro de costo seleccionados

const AsociarTrabajadoresSeleccionadosCronograma = async(req,res) => {
    // let clienteId = req.params.id_cliente
    // let cronogramaId = req.params.id_cronograma
    let trabajadores = req.body.trabajadores;
    let cronogramaId = req.params.id_cronograma;
    try {
        //console.log(trabajadores_asociados)
            let asociar_trabajadores = await logicaDB.AsociarTrabajadoresCronogramaDB(cronogramaId,trabajadores)
            return res.status(200).json({
                asociar_trabajadores,
                estado:true,
                'mensaje':'Trabajadores asociados correctamente'
            })

    } catch (error) {
        console.log(error)
        return res.status(500).json({error})
    }
}


//Asocia todos los trabajkadores que se encuentran en el centro de costo activo
const AsociarTrabajadoresCronograma = async(req,res) => {
    // let clienteId = req.params.id_cliente
    // let cronogramaId = req.params.id_cronograma
    let trabajador_cronograma = req.body.trabajador_cronograma
    try {
        let respuesta_centro_costo = await logicaDB.obtenerCentroCostoActivoClienteDB(trabajador_cronograma.clienteId)
        let trabajadores_asociados;
    if(respuesta_centro_costo){
        trabajadores_asociados = await logicaDB.obtenerTrabajadoresCentrodeCostoClienteDB(respuesta_centro_costo.id)
        if(trabajadores_asociados.length != 0){
            let asociar_trabajadores = await logicaDB.AsociarTrabajadoresCronogramaDB(trabajador_cronograma.cronogramaId,trabajadores_asociados)
            return res.status(200).json({
                asociar_trabajadores,
                estado:true,
                'mensaje':'Trabajadores asociados correctamente'
            })
        }else{
            return res.status(200).json({
                estado:false,
                'mensaje':'No hay trabajadores para asociar'
            })
        }

    }else{
        return res.status(200).json({
            estado:false,
            'mensaje':'No existe centro de costo activo'
        })
    }
    } catch (error) {
        return res.status(500).json({error})
    }
}

const obtenerTareasCronograma = async(req,res) => {
    let cronogramaId = req.params.id_cronograma;
    try {
        let respuesta = await logicaDB.obtenerTareasAsociadasAlCronogramaDB(cronogramaId)
        return res.status(200).json({
            tareas_cronograma: respuesta,
            estado:true,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({error})
    }
}

//Genera el listado con las tareas del cronogama y se asocia a un trabajador
const crearListaPevTrabajadorDB = async(req,res) => {
    let lista_pev = req.body.lista_pev //contiene cronogramaId, n_empleado , sectoreId
    let tareas = req.body.tareas;
    try {
        let respuesta = await logicaDB.crearListasPevTrabajadorDB(lista_pev.cronogramaId, lista_pev.n_empleado,lista_pev.sectoreId,lista_pev.fecha_chequeo, tareas)
        return res.status(200).json({
            'id_lista_pev_trabajador': respuesta,
            'estado':true,
            'mensaje':'Lista pev Generada exitosamente'
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerListasPevTrabajadorConLineasPevPorCronograma = async(req,res) => {
    let id_lista_pev_trabajadores = req.params.id
    try{
        let respuesta = await logicaDB.obtenerListasPevTrabajadorConLineasPevPorCronogramaDB(id_lista_pev_trabajadores)
        let cronograma = await logicaDB.obtenerEstadoCronogramaDB(respuesta.dataValues.cronogramaId)
        return res.status(200).json({
            'lista_pev_trabajador':respuesta,
            'cronograma':cronograma
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

//Obtener todos las listas por estado por cronograma
const obtenerTodasLasListasPorCronograma = async(req,res) => {
    let cronogramaId = req.params.id_cronograma
    try{
        let respuesta = await logicaDB.obtenerListasPevTrabajadorPorCronogramaDB(cronogramaId)
        return res.status(200).json({
            'listas_pev':respuesta

        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
//Obtener listas pev de un trabjador por cronograma
const obtenerListaPevTrabajador = async(req,res) => {
    let cronogramaId = req.params.id_cronograma
    let n_empleado = req.params.n_empleado
    try{
        let cronograma = await logicaDB.obtenerEstadoCronogramaDB(cronogramaId)
        let respuesta = await logicaDB.obtenerListasPevTrabajadorDB(cronogramaId,n_empleado)
        return res.status(200).json({
            'listas_pev':respuesta,
            'cronograma':cronograma

        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
//Obtener trabajadores de un cronograma
const obtenerTrabajadoresCronograma = async(req,res) => {
    let cronogramaId = req.params.id_cronograma
    try{
        let cronograma = await logicaDB.obtenerEstadoCronogramaDB(cronogramaId)
        let respuesta = await logicaDB.obtenerTrabajadoresCronogramaDB(cronogramaId)
        if(respuesta.length > 0){
            return res.status(200).json({
                'estado':true,
                'cronograma':cronograma,
                'trabajadores':respuesta,
                'mensaje':'Trabajadores Obtenidos exitosamente'
            })
        }else{
            return res.status(200).json({
                'estado':false,
                'cronograma':cronograma,
                'trabajadores':respuesta,
                'mensaje':'No existen trabajadores asociados'
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerTrabajadoresCentroCosto = async(req,res) => {
    let clienteId = req.params.id_cliente
    try{
        let respuesta;
        let respuest_centro_costo = await logicaDB.obtenerCentroCostoActivoClienteDB(clienteId)
        console.log(respuest_centro_costo)
        if(respuest_centro_costo){
            respuesta = await logicaDB.obtenerTrabajadoresCompletoCentrodeCostoClienteDB(respuest_centro_costo.id)
            return res.status(200).json({
                'trabajadores':respuesta,
                'estado':true,
                'cantidad_trabajadores':respuesta.length
            })
        }else{
            return res.status(200).json({
                'trabajadores':respuesta,
                'estado':false,
                'mensaje':"No hay centro de costo activo"
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
//Obtiene los trabajadores que no han sido aasociado al cronograma  y que si estan asociados al centro de costo
const obtenerTrabajadoresNoAsociadosalCronograma = async(req,res) => {
    let clienteId = req.params.id_cliente
    let cronogramaId = req.params.id_cronograma
    try{
        //let respuesta = await logicaDB.obtenerTrabajadoresNoAsociadosAlCronogramaDB(300);
        let respuest_centro_costo = await logicaDB.obtenerCentroCostoActivoClienteDB(clienteId)
        if(respuest_centro_costo){
            respuesta = await logicaDB.obtenerTrabajadoresNoAsociadosAlCronogramaDB(respuest_centro_costo.id, cronogramaId)
            return res.status(200).json({
                'trabajadores_centro_costo':respuesta.trabajadores_centro_costo,
                'trabajadores_cronograma': respuesta.trabajador_cronograma,
                'estado':true,
            })
        }else{
            return res.status(200).json({
                'trabajadores':respuesta,
                'estado':false,
                'mensaje':"No hay centro de costo activo"
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
//Obtener trabajador por N° empelado
const obtenerTrabajadorPorNumeroEmpleado = async(req,res) => {
    let n_empleado = req.params.n_empleado
    try{
        let respuesta = await logicaDB.obtenerTrabajadorPorNumeroEmpleadoDB(n_empleado)
        return res.status(200).json({
            'trabajador':respuesta
        })
    }catch(error){
        console.log(error)
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
const cambiarEstado = async(req,res) => {
    let lista_pev = req.body.lista_pev
    let id_lista_pev = req.params.id
    try{
        let respuesta = await logicaDB.cambiarEstadoDB(id_lista_pev,lista_pev)
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

const eliminarTrabajadorCronograma = async(req,res) => {
    let id = req.params.id
    let n_empleado = req.params.n_empleado
    try{
        let respuesta_1 = await logicaDB.obtenerExisteListaPevTrabajadorDB(n_empleado)
        console.log('respuesta',respuesta_1)
        if(respuesta_1){
            return res.status(200).json({estado:false, mensaje:'Trabajador Asociado con Listas Pev'})
        }
        let respuesta = await logicaDB.eliminarTrabajadorCronogramaDB(id)
        return res.status(200).json({estado:true, mensaje:'Trabajador Quitado Correctamente'})
    }catch(error){
        return res.status(500).json({error})
    }
}

module.exports = {
    AsociarTrabajadoresSeleccionadosCronograma,
    AsociarTrabajadoresCronograma,
    obtenerTareasCronograma,
    obtenerListaPevTrabajador,
    obtenerTrabajadoresCronograma,
    crearListaPevTrabajadorDB,
    obtenerListasPevTrabajadorConLineasPevPorCronograma,
    obtenerTrabajadoresCentroCosto,
    obtenerTodasLasListasPorCronograma,
    obtenerTrabajadoresNoAsociadosalCronograma,
    obtenerTrabajadorPorNumeroEmpleado,
    actualizarLineaListaPevTrabajador,
    cambiarEstado,
    eliminarTrabajadorCronograma
}