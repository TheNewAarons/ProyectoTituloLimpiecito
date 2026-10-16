const Op = require('sequelize').Op
const { EGRESO_ANULADO, EGRESO_TIPO_LIQUIDACION, CAJA_ABIERTA } = require('../../../services/constantes')
const db = require('../../../database/database')
const AppError = require('../../../libs/app-error')
const { auditar } = require('../../../services/auditoria')
const Caja = require('../../../modelos/sistema_base/Caja')
const Usuario = require('../../../modelos/sistema_base/Usuario')
const Egreso = require('../../../modelos/sistema_base/Egreso')

Egreso.belongsTo(Caja);
Egreso.belongsTo(Usuario);

const crearEgresoDB = async(egreso) => {
    let respuesta = await Egreso.create(egreso)
    return respuesta
}

// RF-CAJA-01 (E5): los egresos no se borran fisicamente; se anulan (estado -1) en una transaccion con
// auditoria y solo si su caja esta ABIERTA. Los egresos de pago de liquidacion (tipo 2) se revierten
// desde /api/v1/liquidaciones/:id/revertir-pago.
const eliminarEgresoDB = async(id, contexto) => {
    const ctx = contexto || {}
    const usuario = ctx.usuario || { id: null, contexto: 'sistema' }
    return db.sequelize.transaction(async (t) => {
        const egreso = await Egreso.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (!egreso) return 0
        if (egreso.estado === EGRESO_ANULADO) return 0
        if (egreso.tipo === EGRESO_TIPO_LIQUIDACION) {
            throw new AppError('EGRESO_PAGO_LIQUIDACION', 'el egreso corresponde al pago de una liquidacion: revertir el pago desde liquidaciones', 409)
        }
        if (egreso.cajaId !== null && egreso.cajaId !== undefined) {
            const caja = await Caja.findById(egreso.cajaId, { transaction: t, lock: t.LOCK.UPDATE })
            if (caja && caja.estado !== CAJA_ABIERTA) {
                throw new AppError('CAJA_CERRADA', 'no se puede anular un egreso de una caja cerrada', 409, { periodo: caja.periodo })
            }
        }
        const antes = egreso.get({ plain: true })
        await egreso.update({ estado: EGRESO_ANULADO }, { transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'egresos',
            entidad_id: egreso.id,
            accion: 'ANULAR',
            antes,
            despues: egreso,
            motivo: 'ANULACION_EGRESO_LEGACY',
            ip: ctx.ip
        })
        return 1
    })
}

const obtenerTodosEgresosDB = async() => {
    let respuesta = await Egreso.findAll({
        include: [
          { model: Caja },
          { model: Usuario }
        ],
        where: { [Op.or]: [{ estado: null }, { estado: { [Op.ne]: EGRESO_ANULADO } }] }
      })
    return respuesta
}

const obtenerEgresosCajaDB = async(id) => {
    let respuesta = await Egreso.findAll({
        include: [
          { model: Caja },
          { model: Usuario }
        ],
        where: { cajaId: id, [Op.or]: [{ estado: null }, { estado: { [Op.ne]: EGRESO_ANULADO } }] }
      })
    return respuesta
}

module.exports = {
    crearEgresoDB,
    eliminarEgresoDB,
    obtenerTodosEgresosDB,
    obtenerEgresosCajaDB
}