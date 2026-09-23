const express = require('express');
const usuarios = express.Router();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const atob = require('atob');

const Usuario = require('../../modelos/sist_app/Usuario_app');

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
    .then((usuario) => {
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
          let token = jwt.sign(usuarioToken, process.env.SECRET_KEY);
          res.json({ usuarioToken, token: token });
        } else {
          res.json({ mensaje: 'Contraseña Incorrecta!' });
        }
      } else {
        res.json({ mensaje: 'Usuario no existe!' });
      }
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = usuarios;
