//const models = require('../../../database').models
const Sectores = require('../../../modelos/apartado_listas_pev/sector')
const Areas = require('../../../modelos/apartado_listas_pev/area')
const paginador = require('../../../services/paginado')
const { Op } = require('sequelize')
Sectores.hasMany(Areas);

const crearSectorDB = async (sector) => {
    let respuesta = await Sectores.create(sector)
    return respuesta
}

const actualizarSectorDB = async (id,sector) => {
    id = parseInt(id)
    let respuesta = await Sectores.update(sector, { where: { id } })
    return respuesta
}

//DESACTIVAR O ACTIVAR SECTOR
const cambiarEstadoSectorDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await Sectores.update({ estado }, { where: { id } })
    return respuesta
}

const obtenerSectoresActivosPaginadosDB = async (clienteId,pagina) => {
    clienteId = parseInt(clienteId)
    pagina = parseInt(pagina)
    const totalCount = await Sectores.count({ where: { 'estado': 1, clienteId } })
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

    respuesta.sectores = await Sectores.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 1, clienteId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerSectoresInactivosPaginadosDB = async (clienteId, pagina) => {
    clienteId = parseInt(clienteId)
    pagina = parseInt(pagina)
    const totalCount = await Sectores.count({ where: { 'estado': 0, clienteId } })
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

    respuesta.sectores = await Sectores.findAll({
        offset: response.skip, limit: parseInt(process.env.CANTIDAD_ITEM_PAGINA),
        where: { 'estado': 0, clienteId },
        order: [['nombre', 'ASC']]
    })
    return respuesta
}

const obtenerSectoresPorEstadoDB = async (clienteId,estado) => {
    clienteId = parseInt(clienteId)
    estado = parseInt(estado)
    const respuesta = await Sectores.findAll({
        where: {estado,clienteId},
        order: [['nombre', 'ASC']]

    })
    return respuesta
}
const obtenerSectorPorIdDB = async (id) => {
    id = parseInt(id)
    const respuesta = await Sectores.findOne({
        where: {id}
    })
    return respuesta
}
const obtenerSectoresPorClienteDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    const respuesta = await Sectores.findAll({
        where: {clienteId},
        include:{
            model:Areas
        },
        order: [['estado', 'DESC']]
    })
    return respuesta
}
const obtenerSectoresNormalPorClienteDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    const respuesta = await Sectores.findAll({
        where: {clienteId},
        order: [['estado', 'DESC']]
    })
    return respuesta
}
const obtenerSectoresActivosPorClienteDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    const respuesta = await Sectores.findAll({
        where: {clienteId,estado:1},
        order: [['estado', 'DESC']]

    })
    return respuesta
}

const eliminarSectorPorIdDB = async(id) => {
    let respuesta = await Sectores.destroy({where:{id}})
    return respuesta
}

const buscarSectorIdEnAreaDB = async(id) => {
    let respuesta = await Areas.findAll({where:{sectoreId:id}})
    return respuesta
}

module.exports = {
    crearSectorDB,
    actualizarSectorDB,
    cambiarEstadoSectorDB,
    obtenerSectoresActivosPaginadosDB,
    obtenerSectoresInactivosPaginadosDB,
    obtenerSectoresPorEstadoDB,
    obtenerSectorPorIdDB,
    obtenerSectoresPorClienteDB,
    obtenerSectoresNormalPorClienteDB,
    obtenerSectoresActivosPorClienteDB,
    eliminarSectorPorIdDB,
    buscarSectorIdEnAreaDB
}