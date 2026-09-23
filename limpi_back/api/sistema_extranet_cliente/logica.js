const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente')
const Carpeta = require('../../modelos/sist_doc_cliente/Carpeta')
const Carpeta_padre = require('../../modelos/sist_doc_cliente/Carpeta_padre')
const Documento = require('../../modelos/sist_doc_cliente/Doc_cliente')
const Doc_subida = require('../../modelos/sist_doc_cliente/Doc_subido')
const Cronograma = require('../../modelos/apartado_cronograma/Cronograma')
const Linea_cronograma = require('../../modelos/apartado_cronograma/Linea_cronograma')
const Sector = require('../../modelos/apartado_listas_pev/sector')
const Area = require('../../modelos/apartado_listas_pev/area')
const Tarea = require('../../modelos/apartado_listas_pev/tarea')
const Checkeo = require('../../modelos/apartado_cronograma/checkeos')
const Turno = require('../../modelos/apartado_listas_pev/turno')

const Sequelize = require('sequelize');
const Op = Sequelize.Op;


process.env.SECRET_KEY = '89434abc3444limpi904384dsadDASdasdsa';

const obtenerAccesoClientePorCorreoDB = async(correo) => {
    let respuesta = await Acceso_cliente.findOne({where:{correo}})
    return respuesta
}

const obtenerCarpetaPadrePorClienteDB = async(clienteId) => {
    let respuesta = await Carpeta_padre.findOne({where:{clienteId}})
    return respuesta
}

const obtenerCarpetasPorCarpetaPadreDB = async(padreId) => {
    let respuesta = await Carpeta.findAll({where:{padreId}})
    return respuesta
}

const obtenerDocumentosCarpetaPadreIdDB = async(id_carpeta_padre) => {
    let respuesta = await Documento.findAll({where:{carpetaId:id_carpeta_padre}})
    return respuesta
}

const obtenerCarpetasPorCarpetaIdDB = async(id_carpeta_padre) => {
    let respuesta = await Carpeta.findAll({where:{carpetaPadreId:id_carpeta_padre}})
    return respuesta
}

const buscarEnDocumentosDB = async(id_carpeta,busca) => {
    let respuesta = await Documento.findAll({
        where:{
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

const obtenerDocumentosubidaPorClienteDB = async(clienteId,fecha) => {
    let respuesta = await Doc_subida.findOne({where:{clienteId,fecha}})
    return respuesta
}

const obtenerDocumentosSubidosPorClienteDB = async(primer_dia_semana,ultimo_dia_semana,clienteId) => {
    let respuesta = await Doc_subida.findAll({where:{
        fecha:{
            [Op.gte]:primer_dia_semana,
            [Op.lte]:ultimo_dia_semana,
        },
        clienteId
    }})
    return respuesta
}

const obtenerCronogramasPorClienteDB = async(clienteId) => {
    let respuesta = await Cronograma.findAll({
        include:{model:Turno},
        where:{clienteId,estado:1}})
    return respuesta
}

const obtenerCronogramaDB =  async(id) => {
    let respuesta = await Cronograma.findOne({
        include:[{
            model:Linea_cronograma,
            include:[{model:Tarea,include:{model:Area,include:[Sector]}},{model:Checkeo}]
        },{
            model:Turno
        }],
        where:{id}})
    return respuesta
}


module.exports = {
    obtenerAccesoClientePorCorreoDB,
    obtenerCarpetaPadrePorClienteDB,
    obtenerCarpetasPorCarpetaPadreDB,
    obtenerDocumentosCarpetaPadreIdDB,
    obtenerCarpetasPorCarpetaIdDB,
    buscarEnDocumentosDB,
    obtenerDocumentosubidaPorClienteDB,
    obtenerDocumentosSubidosPorClienteDB,
    obtenerCronogramasPorClienteDB,
    obtenerCronogramaDB

}