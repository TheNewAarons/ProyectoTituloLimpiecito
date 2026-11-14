const express = require('express');
const login = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob');

const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente');
const Acceso_trabajador = require('../../modelos/sistema_base/Acceso_trabajador');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');
const { registrarLogin } = require('../../services/auditoria/login');

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
      .then(async (acceso) => {
        if (acceso) {
          if (acceso.estado) {
            if (bcrypt.compareSync(pass, acceso.password)) {
              let token = jwt.sign(acceso.dataValues, process.env.SECRET_KEY, {
                expiresIn: '1d'
              });
              await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: acceso.id, correo: login.correo, ok: true, ip: req.ip });
              return res.json({ token });
            } else {
              await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: acceso.id, correo: login.correo, ok: false, motivo: 'PASSWORD_INCORRECTA', ip: req.ip });
              return res.send('Contraseña Incorrecta');
            }
          } else {
            await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: acceso.id, correo: login.correo, ok: false, motivo: 'CUENTA_DESHABILITADA', ip: req.ip });
            return res.send('Cuenta Deshabilitada');
          }
        } else {
          await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: null, correo: login.correo, ok: false, motivo: 'USUARIO_NO_EXISTE', ip: req.ip });
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
      .then(async (acceso) => {
        if (acceso) {
          if (acceso.estado) {
            if (bcrypt.compareSync(pass, acceso.password)) {
              Trabajador.findOne({ where: { accesoTrabajadoreId: acceso.id } })
                .then(async (trabajador) => {
                  let payload = {
                    correo: acceso.correo,
                    estado: acceso.estado,
                    trabajadoreId: trabajador.id
                  };
                  let token = jwt.sign(payload, process.env.SECRET_KEY, {
                    expiresIn: '1d'
                  });
                  await registrarLogin({ contexto: 'acceso_trabajadores', entidad: 'acceso_trabajadores', usuarioId: acceso.id, correo: login.correo, ok: true, ip: req.ip });
                  res.json({ token: token });
                })
                .catch((error) => {
                  return res.send('error: ' + error);
                });
            } else {
              await registrarLogin({ contexto: 'acceso_trabajadores', entidad: 'acceso_trabajadores', usuarioId: acceso.id, correo: login.correo, ok: false, motivo: 'PASSWORD_INCORRECTA', ip: req.ip });
              return res.send('Contraseña Incorrecta');
            }
          } else {
            await registrarLogin({ contexto: 'acceso_trabajadores', entidad: 'acceso_trabajadores', usuarioId: acceso.id, correo: login.correo, ok: false, motivo: 'CUENTA_DESHABILITADA', ip: req.ip });
            return res.send('Cuenta Deshabilitada');
          }
        } else {
          await registrarLogin({ contexto: 'acceso_trabajadores', entidad: 'acceso_trabajadores', usuarioId: null, correo: login.correo, ok: false, motivo: 'USUARIO_NO_EXISTE', ip: req.ip });
          return res.send('No Existe este Acceso Trabajador');
        }
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }
});

module.exports = login;
