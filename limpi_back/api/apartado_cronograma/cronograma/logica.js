const Cronograma = require('../../../modelos/apartado_cronograma/Cronograma')
const LineaCronograma = require('../../../modelos/apartado_cronograma/Linea_cronograma')
const Tarea = require('../../../modelos/apartado_listas_pev/tarea')
const Area = require('../../../modelos/apartado_listas_pev/area')
const Sector = require('../../../modelos/apartado_listas_pev/sector')
const TareaTurno = require('../../../modelos/apartado_listas_pev/turnoTarea')
const Turno = require('../../../modelos/apartado_listas_pev/turno')
const Cliente = require('../../../modelos/sistema_base/Cliente')
const Checkeo = require('../../../modelos/apartado_cronograma/checkeos')
const TrabajadorCronograma = require('../../../modelos/apartado_listas_pev/trabajadorCronograma')

/** Para lista pev , linea pev - lista supervisor, linea supervisor */
const ListaPev = require('../../../modelos/apartado_listas_pev/listaPevTrabajador')
const ListaSuper = require('../../../modelos/apartado_listas_pev/listaSuperTrabajador')
const LineaPev = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador')
const LineaSuper = require('../../../modelos/apartado_listas_pev/lineaSuperTrabajador')



Cronograma.hasMany(LineaCronograma)
LineaCronograma.belongsTo(Tarea)
LineaCronograma.hasMany(Checkeo)

Checkeo.belongsTo(LineaCronograma)

Tarea.hasMany(TareaTurno)
TareaTurno.belongsTo(Tarea)
Area.hasMany(Tarea)
Tarea.belongsTo(Area)

Cronograma.belongsTo(Turno)
Cronograma.belongsTo(Cliente,{as:'cliente'})

ListaPev.hasOne(ListaSuper)


const crearCronogramaDB = async(cronograma) => {
    let respuesta = await Cronograma.create(cronograma)
    return respuesta
}

const editarCronogramaDB = async(cronograma,id) => {
    let respuesta = await Cronograma.update(cronograma,{where:{id}})
    return respuesta
}

const crearLineaCronogramaDB = async(linea_cronograma) => {
    let respuesta = await LineaCronograma.create(linea_cronograma)
    return respuesta
}

const eliminarLineaCronogramaDB = async(id) => {
    let respuesta = await LineaCronograma.destroy({where:{id}})
    return respuesta
}

const obtenerCronogramaIdDB = async(id) => {
    let respuesta = await Cronograma.findOne({
            include:[{
                model:LineaCronograma,
                include:[{model:Tarea,include:{model:Area,include:[Sector]}},{model:Checkeo}]
            },{
                model:Cliente,as:'cliente'
            }],
            where:{id}
        })
    return respuesta
}

const obtenerTurnosTareasPorTurnoIdDB = async(id_turno) => {
    let respuesta = await TareaTurno.findAll({
        include:{model:Tarea,
                include:{model:Area,include:{model:Sector}}},
        where:{turnoId:id_turno}
    })
    return respuesta
}

const obtenerCronogramasActivosPorClienteIdDB = async(id_cliente) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        where:{clienteId:id_cliente,estado:1}})
    return respuesta
}

const obtenerCronogramasInactivosPorClienteIdDB = async(id_cliente) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        limit:3,
        where:{clienteId:id_cliente,estado:2}})
    return respuesta
}

const obtenerTurnosPorClienteIdDB = async(id_cliente) => {
    const respuesta = await Turno.findAll({
        where: {clienteId:id_cliente},
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

/* obtener cronograma Activo por mes y cliente */

const obtenerCronogramaActivosPorMesPorClienteIdDB = async(id_cliente,mes) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        where:{clienteId:id_cliente,estado:1, mes}})
    return respuesta
}

const obtenerCronogramasActivosPorMesAnioClienteDB = async(id_cliente,mes,anio) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        where:{clienteId:id_cliente,estado:1,mes,anio}
    })
    return respuesta
}

const obtenerCronogramasInactivosPorMesAnioClienteDB = async(id_cliente,mes,anio) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        where:{clienteId:id_cliente,estado:2,mes,anio}
    })
    return respuesta
}

/** apartado para lista pev y supervisor */

const obtenerListasPevPorCronogramaYSectorDB = async(cronogramaId, sectoreId) => {
    let respuesta = await ListaPev.findAll({
        include:{model:ListaSuper},
        where: {cronogramaId,sectoreId,estado:1}
    })
    return respuesta
}

const crearLineaListaPevDB = async(tareaId, idListaPev) => {
    let respuesta = await LineaPev.create({
        check_trabajador_1: 0,
        hora_check_trabajador_1:null,
        check_trabajador_2: 0,
        hora_check_trabajador_2:null,
        check_trabajador_3: 0,
        hora_check_trabajador_3:null,
        observaciones:null,
        listasPevTrabajadoreId: idListaPev,
        tareaId:tareaId
    })
    return respuesta
}

