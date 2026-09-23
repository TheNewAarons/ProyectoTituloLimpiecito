const Dia = require('../../../modelos/sist_app/Dia')

const crearDiasDB = async (dia) => {
    let respuesta = Dia.create(dia);
    return respuesta;
}

module.exports = {
    crearDiasDB
}

