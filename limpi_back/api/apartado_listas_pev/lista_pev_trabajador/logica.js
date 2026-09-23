const db  = require('../../../database/database');
// const ListasPevTrabajadores = require('../../../modelos/apartado_listas_pev/listaPevTrabajador')
// const LineaListasPevTrabajadores = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador')
const LineasCronograma = require('../../../modelos/apartado_cronograma/Linea_cronograma')
const LineaListaPevTrabajador = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador');
const ListaPevTrabajador = require('../../../modelos/apartado_listas_pev/listaPevTrabajador');
const CentroCostoTrabajadores = require('../../../modelos/sistema_base/Centro_costo_trabajadore')
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo')
const LineaCronograma = require('../../../modelos/apartado_cronograma/Linea_cronograma')

const Trabajador = require('../../../modelos/sistema_base/Trabajadore')

const TrabajadorCronograma = require('../../../modelos/apartado_listas_pev/trabajadorCronograma')
const sequelize_trabajador_cronograma = TrabajadorCronograma.sequelize
const sequelize_listas_pev_trabajador = ListaPevTrabajador.sequelize
const Tareas = require('../../../modelos/apartado_listas_pev/tarea');
const Areas = require('../../../modelos/apartado_listas_pev/area');
const Sectores = require('../../../modelos/apartado_listas_pev/sector');

const Cronograma = require('../../../modelos/apartado_cronograma/Cronograma')



const ListaSupervisor = require('../../../modelos/apartado_listas_pev/listaSuperTrabajador')
//const sequelize = require('sequelize');

TrabajadorCronograma.belongsTo(Trabajador)
CentroCostoTrabajadores.belongsTo(Trabajador)
ListaPevTrabajador.hasMany(LineaListaPevTrabajador)

Tareas.hasOne(LineaListaPevTrabajador)
Tareas.belongsTo(Areas)
Areas.belongsTo(Sectores)
LineaListaPevTrabajador.belongsTo(Tareas)
LineaCronograma.belongsTo(Tareas)
//LineaListasPevTrabajadores.hasOne(Tareas)
//LineaListasPevTrabajadores.belongsTo(Tareas)
ListaPevTrabajador.hasOne(ListaSupervisor)

const obtenerCentroCostoActivoClienteDB = async (clienteId) => {
    const respuesta = await CentroCosto.findOne({
        where: {clienteId,estado:1},
        attributes:['id']
    })
    return respuesta
}

const obtenerTrabajadoresCentrodeCostoClienteDB = async (centroCostoId) => {
    const respuesta = await CentroCostoTrabajadores.findAll({
        where: {centroCostoId},
        //attributes:['trabajadoreId']
    })
    return respuesta
}

const obtenerTrabajadoresCompletoCentrodeCostoClienteDB = async (centroCostoId) => {
    const respuesta = await CentroCostoTrabajadores.findAll({
        where: {centroCostoId},
        include:{
            model: Trabajador,
            attributes:['nombre','apellido','rut','correo']
        }
        //attributes:['trabajadoreId']
    })
    return respuesta
}

const AsociarTrabajadoresCronogramaDB = async (cronogramaId,trabajadores) => {
    cronogramaId = parseInt(cronogramaId)
    await sequelize_trabajador_cronograma.transaction(async(t) => {
        for(let index = 0; index < trabajadores.length; index++){
            await TrabajadorCronograma.create({
                cronogramaId,
                trabajadoreId: trabajadores[index].trabajadoreId,
            },{transaction:t})
        }
        });
    return true
}

//Buscar todas las tareas asociadas al cronograma en linea cronogamas
const obtenerTareasAsociadasAlCronogramaDB = async (cronogramaId) => {
    const respuesta = await LineaCronograma.findAll({
        where: {cronogramaId},
        include:{
            model:Tareas,
            include:{
                model:Areas,
                include: Sectores
            }
        },
        attributes:['tareaId']
    })
    return respuesta
}
//Tareas sin areas ni sectores
const obtenerTareasNormalCronogramaDB = async (cronogramaId) => {
    const respuesta = await LineaCronograma.findAll({
        where: {cronogramaId},
        include:{
            model:Tareas,
        },
        attributes:['tareaId']
    })
    return respuesta
}

//Buscar todas las tareas asociadas al cronograma en linea cronogamas
const contrarTareasAsociadasAlCronogramaDB = async (cronogramaId) => {
    const respuesta = await LineaCronograma.count({
        where: {cronogramaId},
    })
    return respuesta
}
const crearListasPevTrabajadorDB = async (cronogramaId,n_empleado,sectoreId,fecha_chequeo,tareas) => {
    cronogramaId = parseInt(cronogramaId)
    let id_lista_pev_trabajador;
    let date = new Date();
    await sequelize_listas_pev_trabajador.transaction(async(t) => {
        id_lista_pev_trabajador = await ListaPevTrabajador.create({
            estado:1,
            fecha_creacion:date,
            fecha_firma:null,
            fecha_chequeo,
            n_empleado:n_empleado,
            cronogramaId:cronogramaId,
            sectoreId
        },{transaction:t}).then( function (x){return x.id})

        for(let index = 0; index < tareas.length; index++){
            await LineaListaPevTrabajador.create({
                check_trabajador_1: 0,
                hora_check_trabajador_1:null,
                check_trabajador_2: 0,
                hora_check_trabajador_2:null,
                check_trabajador_3: 0,
                hora_check_trabajador_3:null,
                observaciones:null,
                listasPevTrabajadoreId: id_lista_pev_trabajador,
                tareaId:tareas[index].tareaId
            },{transaction:t})
        }
        });
    return id_lista_pev_trabajador;
}

