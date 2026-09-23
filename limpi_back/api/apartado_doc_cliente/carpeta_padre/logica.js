const Carpeta_padre = require('../../../modelos/sist_doc_cliente/Carpeta_padre')

const crearCarpetaPadreDB = async(carpeta_padre) => {
    let respuesta = await Carpeta_padre.create(carpeta_padre)
    return respuesta
}

module.exports = {
    crearCarpetaPadreDB
}