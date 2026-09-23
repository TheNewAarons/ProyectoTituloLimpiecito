const logicaDB = require('./logica')

const crearCarpeta = async(req,res) => {
    let carpetas = req.body.carpetas
    let cantidad = 0;
    try{
        for(let i=0;i<carpetas.length;i++){
            let carpetaData = {
                nombre:carpetas[i].nombre,
                carpetaPadreId:carpetas[i].carpetaPadreId,
                padreId:carpetas[i].padreId
            }
            let carpeta = await logicaDB.crearCarpetaDB(carpetaData)
            if(carpeta){
                cantidad++
            }
        }
        return res.json({creados:cantidad,mensaje:'Carpetas creadas correctamente'})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCarpetasIdPadre = async(req,res) => {
    let id_padre = req.params.id_padre
    try{
        let carpetas = await logicaDB.obtenerSubCarpetasDB(id_padre)
        return res.json({carpetas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const obtenerCarpetaDeCarpeta = async(req,res) => {
    let id_carpeta_padre = req.params.id_carpeta_padre
    try{
        let documentos = await logicaDB.obtenerDocumentosIdCarpetaPadreDB(id_carpeta_padre)
        if(documentos.length > 0){
            return res.json({carpetas:[],documentos})
        }else{
            let carpetas = await logicaDB.obtenerCarpetasIdCarpetaPadreDB(id_carpeta_padre)
            return res.json({carpetas, documentos:[]})
        }
    }catch(error){
        return res.status(500).json({error})
    }
}

const eliminarCarpeta = async(req,res) => {
    let id_carpeta = req.params.id_carpeta
    let id_carpeta_padre = req.params.id_carpeta_padre
    try{
        let carpetas = await logicaDB.obtenerCarpetasIdCarpetaPadreDB(id_carpeta)
        if(carpetas.length === 0){
            let documentos = await logicaDB.obtenerDocumentosIdCarpetaPadreDB(id_carpeta)
            if(documentos.length === 0){
                let eliminado_carpeta = await logicaDB.eliminarCarpetaDB(id_carpeta)
                if(eliminado_carpeta === 1){
                    let carpetas_new = await logicaDB.obtenerCarpetasIdCarpetaPadreDB(id_carpeta_padre)
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
}

module.exports = {
    crearCarpeta,
    obtenerCarpetasIdPadre,
    obtenerCarpetaDeCarpeta,
    eliminarCarpeta,
}