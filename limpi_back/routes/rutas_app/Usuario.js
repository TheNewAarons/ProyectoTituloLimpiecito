const express = require('express');
const usuarios = express.Router();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const atob = require('atob');

const Usuario = require('../../modelos/sist_app/Usuario_app');

//REGISTRAR USUARIO 
usuarios.post('/registro', (req, res) => {
  const usuario = req.body.usuario;
  const usuarioData = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    password: atob(usuario.password),
    direccion: usuario.direccion,
    direccion_op: usuario.direccion_op,
    celular: usuario.celular,
    estado: usuario.estado
  };
  console.log(usuario);
  Usuario.findOne({
    where: {
      correo: usuario.correo
    }
  })
    .then((usuario) => {
      if (!usuario) {
        const hash = bcrypt.hashSync(usuarioData.password, 10);
        usuarioData.password = hash;
        Usuario.create(usuarioData)
          .then((usuario) => {
            const usuarioToken = {
              id: usuario.dataValues.id,
              nombre: usuario.dataValues.nombre,
              correo: usuario.dataValues.correo,
              direccion: usuario.dataValues.direccion,
              direccion_op: usuario.dataValues.direccion_op,
              celular: usuario.dataValues.celular
            };
            let token = jwt.sign(usuarioToken, process.env.SECRET_KEY);
            res.json({
              usuarioToken: usuarioToken,
              token: token
            });
          })
          .catch((error) => {
            res.json({ error, mensaje: 'Ocurrio un problema en el registro' });
          });
      } else {
        res.json({ mensaje: 'Usuario ya registrado con este correo' });
      }
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});

//EDITAR USUARIO SIN PASSWORD
usuarios.put('/editar/:id', (req, res) => {
  const usuario = req.body.usuario;
  const usuarioData = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    direccion: usuario.direccion,
    direccion_op: usuario.direccion_op,
    celular: usuario.celular
  };
  Usuario.findOne({ where: { correo: usuarioData.correo } })
    .then((usuario) => {
      if (usuario.correo != usuarioData.correo) {
        Usuario.update(usuarioData, { where: { id: req.params.id } })
          .then((filasUpdate) => {
            return res.json({
              filas: filasUpdate
            });
          })
          .catch((error) => {
            return res.send('error ' + error);
          });
      } else {
        return res.json({ error: 'Usuario ya registrado con este correo' });
      }
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});

module.exports = usuarios;
