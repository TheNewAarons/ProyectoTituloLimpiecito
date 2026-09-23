//const models = require('../../../database').models
const Turnos = require('../../../modelos/apartado_listas_pev/turno')
const { Op } = require('sequelize')
const sequelize_turnos = Turnos.sequelize

const crearTurnoDB = async (turno) => {
    console.log(turno)
    let respuesta = await Turnos.create(turno)
    return respuesta
}
const crearTurnosDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    let turnos = [
        {nombre: 'A' },
        {nombre: 'B'},
        {nombre: 'C'}
    ];
    await sequelize_turnos.transaction(async(t) => {
        for(let index = 0; index < turnos.length; index++){
            await Turnos.create({
                nombre: turnos[index].nombre,
                estado: 1,
                clienteId: clienteId
            },{transaction:t})
        }
    });
    return true;
}
const actualizarTurnoDB = async (id,turno) => {
    id = parseInt(id)
    let respuesta = await Turnos.update(turno, { where: { id } })
    return respuesta
}

//DESACTIVAR O ACTIVAR SECTOR
const cambiarEstadoTurnoDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await Turnos.update({ estado }, { where: { id } })
    return respuesta
}

const obtenerTurnosPorEstadoDB = async (clienteId,estado) => {
    clienteId = parseInt(clienteId)
    estado = parseInt(estado)
    const respuesta = await Turnos.findAll({
        where: {estado,clienteId},
        order: [['nombre', 'ASC']]
    })    
    return respuesta
}
const obtenerTurnoPorIdDB = async (id) => {
    id = parseInt(id)
    const respuesta = await Turnos.findOne({
        where: {id}
    })    
    return respuesta
}

const obtenerTurnosPorClienteDB = async (clienteId) => {
    clienteId = parseInt(clienteId)
    const respuesta = await Turnos.findAll({
        where: {clienteId},
        order: [['nombre', 'ASC']]
    })    
    return respuesta
}
module.exports = {
    crearTurnoDB,
    crearTurnosDB,
    actualizarTurnoDB,
    cambiarEstadoTurnoDB,
    obtenerTurnosPorEstadoDB,
    obtenerTurnoPorIdDB,
    obtenerTurnosPorClienteDB
}