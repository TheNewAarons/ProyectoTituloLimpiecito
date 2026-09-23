const express = require('express');
const saludes = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Salude = require('../../modelos/sistema_base/Salude');

//CREAR SALUD
saludes.post('/crear', (req, res) => {
  const salude = JSON.parse(req.body.salude);
  const saludeData = {
    nombre: salude.nombre,
    comision: salude.comision,
    estado: salude.estado
  };
  Salude.create(saludeData)
    .then((salude) => {
      res.json({ salude: salude });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR SALUD
saludes.put('/editar/:id', (req, res) => {
  const salude = JSON.parse(req.body.salude);
  const saludeData = {
    nombre: salude.nombre,
    comision: salude.comision,
    estado: salude.estado
  };
  Salude.findById(req.params.id)
    .then((salude) => {
      Salude.update(saludeData, { where: { id: req.params.id } })
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

//OBTENER TODOS LAS SALUD
saludes.get('/todos', (req, res) => {
  Salude.findAll({
    order: [['id', 'DESC']]
  })
    .then((saludes) => {
      res.json({ saludes: saludes });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LAS SALUD ACTIVOS
saludes.get('/activos', (req, res) => {
  Salude.findAll({
    where: {
      estado: 1
    },
    order: [['id', 'DESC']]
  })
    .then((saludes) => {
      res.json({ saludes: saludes });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LAS SALUD INACTIVOS
saludes.get('/inactivos', (req, res) => {
  Salude.findAll({
    where: {
      estado: 0
    },
    order: [['id', 'DESC']]
  })
    .then((saludes) => {
      res.json({ saludes: saludes });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//ELIMINAR LOS SALUD (CAMBIAR ESTADO A INACTIVO)
saludes.delete('/eliminar/:id', (req, res) => {
  Salude.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ACTIVAR LOS SALUD (CAMBIAR ESTADO A ACTIVO)
saludes.delete('/activar/:id', (req, res) => {
  Salude.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = saludes;
