const Instituto_previsione = require('../../../modelos/sistema_base/Instituto_previsione');

const crearInstitutoPrevisionDB = async (instituto_previsione) => {
  let respuesta = await Instituto_previsione.create(instituto_previsione);
  return respuesta;
};

const editarInstitutoPrevisionDB = async (id, instituto_previsione) => {
  let respuesta = await Instituto_previsione.update(instituto_previsione, { where: { id } });
  return respuesta;
};

const obtenerInstitutoPrevisionIdDB = async (id) => {
  let respuesta = await Instituto_previsione.findById(id);
  return respuesta;
};

const obtenerTodosInstitutoPrevisionDB = async () => {
  let respuesta = await Instituto_previsione.findAll({
    where: { estado: 1 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const obtenerInstitutoPrevisionActivosDB = async () => {
  let respuesta = await Instituto_previsione.findAll({
    where: { estado: 1 },
    order: [['id', 'DESC']]
  });

  return respuesta;
};

const obtenerInstitutoPrevisionInactivosDB = async () => {
  let respuesta = await Instituto_previsione.findAll({
    where: { estado: 0 },
    order: [['id', 'DESC']]
  });
  return respuesta;
};

const desactivarInstitutoPrevisionDB = async(id) => {
    let respuesta = await Instituto_previsione.update({ estado: 0 }, { where: { id } })
    return respuesta
}

const activarInstitutoPrevisionDB = async(id) => {
    let respuesta = await Instituto_previsione.update({ estado: 1 }, { where: { id } })
    return respuesta
}

module.exports = {
  crearInstitutoPrevisionDB,
  editarInstitutoPrevisionDB,
  obtenerInstitutoPrevisionIdDB,
  obtenerTodosInstitutoPrevisionDB,
  obtenerInstitutoPrevisionActivosDB,
  obtenerInstitutoPrevisionInactivosDB,
  desactivarInstitutoPrevisionDB,
  activarInstitutoPrevisionDB

};
