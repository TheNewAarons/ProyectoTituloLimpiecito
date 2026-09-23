const express = require('express')
const carpeta_padres = express.Router()

//MODELOS
const Carpeta_padre = require('../../modelos/sist_doc_cliente/Carpeta_padre')

//CREAR CARPETA PADRE
carpeta_padres.post('/crear', async (req,res)=>{
    let id_cliente = req.body.id_cliente
    const carpeta_padreData = {
        cant_documento:0,
        clienteId: id_cliente
    }
    Carpeta_padre.create(carpeta_padreData)
    .then((carpetaPadre)=>{
        return res.json({carpeta_padre:carpetaPadre})
    })
    .catch((error)=>{
        return res.status(500).json({error})
    })
})

module.exports = carpeta_padres