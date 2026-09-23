//const models = require('../../../database').models
const Tareas = require('../../../modelos/apartado_listas_pev/tarea')
const TareasTurnos = require('../../../modelos/apartado_listas_pev/turnoTarea')
const Turnos = require('../../../modelos/apartado_listas_pev/turno')
const paginador = require('../../../services/paginado')

const Linea_lista_super = require('../../../modelos/apartado_listas_pev/lineaSuperTrabajador')
const Linea_lista_pev = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador')
const Linea_cronograma = require('../../../modelos/apartado_cronograma/Linea_cronograma')
const Turno_tarea = require('../../../modelos/apartado_listas_pev/turnoTarea')

const { Op } = require('sequelize')
const sequelize_tareas = Tareas.sequelize
Tareas.hasMany(TareasTurnos)
TareasTurnos.belongsTo(Turnos)

const crearTareaDB = async (tarea, turnos) => {
    let tareaId;
    await sequelize_tareas.transaction(async(t) => {
        tareaId = await Tareas.create(tarea,{transaction:t}).then( function (x){
                return x.id
            })
        for(let index = 0; index < turnos.length; index++){
            await TareasTurnos.create({
                turnoId: turnos[index].turnoId,
                tareaId: tareaId,
                estado: 1
            },{transaction:t})
        }
        });
    return true
}

const actualizarTareaDB = async (id,tarea) => {
    id = parseInt(id)
    let respuesta = await Tareas.update(tarea, { where: { id } })
    return respuesta
}

//DESACTIVAR O ACTIVAR AREA
const cambiarEstadoTareaDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await Tareas.update({ estado }, { where: { id } })
    return respuesta
}

const obtenerTareasPorArearActivosPaginadosDB = async (areaId,pagina) => {
    areaId = parseInt(areaId)
    pagina = parseInt(pagina)
    const totalCount = await Tareas.count({ where: { 'estado': 1, areaId } })
    const totalPage = Math.ceil(totalCount / parseInt(process.env.CANTIDAD_ITEM_PAGINA))
    const currentPage = pagina || 0
    const respuesta = {}
    if (pagina <= 0) {
        return "Pagina no puede ser 0 o negativo";
    }
    respuesta.cantidad_objetos = totalCount
    respuesta.cantidad_paginas = totalPage
    respuesta.pagina_actual = currentPage
    let response = await paginador.paginador(pagina, totalPage)
    respuesta.next = response.next
    respuesta.prev = response.prev
    respuesta.cantidad_por_pagina = response.cantidad_por_pagina

    respuesta.tareas = await Tareas.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 1, areaId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerTareasPorArearInactivosPaginadosDB = async (areaId,pagina) => {
    areaId = parseInt(areaId)
    pagina = parseInt(pagina)
    const totalCount = await Tareas.count({ where: { 'estado': 0, areaId } })
    const totalPage = Math.ceil(totalCount / parseInt(process.env.CANTIDAD_ITEM_PAGINA))
    const currentPage = pagina || 0
    const respuesta = {}
    if (pagina <= 0) {
        return "Pagina no puede ser 0 o negativo";
    }
    respuesta.cantidad_objetos = totalCount
    respuesta.cantidad_paginas = totalPage
    respuesta.pagina_actual = currentPage
    let response = await paginador.paginador(pagina, totalPage)
    respuesta.next = response.next
    respuesta.prev = response.prev
    respuesta.cantidad_por_pagina = response.cantidad_por_pagina

    respuesta.tareas = await Tareas.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 0, areaId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerTareasPorAreaYEstadoDB = async (areaId,estado) => {
    areaId = parseInt(areaId)
    estado = parseInt(estado)
    const respuesta = await Tareas.findAll({
        where: {estado,areaId},
        order: [['nombre', 'ASC']]
    })
    return respuesta
}
const obtenerTareaPorIdDB = async (id) => {
    id = parseInt(id)
    const respuesta = await Tareas.findOne({
        where: {id}
    })
    return respuesta
}

const obtenerTareasPorAreaDB = async (areaId) => {
    areaId = parseInt(areaId)
    const respuesta = await Tareas.findAll({
        where: {areaId},
        include:{
            model: TareasTurnos,
            include:{
                model: Turnos,
            },
            //order:[['nombre', 'ASC']]
        },
        order: [['estado', 'DESC']]
    })
    return respuesta
}
const obtenerCantidadTareasActivasPorAreaDB = async (areaId) => {
    areaId = parseInt(areaId)
    const respuesta = await Tareas.count({
        where: {areaId, estado:1}
    })
    return respuesta
}

const eliminarTareaPorIdDB = async(id) => {
    let respuesta_turno_tarea = await Turno_tarea.destroy({where:{tareaId:id}})
    let respuesta = await Tareas.destroy({where:{id}})
    return respuesta
}

const buscarExistenciasTareaIdDB = async(tareaId) => {
    let res_linea_cronograma = await Linea_cronograma.findOne({where:{tareaId}})
    let res_linea_lista_super = await Linea_lista_super.findOne({where:{tareaId}})
    let res_linea_lista_pev = await Linea_lista_pev.findOne({where:{tareaId}})
    return {
        'linea_cronograma':res_linea_cronograma,
        'linea_lista_super':res_linea_lista_super,
        'linea_lista_pev':res_linea_lista_pev
    }
}

module.exports = {
    crearTareaDB,
    actualizarTareaDB,
    cambiarEstadoTareaDB,
    obtenerTareasPorArearActivosPaginadosDB,
    obtenerTareasPorArearInactivosPaginadosDB,
    obtenerTareasPorAreaYEstadoDB,
    obtenerTareaPorIdDB,
    obtenerTareasPorAreaDB,
    obtenerCantidadTareasActivasPorAreaDB,
    eliminarTareaPorIdDB,
    buscarExistenciasTareaIdDB
}