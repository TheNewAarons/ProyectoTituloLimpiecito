const logicaDB = require('./logica');

const crearObservacion = async (req, res) => {
  let observacion = req.body.observacion;
  let observacionData = {
    observacion: observacion.observacion,
    fecha: observacion.fecha,
    reservaId: observacion.reservaId
  };
  try {
    let observacion = await logicaDB.crearObservacionDB(observacionData);
    return res.json({observacion})
  } catch (error) {
    return res.json({ error });
  }
};

module.exports = {
  crearObservacion
};
