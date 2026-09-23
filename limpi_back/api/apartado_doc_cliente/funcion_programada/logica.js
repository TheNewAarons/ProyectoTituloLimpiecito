//MODELOS
const Acceso_cliente = require('../../../modelos/sistema_base/Acceso_cliente');
const Doc_subida = require('../../../modelos/sist_doc_cliente/Doc_subido');

const obtenerDocSubidaPorFechaDB = async(fecha) => {
    let respuesta = await Doc_subida.findAll({where:{fecha}})
    return respuesta
}

const obtenerClientesDB = async() => {
    let respuesta = await Doc_subida.aggregate('clienteId','DISTINCT',{plain:false})
    return respuesta
}

const obtenerAccesosDB = async(id_cliente) => {
    let respuesta = await Acceso_cliente.findAll({where:{clienteId:id_cliente}})
    return respuesta
}

const obtenerDocSubidaFechaClienteDB = async(fecha,id_cliente) => {
    let respuesta = await Doc_subida.findAll({where:{fecha,clienteId:id_cliente}})
    return respuesta
}

const limpiarDocSubidaDB = async() => {
    await Doc_subida.destroy({truncate:true})
}

module.exports = {
    obtenerDocSubidaPorFechaDB,
    obtenerClientesDB,
    obtenerAccesosDB,
    obtenerDocSubidaFechaClienteDB,
    limpiarDocSubidaDB
}