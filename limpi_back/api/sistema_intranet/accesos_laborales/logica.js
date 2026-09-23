const AccesosLaborales = require('../../../modelos/sistema_intranet/acceso_laboral')
const Trabajadores = require('../../../modelos/sistema_base/Trabajadore')
const { parse } = require('uuid')
const bcrypt = require('bcryptjs');

AccesosLaborales.belongsTo(Trabajadores)

const crearAccesoLaboralDB = async (accesoLaboral) => {
    const hash = bcrypt.hashSync(accesoLaboral.password, 10);
    accesoLaboral.password = hash;

    let respuesta = await AccesosLaborales.create(accesoLaboral)
    return respuesta
}
const actualizarAccesoLaboralDB = async (id, accesoLaboral) => {
    id = parseInt(id);
    if(accesoLaboral.password){
        const hash = bcrypt.hashSync(accesoLaboral.password, 10);
        accesoLaboral.password = hash;
        let respuesta = await AccesosLaborales.update({
            correo:accesoLaboral.correo,
            password:accesoLaboral.password,
            tipo:accesoLaboral.tipo
            },{where:{id}})
        return respuesta
    }else{
        let respuesta = await AccesosLaborales.update({
            correo:accesoLaboral.correo,
            password:accesoLaboral.password,
            tipo:accesoLaboral.tipo
            },{where:{id}})
        return respuesta
    }

    // let respuesta = await AccesosLaborales.update({accesoLaboral},{where:{id}})
    // return respuesta
}
const obtenerAccesoLaboralPorIdTrabajadorDB = async (trabajadoreId) => {
    trabajadoreId = parseInt(trabajadoreId);
    let respuesta = await AccesosLaborales.findOne({
        where:{trabajadoreId}
    });
    return respuesta;
}

//DESACTIVAR O ACTIVAR Acceso Laboral
const cambiarEstadoAccesoLaboralDB = async (id, estado) => {
    estado = parseInt(estado)
    id = parseInt(id)
    let respuesta = await AccesosLaborales.update({ estado }, { where: { id } })
    return respuesta
}

const loginDB = async (correo) => {
    let respuesta = await AccesosLaborales.findOne({
        where:{correo, estado:1},
        include:[{
            model:Trabajadores,
            attributes:['id'] 
        }]
    });
    return respuesta;
}

const obtenerTrabajadorPorIdDB = async (id) => {
    id = parseInt(id)
    let respuesta = await Trabajadores.findOne({
        where:{id},
        attributes:['id','nombre','apellido','rut','telefono','estado','n_empleado']
    });
    return respuesta;
}

const existeAccesoLaboralDB = async (trabajadoreId) => {
    trabajadoreId = parseInt(trabajadoreId);
    let respuesta = await AccesosLaborales.findOne({
        where:{trabajadoreId}
    });
    return respuesta;
}


module.exports = {
    crearAccesoLaboralDB,
    actualizarAccesoLaboralDB,
    obtenerAccesoLaboralPorIdTrabajadorDB,
    cambiarEstadoAccesoLaboralDB,
    loginDB,
    obtenerTrabajadorPorIdDB,
    existeAccesoLaboralDB
}