const { Op } = require('sequelize')

//MODELOS
const Documento = require('../../../modelos/sist_doc_cliente/Doc_cliente')
const Doc_subida = require('../../../modelos/sist_doc_cliente/Doc_subido');
const Carpeta_padre = require('../../../modelos/sist_doc_cliente/Carpeta_padre')

const crearDocumentoDB = async(documento) => {
    let respuesta = await Documento.create(documento)
    return respuesta
}

const aumentarCantDocumentoCarpetaDB = async(id_cliente) => {
    let respuesta = await Carpeta_padre.increment('cant_documento',{by:1,where:{clienteId:id_cliente}})
    return respuesta
}

const crearDocSubidaDB = async(docSubida) => {
    let respuesta = await Doc_subida.create(docSubida)
    return respuesta
}

const busquedaDocumentosDB = async(id_carpeta,busca) => {
    let respuesta = await Documento.findAll({where:{
        carpetaId:id_carpeta,
        [Op.or]:[
            {  nombre:{
                [Op.like]:'%'+ busca +'%'
                }
            },
            { fecha:{
                [Op.like]:'%'+ busca +'%'
                }
            }
        ]
    }})
    return respuesta
}

const obtenerDocumentosDB = async(id_carpeta) => {
    let respuesta = await Documento.findAll({where:{carpetaId:id_carpeta}})
    return respuesta
}

const eliminarDocumentoDB = async(id_documento) => {
    let respuesta = await Documento.destroy({where:{id:id_documento}})
    return respuesta
}

const disminuirCantDocumentoCarpetaDB = async(id_cliente) => {
    let respuesta = await Carpeta_padre.decrement('cant_documento',{by:1,where:{clienteId:id_cliente}})
    return respuesta
}

module.exports = {
    crearDocumentoDB,
    aumentarCantDocumentoCarpetaDB,
    crearDocSubidaDB,
    busquedaDocumentosDB,
    obtenerDocumentosDB,
    eliminarDocumentoDB,
    disminuirCantDocumentoCarpetaDB,
}