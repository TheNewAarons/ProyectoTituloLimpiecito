const express = require('express');
const seguros = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Seguro = require('../../modelos/sistema_base/Seguro');

//CREAR SEGURO
seguros.post('/crear', (req, res) => {
  const seguro = JSON.parse(req.body.seguro);
  const seguroData = {
    nombre: seguro.nombre,
    comision: seguro.comision,
    estado: seguro.estado
  };
  Seguro.create(seguroData)
    .then((seguro) => {
      res.json({
        seguro: seguro
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR SEGURO
seguros.put('/editar/:id', (req, res) => {
  const seguro = JSON.parse(req.body.seguro);
  const seguroData = {
    nombre: seguro.nombre,
    comision: seguro.comision,
    estado: seguro.estado
  };
  Seguro.findById(req.params.id)
    .then((seguro) => {
      Seguro.update(seguroData, {
        where: {
          id: req.params.id
        }
      })
        .then((filasUpdate) => {
          res.json({
            filas: filasUpdate
          });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS SEGUROS
seguros.get('/todos', (req, res) => {
  Seguro.findAll({
    order: [['id', 'DESC']]
  })
    .then((seguros) => {
      res.json({
        seguros: seguros
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS SEGUROS ACTIVOS
seguros.get('/activos', (req, res) => {
  Seguro.findAll({
    where: {
      estado: 1
    },
    order: [['id', 'DESC']]
  })
    .then((seguros) => {
      res.json({
        seguros: seguros
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS SEGUROS INACTIVOS
seguros.get('/inactivos', (req, res) => {
  Seguro.findAll({
    where: {
      estado: 0
    },
    order: [['id', 'DESC']]
  })
    .then((seguros) => {
      res.json({
        seguros: seguros
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//ELIMINAR SEGURO (CAMBIAR ESTADO A INACTIVO)
seguros.delete('/eliminar/:id', (req, res) => {
  Seguro.update(
    {
      estado: 0
    },
    {
      where: {
        id: req.params.id
      }
    }
  )
    .then((filasUpdate) => {
      res.json({
        filas: filasUpdate
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ACTIVAR SEGURO
seguros.delete('/activar/:id', (req, res) => {
  Seguro.update(
    {
      estado: 1
    },
    {
      where: {
        id: req.params.id
      }
    }
  )
    .then((filasUpdate) => {
      res.json({
        filas: filasUpdate
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = seguros;
