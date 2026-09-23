const Trabajador_cronograma = require('../../../modelos/apartado_listas_pev/trabajadorCronograma')
const Cronograma = require('../../../modelos/apartado_cronograma/Cronograma')
const Turno = require('../../../modelos/apartado_listas_pev/turno')
const Cliente = require('../../../modelos/sistema_base/Cliente')
const Sector = require('../../../modelos/apartado_listas_pev/sector')
const Area = require('../../../modelos/apartado_listas_pev/area')
const ListaPevTrabajador = require('../../../modelos/apartado_listas_pev/listaPevTrabajador')
const ListaSupervisor = require('../../../modelos/apartado_listas_pev/listaSuperTrabajador')
const LineaSupervisor = require('../../../modelos/apartado_listas_pev/lineaSuperTrabajador')
const LineaPev = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador')
const Tarea = require('../../../modelos/apartado_listas_pev/tarea')
const LineaCronograma = require('../../../modelos/apartado_cronograma/Linea_cronograma')
const Checkeo = require('../../../modelos/apartado_cronograma/checkeos')
const Trabajador = require('../../../modelos/sistema_base/Trabajadore')

const { Op } = require("sequelize");

Cronograma.hasMany(Trabajador_cronograma)
Trabajador_cronograma.belongsTo(Cronograma)
ListaPevTrabajador.belongsTo(Sector)
ListaSupervisor.belongsTo(ListaPevTrabajador,{as:'listasPevTrabajadore'})
ListaPevTrabajador.hasOne(ListaSupervisor)
ListaSupervisor.hasMany(LineaSupervisor)
ListaPevTrabajador.hasMany(LineaPev)
ListaPevTrabajador.belongsTo(Cronograma,{as:'cronograma'})

const obtenerClientesDB = async(id_trabajador) => {
    let respuesta = await Trabajador_cronograma.findAll({
        include:[
            {   model:Cronograma,
                include:[{model:Turno},{model:Cliente,as:'cliente'}]
            }
        ],
        where:{trabajadoreId:id_trabajador}
    })
    return respuesta
}

const obtenerListasPevTrabajadorDB = async(n_empleado,cronogramaId) => {
    let respuesta = await ListaPevTrabajador.findAll({
        include:{model:Sector},
        where:{
            n_empleado,
            cronogramaId,
            estado:1
        }
    })
    return respuesta
}

const obtenerListaPevTrabajadorDB = async(id) => {
    let respuesta = await ListaPevTrabajador.findOne({
        include:[{model:LineaPev,
            include:{model:Tarea,include:{model:Area,include:{model:Sector}}}
        },{model:Cronograma,as:'cronograma',include:{model:Turno}}],
        where:{id}
    })
    return respuesta
}
//Obtiene clientes por busqueda
const obtenerClientesParaSupervisorDB = async(n_empleado,search) => {
    let respuesta = await ListaSupervisor.findAll({
        include:{model:ListaPevTrabajador,as:'listasPevTrabajadore',
            include:[{model:Cronograma,as:'cronograma',
                    include:[{model:Cliente,as:'cliente',attributes:['id','representante']},{model:Turno}]},{model:Sector}]
        },
        where:{
            n_empleado,
            '$listasPevTrabajadore.cronograma.estado$':1,
            '$listasPevTrabajadore.cronograma.cliente.representante$':{[Op.like]:'%'+search+'%'}
        }
    })
    return respuesta
}

const obtenerListaSupervisorDB = async(id) => {
    let respuesta = await ListaSupervisor.findOne({
        include:[{model:LineaSupervisor,include:{model:Tarea,include:{model:Area,include:{model:Sector}}}},
        {model:ListaPevTrabajador,as:'listasPevTrabajadore',attributes:['fecha_chequeo'],include:{model:Cronograma,as:'cronograma',include:{model:Turno}}}],
        where:{id}
    })
    return respuesta
}

const actualizarLineaListaPevTrabajadorDB = async (id,linea_lista_pev) => {
    id = parseInt(id)
    const respuesta = await LineaPev.update(
        linea_lista_pev,{where: {id},}
    )
    return respuesta
}

const cambiarEstadoListaPevDB = async (id,lista_pev) => {
    id = parseInt(id)
    lista_pev.estado = parseInt(lista_pev.estado)
    const respuesta = await ListaPevTrabajador.update({
            estado:lista_pev.estado,
            fecha_firma:lista_pev.fecha_firma
        },
        {where: {id}}
    )
    return respuesta
}


const cambiarEstadoListaSupervisorDB = async(id,lista_super) => {
    id  = parseInt(id)
    lista_super.estado = parseInt(lista_super.estado)
    const respuesta = await ListaSupervisor.update({
        estado:lista_super.estado,
        fecha_firma:lista_super.fecha_firma},
        {where:{id}}
    )
    return respuesta
}

const actualizarLineaListaSuperTrabajadorDB = async(id,linea_lista_super) => {
    id = parseInt(id)
    const respuesta = await LineaSupervisor.update(
        linea_lista_super,{where:{id}}
    )
    return respuesta
}

const obtenerCronogramaIdDB = async(id) => {
    let respuesta = await Cronograma.findOne({
            include:[{
                model:LineaCronograma,
                include:[{model:Tarea,include:{model:Area,include:[Sector]}},{model:Checkeo}]
            },{
                model:Cliente,as:'cliente'
            }],
            where:{id}
        })
    return respuesta
}

const obtenerTrabajadorDB = async(n_empleado) => {
    const respuesta = await Trabajador.findOne({
        attributes:['nombre','apellido','n_empleado','correo','rut'],
        where:{n_empleado}})
    return respuesta
}


module.exports = {
    obtenerClientesDB,
    obtenerListasPevTrabajadorDB,
    obtenerListaPevTrabajadorDB,
    obtenerClientesParaSupervisorDB,
    obtenerListaSupervisorDB,
    actualizarLineaListaPevTrabajadorDB,
    cambiarEstadoListaPevDB,
    cambiarEstadoListaSupervisorDB,
    actualizarLineaListaSuperTrabajadorDB,
    obtenerCronogramaIdDB,
    obtenerTrabajadorDB
}
