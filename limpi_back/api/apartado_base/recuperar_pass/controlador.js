const logicaDB = require('./logica');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const atob = require('atob');
const recuperacion = require('../../../services/seguridad/recuperacion');
const Usuario = require('../../../modelos/sistema_base/Usuario');

const recuperarPassword = async (req, res) => {
  let correo = req.body.correo;
  try {
    let usuario = await logicaDB.buscarUsuarioCorreoDB(correo);
    if (usuario) {
      let token = recuperacion.firmar(usuario, recuperacion.PROPOSITO.USUARIO);
      // let url = "http://localhost:4200/#/sistema/recuperar-password/"+token
      let url = 'https://www.minda.aseolimpiecito.cl/#/sistema/recuperar-password/' + token;
      const transporter = nodemailer.createTransport({
        host: 'mail.aseolimpiecito.cl',
        port: 465,
        secureConnection: true,
        auth: { user: 'no-reply@aseolimpiecito.cl', pass: 'limpiecito-2020-noreply' },
        tls: { rejectUnauthorized: false }
      });
      const mailOptions = {
        from: 'no-reply@aseolimpiecito.cl',
        to: correo,
        subject: 'Solicitud de recuperaración de contraseña',
        text: `Para cambiar tu contraseña debes ingresar al siguiente enlace ${url} , ten encuenta que la duracion de este enlace sera de 1 hora, a partir de la hora de recepción de este correo!`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.json({ error, mensaje: 'Ocurrio un problema al enviar el correo' });
        } else {
          // console.log("Email enviado")
          return res.json({ mensaje: 'Se ha enviado un correo con las indicaciones para recuperar contraseña!' });
        }
      });
    } else {
      return res.json({ mensaje: 'Este correo no existe en nuestros registros o no cuenta con los permisos para recuperar la contraseña!' });
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const cambiarPassword = async (req, res) => {
  // Solo vale el token del correo; id/correo/pass del body se ignoran (antes permitían cambiar la de otro usuario).
  let newPass = typeof req.body.newPass === 'string' ? atob(req.body.newPass) : '';
  if (!newPass) return res.json({ mensaje: 'Debes ingresar la nueva contraseña' });
  try {
    let usuario = await recuperacion.verificar(req.body.token, recuperacion.PROPOSITO.USUARIO, Usuario);
    if (usuario) {
      const hash = bcrypt.hashSync(newPass, 10);
      const filas = await logicaDB.cambiarPassUsuarioDB(usuario.id, hash);
      if (filas > 0) {
        return res.json({ filas, mensaje: 'Contraseña editada correctamente' });
      } else {
        return res.json({ mensaje: 'Ha ocurrido un problema' });
      }
    } else {
      return res.json({ mensaje: 'El enlace no es válido, ya se usó o expiró. Solicita uno nuevo.' });
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
};

module.exports = {
  recuperarPassword,
  cambiarPassword
};
