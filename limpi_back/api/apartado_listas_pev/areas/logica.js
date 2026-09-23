//const models = require('../../../database').models
const Areas = require('../../../modelos/apartado_listas_pev/area')
const Sectores = require('../../../modelos/apartado_listas_pev/sector')
const Tareas = require('../../../modelos/apartado_listas_pev/tarea')
const paginador = require('../../../services/paginado')
const { Op } = require('sequelize')
const { sequelize } = require('../../../database/database')
Areas.belongsTo(Sectores)
Areas.hasMany(Tareas)
const crearArearDB = async (area) => {
    let respuesta = await Areas.create(area)
    return respuesta
}

const actualizarArearDB = async (id,area) => {
    id = parseInt(id)
    let respuesta = await Areas.update(area, { where: { id } })
    return respuesta
}

//DESACTIVAR O ACTIVAR AREA
const cambiarEstadoAreaDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await Areas.update({ estado }, { where: { id } })
    return respuesta
}

const obtenerAreasPorSectorActivosPaginadosDB = async (sectoreId,pagina) => {
    sectoreId = parseInt(sectoreId)
    pagina = parseInt(pagina)
    const totalCount = await Areas.count({ where: { 'estado': 1, sectoreId } })
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

    respuesta.areas = await Areas.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 1, sectoreId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerAreasPorSectorInactivosPaginadosDB = async (sectoreId,pagina) => {
    sectoreId = parseInt(sectoreId)
    pagina = parseInt(pagina)
    const totalCount = await Areas.count({ where: { 'estado': 0, sectoreId } })
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

    respuesta.areas = await Areas.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 0, sectoreId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerAreasPorSectorYEstadoDB = async (sectoreId,estado) => {
    sectoreId = parseInt(sectoreId)
    estado = parseInt(estado)
    const respuesta = await Areas.findAll({
        where: {estado,sectoreId},
        order: [['nombre', 'ASC']]

    })
    return respuesta
}
const obtenerAreaPorIdDB = async (id) => {
    id = parseInt(id)
    const respuesta = await Areas.findOne({
        where: {id}

    })
    return respuesta
}

const obtenerAreasPorSectorDB = async (sectoreId) => {
    sectoreId = parseInt(sectoreId)
    const respuesta = await Areas.findAll({
        where: {sectoreId},
        order: [['nombre', 'ASC']]

    })
    return respuesta
}
const obtenerAreasActivasPorSectorDB = async (sectoreId) => {
    sectoreId = parseInt(sectoreId)
    const respuesta = await Areas.findAll({
        where: {'estado':1, sectoreId},        
        order: [['nombre', 'ASC']]
    })    
    return respuesta
}
// const obtenerAreasActivasPorClienteDB = async (clienteId) => {
//     clienteId = parseInt(clienteId)
//     const respuesta = await Areas.findAll({
//         where:{
//             estado:1,
//             sectoreId: sequelize.literal(`sectoreId IN (                     
//                     SELECT id
//                     FROM sectores
//                     WHERE clienteId = ${clienteId}
//             )`)
        
//         },
//         order: [['nombre', 'ASC']]
//     })    
//     return respuesta
// }

const obtenerAreasActivasPorClienteDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    const respuesta = await Areas.findAll({
        where:{
            [Op.or]:[{estado:0},{estado: 1}]
        },
        include:{
            model:Sectores,
            where: {'clienteId':clienteId}
        },
        order: [['estado', 'DESC']]

    })
    return respuesta
}
const obtenerCantidadAreasActivasDB = async (sectoreId) => {
    sectoreId = parseInt(sectoreId)
    const totalCount = await Areas.count({ where: { 'estado': 1, sectoreId } })
    return respuesta
}

const eliminarAreaPorIdDB = async(id) =>{
    let respuesta = await Areas.destroy({where:{id}})
    return respuesta
}

const buscarAreaIdEnTareaDB = async(areaId) => {
    let respuesta = await Tareas.findAll({where:{areaId}})
    return respuesta
}

module.exports = {
    crearArearDB,
    actualizarArearDB,
    cambiarEstadoAreaDB,
    obtenerAreasPorSectorActivosPaginadosDB,
    obtenerAreasPorSectorInactivosPaginadosDB,
    obtenerAreasPorSectorYEstadoDB,
    obtenerAreaPorIdDB,
    obtenerAreasPorSectorDB,
    obtenerAreasActivasPorSectorDB,
    obtenerAreasActivasPorClienteDB,
    obtenerCantidadAreasActivasDB,
    eliminarAreaPorIdDB,
    buscarAreaIdEnTareaDB
}