const logicaDB = require('./logica')
const axios = require('axios')

const crearDocumento = async(req,res) => {
    let id_cliente = req.params.id_cliente
    let ruta = req.params.ruta
    let lista_documentos = req.body.lista_documentos
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
            let documento = await logicaDB.crearDocumentoDB(documentoData)
            if(documento){
                cantidad++
                await logicaDB.aumentarCantDocumentoCarpetaDB(id_cliente)
                let ruta_documento = ruta+'-'+lista_documentos[i].nombre
                let fecha_formateada = new Date(`${fecha_dia.getFullYear()}/${fecha_dia.getMonth()+1}/${fecha_dia.getDate()}`)
                let docSubidaData = {
                    ruta: ruta_documento,
                    fecha: fecha_formateada,
                    clienteId: req.params.id_cliente
                }
                await logicaDB.crearDocSubidaDB(docSubidaData)
            }
        }
        return res.json({cantidad})
    }catch(error){
        return res.status(500).json({error})
    }
}

const busquedaDocumentos = async(req,res) => {
    try{
        if(req.params.busca != null){
            let documentos = await logicaDB.busquedaDocumentosDB(req.params.id_carpeta,req.params.busca)
            return res.json({documentos})
        }else{
            let documentos = await logicaDB.obtenerDocumentosDB(req.params.id_carpeta)
            return res.json({documentos})
        }
    }catch(error){
        return res.status(500).json({error})
    }
}

const eliminarDocumento = async(req,res) => {
    let id_cliente = req.params.id_cliente
    try{
        let cant_eliminado = await logicaDB.eliminarDocumentoDB(req.params.id_documento)
        if(cant_eliminado === 1){
            await logicaDB.disminuirCantDocumentoCarpetaDB(id_cliente)
            let respuesta = await axios.delete('http://localhost:3300/api-archivo/archivo/eliminar-archivo/'+req.params.nombre_archivo)
            let docs = await logicaDB.obtenerDocumentosDB(req.params.id_carpeta)
            return res.json({cant_eliminado, documentos:docs})
        }else{
            return res.status(500).json({error:'no elimino'})
        }
    }catch(error){
        return res.status(500).json({error})
    }
}

module.exports = {
    crearDocumento,
    busquedaDocumentos,
    eliminarDocumento
}