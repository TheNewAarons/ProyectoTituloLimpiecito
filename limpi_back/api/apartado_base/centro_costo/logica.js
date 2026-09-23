const Centro = require('../../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../../modelos/sistema_base/Cliente');
const Caja = require('../../../modelos/sistema_base/Caja');
const CentroTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const Trabajador = require('../../../modelos/sistema_base/Trabajadore');
const Lista_insumo = require('../../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../../modelos/sistema_base/Linea_insumo');
const Producto = require('../../../modelos/sistema_base/Producto');
const Ccegreso = require('../../../modelos/sistema_base/CcEgreso');
const Ccingreso = require('../../../modelos/sistema_base/CcIngreso');
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const Usuario = require('../../../modelos/sistema_base/Usuario');

const { Op } = require('sequelize');

//RELACIONES 1-1 *-* 1-*
Centro.belongsTo(Cliente, { as: 'cliente' });
Centro.belongsTo(Caja);
Centro.hasMany(CentroTrabajador);
CentroTrabajador.belongsTo(Trabajador);

CentroTrabajador.belongsTo(Liquidacion);
Centro.hasMany(Lista_insumo);
Centro.hasMany(Ccegreso);
Centro.hasMany(Ccingreso);
Lista_insumo.hasMany(Linea_insumo);
Lista_insumo.belongsTo(Usuario, { as: 'crea', foreignKey: 'usuarioCreaId', targetKey: 'id' });
Lista_insumo.belongsTo(Usuario, { as: 'aprueba', foreignKey: 'usuarioApruebaId', targetKey: 'id' });
Linea_insumo.belongsTo(Producto);

const crearCentroCostoDB = async (centro_costo) => {
  let respuesta = await Centro.create(centro_costo);
  return respuesta;
};

const obtenerNumeroCCCentroCostoDB = async () => {
  let respuesta = await Centro.max('numero_cc');
  return respuesta;
};

const buscarCentroCostoIdDB = async (id) => {
  let respuesta = await Centro.findById(id);
  return respuesta;
};

const editarCentroCostoDB = async (id, centro_costo) => {
  let respuesta = await Centro.update(centro_costo, { where: { id } });
  return respuesta;
};

const obtenerCentroCostoIdDB = async (id) => {
  let respuesta = await Centro.findById(id, {
    include: [
      { model: Cliente, as: 'cliente' },
      { model: CentroTrabajador, include: [{ model: Trabajador }, { model: Liquidacion }] },
      {
        model: Lista_insumo,
        include: [
          { model: Linea_insumo, include: [{ model: Producto }] },
          { model: Usuario, as: 'crea', attributes: ['nombre', 'apellido'] },
          { model: Usuario, as: 'aprueba', attributes: ['nombre', 'apellido'] }
        ]
      },
      { model: Ccegreso },
      { model: Ccingreso }
    ]
  });
  return respuesta;
};

const obtenerCentroCostoActivosCajaDB = async (id_caja) => {
  let respuesta = await Centro.findAll({
    include: [{ model: Cliente, as: 'cliente' }],
    where: { estado: 1, cajaId: id_caja },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerCentroCostoInactivosCajaDB = async (id_caja) => {
  let respuesta = await Centro.findAll({
    include: [{ model: Cliente, as: 'cliente' }],
    where: { estado: 0, cajaId: id_caja },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerCentroCostoClienteDB = async (id_cliente) => {
  let respuesta = await Centro.findAll({
    include: [{ model: Cliente, as: 'cliente' }],
    where: { clienteId: id_cliente },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerTodosCentroCostoCajaDB = async (id_caja) => {
  let respuesta = await Centro.findAll({
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Ccegreso },
      { model: CentroTrabajador, include: [{ model: Trabajador }, { model: Liquidacion }] },
      { model: Lista_insumo, include: [{ model: Linea_insumo, include: [{ model: Producto }] }] }
    ],
    where: { cajaId: id_caja }
  });
  return respuesta;
};

const buscarCentroCostoCajaActivosDB = async (id_caja, busca) => {
  let respuesta = await Centro.findAll({
    include: [{ model: Cliente, as: 'cliente' }],
    where: { estado: 1, cajaId: id_caja, [Op.or]: [{ '$cliente.representante$': { [Op.like]: '%' + busca + '%' } }] },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const buscarCentroCostoCajaInactivosDB = async (id_caja, busca) => {
  let respuesta = await Centro.findAll({
    include: [{ model: Cliente, as: 'cliente' }],
    where: { estado: 0, cajaId: id_caja, [Op.or]: [{ '$cliente.representante$': { [Op.like]: '%' + busca + '%' } }] },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

module.exports = {
  crearCentroCostoDB,
  obtenerNumeroCCCentroCostoDB,
  buscarCentroCostoIdDB,
  editarCentroCostoDB,
  obtenerCentroCostoIdDB,
  obtenerCentroCostoActivosCajaDB,
  obtenerCentroCostoInactivosCajaDB,
  obtenerCentroCostoClienteDB,
  obtenerTodosCentroCostoCajaDB,
  buscarCentroCostoCajaActivosDB,
  buscarCentroCostoCajaInactivosDB
};
