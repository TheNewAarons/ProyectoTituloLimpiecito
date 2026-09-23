//MODELOS
const Reserva = require('../../../modelos/sist_app/Reserva');
const Servicio = require('../../../modelos/sist_app/Servicio');
const Usuario = require('../../../modelos/sist_app/Usuario_app');
const Extra = require('../../../modelos/sist_app/Extra');
const Extra_lavado = require('../../../modelos/sist_app/Extra_lavado');

const Observacion = require('../../../modelos/sist_app/Observacion');
const Categoria_servicio = require('../../../modelos/sist_app/Categoria_servicio');

Reserva.belongsTo(Servicio);
Reserva.belongsTo(Usuario);
Reserva.hasOne(Extra);
Reserva.hasOne(Extra_lavado);
Reserva.hasMany(Observacion);

/**  ESTADOS DE RESERVA
 *   1 = FINALIZADO
 *   2 = APROBADO
 *   3 = EN PROCESO
 *   4 = RECHAZADO
 */

const obtenerReservaProcesoDB = async(id_cate) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }, { model: Usuario, attributes: ['nombre','celular'] }],
        where: { estado: 3, "$servicio.categoriaServicioId$": id_cate },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

const obtenerReservaAprobadaDB = async(id_cate) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
        where: { estado: 2, "$servicio.categoriaServicioId$": id_cate },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

const obtenerReservaFinalizadaDB = async(id_cate) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
        where: { estado: 1, "$servicio.categoriaServicioId$": id_cate },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

const obtenerReservaRechazadaDB = async(id_cate) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
        where: { estado: 4, "$servicio.categoriaServicioId$": id_cate },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

const obtenerReservaIdDB = async(id) => {
    let respuesta = await Reserva.findById(id, {
        include: [{ model: Servicio,include:[Categoria_servicio] }, { model: Extra }, { model: Extra_lavado }, { model: Observacion }, { model: Usuario }]
      })
    return respuesta
}

const obtenerUsuarioIdDB = async(id) => {
    let respuesta = await Usuario.findById(id)
    return respuesta
}

const obtenerServicioIdDB = async(id) => {
    let respuesta = await Servicio.findById(id)
    return respuesta
}

const aprobarReservaDB = async(id) => {
    let respuesta = await Reserva.update({ estado: 2 }, { where: { id } })
    return respuesta
}

const rechazarReservaDB = async(id) => {
    let respuesta = await Reserva.update({ estado: 4 }, { where: { id } })
    return respuesta
}

const finalizarReservaDB = async(id) => {
    let respuesta = await Reserva.update({ estado: 1,pagado:true }, { where: { id } })
    return respuesta
}

const obtenerReservaUsuarioEstadoDB = async(id_usuario,estado) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }],
        where: { estado, usuarioAppId: id_usuario },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

const obtenerReservaUsuarioDB = async(id_usuario) => {
    let respuesta = await Reserva.findAll({
        include: [{ model: Servicio }],
        where: {usuarioAppId: id_usuario },
        order: [['fecha_reserva', 'ASC']]
      })
    return respuesta
}

module.exports = {
    obtenerReservaProcesoDB,
    obtenerReservaAprobadaDB,
    obtenerReservaFinalizadaDB,
    obtenerReservaRechazadaDB,
    obtenerReservaIdDB,
    obtenerUsuarioIdDB,
    obtenerServicioIdDB,
    aprobarReservaDB,
    rechazarReservaDB,
    finalizarReservaDB,
    obtenerReservaUsuarioEstadoDB,
    obtenerReservaUsuarioDB
}