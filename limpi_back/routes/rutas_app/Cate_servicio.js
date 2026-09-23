const express = require('express');
const cate_servicios = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

//MODELOS
const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');
const Servicio = require('../../modelos/sist_app/Servicio');
const Articulo = require('../../modelos/sist_app/Articulo');
const Descripcion = require('../../modelos/sist_app/Descripcion');
const Herramienta = require('../../modelos/sist_app/Herramienta');
const Horario = require('../../modelos/sist_app/Horario');
const Bloque = require('../../modelos/sist_app/Bloque');
const Img_extra = require('../../modelos/sist_app/Img_extra')
const Instructivo = require('../../modelos/sist_app/Instructivo');
const Dia = require('../../modelos/sist_app/Dia');

Cate_servicio.hasOne(Instructivo)

//OBTENER CATEGORIAS SERVICIOS ACTIVOS ----
cate_servicios.get('/obtener-cate-serv-activos', async (req, res) => {
  Cate_servicio.findAll({ where: { estado: 1 } })
    .then((cate_servicios) => {
      return res.json({ cate_servicios });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER CATEGORIAS SERVICIOS POR ID ----
cate_servicios.get('/obtener-cate-serv/:idCategoria', async (req, res) => {
  Cate_servicio.findOne({
    where: { id: req.params.idCategoria },
    include: [{ model: Servicio }, { model: Herramienta }, { model: Descripcion }, { model: Articulo },{model:Img_extra},{model:Instructivo}]
  })
    .then((cate_servicio) => {
      return res.json({ cate_servicio });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER CATEGORIAS SERVICIOS POR ID SOLO SERVICIOS ----
cate_servicios.get('/ob-serv-cate/:idCategoria', async (req, res) => {
  Cate_servicio.findOne({
    where: { id: req.params.idCategoria },
    include: [{ model: Servicio }]
  })
    .then((cate_servicio) => {
      return res.json({ cate_servicio });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER CATEGORIAS SERVICIOS POR ID PARA CONTRATAR TRAE CATEGORIA CON HORARIO, DIAS Y SERVICIOS
cate_servicios.get('/obtener-categoria/:idCategoria', async (req, res) => {
  Cate_servicio.findById(req.params.idCategoria, {
    include: [{ 
      model: Horario,
      include: [{
        model:Dia,
        include:[Bloque]
      }]
    }]
  })
  .then((categoria) => {
    if (categoria) {
      return res.json({ categoria });
    } else {
      return res.json({ mensaje: 'La categoria ha obtener no existe' });
    }
  })
  .catch((error) => {
    return res.send('error: ' + error);
  });
});

module.exports = cate_servicios;
