const Rol = require('../../../modelos/sistema_base/Role');

const buscarRolPorNombreDB = async (nombre) => {
  let respuesta = await Rol.findOne({ where: { nombre } });
  return respuesta;
};

const crearRolDB = async (rol) => {
  let respuesta = await Rol.create(rol);
  return respuesta;
};

const editarRolDB = async (id, rol) => {
  let respuesta = await Rol.update(rol, { where: { id } });
  return respuesta;
};

const desactivarRolDB = async (id) => {
  let respuesta = await Rol.update({ estado: 0 }, { where: { id } });
  return respuesta;
};
const activarRolDB = async (id) => {
  let respuesta = await Rol.update({ estado: 1 }, { where: { id } });
  return respuesta;
};

const obtenerRolesActivosDB = async () => {
  let respuesta = await Rol.findAll({
    where: { estado: 1 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerRolesInactivosDB = async () => {
    let respuesta = await Rol.findAll({
      where: { estado: 0 },
      order: [['id', 'DESC']]
    });
    return respuesta;
  };

module.exports = {
  buscarRolPorNombreDB,
  crearRolDB,
  editarRolDB,
  desactivarRolDB,
  activarRolDB,
  obtenerRolesActivosDB,
  obtenerRolesInactivosDB
};
