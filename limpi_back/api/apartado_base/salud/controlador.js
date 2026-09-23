const logicaDB = require('./logica');

const crearSalud = async (req, res) => {
  const salude = JSON.parse(req.body.salude);
  const saludeData = {
    nombre: salude.nombre,
    comision: salude.comision,
    estado: salude.estado
  };
  try {
    let salude = await logicaDB.crearSaludDB(saludeData);
    return res.json({ salude });
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarSalud = async (req, res) => {
  const salude = JSON.parse(req.body.salude);
  const saludeData = {
    nombre: salude.nombre,
    comision: salude.comision,
    estado: salude.estado
  };
  try {
    let filas = await logicaDB.editarSaludDB(req.params.id,saludeData)
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerTodosSalud = async (req, res) => {
  try {
    let saludes = await logicaDB.obtenerTodosSaludDB()
    return res.json({saludes})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerSaludActivos = async (req, res) => {
  try {
    let saludes = await logicaDB.obtenerSaludActivosDB()
    return res.json({saludes})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerSaludInactivos = async (req, res) => {
  try {
    let saludes = await logicaDB.obtenerSaludInactivosDB()
    return res.json({saludes})
  } catch (error) {
    return res.send('error' + error);
  }
};

const desactivarSalud = async (req, res) => {
  try {
    let filas = await logicaDB.desactivarSaludDB()
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

const activarSalud = async (req, res) => {
  try {
    let filas = await logicaDB.activarSaludDB()
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

module.exports = {
  crearSalud,
  editarSalud,
  obtenerTodosSalud,
  obtenerSaludActivos,
  obtenerSaludInactivos,
  desactivarSalud,
  activarSalud
};
