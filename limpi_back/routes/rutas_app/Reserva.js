const express = require('express');
const reservas = express.Router();

const Reserva = require('../../modelos/sist_app/Reserva');
const Servicio = require('../../modelos/sist_app/Servicio');

const ExtraLavado = require('../../modelos/sist_app/Extra_lavado');
const Extra = require('../../modelos/sist_app/Extra');

const Bloque = require('../../modelos/sist_app/Bloque')

//PARA EL CORREO
const nodemailer = require("nodemailer")

//WEB PAY
const WebpayPlus = require("transbank-sdk").WebpayPlus;
// WebpayPlus.configureForIntegration(597055555532,'579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C')
WebpayPlus.configureForProduction(597035985883,'027e4ca44a9bf95b0a7db601a62c1b8a')

const sequelize = require('sequelize');
const Usuario_app = require('../../modelos/sist_app/Usuario_app');
const Categoria_servicio = require('../../modelos/sist_app/Categoria_servicio');
const Op = sequelize.Op;

//PARA REALIZAR TRANSACCIONES
const sequelize_reserva = Reserva.sequelize;

// Reserva.belongsTo(Servicio);
// Reserva.belongsTo(Categoria);

/**  ESTADOS DE RESERVA
 *   1 = FINALIZADO
 *   2 = APROBADO
 *   3 = EN PROCESO
 *   4 = RECHAZADO
 */
 //CREAR RESERVA METODO WEBPAY
