const logicaDB = require('./logica');

const crearVestimenta = async (req, res) => {
  const vestimenta = JSON.parse(req.body.vestimenta);
  const vestimentaData = {
    polera_talla: vestimenta.polera_talla,
    pantalon_talla: vestimenta.pantalon_talla,
    zapato_talla: vestimenta.zapato_talla,
    chaqueta_talla: vestimenta.chaqueta_talla,
    otros: vestimenta.otros,
    trabajadoreId: vestimenta.trabajadoreId
  };
  try {
    let vestimenta = await logicaDB.crearVestimentaDB(vestimentaData)
    return res.json({vestimenta})
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarVestimenta = async (req, res) => {
    const vestimenta = JSON.parse(req.body.vestimenta);
    const vestimentaData = {
      polera_talla: vestimenta.polera_talla,
      pantalon_talla: vestimenta.pantalon_talla,
      zapato_talla: vestimenta.zapato_talla,
      chaqueta_talla: vestimenta.chaqueta_talla,
      otros: vestimenta.otros,
      trabajadoreId: vestimenta.trabajadoreId
    };
    try {
        let filas = await logicaDB.editarVestimentaDB(req.params.id,vestimentaData)
        return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

module.exports = {
  crearVestimenta,
  editarVestimenta
};
