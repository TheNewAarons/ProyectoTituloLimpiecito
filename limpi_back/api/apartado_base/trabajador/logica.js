const { Op } = require('sequelize');

const Trabajadore = require('../../../modelos/sistema_base/Trabajadore');
const Salude = require('../../../modelos/sistema_base/Salude');
const Seguro = require('../../../modelos/sistema_base/Seguro');
const Vestimenta = require('../../../modelos/sistema_base/Vestimenta');
const Instituto_previsione = require('../../../modelos/sistema_base/Instituto_previsione');
const Dato_liquidacione = require('../../../modelos/sistema_base/Dato_liquidacione');
const Acceso_trabajador = require('../../../modelos/sistema_base/Acceso_trabajador');
const Asoc_trabajador = require('../../../modelos/sistema_base/Asociacion_trabajador')
const Documento = require('../../../modelos/sistema_base/Documento');
const Categoria = require('../../../modelos/sistema_base/Categoria');

//RELACIONES *-* 1-1
Trabajadore.belongsTo(Salude);
Trabajadore.belongsTo(Seguro);
Trabajadore.belongsTo(Instituto_previsione);
Vestimenta.belongsTo(Trabajadore);
Trabajadore.belongsTo(Dato_liquidacione);
Trabajadore.belongsTo(Acceso_trabajador);
Trabajadore.hasMany(Asoc_trabajador);
Asoc_trabajador.belongsTo(Documento);

const buscarNumeroEmpladoTrabajadorDB = async () => {
  let respuesta = await Trabajadore.max('n_empleado');
  return respuesta;
};
// Crear Dato liquidación
const crearDatoLiquidacioneDB = async (dato_liquidacione) => {
  let respuesta = await Dato_liquidacione.create(dato_liquidacione);
  return respuesta;
};

const crearTrabajadorDB = async (trabajador) => {
  let respuesta = await Trabajadore.create(trabajador);
  return respuesta;
};

const buscarTrabajadorIdDB = async (id) => {
  let respuesta = await Trabajadore.findById(id);
  return respuesta;
};

const editarTrabajadorDB = async (id, trabajador) => {
  let respuesta = await Trabajadore.update(trabajador, { where: { id } });
  return respuesta;
};

const editarDatoLiquidacionDB = async(id,dato_liquidacione) => {
  let respuesta = await Dato_liquidacione.update(dato_liquidacione,{where:{id}})
  return respuesta
}

const obtenerTodosTrabajadoresDB = async () => {
  let respuesta = await Trabajadore.findAll({
    include: [{ model: Instituto_previsione }, { model: Seguro }, { model: Salude }, { model: Vestimenta }],
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerTrabajadoresActivosDB = async () => {
  let respuesta = await Trabajadore.findAll({
    include: [
      { model: Instituto_previsione },
      { model: Seguro },
      { model: Salude }
      /*{
                model:Vestimenta,
                //include:[Producto]
            }*/
    ],
    order: [['id', 'DESC']],
    where: {
      estado: 1
    }
  });
  return respuesta;
};

const obtenerTrabajadoresInactivosDB = async () => {
  let respuesta = await Trabajadore.findAll({
    include: [
      { model: Instituto_previsione },
      { model: Seguro },
      { model: Salude }
      /*{
                model:Vestimenta,
                //include:[Producto]
            }*/
    ],
    order: [['id', 'DESC']],
    where: {
      estado: 0
    }
  });
  return respuesta;
};

const desactivarTrabajadorDB = async (id) => {
  let respuesta = await Trabajadore.update({ estado: 0 }, { where: { id } });
  return respuesta;
};

const activarTrabajadorDB = async (id) => {
  let respuesta = await Trabajadore.update({ estado: 1 }, { where: { id } });
  return respuesta;
};

const obtenerTrabajadorIdDB = async (id) => {
  let respuesta = await Trabajadore.findById(id, {
    include: [
      { model: Salude },
      { model: Seguro },
      { model: Instituto_previsione },
      { model: Dato_liquidacione },
      { model: Acceso_trabajador },
      { model: Asoc_trabajador, include: [{ model: Documento, include: [Categoria] }] }
    ]
  });
  return respuesta
};

const buscarTrabajadoresActivosDB = async (busca) => {
  let respuesta = await Trabajadore.findAll({
    include: [{ model: Instituto_previsione }, { model: Seguro }, { model: Salude }],
    order: [['id', 'DESC']],
    where: {
      estado: 1,
      [Op.or]: [
        { nombre: { [Op.like]: '%' + busca + '%' } },
        { rut: { [Op.like]: '%' + busca + '%' } },
        { telefono: { [Op.like]: '%' + busca + '%' } }
      ]
    }
  });
  return respuesta;
};

const buscarTrabajadoresInactivosDB = async (busca) => {
  let respuesta = await Trabajadore.findAll({
    include: [{ model: Instituto_previsione }, { model: Seguro }, { model: Salude }],
    order: [['id', 'DESC']],
    where: {
      estado: 0,
      [Op.or]: [
        { nombre: {[Op.like]: '%' + busca + '%'}},
        { rut: {[Op.like]: '%' + busca + '%'}},
        { telefono: {[Op.like]: '%' + busca + '%'}}
      ]
    }
  });
  return respuesta;
};

module.exports = {
  buscarNumeroEmpladoTrabajadorDB,
  crearDatoLiquidacioneDB,
  crearTrabajadorDB,
  buscarTrabajadorIdDB,
  editarTrabajadorDB,
  editarDatoLiquidacionDB,
  obtenerTodosTrabajadoresDB,
  obtenerTrabajadoresActivosDB,
  obtenerTrabajadoresInactivosDB,
  desactivarTrabajadorDB,
  activarTrabajadorDB,
  obtenerTrabajadorIdDB,
  buscarTrabajadoresActivosDB,
  buscarTrabajadoresInactivosDB
};
