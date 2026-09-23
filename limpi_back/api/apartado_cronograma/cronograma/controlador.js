const logicaDB = require('./logica')

const crearCronograma = async(req,res) => {
    let cronograma_crear = req.body.cronograma
    let lineas_cronograma = req.body.lineas_cronograma
    try{
        let cronograma = await logicaDB.crearCronogramaDB(cronograma_crear)
        for(let i = 0; i< lineas_cronograma.length; i++){
            lineas_cronograma[i].cronogramaId = cronograma.id
            await logicaDB.crearLineaCronogramaDB(lineas_cronograma[i])
        }
        return res.status(200).json({cronograma})
    }catch(error){
        return res.status(500).json({error})
    }
}

const editarCronograma = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    let cronograma_editar = req.body.cronograma
    try{
        let cronograma = await logicaDB.editarCronogramaDB(cronograma_editar,id_cronograma)
        return res.status(200).json({cronograma})
    }catch(error){
        return res.status(500).json({error})
    }
}

const crearLineaCronograma = async(req,res) => {
    let linea_cronograma_crear = req.body.linea_cronograma
    let id_sector = req.body.id_sector
    try{
        let linea_cronograma = await logicaDB.crearLineaCronogramaDB(linea_cronograma_crear)
        let listas_pev = await logicaDB.obtenerListasPevPorCronogramaYSectorDB(linea_cronograma_crear.cronogramaId,id_sector)
        if(listas_pev.length != 0){
            for(let index = 0;index < listas_pev.length; index++){
                await logicaDB.crearLineaListaPevDB(linea_cronograma_crear.tareaId, listas_pev[index].id)
                if(listas_pev[index].listas_super_trabajadore != null){
                    await logicaDB.crearLineaListaSuperDB(linea_cronograma_crear.tareaId,listas_pev[index].listas_super_trabajadore.id)
                }
            }
        }
        return res.status(200).json({linea_cronograma})
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const eliminarLineaCronograma = async(req,res) => {
    let id_linea_cronograma = req.params.id_linea_cronograma
    let tareaId = req.params.tareaId
    let cronogramaId = req.params.cronogramaId
    let sectoreId = req.params.sectoreId
    try{
        let filas = await logicaDB.eliminarLineaCronogramaDB(id_linea_cronograma)
        let listas_pev = await logicaDB.obtenerListasPevPorCronogramaYSectorDB(cronogramaId,sectoreId)
        if(listas_pev.length != 0){
            for(let index = 0;index < listas_pev.length; index++){
                await logicaDB.eliminarLineaListaPevDB(listas_pev[index].id,tareaId)
            }
        }
        return res.status(200).json({filas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramaId = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    try{
        let cronograma = await logicaDB.obtenerCronogramaIdDB(id_cronograma)
        return res.status(200).json({cronograma})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerTurnosTareasPorTurnoId = async(req,res) => {
    let id_turno = req.params.id_turno
    try{
        let tareas = await logicaDB.obtenerTurnosTareasPorTurnoIdDB(id_turno)
        return res.status(200).json({tareas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramasActivosPorClienteId = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let cronogramas = await logicaDB.obtenerCronogramasActivosPorClienteIdDB(id_cliente)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramasInactivosPorClienteId = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let cronogramas = await logicaDB.obtenerCronogramasInactivosPorClienteIdDB(id_cliente)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

//*turnos
const obtenerTurnosPorClienteId = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let turnos = await logicaDB.obtenerTurnosPorClienteIdDB(id_cliente)
        return res.status(200).json({turnos})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramaActivosPorMesPorClienteId = async(req,res) => {
    let id_cliente = req.params.id_cliente
    let mes = req.params.mes
    try{
        let turnos_cliente = await logicaDB.obtenerTurnosPorClienteIdDB(id_cliente)
        if(turnos_cliente.length === 0){
            return res.status(200).json({mensaje:'No existen Turnos creados para generar Cronogramas'})
        }
        let cronogramas_activos_mes = await logicaDB.obtenerCronogramaActivosPorMesPorClienteIdDB(id_cliente,mes)
        if(cronogramas_activos_mes.length === 0){
            return res.status(200).json({turnos:turnos_cliente})
        }
        let cronogramas = cronogramas_activos_mes
        cronogramas.forEach((element) => {
            let index_turno = turnos_cliente.findIndex(x => x.id === element.turnoId )
            if(index_turno != -1){
                turnos_cliente.splice(index_turno,1)
            }
        });
        return res.status(200).json({turnos:turnos_cliente})
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const obtenerCronogramasActivosPorMesAnioCliente = async(req,res) => {
    let id_cliente = req.params.id_cliente
    let mes = req.params.mes
    let anio = req.params.anio
    try{
        let cronogramas = await logicaDB.obtenerCronogramasActivosPorMesAnioClienteDB(id_cliente,mes,anio)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramasInactivosPorMesAnioCliente = async(req,res) => {
    let id_cliente = req.params.id_cliente
    let mes = req.params.mes
    let anio = req.params.anio
    try{
        let cronogramas = await logicaDB.obtenerCronogramasInactivosPorMesAnioClienteDB(id_cliente,mes,anio)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const finalizarCronograma = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    try{
        let listas_pev = await logicaDB.obtenerListasPevDeCronogramaDB(id_cronograma)
        let cantidad_lista_pev = 0
        let cantidad_lista_super = 0
        for(let index = 0; index < listas_pev.length ; index++){
            if(listas_pev[index].listas_super_trabajadore){
                if(listas_pev[index].listas_super_trabajadore.estado === 1) cantidad_lista_super++
            }
            if(listas_pev[index].estado === 1) cantidad_lista_pev++
        }
        if(cantidad_lista_pev === 0 && cantidad_lista_super === 0){
            let respuesta = await logicaDB.finalizarCronogramaDB(id_cronograma)
            return res.status(200).json({'finalizado':true,respuesta})
        }
        return res.status(200).json({'finalizado':false,cantidad_lista_pev, cantidad_lista_super})

    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

//Eliminar Cronograma con linea_cronograma, checkeos, trabajador_cronograma, lista_pev,linea_pev, lista_super, linea_super

const eliminarCronograma = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    try{
        let res_eliminar_trabajador_cronograma = await logicaDB.eliminarTrabajadoresCronogramaDB(id_cronograma)
        let res_obt_lineas_cronograma = await logicaDB.obtenerLineasCronogramaDB(id_cronograma)
        for(let i = 0; i < res_obt_lineas_cronograma.length; i++){
            await logicaDB.eliminarCheckeosCronogramaDB(res_obt_lineas_cronograma[i].dataValues.id)
        }
        let res_eliminar_linea_cronograma = await logicaDB.eliminarLineasCronogramaDB(id_cronograma)

        let res_obt_listas_pev = await logicaDB.obtenerListasPevTrabajadorDB(id_cronograma)
        for(let p = 0; p < res_obt_listas_pev.length; p++){
            let res_obt_listas_super = await logicaDB.obtenerListasSuperDB(res_obt_listas_pev[p].dataValues.id)
            for(let n = 0; n < res_obt_listas_super.length; n++){
                await logicaDB.eliminarLineasListaSuperCronogramaDB(res_obt_listas_super[n].dataValues.id)
            }
            await logicaDB.eliminarListasSuperCronogramaDB(res_obt_listas_pev[p].dataValues.id)
            await logicaDB.eliminarLineasListaPevCronogramaDB(res_obt_listas_pev[p].dataValues.id)
        }
        let res_eliminar_listas_pev = await logicaDB.eliminarListasPevCronogramaDB(id_cronograma)
        let res_eliminar_cronograma = await logicaDB.eliminarCronogramaDB(id_cronograma)

        return res.status(200).json({
            res_eliminar_trabajador_cronograma,
            res_obt_lineas_cronograma,
            res_eliminar_linea_cronograma,
            res_obt_listas_pev,
            res_eliminar_listas_pev,
            res_eliminar_cronograma
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

module.exports = {
    crearCronograma,
    editarCronograma,
    crearLineaCronograma,
    eliminarLineaCronograma,
    obtenerCronogramaId,
    obtenerTurnosTareasPorTurnoId,
    obtenerCronogramasActivosPorClienteId,
    obtenerCronogramasInactivosPorClienteId,
    obtenerTurnosPorClienteId,
    obtenerCronogramaActivosPorMesPorClienteId,
    obtenerCronogramasActivosPorMesAnioCliente,
    obtenerCronogramasInactivosPorMesAnioCliente,
    finalizarCronograma,
    eliminarCronograma
}