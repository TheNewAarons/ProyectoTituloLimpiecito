const express = require('express');
const usuarios = express.Router();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const atob = require('atob');

const Usuario = require('../../modelos/sist_app/Usuario_app');
const { registrarLogin } = require('../../services/auditoria/login');
const { expiraEn } = require('../../config/auth');

//LOGIN
usuarios.post('/login', (req, res) => {
  const usuario1 = req.body.login;
  const passCrypt = atob(usuario1.password);
  usuario1.password = passCrypt;
  Usuario.findOne({
    where: {
      correo: usuario1.correo,
      estado: 1
    }
  })
    .then(async (usuario) => {
      if (usuario) {
        const usuarioToken = {
          id: usuario.dataValues.id,
          nombre: usuario.dataValues.nombre,
          correo: usuario.dataValues.correo,
          direccion: usuario.dataValues.direccion,
          direccion_op: usuario.dataValues.direccion_op,
          celular: usuario.dataValues.celular
        };
        if (bcrypt.compareSync(usuario1.password, usuario.password)) {
          let token = jwt.sign(usuarioToken, process.env.SECRET_KEY, { expiresIn: expiraEn });
          await registrarLogin({ contexto: 'usuario_apps', entidad: 'usuario_apps', usuarioId: usuario.id, correo: usuario1.correo, ok: true, ip: req.ip });
          res.json({ usuarioToken, token: token });
        } else {
          await registrarLogin({ contexto: 'usuario_apps', entidad: 'usuario_apps', usuarioId: usuario.id, correo: usuario1.correo, ok: false, motivo: 'PASSWORD_INCORRECTA', ip: req.ip });
          res.json({ mensaje: 'Contraseña Incorrecta!' });
        }
      } else {
        // estado != 1 también cae aquí (findOne filtra estado:1), no distinguible de inexistente
        await registrarLogin({ contexto: 'usuario_apps', entidad: 'usuario_apps', usuarioId: null, correo: usuario1.correo, ok: false, motivo: 'USUARIO_NO_EXISTE', ip: req.ip });
        res.json({ mensaje: 'Usuario no existe!' });
      }
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = usuarios;
