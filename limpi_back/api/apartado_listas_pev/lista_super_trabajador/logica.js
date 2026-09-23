const ListasSuperTrabajadores = require('../../../modelos/apartado_listas_pev/listaSuperTrabajador')
const LineaListasSuperTrabajadores = require('../../../modelos/apartado_listas_pev/lineaSuperTrabajador')
const ListaPevTrabajador = require('../../../modelos/apartado_listas_pev/listaPevTrabajador')
const Cronograma = require('../../../modelos/apartado_cronograma/Cronograma')

const Trabajador = require('../../../modelos/sistema_base/Trabajadore')
const AccesoLaboral = require('../../../modelos/sistema_intranet/acceso_laboral')

Trabajador.hasOne(AccesoLaboral)

const sequelize_listas_Super_trabajador = ListasSuperTrabajadores.sequelize

const Tareas = require('../../../modelos/apartado_listas_pev/tarea');
const Areas = require('../../../modelos/apartado_listas_pev/area');
const Sectores = require('../../../modelos/apartado_listas_pev/sector');

ListasSuperTrabajadores.hasMany(LineaListasSuperTrabajadores)
LineaListasSuperTrabajadores.belongsTo(Tareas)


const crearListasSuperTrabajadorDB = async(listasPevTrabajadoreId,n_empleado,tareas) => {
    listasPevTrabajadoreId = parseInt(listasPevTrabajadoreId)
    let id_lista_super_trabajador
    let date = new Date()
    await sequelize_listas_Super_trabajador.transaction(async(t) => {
        id_lista_super_trabajador = await ListasSuperTrabajadores.create({
            estado:1,
            fecha_creacion: date,
            fecha_firma:null,
            n_empleado,
            listasPevTrabajadoreId
        },{transaction:t}).then( function (x){return x.id})

        for(let index = 0; index < tareas.length; index++){
            await LineaListasSuperTrabajadores.create({
                hora_1:null,
                despolvado_1:0,
                aplicacion_producto_1:0,
                abrillantado_1:0,
                hora_2:null,
                despolvado_2:0,
                aplicacion_producto_2:0,
                abrillantado_2:0,
                hora_3:null,
                despolvado_3:0,
                aplicacion_producto_3:0,
                abrillantado_3:0,
                observaciones:null,
                listasSuperTrabajadoreId:id_lista_super_trabajador,
                tareaId:tareas[index].tareaId
            },{transaction:t})
        }
    })
    return id_lista_super_trabajador;
}

const obtenerListasSuperTrabajadorConLineasDB = async(id) => {
    id = parseInt(id)
    const respuesta = await ListasSuperTrabajadores.findOne({
        include:[
            {model:ListaPevTrabajador,as:'listasPevTrabajadore', attributes:['id','cronogramaId']},{
            model:LineaListasSuperTrabajadores,
            include:{
                model: Tareas,
                include:{
                    model:Areas,
                    include:{
                        model:Sectores
                    }
                }
            }
        }],
        where:{id},
    })
    return respuesta
}

//Obtener estado cronograma
const obtenerEstadoCronogramaDB = async(cronogramaId) => {
    cronogramaId = parseInt(cronogramaId)
    const respuesta = await Cronograma.findOne({attributes:['id','estado'],where:{id:cronogramaId}})
    return respuesta
}

const actualizarLineaListaSuperTrabajadorDB = async(id,linea_lista_super) => {
    id = parseInt(id)
    const respuesta = await LineaListasSuperTrabajadores.update(
        linea_lista_super,{where:{id}}
    )
    return respuesta
}

const cambiarEstadoDB = async(id,lista_super) => {
    id  = parseInt(id)
    lista_super.estado = parseInt(lista_super.estado)
    const respuesta = await ListasSuperTrabajadores.update({
        estado:lista_super.estado,
        fecha_firma:lista_super.fecha_firma},
        {where:{id}}
    )
    return respuesta
}

const obtenerTrabajadorSupervisorDB = async() => {
    const respuesta = await Trabajador.findAll({
        attributes:['nombre','apellido','n_empleado','id','rut'],
        include:{
            model:AccesoLaboral,
            required:true,
            where:{tipo:1}
        }
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
    crearListasSuperTrabajadorDB,
    obtenerListasSuperTrabajadorConLineasDB,
    actualizarLineaListaSuperTrabajadorDB,
    cambiarEstadoDB,
    obtenerTrabajadorSupervisorDB,
    obtenerTrabajadorDB,
    obtenerEstadoCronogramaDB
}