const { Op } = require('sequelize');

const Cliente = require('../../../modelos/sistema_base/Cliente');
const Acceso_cliente = require('../../../modelos/sistema_base/Acceso_cliente');

const CarpetaPadre = require('../../../modelos/sist_doc_cliente/Carpeta_padre');

Cliente.hasMany(Acceso_cliente);
Cliente.hasOne(CarpetaPadre)

const crearClienteDB = async (cliente) => {
  let respuesta = await Cliente.create(cliente);
  return respuesta;
};

const editarClienteDB = async (id, cliente) => {
  let respuesta = await Cliente.update(cliente, { where: { id } });
  return respuesta;
};

const obtenerClientesActivosDB = async () => {
  let respuesta = await Cliente.findAll({
    where: { estado: 1 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerClientesInactivosDB = async () => {
  let respuesta = await Cliente.findAll({
    where: { estado: 0 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const desactivarClienteDB = async (id) => {
  let respuesta = await Cliente.update({ estado: 0 }, { where: { id } });
  return respuesta;
};

const activarClienteDB = async () => {
  let respuesta = await Cliente.update({ estado: 1 }, { where: { id } });
  return respuesta;
};

const obtenerClienteIdDB = async (id) => {
  let respuesta = await Cliente.findById(id, {
    include: [{ model: Acceso_cliente }]
  });
  return respuesta;
};

const buscarClientesActivosDB = async (busca) => {
  let respuesta = await Cliente.findAll({
    where: {
      estado: 1,
      [Op.or]: [
        { representante: { [Op.like]: '%' + busca + '%' } },
        { encargado_contrato: { [Op.like]: '%' + busca + '%' } },
        { numero_contacto: { [Op.like]: '%' + busca + '%' } }
      ]
    },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const buscarClientesInactivosDB = async (busca) => {
  let respuesta = await Cliente.findAll({
    where: {
      estado: 0,
      [Op.or]: [
        { representante: { [Op.like]: '%' + busca + '%' } },
        { encargado_contrato: { [Op.like]: '%' + busca + '%' } },
        { numero_contacto: { [Op.like]: '%' + busca + '%' } }
      ]
    },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerClientesCarpetaDB = async () => {
  let respuesta = await Cliente.findAll({
    include: [CarpetaPadre],
    where: { estado: 1 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const buscarClientesCarpetaDB = async (busca) => {
  let respuesta = await Cliente.findAll({
    include: [CarpetaPadre],
    where: {
      estado: 1,
      [Op.or]: [{ representante: { [Op.like]: '%' + busca + '%' } }, { encargado_contrato: { [Op.like]: '%' + busca + '%' } }]
    },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

module.exports = {
  crearClienteDB,
  editarClienteDB,
  obtenerClientesActivosDB,
  obtenerClientesInactivosDB,
  activarClienteDB,
  desactivarClienteDB,
  obtenerClienteIdDB,
  buscarClientesActivosDB,
  buscarClientesInactivosDB,
  obtenerClientesCarpetaDB,
  buscarClientesCarpetaDB
};
