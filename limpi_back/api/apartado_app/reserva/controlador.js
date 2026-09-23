const logicaDB = require('./logica')

//PARA EL CORREO
const nodemailer = require("nodemailer");

const obtenerReservaProceso = async(req,res) => {
    try{
        let reservas = await logicaDB.obtenerReservaProcesoDB(req.params.idCate)
        return res.json({reservas})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerReservaAprobada = async(req,res) => {
    try{
        let reservas = await logicaDB.obtenerReservaAprobadaDB(req.params.idCate)
        return res.json({reservas})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerReservaFinalizada = async(req,res) => {
    try{
        let reservas = await logicaDB.obtenerReservaFinalizadaDB(req.params.idCate)
        return res.json({reservas})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerReservaRechazada = async(req,res) => {
    try{
        let reservas = await logicaDB.obtenerReservaRechazadaDB(req.params.idCate)
        return res.json({reservas})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerReservaId = async(req,res) => {
    try{
        let reserva = await logicaDB.obtenerReservaIdDB(req.params.idReserva)
    }catch(error){
        return res.send('error'+error)
    }
}

const aprobarReserva = async(req,res) => {

    try{
        let reserva = await logicaDB.obtenerReservaIdDB(req.params.idReserva)
        let usuario = await logicaDB.obtenerUsuarioIdDB(reserva.usuarioAppId)
        let servicio = await logicaDB.obtenerServicioIdDB(reserva.servicioId)

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
          const mailOptions = {
              from:"no-reply@aseolimpiecito.cl",
              to: usuario.correo,
              subject:"Confirmación de reserva exitosa",
              text: 'Has Realizado una reserva en la Aplicación móvil de Limpiecito.',
              html: `Hola ${usuario.nombre}!<br>
              Le informamos que tu reserva con n° de orden ${reserva.orden} correspondiente al servicio de ${servicio.nombre}, ha sido reservada exitosamente para el día ${reserva.fecha_reserva} a las ${reserva.hora_inicio}hrs.<br> 
              El cúal tiene un valor equivalente de $${reserva.precio} a cancelar mediante ${reserva.metodo_pago}.<br>
              ¡Muchas Gracias por su reseva!<br>`,
          }
          transporter.sendMail(mailOptions, (error,info)=>{
            if(error){
                console.log(error)
            }
          })
          let filas = await logicaDB.aprobarReservaDB(req.params.idReserva)
          return res.json({filas})
    }catch(error){
        return res.json({error})
    }
}

const rechazarReserva = async(req,res) => {
    try{
        let filas = await logicaDB.rechazarReservaDB(req.params.idReserva)
        return res.json({filas})
    }catch(error){
        return res.json({error})
    }
}

const finalizarReserva = async(req,res) => {
    try{
        let filas = await logicaDB.finalizarReservaDB(req.params.idReserva)
        return res.json({filas})
    }catch(error){
        return res.json({error})
    }
}

const obtenerReservasUsuarioEstado = async(req,res) => {
    try{
        if(req.params.estado != 'null'){
            let reservas = await logicaDB.obtenerReservaUsuarioEstadoDB(req.params.idUsuario,req.params.estado)
            return res.json({reservas})
        }else{
            let reservas = await logicaDB.obtenerReservaUsuarioDB(req.params.idUsuario)
            return res.json({reservas})
        }
    }catch(error){
        return res.send('error'+error)
    }
}

module.exports = {
    obtenerReservaProceso,
    obtenerReservaAprobada,
    obtenerReservaFinalizada,
    obtenerReservaRechazada,
    obtenerReservaId,
    aprobarReserva,
    rechazarReserva,
    finalizarReserva,
    obtenerReservasUsuarioEstado
}