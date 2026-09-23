//MODELOS
const Bloque = require('../../../modelos/sist_app/Bloque');

//PARA REALIZAR TRANSACCIONES
const sequelize_bloque = Bloque.sequelize;

const crearBloquesDB = async(bloque,t) => {
    let respuesta = await Bloque.create(bloque,{transaction:t})
    return respuesta
}

const eliminarBloqueDB = async(id,t) => {
    let respuesta = await Bloque.destroy({where:{id}},{transaction:t})
    return respuesta
}

const desactivarBloqueDB = async(id) => {
    let respuesta = await Bloque.update({activo:false},{where:{id}})
    return respuesta
}

const activarBloqueDB = async(id) => {
    let respuesta = await Bloque.update({activo:true},{where:{id}})
    return respuesta
}

module.exports = {
    crearBloquesDB,
    eliminarBloqueDB,
    desactivarBloqueDB,
    activarBloqueDB
}