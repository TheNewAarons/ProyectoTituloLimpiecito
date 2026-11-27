const express = require('express');
const reservas = express.Router();

//MODELOS
const Reserva = require('../../modelos/sist_app/Reserva');
const Servicio = require('../../modelos/sist_app/Servicio');
const Usuario = require('../../modelos/sist_app/Usuario_app');
const Extra = require('../../modelos/sist_app/Extra');
const Extra_lavado = require('../../modelos/sist_app/Extra_lavado');

const Observacion = require('../../modelos/sist_app/Observacion');

//PARA EL CORREO
const nodemailer = require("nodemailer");
const { crearTransporte } = require('../../services/correo/transporte');
const Categoria_servicio = require('../../modelos/sist_app/Categoria_servicio');

Reserva.belongsTo(Servicio);
Reserva.belongsTo(Usuario);
Reserva.hasOne(Extra);
Reserva.hasOne(Extra_lavado);
Reserva.hasMany(Observacion);

/**  ESTADOS DE RESERVA
 *   1 = FINALIZADO
 *   2 = APROBADO
 *   3 = EN PROCESO
 *   4 = RECHAZADO
 */

//OBTENER RESERVAS EN PROCESO
reservas.get('/obtener-reservas-proceso/:idCate', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio }, { model: Usuario, attributes: ['nombre','celular'] }],
    where: { estado: 3, "$servicio.categoriaServicioId$": req.params.idCate },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});
//OBTENER RESERVAS EN APROBADO
reservas.get('/obtener-reservas-aprobada/:idCate', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
    where: { estado: 2, "$servicio.categoriaServicioId$": req.params.idCate },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER RESERVAS FINALIZADAS
reservas.get('/obtener-reservas-finalizada/:idCate', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
    where: { estado: 1, "$servicio.categoriaServicioId$": req.params.idCate },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});
//OBTENER RESERVAS RECHAZADAS
reservas.get('/obtener-reservas-rechazada/:idCate', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio }, { model: Usuario , attributes: ['nombre','celular'] }],
    where: { estado: 4, "$servicio.categoriaServicioId$": req.params.idCate },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//VER RESERVA POR ID
reservas.get('/obtener-reserva/:idReserva', async (req, res) => {
  Reserva.findById(req.params.idReserva, {
    include: [{ model: Servicio,include:[Categoria_servicio] }, { model: Extra }, { model: Extra_lavado }, { model: Observacion }, { model: Usuario }]
  })
    .then((reserva) => {
      return res.json({ reserva });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//APROBAR RESERVA
reservas.delete('/aprobar-reserva/:idReserva', async (req, res) => {

  let reserva = await Reserva.findById(req.params.idReserva)
  let usuario = await Usuario.findById(reserva.usuarioAppId);
  let servicio = await Servicio.findById(reserva.servicioId);

  const transporter = crearTransporte()
  // AUT-031 (RF-BI-05): correo "reserva confirmada" con el diseño de la empresa, fecha en español y datos escapados.
  // Si no se puede armar, la reserva se aprueba igual (como antes, el correo no bloquea la aprobación).
  let mailOptions = null
  try {
    mailOptions = await require('../../services/reservas/correo-aprobada').armarCorreoAprobada({ reserva, usuario, servicio })
  } catch (e) {
    console.log('[reserva] no se pudo armar el correo de confirmacion:', e && e.message)
  }
  if (mailOptions) {
    transporter.sendMail(mailOptions, (error,info)=>{
      if(error){
          console.log(error)
      }
    })
  }

  Reserva.update({ estado: 2 }, { where: { id: req.params.idReserva } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//RECHAZAR RESERVA
reservas.delete('/rechazar-reserva/:idReserva', async (req, res) => {
  Reserva.update({ estado: 4 }, { where: { id: req.params.idReserva } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.json({ error });
    });
});
//FINALIZAR RESERVA
reservas.delete('/finalizar-reserva/:idReserva', async (req, res) => {
  Reserva.update({ estado: 1,pagado:true }, { where: { id: req.params.idReserva } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//OBTENER RESERVAS BUSQUEDA POR FECHA

//OBTENER RESERVAS ENTRE FECHAS


//OBTENER RESERVAS POR ID USUARIO Y ESTADO
reservas.get('/obtener-reservas-usuario/:idUsuario/:estado?', async (req, res) => {
  console.log(req.params)
  if(req.params.estado != 'null'){
    Reserva.findAll({
      include: [{ model: Servicio }],
      where: { estado: req.params.estado, usuarioAppId: req.params.idUsuario },
      order: [['fecha_reserva', 'ASC']]
    })
      .then((reservas) => {
        return res.json({ reservas });
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }else{
    Reserva.findAll({
      include: [{ model: Servicio }],
      where: {usuarioAppId: req.params.idUsuario },
      order: [['fecha_reserva', 'ASC']]
    })
      .then((reservas) => {
        return res.json({ reservas });
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }
});

module.exports = reservas;
