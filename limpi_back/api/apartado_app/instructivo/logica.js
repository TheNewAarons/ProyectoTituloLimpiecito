const Instructivo = require('../../modelos/sist_app/Instructivo')

const crearInstructivoDB = async(instructivo) => {
    let respuesta = await Instructivo.create(instructivo)
    return respuesta
}

const editarInstructivoDB = async(instructivo,id) => {
    let respuesta = await Instructivo.update(instructivo,{where:{id}})
    return respuesta
}

const obtenerInstructivoIdDB = async(id) => {
    let respuesta = await Instructivo.findById(id)
    return respuesta
}

const obtenerInstructivosDB = async() => {
    let respuesta = await Instructivo.findAll()
    return respuesta
}

const eliminarInstructivoDB = async(id) => {
    let respuesta = await Instructivo.destroy({where:{id}})
    return respuesta
}

module.exports = {
    crearInstructivoDB,
    editarInstructivoDB,
    obtenerInstructivoIdDB,
    obtenerInstructivosDB,
    eliminarInstructivoDB
}