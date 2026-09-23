const Carpeta = require('../../../modelos/sist_doc_cliente/Carpeta');
const Documento = require('../../../modelos/sist_doc_cliente/Doc_cliente');

const crearCarpetaDB = async (carpeta) => {
    let respuesta = await Carpeta.create(carpeta)
    return respuesta
};

const obtenerSubCarpetasDB = async (id_padre) => {
    let respuesta = await Carpeta.findAll({where:{padreId:id_padre}})
    return respuesta
};

const obtenerCarpetasIdCarpetaPadreDB = async(id_carpeta_padre) => {
  let respuesta = await Carpeta.findAll({where:{ carpetaPadreId: id_carpeta_padre }})
  return respuesta
}

const obtenerDocumentosIdCarpetaPadreDB = async(id_carpeta_padre) => {
  let respuesta = await Documento.findAll({where:{carpetaId:id_carpeta_padre}})
  return respuesta
}

const eliminarCarpetaDB = async(id_carpeta) => {
  let respuesta = await Carpeta.destroy({where:{id:id_carpeta}})
}


module.exports = {
  crearCarpetaDB,
  obtenerSubCarpetasDB,
  obtenerDocumentosIdCarpetaPadreDB,
  obtenerCarpetasIdCarpetaPadreDB,
  eliminarCarpetaDB
};
