const express = require('express');
const roles = express.Router();
const cors = require('cors');

const Rol = require('../../modelos/sistema_base/Role');
roles.use(cors());

//CREAR ROL
roles.post('/crear', (req, res) => {
  const rol = JSON.parse(req.body.rol);

  const rolData = {
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    estado: rol.estado
  };
  Rol.findOne({
    where: {
      nombre: rol.nombre
    }
  })
    .then((role) => {
      if (!role) {
        Rol.create(rolData)
          .then((rol) => {
            res.json({
              rol: rol
            });
          })
          .catch((error) => {
            res.send('error: ' + error);
          });
      } else {
        res.json({ error: '¡Rol con el mismo nombre ya registrado!' });
      }
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});

//EDITAR ROL
roles.put('/editar/:id', (req, res) => {
  const rol = JSON.parse(req.body.rol);

  const rolData = {
    nombre: rol.nombre,
    descripcion: rol.descripcion
  };
  Rol.update(rolData, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//ELIMINAR ROL (CAMBIAR ESTADO A INACTIVO)
//QUIZAS EDITAR AL USUARIO POR EL ROL INACTIVO
roles.delete('/eliminar/:id', (req, res) => {
  Rol.update({ estado: false }, { where: { id: req.params.is } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER ROLES EN ESTADO ACTIVO
roles.get('/obtener', (req, res) => {
  Rol.findAll({
    where: { estado: 1 },
    order: [['id', 'DESC']]
  })
    .then((roles) => {
      res.json({ roles: roles });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER ROLES EN ESTADO INACTIVO
roles.get('/obtener-inactivo', (req, res) => {
  Rol.findAll({
    where: { estado: 0 },
    order: [['id', 'DESC']]
  })
    .then((roles) => {
      res.json({ rolesInactivos: roles });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = roles;