const obtenerTareasCronogramaDB = async (cronogramaId) => {
    cronogramaId = parseInt(cronogramaId)
    const respuesta = await LineasCronograma.findAll({
        where: {cronogramaId}
    })
    return respuesta
}
//Obtener todas las listas pev de iun cronograma
const obtenerListasPevTrabajadorPorCronogramaDB = async (cronogramaId) => {
    cronogramaId = parseInt(cronogramaId)
    const respuesta = await ListaPevTrabajador.findAll({
        where: {cronogramaId}
    })
    return respuesta
}
//Obtener todas las listas pev de un trabajador de un cronograma
const obtenerListasPevTrabajadorDB = async (cronogramaId,n_empleado) => {
    cronogramaId = parseInt(cronogramaId);
    n_empleado = parseInt(n_empleado);
    const respuesta = await ListaPevTrabajador.findAll({
        include:{model:ListaSupervisor},
        where: {cronogramaId,n_empleado}
    })
    return respuesta
}
const obtenerListasPevTrabajadorConLineasPevPorCronogramaDB = async (id) => {
    id = parseInt(id)
    const respuesta = await ListaPevTrabajador.findOne({
        where: {id},
        include:{
            model:LineaListaPevTrabajador,
            include:{
                model: Tareas,
                include:{
                    model:Areas,
                    include:{model:Sectores}
                }
            }
        }
    })
    return respuesta
}
//Obtener trabajadores asociados a un cronograma
const obtenerTrabajadoresCronogramaDB = async (cronogramaId) => {
    cronogramaId = parseInt(cronogramaId)
    const respuesta = await TrabajadorCronograma.findAll({
        where: {cronogramaId},
        include:{
            model:Trabajador,
            attributes:['id','nombre','apellido','n_empleado']
        }
    })
    return respuesta
}

//Obtener estado cronograma
const obtenerEstadoCronogramaDB = async(cronogramaId) => {
    cronogramaId = parseInt(cronogramaId)
    const respuesta = await Cronograma.findOne({attributes:['id','estado'],where:{id:cronogramaId}})
    return respuesta
}

//DESACTIVAR O ACTIVAR AREA
const cambiarEstadoListaPevTrabajadorDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await ListaPevTrabajador.update({ estado }, { where: { id } })
    return respuesta
}
//Obtener trabajadpres no asociados al cronograma pero si asociados al centro costo
const obtenerTrabajadoresNoAsociadosAlCronogramaDB = async (centroCostoId, cronogramaId) => {
    centroCostoId = parseInt(centroCostoId)
    cronogramaId = parseInt(cronogramaId)
    let trabajadores_centro_costo  = await CentroCostoTrabajadores.findAll({
        include:{model:Trabajador},
        where:{centroCostoId}})
    let trabajador_cronograma = await TrabajadorCronograma.findAll({where:{cronogramaId}})
    return {
        trabajadores_centro_costo,
        trabajador_cronograma
    }
}

//Obtener trabajador por N° empleado
const obtenerTrabajadorPorNumeroEmpleadoDB = async (n_empleado) => {
    n_empleado = parseInt(n_empleado)
    const respuesta = await Trabajador.findOne({
        where: {n_empleado},
        //attributes:['trabajadoreId']
    })
    return respuesta
}
//Actualizar Linea Lista Pev Trabajador
const actualizarLineaListaPevTrabajadorDB = async (id,linea_lista_pev) => {
    id = parseInt(id)
    const respuesta = await LineaListaPevTrabajador.update(
        linea_lista_pev,{where: {id},}
    )
    return respuesta
}
//finalizar Lista PEV
const cambiarEstadoDB = async (id,lista_pev) => {
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

const eliminarTrabajadorCronogramaDB = async(id) => {
    id = parseInt(id)
    const respuesta = await TrabajadorCronograma.destroy({where:{id}})
    return respuesta
}

const obtenerExisteListaPevTrabajadorDB = async(n_empleado) => {
    n_empleado = parseInt(n_empleado)
    const respuesta = await ListaPevTrabajador.findOne({where:{n_empleado}})
    return respuesta
}

module.exports = {
    obtenerCentroCostoActivoClienteDB,
    obtenerTrabajadoresCentrodeCostoClienteDB,
    obtenerTrabajadoresCompletoCentrodeCostoClienteDB,
    AsociarTrabajadoresCronogramaDB,
    obtenerTareasAsociadasAlCronogramaDB,
    contrarTareasAsociadasAlCronogramaDB,
    crearListasPevTrabajadorDB,
    obtenerTareasCronogramaDB,
    obtenerListasPevTrabajadorPorCronogramaDB,
    obtenerListasPevTrabajadorDB,
    obtenerListasPevTrabajadorConLineasPevPorCronogramaDB,
    cambiarEstadoListaPevTrabajadorDB,
    obtenerTrabajadoresCronogramaDB,
    obtenerTareasNormalCronogramaDB,
    obtenerTrabajadoresNoAsociadosAlCronogramaDB,
    obtenerTrabajadorPorNumeroEmpleadoDB,
    actualizarLineaListaPevTrabajadorDB,
    cambiarEstadoDB,
    eliminarTrabajadorCronogramaDB,
    obtenerExisteListaPevTrabajadorDB,
    obtenerEstadoCronogramaDB
}