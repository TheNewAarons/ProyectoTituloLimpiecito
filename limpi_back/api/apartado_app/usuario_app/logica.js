//MODELOS
const Usuario = require('../../../modelos/sist_app/Usuario_app');

const { Op } = require('sequelize');

const obtenerUsuariosAppActivosDB = async () => {
  let respuesta = await Usuario.findAll({ where: { estado: 1 }, order: [['id', 'DESC']] });
  return respuesta;
};

const obtenerUsuariosAppInactivosDB = async () => {
  let respuesta = await Usuario.findAll({ where: { estado: 0 }, order: [['id', 'DESC']] });
  return respuesta;
};

const activarUsuarioAppDB = async (id) => {
  let respuesta = await Usuario.update({ estado: 1 }, { where: { id } });
  return respuesta;
};

const desactivarUsuarioAppDB = async (id) => {
  let respuesta = await Usuario.update({ estado: 0 }, { where: { id } });
  return respuesta;
};

const obtenerUsuarioAppDB = async (id) => {
  let respuesta = await Usuario.findById(id, { attributes: ['id', 'nombre', 'correo', 'direccion', 'celular'] });
  return respuesta;
};

const buscaUsuarioAppActivoDB = async (busca) => {
  let respuesta = await Usuario.findAll({
    where: {
      estado: 1,
      [Op.or]: [
        { nombre: { [Op.like]: '%' + busca + '%' } },
        { correo: { [Op.like]: '%' + busca + '%' } },
        { direccion: { [Op.like]: '%' + busca + '%' } },
        { celular: { [Op.like]: '%' + busca + '%' } }
      ]
    },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const buscaUsuarioAppInactivoDB = async (id) => {
  let respuesta = await Usuario.findAll({
    where: {
      estado: 0,
      [Op.or]: [
        { nombre: { [Op.like]: '%' + busca + '%' } },
        { correo: { [Op.like]: '%' + busca + '%' } },
        { direccion: { [Op.like]: '%' + busca + '%' } },
        { celular: { [Op.like]: '%' + busca + '%' } }
      ]
    },
    order: [['id', 'DESC']]
  });
  return respuesta
};

module.exports = {
  obtenerUsuariosAppActivosDB,
  obtenerUsuariosAppInactivosDB,
  activarUsuarioAppDB,
  desactivarUsuarioAppDB,
  obtenerUsuarioAppDB,
  buscaUsuarioAppActivoDB,
  buscaUsuarioAppInactivoDB
};
