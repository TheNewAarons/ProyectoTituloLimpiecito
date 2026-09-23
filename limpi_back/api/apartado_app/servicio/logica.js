//MODELOS
const Servicio = require('../../modelos/sist_app/Servicio');
const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');
//DEFINICION DE ASOCIACIONES
Servicio.belongsTo(Cate_servicio);

const buscarServicioNombreDB = async(nombre) => {
    let respuesta = await Servicio.findOne({where:{nombre}})
    return respuesta
}

const crearServicioDB = async(servicio) => {
    let respuesta = await Servicio.create(servicio)
    return respuesta
}

const buscarServicioIdDB = async(id) => {
    let respuesta = await Servicio.findById(id)
    return respuesta
}

const editarServicioDB = async(servicio,id) => {
    let respuesta = await Servicio.update(servicio,{where:{id}})
    return respuesta
}

const desactivarServicioDB = async(id) => {
    let respuesta = await Servicio.update({estado:0},{where:{id}})
    return respuesta
}

const activarServicioDB = async(id) => {
    let respuesta = await Servicio.update({estado:1},{where:{id}})
    return respuesta
}

const obtenerServiciosActivosDB = async() => {
    let respuesta = await Servicio.findAll({where:{estado:1}})
    return respuesta
}

const obtenerServiciosInactivosDB = async() => {
    let respuesta = await Servicio.findAll({where:{estado:0}})
    return respuesta
}

module.exports = {
    buscarServicioNombreDB,
    crearServicioDB,
    buscarServicioIdDB,
    editarServicioDB,
    desactivarServicioDB,
    activarServicioDB,
    obtenerServiciosActivosDB,
    obtenerServiciosInactivosDB
}