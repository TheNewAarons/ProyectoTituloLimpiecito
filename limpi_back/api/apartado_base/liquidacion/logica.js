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
const AppError = require('../../../libs/app-error');

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
    // estado 0 = cerrada: sus montos ya alimentan pagos y caja, no se editan.
    if (Number(existente.estado) === 0) {
      throw new AppError('LIQUIDACION_CERRADA', 'la liquidación está cerrada y no se puede editar', 409, { liquidacion_id: Number(id) });
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

/**
 * Reglas para reabrir una liquidación cerrada (estado 0 -> 1): su pago sigue EN_ESPERA (pagada: revertir
 * el pago primero; anulada: no se reabre) y su centro de costo está abierto (un CC cerrado ya congeló sus costos).
 * Devuelve la liquidación y una descripción legible para el correo del código.
 */
const cargarLiquidacionReabrible = async (id, opcionesConsulta) => {
  const existente = await Liquidacion.findById(id, opcionesConsulta);
  if (!existente) throw new AppError('LIQUIDACION_NO_EXISTE', 'la liquidación no existe', 404, { id: Number(id) });
  if (Number(existente.estado) !== 0) {
    throw new AppError('LIQUIDACION_NO_CERRADA', 'la liquidación no está cerrada', 409, { id: Number(id) });
  }
  if (existente.estado_pago === 'PAGADA') {
    throw new AppError('LIQUIDACION_PAGADA', 'la liquidación ya está pagada, revierte el pago antes de reabrirla', 409, { id: Number(id) });
  }
  if (existente.estado_pago !== 'EN_ESPERA') {
    throw new AppError('LIQUIDACION_ANULADA', 'la liquidación está anulada y no se puede reabrir', 409, { id: Number(id) });
  }
  const asociacion = await CentroCostoTrabajador.findOne({
    where: { liquidacioneId: id },
    include: [
      { model: Centro, as: 'centro_costo', attributes: ['id', 'estado', 'numero_cc'] },
      { model: Trabajador, attributes: ['id', 'nombre', 'apellido'] }
    ],
    transaction: opcionesConsulta.transaction
  });
  const centro = asociacion && asociacion.centro_costo;
  if (centro && Number(centro.estado) !== 1) {
    throw new AppError('CENTRO_CERRADO', 'el centro de costo está cerrado, reábrelo primero', 409, { id: Number(id) });
  }
  const trabajador = asociacion && asociacion.trabajadore;
  const descripcion = 'la liquidación' +
    (trabajador ? ' de ' + [trabajador.nombre, trabajador.apellido].filter(Boolean).join(' ') : ' N° ' + id) +
    (centro ? ' (centro de costo N° ' + centro.numero_cc + ')' : '');
  return { liquidacion: existente, descripcion: descripcion };
};

// Chequeo previo sin bloqueo (antes de enviar el código por correo); reabrirLiquidacionDB lo repite con bloqueo.
const verificarLiquidacionReabrible = (id) => cargarLiquidacionReabrible(id, {});

/** Reabre la liquidación (reglas en cargarLiquidacionReabrible). Auditado como REAPERTURA con motivo. */
const reabrirLiquidacionDB = async (id, ctx) => {
  const contexto = ctx || {};
  return db.sequelize.transaction(async (t) => {
    const { liquidacion } = await cargarLiquidacionReabrible(id, { transaction: t, lock: t.LOCK.UPDATE });
    const antes = liquidacion.get({ plain: true });
    await Liquidacion.update({ estado: 1 }, { where: { id }, transaction: t });
    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'liquidaciones',
      entidad_id: Number(id),
      accion: 'REAPERTURA',
      antes,
      despues: Object.assign({}, antes, { estado: 1 }),
      motivo: contexto.motivo,
      ip: contexto.ip || null
    });
    return Object.assign({}, antes, { estado: 1 });
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
  reabrirLiquidacionDB,
  verificarLiquidacionReabrible,
  obtenerLiquidacionIdDB,
  obtenerTodasLiquidacionesDB,
  buscarLiquidacionesDB
};
