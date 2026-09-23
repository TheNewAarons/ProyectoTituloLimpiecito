const express = require('express')
const documentos = express.Router()
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

//MODELOS
const Carpeta = require('../../modelos/sist_doc_cliente/Carpeta')
const Carpeta_padre = require('../../modelos/sist_doc_cliente/Carpeta_padre')
const Documento = require('../../modelos/sist_doc_cliente/Doc_cliente')
const Doc_subida = require('../../modelos/sist_doc_cliente/Doc_subido');

//OBTENER CARPETAS POR ID PADRE
documentos.get('/obtener_sub_carpetas/:id_cliente',async(req,res)=>{
    let id_cliente = req.params.id_cliente
    try{
        let carpeta_padre = await Carpeta_padre.findOne({
            where:{
                clienteId:id_cliente
            }
        })
        if(carpeta_padre){
            let carpetas = await Carpeta.findAll({
                where:{padreId:carpeta_padre.id}
            })
            return res.json({carpetas,id_padre:carpeta_padre.id})
        }else{
            return res.json({mensaje:'No Existen Carpetas asociadas'})
        }
    }catch(error){
        return res.status(500).json({error})
    }
})

//OBTENER CARPETAS POR CARPETAPADREID ( MISMA INSTANCIA)
documentos.get('/obtener_carpetas_hijos/:id_carpeta_padre',async(req,res)=>{
    let id_carpeta_padre = req.params.id_carpeta_padre
    let documentos = await Documento.findAll({where:{carpetaId:id_carpeta_padre}})
    if(documentos.length > 0){
        return res.json({carpetas:[],documentos})
    }else{
        Carpeta.findAll({
            where:{
                carpetaPadreId: id_carpeta_padre
            }
        })
        .then(carpetas=>{
            return res.json({carpetas, documentos:[]})
        })
        .catch(error =>{
            return res.status(500).json({error})
        })
    }
})

//BUSQUEDA EN DOCUMENTOS
documentos.get('/buscar_documentos/:id_carpeta/:busca?',async(req,res)=>{
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

/** RUTAS PARA EL INICIO  */
documentos.get('/obtener_datos_inicio/:id_cliente', async(req,res)=>{
    let cantidad_dia = 0
    let total_documentos = 0
    let total_semana_documentos = 0
    let id_cliente = req.params.id_cliente
    let fecha_dia = new Date()
    let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
    let fecha_formt_semana = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
    let doc_subida = await Doc_subida.findOne({where:{clienteId:id_cliente, fecha:fecha_formateada}})
    let primer_dia_semana = new Date(fecha_formt_semana.setDate(fecha_formt_semana.getDate() - fecha_formt_semana.getDay()+1) )
    let ultimo_dia_semana = new Date(fecha_formt_semana.setDate(fecha_formt_semana.getDate() - fecha_formt_semana.getDay()+7))
    let doc_subidos = await Doc_subida.findAll({where:{ 
        fecha:{
            [Op.gte]:primer_dia_semana,
            [Op.lte]:ultimo_dia_semana,
        },
        clienteId:id_cliente
    }})
    if(doc_subidos.length > 0){
        doc_subidos.forEach(e => {
            total_semana_documentos = total_semana_documentos+e.cantidad
        })
    }
    if(doc_subida){
        cantidad_dia = doc_subida.cantidad
    }
    let carpeta_padre = await Carpeta_padre.findOne({where:{clienteId:id_cliente}})
    if(carpeta_padre){
        total_documentos = carpeta_padre.cant_documento
    }
    
    return res.json({cantidad_dia, total_documentos, total_semana_documentos})
})

module.exports = documentos