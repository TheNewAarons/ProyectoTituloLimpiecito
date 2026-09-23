const Usuario = require('../../../modelos/sistema_base/Usuario');
const Rol = require('../../../modelos/sistema_base/Role');

const { Op } = require('sequelize')

Usuario.belongsTo(Rol, { as: 'role' });

const buscarUsuarioCorreoDB = async (correo) => {
  let respuesta = await Usuario.findOne({ where: { correo } });
  return respuesta;
};

const buscarUsuarioCorreoTrueDB = async(correo) => {
  let respuesta = await Usuario.findOne({
    where: { correo, estado:true },
    include:{model:Rol,as:'role'}
  })
  return respuesta
}

const buscarUsuarioIdDB = async (id) => {
  let respuesta = await Usuario.findOne({ where: {id} });
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
  return respuesta;
};

const obtenerUsuariosInactivosDB = async () => {
  let respuesta = await Usuario.findAll({
    where: { estado: 0 },
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const buscarUsuariosActivosDB = async (busca) => {
  let respuesta = Usuario.findAll({
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']],
    where: {
      estado: 1,
      [Op.or]: [
        {
          nombre: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          apellido: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          rut: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          correo: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          '$role.nombre$': {
            [Op.like]: '%' + busca + '%'
          }
        }
      ]
    }
  });
  return respuesta
};

const buscarUsuariosInactivosDB = async (busca) => {
  let respuesta = Usuario.findAll({
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']],
    where: {
      estado: 0,
      [Op.or]: [
        {
          nombre: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          apellido: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          rut: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          correo: {
            [Op.like]: '%' + busca + '%'
          }
        },
        {
          '$role.nombre$': {
            [Op.like]: '%' + busca + '%'
          }
        }
      ]
    }
  });
  return respuesta
};
module.exports = {
  buscarUsuarioCorreoDB,
  buscarUsuarioCorreoTrueDB,
  buscarUsuarioIdDB,
  crearUsuarioDB,
  editarUsuarioDB,
  activarUsuarioDB,
  desactivarUsuarioDB,
  obtenerUsuariosActivosDB,
  obtenerUsuariosInactivosDB,
  buscarUsuariosActivosDB,
  buscarUsuariosInactivosDB
};
