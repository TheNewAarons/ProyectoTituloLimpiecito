const logicaDB = require('./logica')

const crearCarpetaPadre = async(req,res) => {
    let id_cliente = req.body.id_cliente
    const carpeta_padreData = {
        cant_documento:0,
        clienteId: id_cliente
    }
    try{
        let carpeta_padre = await logicaDB.crearCarpetaPadreDB(carpeta_padreData)
        return res.json({carpeta_padre})
    }catch(error){
        return res.status(500).json({error})
    }
}

module.exports = {
    crearCarpetaPadre
}