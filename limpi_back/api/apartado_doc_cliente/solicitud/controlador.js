//PARA EL CORREO
const nodemailer = require("nodemailer")

const solicitudCronograma = async(req,res) => {
    let solicitud = req.body;

    try {
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
            to: "contactanos@aseolimpiecito.cl",
            cc: solicitud.correo,
            subject: solicitud.asunto,
            // text: `El día de hoy ${fecha_dia.getDate()}/${fecha_dia.getMonth()+1}/${fecha_dia.getFullYear()}, se han subido los siguientes documentos:`,
            html: `Geanial!. Se ha realizado una solicitud de actividades. Los datos involucrados son: <br>
            Solicitante: ${solicitud.solicitante} <br>
            Correo: ${solicitud.correo} <br>
            Empresa: ${solicitud.empresa}<br>
            Área: ${solicitud.area} <br>
            Sector: ${solicitud.sector} <br>
            Actividades: ${solicitud.actividades} <br>
            *Mensaje enviado con copia a los participantes involucrados. <br>
            Saludos.
            `
        }
        await transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
            if(error){
                console.log(error)
            }
        })
        return res.status(200).json({
            'mensaje':"Correo enviado",
            'realizado':true
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({error})
    }

}

module.exports = {
    solicitudCronograma
}