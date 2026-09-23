const express = require("express")
const recuperar_pass = express.Router()
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const atob = require('atob')

const Usuario = require('../../modelos/sistema_base/Usuario')

process.env.SECRET_KEY = 'secretazoAdmin1234'

//RECUPERAR CONTRASEÑA
recuperar_pass.post("/recuperar-password", async (req, res) => {
    let correo = req.body.correo;

    const usuario = await Usuario.findOne({where:{correo:correo}});
    if(usuario){
        let token = jwt.sign(usuario.dataValues, process.env.SECRET_KEY, {
            expiresIn: '1h'
        })
        // let url = "http://localhost:4200/#/sistema/recuperar-password/"+token
        let url = "https://www.minda.aseolimpiecito.cl/#/sistema/recuperar-password/"+token
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
            to:correo,
            subject:"Solicitud de recuperaración de contraseña",
            text:`Para cambiar tu contraseña debes ingresar al siguiente enlace ${url} , ten encuenta que la duracion de este enlace sera de 1 hora, a partir de la hora de recepción de este correo!`,
        }
        transporter.sendMail(mailOptions, (error,info)=>{
            if(error){
                return res.json({error, mensaje:"Ocurrio un problema al enviar el correo"})
            }else {
                // console.log("Email enviado")
                return res.json({mensaje:"Se ha enviado un correo con las indicaciones para recuperar contraseña!"})
            }
        })
        
    }else{
        return res.json({mensaje:'Este correo no existe en nuestros registros o no cuenta con los permisos para recuperar la contraseña!'})
    }
    
})

//CAMBIAR PASSWORD
recuperar_pass.post("/cambiar-password", async (req, res) => {
    let correo = req.body.correo
    let id = req.body.id
    let pass = req.body.pass
    let newPass = atob(req.body.newPass) 
    let usuario = await Usuario.findOne({where:{correo:correo,password:pass}}) 
    if(usuario){
        const hash = bcrypt.hashSync(newPass,10)
        const filas = await Usuario.update({password:hash},{where:{id:id}})
        if(filas > 0){
            return res.json({filas, mensaje:'Contraseña editada correctamente'})
        }else{
            return res.json({mensaje:'Ha ocurrido un problema'})
        }
    }else{
        return res.json({mensaje:'Ha ocurrido un problema con la edición'})
    } 
})

module.exports = recuperar_pass
