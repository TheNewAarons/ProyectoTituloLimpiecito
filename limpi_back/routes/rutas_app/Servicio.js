const express = require('express');
const servicios = express.Router();

const Servicio = require('../../modelos/sist_app/Servicio');
const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');
const Horario = require('../../modelos/sist_app/Horario');
const Dia = require('../../modelos/sist_app/Dia')
const Bloque = require('../../modelos/sist_app/Bloque');

//DEFINICION DE ASOCIACIONES
Servicio.belongsTo(Cate_servicio);
Horario.hasMany(Dia)

//OBTENER SERVICIO POR ID
servicios.get('/obtener-servicio/:idServicio', async (req, res) => {
  Servicio.findById(req.params.idServicio,
    {include:[
      { model:Cate_servicio,
        include:[Horario]
      }]})
    .then((servicio) => {
      if (servicio) {
        return res.json({ servicio });
      } else {
        return res.json({ mensaje: 'El servicio ha obtener no existe' });
      }
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

module.exports = servicios;
