const logicaDB = require('./logica');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob')
const nodemailer = require('nodemailer');

const inicioSesion = async(req,res) => {
    const acceso = req.body
    try{
        let existe = await logicaDB.obtenerAccesoClientePorCorreoDB(acceso.correo)
        if(existe){
            if(bcrypt.compareSync(acceso.password,existe.password)){
                delete existe.dataValues.password
                let token = jwt.sign(existe.dataValues, process.env.SECRET_KEY,{
                    expiresIn:'7d'
                })
                return res.status(200).json({error:false,token,mensaje:'Acceso Correcto'})
            }else{
                return res.status(200).json({error:true,mensaje:'Contraseña Incorrecta'})
            }
        }else{
            return res.status(200).json({error:true,mensaje:'No existe este Acceso Cliente'})
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
// obtener carpetas por id padre
const obtenerSubCarpetas = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let carpeta_padre = await logicaDB.obtenerCarpetaPadrePorClienteDB(id_cliente)
        if(carpeta_padre){
            let carpetas = await logicaDB.obtenerCarpetasPorCarpetaPadreDB(carpeta_padre.id)
            return res.status(200).json({carpetas,id_padre:carpeta_padre.id})
        }else{
            return res.status(200).json({mensaje:'No Existen Carpetas asociadas'})
        }
    }catch(error){
        return res.status(500).json({error})
    }
}
//obtener carpetas por capetapdreId (misma instancia)
const obtenerCarpetasHijos = async(req,res) => {
    let id_carpeta_padre = req.params.id_carpeta_padre
    try{
        let documentos = await logicaDB.obtenerDocumentosCarpetaPadreIdDB(id_carpeta_padre)
        if(documentos.length >0){
            return res.status(200).json({carpetas:[],documentos})
        }else{
            let carpetas = await logicaDB.obtenerCarpetasPorCarpetaIdDB(id_carpeta_padre)
            return res.status(200).json({carpetas,documentos:[]})
        }
    }catch(error){
        return res.status(500).json({error})
    }
}
//busqueda en documentos
const buscarEnDocumentos = async(req,res) => {
    let busca = req.params.busca
    let id_carpeta = req.params.id_carpeta
    if(busca != null){
        try{
            let documentos = await logicaDB.buscarEnDocumentosDB(id_carpeta,busca)
            return res.status(200).json({documentos})
        }catch(error){
            return res.status(500).json({error})
        }
    }else{
        try{
            let documentos = await logicaDB.obtenerDocumentosCarpetaPadreIdDB(id_carpeta)
            return res.json({documentos})
        }catch(error){
            return res.status(500).json({error})
        }
    }
}
//Ruta para el inicio
const obtenerDatosParaInicio = async(req,res) => {
    let cantidad_dia = 0
    let total_documentos = 0
    let total_semana_documentos = 0
    let id_cliente = req.params.id_cliente
    let fecha_dia = new Date()
    let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
    let fecha_formt_semana = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
    try{
        let doc_subida = await logicaDB.obtenerDocumentosubidaPorClienteDB(id_cliente,fecha_formateada)
        let primer_dia_semana = new Date(fecha_formt_semana.setDate(fecha_formt_semana.getDate() - fecha_formt_semana.getDay()+1) )
        let ultimo_dia_semana = new Date(fecha_formt_semana.setDate(fecha_formt_semana.getDate() - fecha_formt_semana.getDay()+7))
        let doc_subidos = await logicaDB.obtenerDocumentosSubidosPorClienteDB(primer_dia_semana,ultimo_dia_semana,id_cliente)
        if(doc_subidos.length > 0){
            doc_subidos.forEach(e => {
                total_semana_documentos = total_semana_documentos+e.cantidad
            })
        }
        if(doc_subida){
            cantidad_dia = doc_subida.cantidad
        }
        let carpeta_padre = await logicaDB.obtenerCarpetaPadrePorClienteDB(id_cliente)
        if(carpeta_padre){
            total_documentos = carpeta_padre.cant_documento
        }
        return res.status(200).json({cantidad_dia, total_documentos, total_semana_documentos})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronogramas = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let cronogramas = await logicaDB.obtenerCronogramasPorClienteDB(id_cliente)
        return res.status(200).json({cronogramas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCronograma = async(req,res) => {
    let id_cronograma = req.params.id_cronograma
    try{
        let cronograma = await logicaDB.obtenerCronogramaDB(id_cronograma)
        return res.status(200).json({cronograma})
    }catch(error){
        return res.status(500).json({error})
    }
}

const enviarMailClienteCronograma = async(req,res) => {
    let data = req.body.mail;
    console.log(data);
    try {
        const transporter = nodemailer.createTransport({
            host: 'mail.aseolimpiecito.cl',
            port: 465,
            secureConnection: true,
            auth: { user: 'no-reply@aseolimpiecito.cl', pass: 'limpiecito-2020-noreply' },
            tls: { rejectUnauthorized: false }
        });
        const mailOptions = {
            from: 'no-reply@aseolimpiecito.cl',
            to: 'soporte@waliex.com',
            subject: data.nombre+' De la empresa '+data.empresa+' tienne requerimientos',
            text: `Se ha solicitado lo siguiente desde sistema Cliente Aseo Limpiecito. 
                Nombre Solicitante: ${data.nombre}
                Correo Solicitante: ${data.correo}
                Empresa: ${data.empresa}
                Tarea: ${data.tarea}
                Jornada: ${data.jornada}
                Otra Información: ${data.otros}
                Saludos, desde sistema Cliente (EXTRANET) Aseo Limpiecito
                `
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              return res.json({ 
                error, mensaje: 'Ocurrio un problema al enviar el correo',
                estado: false });
            } else {
              // console.log("Email enviado")
              return res.json({ 
                mensaje: 'Requerimiento enviado correctamente',
                estado: true });
            }
        });

    } catch (error) {
        return res.send('error:'+error)
    }
}

module.exports = {
    inicioSesion,
    obtenerSubCarpetas,
    obtenerCarpetasHijos,
    buscarEnDocumentos,
    obtenerDatosParaInicio,
    obtenerCronogramas,
    obtenerCronograma,
    enviarMailClienteCronograma
}