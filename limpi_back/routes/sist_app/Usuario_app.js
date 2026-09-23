const express = require('express');
const usuarios = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

//MODELOS
const Usuario = require('../../modelos/sist_app/Usuario_app');
const Reserva = require('../../modelos/sist_app/Reserva');

//OBTENER USUARIOS APP ACTIVOS
usuarios.get('/usuarios-activos', (req, res) => {
  Usuario.findAll({ where: { estado: 1 },order: [['id', 'DESC']] })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//OBTENER USUARIOS APP INACTIVOS
usuarios.get('/usuarios-inactivos', (req, res) => {
  Usuario.findAll({ where: { estado: 0 },order: [['id', 'DESC']] })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//ACTIVAR USUARIO APP
usuarios.delete('/activar/:idUsuario', (req, res) => {
  Usuario.update({ estado: 1 }, { where: { id: req.params.idUsuario } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//DESACTIVAR USUARIO APP
usuarios.delete('/desactivar/:idUsuario', (req, res) => {
  Usuario.update({ estado: 0 }, { where: { id: req.params.idUsuario } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//OBTENER USUARIO APP POR ID
usuarios.get('/obtener/:idUsuario', async (req,res)=>{
  Usuario.findById(req.params.idUsuario,{ attributes: ['id','nombre','correo','direccion','celular'] })
    .then(usuario => {
      return res.json({usuario})
    })
    .catch(error => {
      return res.json({error})
    })
})

//BUSCAR EN USUARIO APP POR PALABRA
usuarios.get('/busca-activo/:busca?',(req,res)=>{
  if(req.params.busca != null){
    Usuario.findAll({ 
      where: { 
        estado: 1,
        [Op.or]:[
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            correo: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            direccion: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            celular: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
        ] 
      },
      order: [['id', 'DESC']] 
    })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
  }else{
    Usuario.findAll({ where: { estado: 1 },order: [['id', 'DESC']] })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
  }
})
//BUSCAR EN USUARIO APP POR PALABRA
usuarios.get('/busca-inactivo/:busca?',(req,res)=>{
  if(req.params.busca != null){
    Usuario.findAll({ 
      where: { 
        estado: 0,
        [Op.or]:[
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            correo: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            direccion: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            celular: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
        ] 
      },
      order: [['id', 'DESC']] 
    })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
  }else{
    Usuario.findAll({ where: { estado: 0 },order: [['id', 'DESC']] })
    .then((usuarios) => {
      return res.json({ usuarios });
    })
    .catch((error) => {
      return res.json({ error });
    });
  }
})

module.exports = usuarios;