const crearLineaListaSuperDB = async(tareaId,idListaSuper) => {
    let respuesta = await LineaSuper.create({
        hora_1:null,
        despolvado_1:0,
        aplicacion_producto_1:0,
        abrillantado_1:0,
        hora_2:null,
        despolvado_2:0,
        aplicacion_producto_2:0,
        abrillantado_2:0,
        hora_3:null,
        despolvado_3:0,
        aplicacion_producto_3:0,
        abrillantado_3:0,
        observaciones:null,
        listasSuperTrabajadoreId:idListaSuper,
        tareaId:tareaId
    })
    return respuesta
}

const eliminarLineaListaPevDB = async(id,tareaId) => {
    let respuesta = await LineaPev.destroy({where:{listasPevTrabajadoreId:id,tareaId}})
    return respuesta
}

const eliminarLineaListaSuperDB = async(id,tareaId) => {
    let respuesta = await LineaSuper.destroy({where:{listasSuperTrabajadoreId:id,tareaId}})
    return respuesta
}

/**  ----- */

const finalizarCronogramaDB = async(id) => {
    let respuesta = await Cronograma.update({estado:2},{where:{id}})
    return respuesta
}

const obtenerListasPevDeCronogramaDB = async(cronogramaId) => {
    let respuesta = await ListaPev.findAll({include:{model:ListaSuper},where:{cronogramaId}})
    return respuesta
}


/** Funciones necesarias para eliminar cronograma */
const eliminarTrabajadoresCronogramaDB = async(cronogramaId) => {
    let respuesta = await TrabajadorCronograma.destroy({where:{cronogramaId}})
    return respuesta
}
const eliminarCheckeosCronogramaDB = async(lineaCronogramaId) => {
    let respuesta = await Checkeo.destroy({where:{lineaCronogramaId}})
    return respuesta
}
const eliminarLineasCronogramaDB = async(cronogramaId) => {
    let respuesta = await LineaCronograma.destroy({where:{cronogramaId}})
    return respuesta
}
const eliminarLineasListaSuperCronogramaDB = async(listasSuperTrabajadoreId) => {
    let respuesta = await LineaSuper.destroy({where:{listasSuperTrabajadoreId}})
    return respuesta
}
const eliminarListasSuperCronogramaDB = async(listasPevTrabajadoreId) => {
    let respuesta = await ListaSuper.destroy({where:{listasPevTrabajadoreId}})
    return respuesta
}
const eliminarLineasListaPevCronogramaDB = async(listasPevTrabajadoreId) => {
    let respuesta = await LineaPev.destroy({where:{listasPevTrabajadoreId}})
    return respuesta
}
const eliminarListasPevCronogramaDB = async(cronogramaId) => {
    let respuesta = await ListaPev.destroy({where:{cronogramaId}})
    return respuesta
}
const obtenerLineasCronogramaDB = async(cronogramaId) => {
    let respuesta = await LineaCronograma.findAll({attributes: ['id'],where:{cronogramaId}})
    return respuesta
}
const obtenerListasPevTrabajadorDB = async(cronogramaId) => {
    let respuesta = await ListaPev.findAll({attributes: ['id'],where:{cronogramaId}})
    return respuesta
}
const obtenerListasSuperDB = async(listasPevTrabajadoreId) =>{
    let respuesta = await ListaSuper.findAll({attributes:['id'],where:{listasPevTrabajadoreId}})
    return respuesta
}
const eliminarCronogramaDB = async(id) => {
    let respuesta = await Cronograma.destroy({where:{id}})
    return respuesta
}
module.exports = {
    crearCronogramaDB,
    editarCronogramaDB,
    crearLineaCronogramaDB,
    eliminarLineaCronogramaDB,
    obtenerCronogramaIdDB,
    obtenerTurnosTareasPorTurnoIdDB,
    obtenerCronogramasActivosPorClienteIdDB,
    obtenerCronogramasInactivosPorClienteIdDB,
    obtenerTurnosPorClienteIdDB,
    obtenerCronogramaActivosPorMesPorClienteIdDB,
    obtenerCronogramasActivosPorMesAnioClienteDB,
    obtenerCronogramasInactivosPorMesAnioClienteDB,

    obtenerListasPevPorCronogramaYSectorDB,
    crearLineaListaPevDB,
    crearLineaListaSuperDB,
    eliminarLineaListaPevDB,
    eliminarLineaListaSuperDB,
    finalizarCronogramaDB,
    obtenerListasPevDeCronogramaDB,

    eliminarTrabajadoresCronogramaDB,
    eliminarCheckeosCronogramaDB,
    eliminarLineasCronogramaDB,
    eliminarLineasListaSuperCronogramaDB,
    eliminarListasSuperCronogramaDB,
    eliminarLineasListaPevCronogramaDB,
    eliminarListasPevCronogramaDB,
    obtenerLineasCronogramaDB,
    obtenerListasPevTrabajadorDB,
    obtenerListasSuperDB,
    eliminarCronogramaDB
}