const express = require('express');
const instituto_previsiones = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Instituto_previsione = require('../../modelos/sistema_base/Instituto_previsione');

//CREAR INSTITUTO_PREVISION
instituto_previsiones.post('/crear', (req, res) => {
  const instituto_previsione = JSON.parse(req.body.instituto_previsione);
  const instituto_previsioneData = {
    nombre: instituto_previsione.nombre,
    comision: instituto_previsione.comision,
    estado: instituto_previsione.estado
  };
  Instituto_previsione.create(instituto_previsioneData)
    .then((afp) => {
      res.json({ afp: afp });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR INSTITUTO DE PREVISION
instituto_previsiones.put('/editar/:id', (req, res) => {
  const instituto_previsione = JSON.parse(req.body.instituto_previsione);
  const instituto_previsioneData = {
    nombre: instituto_previsione.nombre,
    comision: instituto_previsione.comision,
    estado: instituto_previsione.estado
  };
  Instituto_previsione.findById(req.params.id)
    .then((instituto_previsione) => {
      Instituto_previsione.update(instituto_previsioneData, { where: { id: req.params.id } })
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

//OBTENER TODOS LOS INSTITUTOS DE PREVISION
instituto_previsiones.get('/todos', (req, res) => {
  Instituto_previsione.findAll({
    order: [['id', 'DESC']]
  })
    .then((afps) => {
      res.json({ afps: afps });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS INSTITUTOS DE PREVISION ACTIVOS
instituto_previsiones.get('/activos', (req, res) => {
  Instituto_previsione.findAll({
    where: {
      estado: 1
    },
    order: [['id', 'DESC']]
  })
    .then((afps) => {
      res.json({ afps: afps });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS INSTITUTOS DE PREVISION INACTIVOS
instituto_previsiones.get('/inactivos', (req, res) => {
  Instituto_previsione.findAll({
    where: {
      estado: 0
    },
    order: [['id', 'DESC']]
  })
    .then((afps) => {
      res.json({ afps: afps });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR INSTITUTO DE INSTITUTO_PREVISION (CAMBIAR ESTADO A INACTIVO)
instituto_previsiones.delete('/eliminar/:id', (req, res) => {
  Instituto_previsione.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error' + error);
    });
});

//ACTIVAR INSTITUTO DE INSTITUTO_PREVISION
instituto_previsiones.delete('/activar/:id', (req, res) => {
  Instituto_previsione.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error' + error);
    });
});

module.exports = instituto_previsiones;