reservas.post('/crear', async (req, res) => {
  let reserva = req.body.reserva;
  let extra = req.body.extra;
  let id_bloque = req.body.id_bloque
  /** Se comprueba que el bloque este activo */
  let bloque_activo = await Bloque.findOne({where:{id:id_bloque, activo:true}})
  if(bloque_activo){
    const reservaData = {
      fecha_creacion: reserva.fecha_creacion,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      fecha_reserva: reserva.fecha_reserva,
      precio: reserva.precio,
      estado: reserva.estado,
      tipo: reserva.tipo,
      metodo_pago: reserva.metodo_pago,
      pagado:reserva.pagado,
      cantidad: reserva.cantidad,
      precio_total: reserva.precio_total,
      usuarioAppId: reserva.usuarioAppId,
      servicioId: reserva.servicioId
    };
    let orden_reserva = await Reserva.max('orden');
    if(!orden_reserva){
      reservaData.orden = 1
    }else{
      reservaData.orden = orden_reserva + 1
    }
    /** Web Pay */
    let buyOrder = "O-" + reservaData.orden;
    let sessionId = "S-" + Math.floor(Math.random() * 10000) + 1;
    let amount = reserva.precio_total;
    // let returnUrl = 'http://localhost:4900/api-aseo/app_lim/reserva/webpay-normal/finish'
    // let returnUrl = 'https://www.waliex.cl/api-aseo/app_lim/reserva/webpay-normal/finish'
    let returnUrl = 'https://aseolimpiecito.com/web-limpiecito/app_lim/reserva/webpay-normal/finish'
  
    const createResponse = await WebpayPlus.Transaction.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    );
    let token = createResponse.token;
    let url = createResponse.url;
    //** Fin Web Pay  */
    if(extra.marca) { 
      let extraData = {
        tipo: extra.tipo,
        marca: extra.marca,
        modelo: extra.modelo,
        patente: extra.patente,
        direccion: extra.direccion,
        celular: extra.celular,
        recibe: extra.recibe,
        reservaId: extra.reservaId
      };
      try {
        const resultado = await sequelize_reserva.transaction(async (t) => {
          const new_reserva = await Reserva.create(reservaData, { transaction: t });
          extraData.reservaId = new_reserva.dataValues.id;
          await ExtraLavado.create(extraData, { transaction: t });
          return new_reserva;
        });
        let usuario = await Usuario_app.findById(reservaData.usuarioAppId);
        let servicio = await Servicio.findById(reservaData.servicioId);
        
        const transporter = nodemailer.createTransport({
          host: 'mail.aseolimpiecito.cl',
          port: 465,
          secureConnection:true,
          auth:{
            user: 'no-reply@aseolimpiecito.cl',
            pass: 'limpiecito-2020-noreply'
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        const mailOptionsEmpresa = {
          from:"no-reply@aseolimpiecito.cl",
          to: 'app.movil@aseolimpiecito.cl',
          subject:"Aviso de reserva de servicios mediante la App",
          text: 'Han Realizado una reserva en la Aplicación móvil de Limpiecito.',
          html: `
          Han realizado una reserva con n° de orden ${resultado.orden} correspondiente al servicio de ${servicio.nombre}, que ha sido reservada exitosamente para el día ${reservaData.fecha_reserva}, en el bloque de ${resultado.hora_inicio} - ${resultado.hora_fin} hrs.<br> 
          El cúal tiene un valor equivalente de $${resultado.precio} a cancelar mediante ${resultado.metodo_pago}.<br><br>
          <b>Datos del Receptor:</b><br>
          Nombre: ${extraData.recibe} <br> 
          Correo: ${usuario.correo} <br>
          Contacto: ${extraData.celular}<br>
          Dirección: ${extraData.direccion}<br> <br>
          <b>Datos del Vehículo:</b><br>
          Tipo Vehículo: ${extraData.tipo}<br> 
          Marca: ${extraData.marca} <br>
          Modelo: ${extraData.modelo}<br>
          Patente: ${extraData.patente}<br>`,
        }
        
        transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
          if(error){
              console.log(error)
          }
        })
        return res.json({ mensaje: 'Reserva creado correctamente', reserva: resultado, url, token, inputName:'token_ws' });
      } catch (error) {
        console.log(error);
        return res.json({ error, mensaje: 'Ocurrio un problema al crear la reserva' });
      }
    } else {
      let extraData = {
        direccion: extra.direccion,
        celular: extra.celular,
        recibe: extra.recibe,
        reservaId: extra.reservaId 
      };
      try {
        const resultado = await sequelize_reserva.transaction(async (t) => {
          const new_reserva = await Reserva.create(reservaData, { transaction: t });
          extraData.reservaId = new_reserva.dataValues.id;
          await Extra.create(extraData, { transaction: t });
          return new_reserva;
        });
        let usuario = await Usuario_app.findById(reservaData.usuarioAppId);
        let servicio = await Servicio.findById(reservaData.servicioId);
        
        const transporter = nodemailer.createTransport({
          host: 'mail.aseolimpiecito.cl',
          port: 465,
          secureConnection:true,
          auth:{
            user: 'no-reply@aseolimpiecito.cl',
            pass: 'limpiecito-2020-noreply'
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        const mailOptionsEmpresa = {
          from:"no-reply@aseolimpiecito.cl",
          to: 'app.movil@aseolimpiecito.cl',
          subject:"Aviso de reserva de servicios mediante la App",
          text: 'Han Realizado una reserva en la Aplicación móvil de Limpiecito.',
          html: `
          Han realizado una reserva con n° de orden ${resultado.orden} correspondiente al servicio de ${servicio.nombre}, que ha sido reservada exitosamente para el día ${reservaData.fecha_reserva}, en el bloque de ${resultado.hora_inicio} - ${resultado.hora_fin} hrs.<br> 
          El cúal tiene un valor equivalente de $${resultado.precio} a cancelar mediante ${resultado.metodo_pago}.<br><br>
          <b>Datos del Receptor:</b><br>
          Nombre: ${extraData.recibe} <br> 
          Correo: ${usuario.correo} <br>
          Contacto: ${extraData.celular}<br>
          Dirección: ${extraData.direccion}<br>`,
        }
        transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
          if(error){
              console.log(error)
          }
        })
        return res.json({ mensaje: 'Reserva creado correctamente', reserva: resultado, url,token, inputName:'token_ws' });
      } catch (error) {
        return res.json({ error, mensaje: 'Ocurrio un problema al crear la reserva' });
      }
    }
  }
  
  else{
    return res.json({mensaje:'Bloque no disponible, por favor seleccionar otro', recarga_bloques:true})
  }
  
});

//RUTA FINISH
reservas.post('/webpay-normal/finish', async(req,res)=> {
    if(req.body.token_ws){
      let token = req.body.token_ws
      const commitResponse = await WebpayPlus.Transaction.commit(token);
      let respuesta = JSON.stringify(commitResponse)
      let numOrden = commitResponse.buy_order.split('-')
      if(commitResponse.response_code == 0){
        await Reserva.update({pagado:true},{where: {orden:numOrden[1]}})
      }
      // let url2 = `limpiecito://waliex.cl/finish?respuesta=${respuesta}`
      // let url2 = `https://www.waliex.cl/api-aseo/app_lim/reserva/webpay-final/finish2?respuesta=${respuesta}`
      let url2 = `https://aseolimpiecito.com/web-limpiecito/app_lim/reserva/webpay-final/finish2?respuesta=${respuesta}`
      // let url2 = `http://localhost:8100/wepbay-normal/finish?respuesta=${respuesta}`
      return res.render("final/final", { url2 })
    }else{
      // let token = req.body.TBK_TOKEN
      let respuesta_pre = {
        orden:req.body.TBK_ORDEN_COMPRA,
        sesion:req.body.TBK_ID_SESION,
      }
      let respuesta = JSON.stringify(respuesta_pre)
      // let url2 = `limpiecito://waliex.cl/finish?respuesta=${respuesta}`
      // let url2 = `https://www.waliex.cl/api-aseo/app_lim/reserva/webpay-final/finish2?respuesta=${respuesta}`
      let url2 = `https://aseolimpiecito.com/web-limpiecito/app_lim/reserva/webpay-final/finish2?respuesta=${respuesta}`
      // let url2 = `http://localhost:8100/wepbay-normal/finish?respuesta=${respuesta}`
      return res.render("final/final", { url2 })
    }
    
})
//RUTA TERMINO
reservas.get('/webpay-final/finish2', async(req,res)=>{
  return res.render('final/termino')
})

//CREAR RESERVA NORMAL
reservas.post('/crear-normal', async (req, res) => {
  let reserva = req.body.reserva;
  let extra = req.body.extra;
  let id_bloque = req.body.id_bloque
  /** Se comprueba que el bloque este activo */
  let bloque_activo = await Bloque.findOne({where:{id:id_bloque, activo:true}})
  if(bloque_activo){
    const reservaData = {
      fecha_creacion: reserva.fecha_creacion,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      fecha_reserva: reserva.fecha_reserva,
      precio: reserva.precio,
      estado: reserva.estado,
      tipo: reserva.tipo,
      metodo_pago: reserva.metodo_pago,
      pagado:reserva.pagado,
      cantidad: reserva.cantidad,
      precio_total: reserva.precio_total,
      usuarioAppId: reserva.usuarioAppId,
      servicioId: reserva.servicioId
    };
    let orden_reserva = await Reserva.max('orden');
    if(!orden_reserva){
      reservaData.orden = 1
    }else{
      reservaData.orden = orden_reserva + 1
    }
    if (extra.marca) {
      let extraData = {
        tipo: extra.tipo,
        marca: extra.marca,
        modelo: extra.modelo,
        patente: extra.patente,
        direccion: extra.direccion,
        celular: extra.celular,
        recibe: extra.recibe,
        reservaId: extra.reservaId
      };
      try {
        const resultado = await sequelize_reserva.transaction(async (t) => {
          const new_reserva = await Reserva.create(reservaData, { transaction: t });
          extraData.reservaId = new_reserva.dataValues.id;
          await ExtraLavado.create(extraData, { transaction: t });
          return new_reserva;
        });
        let usuario = await Usuario_app.findById(reservaData.usuarioAppId);
        let servicio = await Servicio.findById(reservaData.servicioId);
        
        const transporter = nodemailer.createTransport({
          host: 'mail.aseolimpiecito.cl',
          port: 465,
          secureConnection:true,
          auth:{
            user: 'no-reply@aseolimpiecito.cl',
            pass: 'limpiecito-2020-noreply'
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        const mailOptionsEmpresa = {
          from:"no-reply@aseolimpiecito.cl",
          to: 'app.movil@aseolimpiecito.cl',
          subject:"Aviso de reserva de servicios mediante la App",
          text: 'Han Realizado una reserva en la Aplicación móvil de Limpiecito.',
          html: `
          Han realizado una reserva con n° de orden ${resultado.orden} correspondiente al servicio de ${servicio.nombre}, que ha sido reservada exitosamente para el día ${reservaData.fecha_reserva}, en el bloque de ${resultado.hora_inicio} - ${resultado.hora_fin} hrs.<br> 
          El cúal tiene un valor equivalente de $${resultado.precio} a cancelar mediante ${resultado.metodo_pago}.<br><br>
          <b>Datos del Receptor:</b><br>
          Nombre: ${extraData.recibe} <br> 
          Correo: ${usuario.correo} <br>
          Contacto: ${extraData.celular}<br>
          Dirección: ${extraData.direccion}<br> <br>
          <b>Datos del Vehículo:</b><br>
          Tipo Vehículo: ${extraData.tipo}<br> 
          Marca: ${extraData.marca} <br>
          Modelo: ${extraData.modelo}<br>
          Patente: ${extraData.patente}<br>`,
        }
        
        transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
          if(error){
              console.log(error)
          }
        })
        return res.json({ mensaje: 'Reserva creado correctamente', reserva: resultado });
      } catch (error) {
        return res.json({ error, mensaje: 'Ocurrio un problema al crear la reserva' });
      }
    } else {
      let extraData = {
        direccion: extra.direccion,
        celular: extra.celular,
        recibe: extra.recibe,
        reservaId: extra.reservaId
      };
      try {
        const resultado = await sequelize_reserva.transaction(async (t) => {
          const new_reserva = await Reserva.create(reservaData, { transaction: t });
          extraData.reservaId = new_reserva.dataValues.id;
          await Extra.create(extraData, { transaction: t });
          return new_reserva;
        });
        let usuario = await Usuario_app.findById(reservaData.usuarioAppId);
        let servicio = await Servicio.findById(reservaData.servicioId);
        
        const transporter = nodemailer.createTransport({
          host: 'mail.aseolimpiecito.cl',
          port: 465,
          secureConnection:true,
          auth:{
            user: 'no-reply@aseolimpiecito.cl',
            pass: 'limpiecito-2020-noreply'
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        const mailOptionsEmpresa = {
          from:"no-reply@aseolimpiecito.cl",
          to: 'app.movil@aseolimpiecito.cl',
          subject:"Aviso de reserva de servicios mediante la App",
          text: 'Han Realizado una reserva en la Aplicación móvil de Limpiecito.',
          html: `
          Han realizado una reserva con n° de orden ${resultado.orden} correspondiente al servicio de ${servicio.nombre}, que ha sido reservada exitosamente para el día ${reservaData.fecha_reserva}, en el bloque de ${resultado.hora_inicio} - ${resultado.hora_fin} hrs.<br> 
          El cúal tiene un valor equivalente de $${resultado.precio} a cancelar mediante ${resultado.metodo_pago}.<br><br>
          <b>Datos del Receptor:</b><br>
          Nombre: ${extraData.recibe} <br> 
          Correo: ${usuario.correo} <br>
          Contacto: ${extraData.celular}<br>
          Dirección: ${extraData.direccion}<br>`,
        }
        transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
          if(error){
              console.log(error)
          }
        })
        return res.json({ mensaje: 'Reserva creado correctamente', reserva: resultado });
      } catch (error) {
        return res.json({ error, mensaje: 'Ocurrio un problema al crear la reserva' });
      }
    }
  }else{
    return res.json({mensaje:'Bloque no disponible, por favor seleccionar otro', recarga_bloques:true})
  }
  
});
//VER RESERVAS POR ID Y EN OTRO ESTADO != FINALIZADAS  VISTA USUARIO APP
reservas.get('/obtener-reservas/:idUsuario', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio,include:[Categoria_servicio] }],
    where: { estado: { [Op.ne]: 1 }, usuarioAppId: req.params.idUsuario },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.json({ error, mensaje: 'Ocurrio un error' });
    });
});

