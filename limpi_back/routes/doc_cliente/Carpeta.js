const express = require('express')
const carpetas = express.Router()

//MODELOS
const Carpeta = require('../../modelos/sist_doc_cliente/Carpeta')
const Documento = require('../../modelos/sist_doc_cliente/Doc_cliente')

//CREAR CARPETA
carpetas.post('/crear',async(req,res)=>{
    let carpetas = req.body.carpetas
    let cantidad = 0;
    try{
        for(let i=0;i<carpetas.length;i++){
            let carpetaData = {
                nombre:carpetas[i].nombre,
                carpetaPadreId:carpetas[i].carpetaPadreId,
                padreId:carpetas[i].padreId
            }
            let carpeta = await Carpeta.create(carpetaData)
            if(carpeta){
                cantidad++
            }
        }
        return res.json({creados:cantidad,mensaje:'Carpetas creadas correctamente'})
    
    }catch(error){
        return res.status(500).json({error})
    }
})

//OBTENER CARPETAS POR ID PADRE
carpetas.get('/obtener-sub-carpetas/:id_padre',async(req,res)=>{
    let id_padre = req.params.id_padre
    Carpeta.findAll({
        where:{
            padreId:id_padre
        }
    })
    .then(carpetas=>{
        return res.json({carpetas})
    })
    .catch(error =>{
        return res.status(500).json({error})
    })
})

//OBTENER CARPETAS POR CARPETAPADREID (misma instancia)
carpetas.get('/obtener-carpetas-hijos/:id_carpeta_padre',async(req,res)=>{
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
//ELIMINAR CARPETA  SOLAMENTE, SI NO TIENE NADA ASOCIADO
carpetas.delete('/eliminar-carpeta-hijo/:id_carpeta/:id_carpeta_padre',async(req,res)=>{
    let id_carpeta = req.params.id_carpeta
    let id_carpeta_padre = req.params.id_carpeta_padre
    try{
        let carpetas = await Carpeta.findAll({
            where:{carpetaPadreId:id_carpeta}
        })
        if(carpetas.length === 0){
            let documentos = await Documento.findAll({
                where:{carpetaId:id_carpeta}
            })
            if(documentos.length === 0){
                let eliminado_carpeta = await Carpeta.destroy({where:{id:id_carpeta}})
                if(eliminado_carpeta === 1){
                    let carpetas_new = await Carpeta.findAll({
                        where:{ carpetaPadreId: id_carpeta_padre }
                    })
                    return res.json({borrar:true,mensaje:'Carpeta eliminada correctamente', carpetas:carpetas_new})
                }else{
                    return res.status(500).json({error:'error'})
                }
            }else{
                return res.json({borrar:false, mensaje:'No se puede eliminar, ya que existen documentos asociados!'})
            }
        }else{
            return res.json({borrar:false, mensaje:'No se puede eliminar, ya que existen carpetas asociadas!'})
        }
    }catch(error){
        return res.status(500).json({error})
    }
})

// //prueba
// carpetas.get('/pokemones',async(req,res)=>{
//     let respuesta = await axios.get('https://pokeapi.co/api/v2/pokemon/1')
//     return res.json({respuesta:respuesta.data})
// })

module.exports = carpetas