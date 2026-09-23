const Vestimenta = require('../../../modelos/sistema_base/Vestimenta')

const crearVestimentaDB = async (vestimenta) => {
    let respuesta = await Vestimenta.create(vestimentaData)
    return respuesta
}

const obtenerVestimentaIdDB = async (id) => {
    let respuesta = await Vestimenta.findById(id)
    return respuesta
}

const editarVestimentaDB = async (id, vestimenta) => {
    let respuesta = await Vestimenta.update(vestimenta,{where:{id}})
    return respuesta
}

module.exports = {
    crearVestimentaDB,
    obtenerVestimentaIdDB,
    editarVestimentaDB
}