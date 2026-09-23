const Seguro = require('../../../modelos/sistema_base/Seguro')

const crearSeguroDB = async (seguro) => {
    let respuesta = await Seguro.create(seguro)
    return respuesta
}

const obtenerSeguroIdDB = async (id) => {
    let respuesta = await Seguro.findById(id)
    return respuesta
}

const editarSeguroDB = async (id,seguro) => {
    let respuesta = await Seguro.update(seguro, {where: {id}})
    return respuesta
}

const obtenerTodosSegurosDB = async() => {
    let respuesta = await Seguro.findAll({
        where: { estado: 1 },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerSegurosActivosDB = async () => {
    let respuesta = await Seguro.findAll({
        where: { estado: 1 },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerSegurosInactivosDB = async () => {
    let respuesta = await Seguro.findAll({
        where: { estado: 0 },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const desactivarSeguroDB = async (id) => {
    let respuesta = await Seguro.update(
        { estado: 0 },
        { where: { id: id } }
      )
    return respuesta
}

const activarSeguroDB = async (id) => {
    let respuesta = await Seguro.update(
        { estado: 1 },
        { where: { id } }
      )
    return respuesta
}

module.exports = {
    crearSeguroDB,
    obtenerSeguroIdDB,
    editarSeguroDB,
    obtenerSeguroIdDB,
    obtenerSegurosActivosDB,
    obtenerSegurosInactivosDB,
    desactivarSeguroDB,
    activarSeguroDB
}