//VER RESERVAS POR ID USUARIO Y ESTADO == FINALIZADA   VISTA USUARIO APP
reservas.get('/obtener-reservas-finalizadas/:idUsuario', async (req, res) => {
  Reserva.findAll({
    include: [{ model: Servicio,include:[Categoria_servicio] }],
    where: { estado: 1, usuarioAppId: req.params.idUsuario },
    order: [['fecha_reserva', 'ASC']]
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.json({ error, mensaje: 'Ocurrio un error' });
    });
});

//OBTENER RESERVAS POR FECHA Y QUE SEAN APROBADA O EN PROCESO (2 o 3)  /PARA CALCULAR BLOQUES DISPONIBLES
reservas.get('/reservas-actual/:fecha/:idCategoria', async (req, res) => {
  let fecha = new Date(req.params.fecha);
  let idCategoria = req.params.idCategoria;
  Reserva.findAll({
    include:[{model:Servicio}],
    where: {
      fecha_reserva: fecha,
      "$servicio.categoriaServicioId$": idCategoria,
      [Op.or]: [{ estado: 2 }, { estado: 3 }]
    }
  })
    .then((reservas) => {
      return res.json({ reservas });
    })
    .catch((error) => {
      return res.json({ error, mensaje: 'Ocurrio un error' });
    });
});

//VER RESERVA POR ID RESERVA
reservas.get('/obtener-reserva/:idReserva', async (req, res) => {
  Reserva.findById(req.params.idReserva, {
    include: [{ model: Servicio,include:[Categoria_servicio] }, { model: ExtraLavado }, { model: Extra }]
  })
    .then((reserva) => {
      return res.json({ reserva });
    })
    .catch((error) => {
      return res.json({ error, mensaje: 'Ocurrio un error' });
    });
});

module.exports = reservas;
