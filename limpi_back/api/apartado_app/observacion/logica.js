//MODELOS
const Observacion = require('../../modelos/sist_app/Observacion');

const crearObservacionDB = async(observacion) => {
    let respuesta = await Observacion.create(observacion)
    return respuesta
}

module.exports ={
    crearObservacionDB
}