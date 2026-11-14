const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const Trabajador = require('../../../modelos/sistema_base/Trabajadore');
const Salud = require('../../../modelos/sistema_base/Salude');
const Afp = require('../../../modelos/sistema_base/Instituto_previsione');
const Seguro = require('../../../modelos/sistema_base/Seguro');
const Centro = require('../../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../../modelos/sistema_base/Cliente');

const CentroCostoTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');

const { Op } = require('sequelize');
const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');

/** RELACIONES   */
CentroCostoTrabajador.belongsTo(Liquidacion);
Trabajador.belongsTo(Salud);
Trabajador.belongsTo(Seguro);
Trabajador.belongsTo(Afp);
CentroCostoTrabajador.belongsTo(Centro, { as: 'centro_costo' });
CentroCostoTrabajador.belongsTo(Trabajador);
Centro.belongsTo(Cliente);

const crearLiquidacionDB = async (liquidacion, idCentroTrabajador, ctx) => {
  const contexto = ctx || {};
  const usuario = contexto.usuario || { id: null, contexto: 'sistema' };
  const motivo = contexto.motivoSinToken || null;
  return db.sequelize.transaction(async (t) => {
    const creada = await Liquidacion.create(liquidacion, { transaction: t });
    await editarCentroTrabajadorDB(creada.id, idCentroTrabajador, t);
    await auditar({
      transaction: t,
      usuario,
      entidad: 'liquidaciones',
      entidad_id: creada.id,
      accion: 'CREAR',
      despues: creada,
      motivo,
      ip: contexto.ip
    });
    return creada;
  });
};

const editarCentroTrabajadorDB = async(id_liquidacion,idCentroTrabajador, t) => {
  let respuesta = await CentroCostoTrabajador.update({ liquidacioneId: id_liquidacion }, { where: { id:idCentroTrabajador }, transaction: t });
  return respuesta
}

const editarLiquidacionDB = async (id, liquidacion, ctx) => {
  const contexto = ctx || {};
  const usuario = contexto.usuario || { id: null, contexto: 'sistema' };
  const motivo = contexto.motivoSinToken || null;
  return db.sequelize.transaction(async (t) => {
    const existente = await Liquidacion.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!existente) {
      return Liquidacion.update(liquidacion, { where: { id }, transaction: t });
    }
    const antes = existente.get({ plain: true });
    const actualizadas = await Liquidacion.update(liquidacion, { where: { id }, transaction: t });
    const despues = await Liquidacion.findById(id, { transaction: t });
    await auditar({
      transaction: t,
      usuario,
      entidad: 'liquidaciones',
      entidad_id: id,
      accion: 'EDITAR',
      antes,
      despues,
      motivo,
      ip: contexto.ip
    });
    return actualizadas;
  });
};

const cerrarLiquidacionDB = async (id, ctx) => {
  const contexto = ctx || {};
  const usuario = contexto.usuario || { id: null, contexto: 'sistema' };
  const motivo = ['CIERRE_LIQUIDACION_LEGACY', contexto.motivoSinToken].filter(Boolean).join(' ') || null;
  return db.sequelize.transaction(async (t) => {
    const existente = await Liquidacion.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!existente) {
      return Liquidacion.update({ estado: 0 }, { where: { id }, transaction: t });
    }
    const antes = existente.get({ plain: true });
    const actualizadas = await Liquidacion.update({ estado: 0 }, { where: { id }, transaction: t });
    const despues = await Liquidacion.findById(id, { transaction: t });
    await auditar({
      transaction: t,
      usuario,
      entidad: 'liquidaciones',
      entidad_id: id,
      accion: 'EDITAR',
      antes,
      despues,
      motivo,
      ip: contexto.ip
    });
    return actualizadas;
  });
};

const obtenerLiquidacionIdDB = async (id_liquidacion) => {
  let respuesta = await CentroCostoTrabajador.findOne({
    include: [
      { model: Trabajador, include: [{ model: Afp }, { model: Salud }, { model: Seguro }] },
      { model: Centro, as: 'centro_costo', include: [{ model: Cliente }] },
      { model: Liquidacion }
    ],
    where: { liquidacioneId: id_liquidacion }
  });
  return respuesta;
};

const obtenerTodasLiquidacionesDB = async () => {
  let respuesta = await CentroCostoTrabajador.findAll({
    include: [
      { model: Trabajador, as: 'trabajadore', include: [{ model: Afp }, { model: Salud }, { model: Seguro }] },
      { model: Centro, as: 'centro_costo', include: [{ model: Cliente }] },
      { model: Liquidacion, required: true }
    ]
  });
  return respuesta;
};

const buscarLiquidacionesDB = async (busca) => {
  let respuesta = await CentroCostoTrabajador.findAll({
    include: [
      { model: Trabajador, as: 'trabajadore', include: [{ model: Afp }, { model: Salud }, { model: Seguro }] },
      { model: Centro, as: 'centro_costo', include: [{ model: Cliente, as: 'cliente' }] },
      { model: Liquidacion, required: true }
    ],
    where: {
      [Op.or]: [
        { '$centro_costo.cliente.representante$': { [Op.like]: '%' + busca + '%' } },
        { '$trabajadore.nombre$': { [Op.like]: '%' + busca + '%' } },
        { '$trabajadore.rut$': { [Op.like]: '%' + busca + '%' } },
        { '$centro_costo.numero_cc$': { [Op.like]: '%' + busca + '%' } }
      ]
    }
  });
  return respuesta;
};

module.exports = {
  crearLiquidacionDB,
  editarCentroTrabajadorDB,
  editarLiquidacionDB,
  cerrarLiquidacionDB,
  obtenerLiquidacionIdDB,
  obtenerTodasLiquidacionesDB,
  buscarLiquidacionesDB
};
