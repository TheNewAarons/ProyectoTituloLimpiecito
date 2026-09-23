const Checkeo = require('../../../modelos/apartado_cronograma/checkeos')

const crearCheckeoDB = async(checkeo) => {
    let respuesta = await Checkeo.create(checkeo)
    return respuesta
}

const editarCheckeoDB = async(id,checkeo) => {
    let respuesta = await Checkeo.update(checkeo,{where:{id}})
    return respuesta
}

const eliminarChekeoDB = async(id) => {
    let respuesta = await Checkeo.destroy({where:{id}})
    return respuesta
}

module.exports = {
    crearCheckeoDB,
    editarCheckeoDB,
    eliminarChekeoDB

}