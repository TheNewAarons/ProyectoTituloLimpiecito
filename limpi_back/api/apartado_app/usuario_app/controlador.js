const logicaDB = require('./logica')

const obtenerUsuariosAppActivos = async(req,res) => {
    try{
        let usuarios = await logicaDB.obtenerUsuariosAppActivosDB()
        return res.json({usuarios})
    }catch(error){
        return res.json({error})
    }
}

const obtenerUsuariosAppInactivos = async(req,res) => {
    try{
        let usuarios = await logicaDB.obtenerUsuariosAppInactivosDB()
        return res.json({usuarios})
    }catch(error){
        return res.json({error})
    }
}

const activarUsuarioApp = async(req,res) => {
    try{
        let filas = await logicaDB.activarUsuarioAppDB(req.params.idUsuario)
        return res.json({filas})
    }catch(error){
        return res.json({error})
    }
}

const desactivarUsuarioApp = async(req,res) => {
    try{
        let filas = await logicaDB.desactivarUsuarioAppDB(req.params.idUsuario)
        return res.json({filas})
    }catch(error){
        return res.json({error})
    }
}

const obtenerUsuarioApp = async(req,res) => {
    try{
        let usuario = await logicaDB.obtenerUsuarioAppDB(req.params.idUsuario)
        return res.json({usuario})
    }catch(error){
        return res.json({error})
    }
}

const buscaUsuarioAppActivo = async(req,res) => {
    try{
        if(req.params.busca != null){
            let usuarios = await logicaDB.buscaUsuarioAppActivoDB(req.params.busca)
            return res.json({usuarios})
        }else{
            let usuarios = await logicaDB.obtenerUsuariosAppActivosDB()
            return res.json({usuarios})
        }
    }catch(error){
        return res.json({error})
    }
}

const buscaUsuarioAppInactivoDB = async(req,res) => {
    try{
        if(req.params.busca != null){
            let usuarios = await logicaDB.buscaUsuarioAppInactivoDB(req.params.busca)
            return res.json({usuarios})
        }else{
            let usuarios = await logicaDB.obtenerUsuariosAppInactivosDB()
            return res.json({usuarios})
        }
    }catch(error){
        return res.json({error})
    }
}

module.exports = {
    obtenerUsuariosAppActivos,
    obtenerUsuariosAppInactivos,
    activarUsuarioApp,
    desactivarUsuarioApp,
    obtenerUsuarioApp,
    buscaUsuarioAppActivo,
    buscaUsuarioAppInactivoDB
}