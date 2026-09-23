const express = require('express');
const vestimentas = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Vestimenta = require('../../modelos/sistema_base/Vestimenta');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');

vestimentas.use(cors());

//CREAR VESTIMENTA
vestimentas.post('/crear', (req, res) => {
  const vestimenta = JSON.parse(req.body.vestimenta);
  const vestimentaData = {
    polera_talla: vestimenta.polera_talla,
    pantalon_talla: vestimenta.pantalon_talla,
    zapato_talla: vestimenta.zapato_talla,
    chaqueta_talla: vestimenta.chaqueta_talla,
    otros: vestimenta.otros,
    trabajadoreId: vestimenta.trabajadoreId
  };
  Vestimenta.create(vestimentaData)
    .then((vestimenta) => {
      res.json({ vestimenta: vestimenta });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR VESTIMENTA
vestimentas.put('/editar/:id', (req, res) => {
  const vestimenta = JSON.parse(req.body.vestimenta);
  const vestimentaData = {
    polera_talla: vestimenta.polera_talla,
    pantalon_talla: vestimenta.pantalon_talla,
    zapato_talla: vestimenta.zapato_talla,
    chaqueta_talla: vestimenta.chaqueta_talla,
    otros: vestimenta.otros,
    trabajadoreId: vestimenta.trabajadoreId
  };
  Vestimenta.findById(req.params.id)
    .then((vestimenta) => {
      Salude.update(vestimentaData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          res.json({ filas: filasUpdate });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = vestimentas;
