const express = require('express');
const login = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob');

const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente');
const Acceso_trabajador = require('../../modelos/sistema_base/Acceso_trabajador');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');

process.env.SECRET_KEY = '89434abc3444limpi904384dsadDASdasdsa';

//INICIO SESION SISTEMA CLIENTE-TRABAJADOR
login.post('/inicio_sesion', async (req, res) => {
  const login = JSON.parse(req.body.login);
  const pass = atob(login.password);

  if (login.cliente) {
    Acceso_cliente.findOne({
      where: {
        correo: login.correo
      }
    })
      .then((acceso) => {
        if (acceso) {
          if (acceso.estado) {
            if (bcrypt.compareSync(pass, acceso.password)) {
              let token = jwt.sign(acceso.dataValues, process.env.SECRET_KEY, {
                expiresIn: '1d'
              });
              return res.json({ token });
            } else {
              return res.send('Contraseña Incorrecta');
            }
          } else {
            return res.send('Cuenta Deshabilitada');
          }
        } else {
          return res.send('No Existe este Acceso Cliente');
        }
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  } else {
    Acceso_trabajador.findOne({
      where: {
        correo: login.correo
      }
    })
      .then((acceso) => {
        if (acceso) {
          if (acceso.estado) {
            if (bcrypt.compareSync(pass, acceso.password)) {
              Trabajador.findOne({ where: { accesoTrabajadoreId: acceso.id } })
                .then((trabajador) => {
                  let payload = {
                    correo: acceso.correo,
                    estado: acceso.estado,
                    trabajadoreId: trabajador.id
                  };
                  let token = jwt.sign(payload, process.env.SECRET_KEY, {
                    expiresIn: '1d'
                  });
                  res.json({ token: token });
                })
                .catch((error) => {
                  return res.send('error: ' + error);
                });
            } else {
              return res.send('Contraseña Incorrecta');
            }
          } else {
            return res.send('Cuenta Deshabilitada');
          }
        } else {
          return res.send('No Existe este Acceso Trabajador');
        }
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }
});

module.exports = login;
