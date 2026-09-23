const logicaDB = require('./logica')

const crearCheckeo = async(req,res) => {
    let checkeo_crear = req.body.checkeo
    try{
        let checkeo = await logicaDB.crearCheckeoDB(checkeo_crear)
        return res.status(200).json({checkeo})
    }catch(error){
        return res.status(500).json({error})
    }
}

const editarCheckeo = async(req,res) => {
    let id_checkeo = req.params.id_checkeo
    let checkeo_edit = req.body.checkeo
    try{
        let filas = await logicaDB.editarCheckeoDB(id_checkeo,checkeo_edit)
        return res.status(200).json({filas})
    }catch(error){
        return res.status(500).json({error})
    }
}

const eliminarChekeo = async(req,res) => {
    let id_checkeo = req.params.id_checkeo
    try{
        let filas = await logicaDB.eliminarChekeoDB(id_checkeo)
        return res.status(200).json({filas})
    }catch(error){
        return res.status(500).json({error})
    }
}

module.exports = {
    crearCheckeo,
    editarCheckeo,
    eliminarChekeo
}