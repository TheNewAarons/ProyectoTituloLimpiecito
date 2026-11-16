const express = require('express');
const contactanos_web = express.Router();
const nodemailer = require('nodemailer');
const { crearTransporte } = require('../../services/correo/transporte');



contactanos_web.post('/contactanos', async (req, res) => {

    const contacto = req.body;

        var transporter = crearTransporte();
    
        console.log(contacto.nombre);
        console.log(contacto.email);

        //console.log('primero',JSON.parse(req.body.contacto));  

        //console.log('segundo',body);   

        const mailOptions = {
            from: '"Formulario Limpiecito" <no-reply@aseolimpiecito.cl>', // sender address
            to: "contacto@aseolimpiecito.cl", // list of receivers
            subject: "✔ Mensaje Aseo Limpiecito solicitud desde contacto ✔", // Subject line
            text: "Tienes una solicitud de contacto desde formulario Aseolimpiecito.cl", // plain text body
            html: `<b>Han solicitado información desde el formulario de contacto.</b><br> 
                   Seño(@)r. <b>${contacto.nombre}</b> con correo <b>${contacto.email}</b> ha escrito <b>${contacto.mensaje}</b><br>
                   número contacto <b>${contacto.celular}</b>
            ` // html body
            
        };
        console.log('mail',mailOptions);

        await transporter.sendMail(mailOptions, function(err, info) {
            if (err)
                console.log(err)

            else{
                console.log(info);
                return res.json({info});
            }
        });

    });

    module.exports = contactanos_web;