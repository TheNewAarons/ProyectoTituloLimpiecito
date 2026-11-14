const Op = require('sequelize').Op;
const { EGRESO_ANULADO } = require('../../../services/constantes');
const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');
const Caja = require('../../../modelos/sistema_base/Caja');
const Centro = require('../../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../../modelos/sistema_base/Cliente');
const CentroTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const Trabajador = require('../../../modelos/sistema_base/Trabajadore');
const Lista_insumo = require('../../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../../modelos/sistema_base/Linea_insumo');
const Producto = require('../../../modelos/sistema_base/Producto');
const Ccegreso = require('../../../modelos/sistema_base/CcEgreso');
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const Egresogeneral = require('../../../modelos/sistema_base/Egreso');

//RELACIONES 1-1 *-* 1-*
Caja.hasMany(Centro);
Centro.hasMany(CentroTrabajador);
CentroTrabajador.belongsTo(Trabajador);

CentroTrabajador.belongsTo(Liquidacion);
Centro.hasMany(Lista_insumo);
Centro.hasMany(Ccegreso);
Lista_insumo.hasMany(Linea_insumo);
Linea_insumo.belongsTo(Producto);

const crearCajaDB = async(caja, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const creada = await Caja.create(caja, { transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cajas',
            entidad_id: creada.id,
            accion: 'CREAR',
            despues: creada,
            motivo,
            ip: contexto.ip
        })
        return creada
    })
}

const editarCajaDB = async(id, caja, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const existente = await Caja.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (!existente) {
            return Caja.update(caja, { where: { id }, transaction: t })
        }
        const antes = existente.get({ plain: true })
        const actualizadas = await Caja.update(caja, { where: { id }, transaction: t })
        const despues = await Caja.findById(id, { transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cajas',
            entidad_id: id,
            accion: 'EDITAR',
            antes,
            despues,
            motivo,
            ip: contexto.ip
        })
        return actualizadas
    })
}

const obtenerTodasCajasdetalleDB = async() => {
    let respuesta = await Caja.findAll({
        include: [
          { model: Centro,
            include: [
              { model: Cliente,
                as: 'cliente'},
              { model: Ccegreso },
              { model: CentroTrabajador, include: [{ model: Trabajador }, { model: Liquidacion }] },
              { model: Lista_insumo, include: [{ model: Linea_insumo, include: [{ model: Producto }] }] }
            ]
          }
        ],
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerTodasCajasDB = async() => {
    let respuesta = await Caja.findAll({
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerCajaActivaDB = async() => {
    // A3 (orden por periodo) diferido a la rama RF-CAJA-01b (D-033): comportamiento previo intacto.
    let respuesta = await Caja.findOne({
        where: { estado: 1 }
      })
    return respuesta
}

const obtenerCajaIdDB = async(id) => {
    let respuesta = await Caja.findById(id)
    return respuesta
}

const obtenerCantidadCentroCostoAbiertoDB = async(id_caja) => {
    let respuesta = await Centro.count({ where: { cajaId: id_caja, estado: 1 } });
    return respuesta
}

const obtenerCentroCostoCerradoDB = async(id_caja) => {
    let respuesta = await Centro.findAll({ where: { cajaId: id_caja, estado: 0 } });
    return respuesta
}

const obtenerEgresoCajaDB = async(id_caja) => {
    let respuesta = await Egresogeneral.findAll({ where: { cajaId: id_caja, [Op.or]: [{ estado: null }, { estado: { [Op.ne]: EGRESO_ANULADO } }] } });
    return respuesta
}

module.exports = {
    crearCajaDB,
    editarCajaDB,
    obtenerTodasCajasdetalleDB,
    obtenerTodasCajasDB,
    obtenerCajaActivaDB,
    obtenerCajaIdDB,
    obtenerCantidadCentroCostoAbiertoDB,
    obtenerCentroCostoCerradoDB,
    obtenerEgresoCajaDB
}