const Salude = require('../../../modelos/sistema_base/Salude')

const crearSaludDB = async(salud) => {
    let respuesta = await Salude.create(salud)
    return respuesta
}

const buscarSaludIdDB = async(id) => {
    let respuesta = await Salude.findById(id)
    return respuesta
}

const editarSaludDB = async(id,salud) => {
    let respuesta = await Salude.update(salud,{where:{id}})
    return respuesta
}

const obtenerTodosSaludDB = async() => {
    let respuesta = await Salude.findAll({
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerSaludActivosDB = async() => {
    let respuesta = await Salude.findAll({
        where: { estado: 1},
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerSaludInactivosDB = async() => {
    let respuesta = await Salude.findAll({
        where: { estado: 0 },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const activarSaludDB = async(id) => {
    let respuesta = await Salude.update({ estado: 0 }, { where: { id } })
    return respuesta
}

const desactivarSaludDB = async() => {
    let respuesta = await Salude.update({ estado: 1 }, { where: { id } })
    return respuesta
}

module.exports = {
    crearSaludDB,
    buscarSaludIdDB,
    editarSaludDB,
    obtenerTodosSaludDB,
    obtenerSaludActivosDB,
    obtenerSaludInactivosDB,
    activarSaludDB,
    desactivarSaludDB
}