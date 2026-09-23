//const models = require('../../../database').models
const TurnosTareas = require('../../../modelos/apartado_listas_pev/turnoTarea')
const { Op } = require('sequelize')

const AsociarTurnoATareaDB = async (turno_tarea) => {
    let respuesta = await TurnosTareas.create(turno_tarea)
    return respuesta
}
const cambiarEstadoTurnoATareaDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await TurnosTareas.update({ estado }, { where: { id } })
    return respuesta
}

// const obtenerTurnosATareaPorEstadoPorTurnoDB = async (turnoId,estado) => {
//     clienteId = parseInt(clienteId)
//     estado = parseInt(estado)
//     const respuesta = await Turnos.findAll({
//         where: {estado,clienteId},
//         order: [['nombre', 'ASC']]
//     })
//     return respuesta
// }

module.exports = {
    AsociarTurnoATareaDB,
    cambiarEstadoTurnoATareaDB
}