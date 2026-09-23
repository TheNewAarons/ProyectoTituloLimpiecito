const Usuario = require('../../../modelos/sistema_base/Usuario')

process.env.SECRET_KEY = 'secretazoAdmin1234'

const buscarUsuarioCorreoDB = async(correo) => {
    let respuesta = await Usuario.findOne({where:{correo}});
    return respuesta
}

const buscarUsuarioCorreoPassDB = async(correo,pass) => {
    let respuesta = await Usuario.findOne({where:{correo,password:pass}})
    return respuesta
}

const cambiarPassUsuarioDB = async(id,pass) => {
    let respuesta = await Usuario.update({password:pass},{where:{id}})
    return respuesta
}

module.exports = {
    buscarUsuarioCorreoDB,
    buscarUsuarioCorreoPassDB,
    cambiarPassUsuarioDB
}