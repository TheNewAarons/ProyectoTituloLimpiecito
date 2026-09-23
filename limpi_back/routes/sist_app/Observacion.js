const express = require('express');
const observaciones = express.Router();

//MODELOS
const Observacion = require('../../modelos/sist_app/Observacion');

//CREAR OBSERVACION
observaciones.post('/crear', async (req, res) => {
  let observacion = req.body.observacion;
  console.log(observacion);
  let observacionData = {
    observacion: observacion.observacion,
    fecha: observacion.fecha,
    reservaId: observacion.reservaId
  };
  Observacion.create(observacionData)
    .then((observacion) => {
      return res.json({ observacion });
    })
    .catch((error) => {
      return res.json({ error });
    });
});
//EDITAR OBSERVACION
// observaciones.put('/editar/:idObservacion',async(req,res)=>{

// })

module.exports = observaciones;
