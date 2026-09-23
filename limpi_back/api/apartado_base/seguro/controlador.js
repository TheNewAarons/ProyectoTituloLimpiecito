const logicaDB = require('./logica');

const crearSeguro = async (req, res) => {
  const seguro = JSON.parse(req.body.seguro);
  const seguroData = {
    nombre: seguro.nombre,
    comision: seguro.comision,
    estado: seguro.estado
  };
  try {
    let seguro = logicaDB.crearSeguroDB(seguroData);
    return res.json({ seguro });
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarSeguro = async (req, res) => {
  const seguro = JSON.parse(req.body.seguro);
  const seguroData = {
    nombre: seguro.nombre,
    comision: seguro.comision,
    estado: seguro.estado
  };
  try {
    let filas = await logicaDB.editarSeguroDB(req.params.id,seguroData)
    return res.json({filas})
} catch (error) {
    return res.send('error' + error);
  }
};
const obtenerTodosSeguros = async (req, res) => {
  try {
    let seguros = await logicaDB.obtenerTodosSeguros()
    return res.json({seguros})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerSegurosActivos = async (req, res) => {
  try {
    let seguros = await logicaDB.obtenerSegurosActivosDB()
    return res.json({seguros})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerSegurosInactivos = async (req, res) => {
  try {
    let seguros = await logicaDB.obtenerSegurosInactivosDB()
    return res.json({seguros})
  } catch (error) {
    return res.send('error' + error);
  }
};

const desactivarSeguro = async (req, res) => {
  try {
    let filas = await logicaDB.desactivarSeguroDB(req.params.id)
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

const activarSeguro = async (req, res) => {
  try {
    let filas = await logicaDB.activarSeguroDB(req.params.id)
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

module.exports = {
    crearSeguro,
    editarSeguro,
    obtenerTodosSeguros,
    obtenerSegurosActivos,
    obtenerSegurosInactivos,
    desactivarSeguro,
    activarSeguro
};
