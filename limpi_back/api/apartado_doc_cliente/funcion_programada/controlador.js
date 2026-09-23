const logicaDB = require('./logica')
//PARA EL CORREO
const nodemailer = require("nodemailer")

const mandarCorreo = async() => {
    let fecha_dia = new Date()
    let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
    let clientes_con_doc = await logicaDB.obtenerDocSubidaPorFechaDB(fecha_formateada)
    if(clientes_con_doc.length > 0){
        let distintos_usuarios = await logicaDB.obtenerClientesDB()
        if(distintos_usuarios.length > 0){
            for(i=0; i < distintos_usuarios.length; i ++){
                let accesos = await logicaDB.obtenerAccesosDB(distintos_usuarios[i].DISTINCT)
                if(accesos.length > 0){
                    for(j=0; j < accesos.length; j++){
                        let lista = ''
                        let rutas = await logicaDB.obtenerDocSubidaFechaClienteDB(fecha_formateada, distintos_usuarios[i].DISTINCT)
                        // ENVIAR CORREO A CADA UNO
                        rutas.forEach(element => {
                            let pre = `<li>${element.dataValues.ruta}</li>`
                            lista = lista+pre
                        });
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
                            to: accesos[j].correo,
                            subject:"Aviso de subida de documentos",
                            // text: `El día de hoy ${fecha_dia.getDate()}/${fecha_dia.getMonth()+1}/${fecha_dia.getFullYear()}, se han subido los siguientes documentos:`,
                            html: ` El día de hoy ${fecha_dia.getDate()}/${fecha_dia.getMonth()+1}/${fecha_dia.getFullYear()}, se han subido los siguientes documentos:
                            ${lista}`
                        }
                        await transporter.sendMail(mailOptionsEmpresa, (error,info)=>{
                            if(error){
                                console.log(error)
                            }
                        })
                    }
                }
            }
        }
    }
}

const vaciar_tabla = async() =>{
    await logicaDB.limpiarDocSubidaDB()
}

module.exports = {
    mandarCorreo,
    vaciar_tabla
}