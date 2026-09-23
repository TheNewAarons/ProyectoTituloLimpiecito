const express = require('express')
const documentos = express.Router()
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const axios = require('axios')

//MODELOS
const Documento = require('../../modelos/sist_doc_cliente/Doc_cliente')
const Doc_subida = require('../../modelos/sist_doc_cliente/Doc_subido');
const Carpeta_padre = require('../../modelos/sist_doc_cliente/Carpeta_padre')

//CREAR DOCUMENTOS LLAMADO DESDE VENDE-ARCHIVO
documentos.post('/crear/:id_cliente/:ruta', async(req,res)=>{
    let id_cliente = req.params.id_cliente
    let ruta = req.params.ruta
    // console.log(ruta)
    let lista_documentos = req.body.documentos
    let cantidad = 0
    let fecha_dia = new Date()
    try{
        for(let i = 0;i<lista_documentos.length;i++){
            let documentoData = {
                nombre:lista_documentos[i].nombre,
                url:lista_documentos[i].url,
                fecha:lista_documentos[i].fecha,
                carpetaId:lista_documentos[i].carpetaId
            }
            let documento = await Documento.create(documentoData)
            if(documento){
                cantidad++
                await Carpeta_padre.increment('cant_documento',{by:1,where:{clienteId:id_cliente}})
                let ruta_documento = ruta+'-'+lista_documentos[i].nombre
                let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
                let docSubidaData = {
                    ruta: ruta_documento,
                    fecha: fecha_formateada,
                    clienteId: req.params.id_cliente
                }
                await Doc_subida.create(docSubidaData)
            }


            /** Crear o aumentar la instancia */
            // let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
            // let existe_doc_cliente = await Doc_subida.findOne({where:{clienteId:id_cliente, fecha:fecha_formateada}})
            // if(existe_doc_cliente){
            //     await Doc_subida.increment('cantidad',{
            //         by:1,
            //         where:{clienteId:id_cliente, fecha:fecha_formateada}
            //     })
            // }else{
            //     let docSubidaData = {
            //         cantidad:1,
            //         fecha: fecha_formateada,
            //         clienteId: req.params.id_cliente
            //     }
            //     await Doc_subida.create(docSubidaData)
            // }
        }
        return res.json({cantidad})
    }catch(error){
        return res.status(500).json({error})
    }
})
//BUSQUEDA EN DOCUMENTOS
documentos.get('/buscar-documentos/:id_carpeta/:busca?',async(req,res)=>{
    if(req.params.busca != null){
        try{
            let documentos = await Documento.findAll({
                where:{
                    carpetaId:req.params.id_carpeta,
                    [Op.or]:[
                        {  nombre:{
                            [Op.like]:'%'+ req.params.busca +'%'
                            }
                        },
                        { fecha:{
                            [Op.like]:'%'+ req.params.busca +'%'
                            }
                        }
                    ]
                }})
            return res.json({documentos})
        }catch(error){
            return res.status()
        }
    }else{
        try{
            let documentos = await Documento.findAll({where:{carpetaId:req.params.id_carpeta}})
            return res.json({documentos})
        }catch(error){
            return res.status()
        }
    }
})
//ELIMINAR INSTANCIA DE DOCUMENTO Y ARCHIVO
documentos.delete('/eliminar-documento/:id_carpeta/:id_documento/:nombre_archivo/:id_cliente',async(req,res)=>{
    let id_cliente = req.params.id_cliente
    Documento.destroy({where:{id:req.params.id_documento}})
    .then(async (cant_eliminado)=>{
        if(cant_eliminado === 1){
            await Carpeta_padre.decrement('cant_documento',{by:1,where:{clienteId:id_cliente}})
            // let respuesta = await axios.delete('https://aseolimpiecito.cl/api-archivo/archivo/eliminar-archivo/'+req.params.nombre_archivo)
            let respuesta = await axios.delete('http://localhost:3300/api-archivo/archivo/eliminar-archivo/'+req.params.nombre_archivo)
            // if(respuesta.data.eliminado === 1){
            //     console.log('entro')
            // }
            let docs = await Documento.findAll({where:{carpetaId:req.params.id_carpeta}})
            return res.json({cant_eliminado, documentos:docs})
        }else{
            return res.status(500).json({error:'no elimino'})
        }
    })
    .catch((error)=>{
        return res.status(500).json({error})
    })
})

module.exports = documentos