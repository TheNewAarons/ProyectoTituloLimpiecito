//MODELOS
const Horario = require('../../../modelos/sist_app/Horario');
const Bloque = require('../../../modelos/sist_app/Bloque');
const Dia = require('../../../modelos/sist_app/Dia')

//ASOCIACIONES
Dia.hasMany(Bloque)

const crearDiasDB = async (dia) => {
    let respuesta = await Dia.create(dia);
    return respuesta;
}

const crearHorarioDB = async(horario) => {
    let respuesta = await Horario.create(horario)
    return respuesta
}

const editarHorarioDB = async(horario,id) => {
    let respuesta = await horario.update(horario,{where:{id}})
    return respuesta
}

const obtenerHorarioSinBloqueDB = async(id) => {
    let respuesta = await Horario.findById(id)
    return respuesta
}

const desactivarHorarioDB = async(id) => {
    let respuesta = await Horario.update({estado:0},{where:{id}})
    return respuesta
}
const activarHorarioDB = async(id) => {
    let respuesta = await Horario.update({estado:1},{where:{id}})
    return respuesta
}

const obtenerDiaConBloqueDB = async(id) => {
    let respuesta = await Dia.findById(id,{ include:[{model:Bloque}]})
    return respuesta
}

const desactivarDiaDB = async(id) => {
    let respuesta = await Dia.update({estado:false},{where:{id}})
    return respuesta
}

const activarDiaDB = async(id) => {
    let respuesta = await Dia.update({estado:false},{where:{id}})
    return respuesta
}

const desactivarBloqueDB = async(idDia) => {
    let respuesta = await Bloque.update({activo:false},{where:{diaId:idDia}})
    return respuesta
}

const activarBloqueDB = async(idDia) => {
    let respuesta = await Bloque.update({activo:true},{where:{diaId:idDia}})
    return respuesta
}

module.exports = {
    crearDiasDB,
    crearHorarioDB,
    editarHorarioDB,
    obtenerHorarioSinBloqueDB,
    desactivarHorarioDB,
    activarHorarioDB,
    obtenerDiaConBloqueDB,
    desactivarDiaDB,
    activarDiaDB,
    desactivarBloqueDB,
    activarBloqueDB
}