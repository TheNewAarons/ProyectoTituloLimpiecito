const Usuario = require('../../../modelos/sistema_base/Usuario');
const Rol = require('../../../modelos/sistema_base/Role');

const buscarUsuarioCorreoDB = async (correo) => {
  let respuesta = await Usuario.findOne({ where: { correo } });
  return respuesta;
};

const buscarUsuarioIdDB = async (id) => {
  let respuesta = await Usuario.findOne({ where: id });
  return respuesta;
};

const crearUsuarioDB = async (usuario) => {
  let respuesta = await Usuario.create(usuario);
  return respuesta;
};

const editarUsuarioDB = async (id, usuario) => {
  let respuesta = await Usuario.update(usuario, { where: { id } });
  return respuesta;
};

const activarUsuarioDB = async (id) => {
  let respuesta = await Usuario.update({ estado: 1 }, { where: { id } });
  return respuesta;
};

const desactivarUsuarioDB = async (id) => {
  let respuesta = await Usuario.update({ estado: 0 }, { where: { id } });
  return respuesta;
};

const obtenerUsuariosActivosDB = async () => {
  let respuesta = await Usuario.findAll({
    where: { estado: 1 },
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']]
  });
};

const obtenerUsuariosInactivosDB = async () => {
    let respuesta = await Usuario.findAll({
        where: { estado: 1 },
        include: {
          model: Rol,
          as: 'role'
        },
        order: [['id', 'DESC']]
      });
};

module.exports = {};
