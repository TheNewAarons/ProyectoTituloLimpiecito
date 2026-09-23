const logicaDB = require('./logica')
const fs = require('fs');
const path = require('path');

const crearInstructivo = async(req,res) => {
    const { nombre , categoriaServicioId } = req.body;

    const instructivoData = {
        nombre: nombre,
        url: req.file.path,
        categoriaServicioId: categoriaServicioId
    };
    try{
        let instructivo = await logicaDB.crearInstructivoDB(instructivoData)
        return res.json({ mensaje: 'Instructivo creado correctamente', instructivo});
    }catch(error){
        fs.unlinkSync(path.resolve(req.file.path));
        return res.status(400).json({ error, mensaje: 'Ocurrio un problema al crear el instructivo' });
    }
}

const editarInstructivo = async(req,res) => {
    const { nombre } = req.body;
    try{
        let instructivo = await logicaDB.obtenerInstructivoIdDB(req.params.idInstructivo)
        if (instructivo) {
            let instructivoData = {
              nombre: nombre,
              //imagen: req.file.path,
            };
            if (req.file) {
              instructivoData.url = req.file.path;
              fs.unlinkSync(path.resolve(instructivo.url));
            }
            let filas = await logicaDB.editarInstructivoDB(instructivoData,req.params.idInstructivo)
            return res.json({ filas, mensaje: 'Instructivo Editado Correctamente' });
          } else {
            fs.unlinkSync(path.resolve(req.file.path));
            return res.json({ mensaje: 'El instructivo ha editar no existe' });
          }
    }catch(error){
        fs.unlinkSync(path.resolve(req.file.path));
        return res.json({ mensaje: 'El instructivo ha editar no existe' });
    }
}

const obtenerInstructivos = async(req,res) => {
    try{
        let instructivos = await logicaDB.obtenerInstructivosDB()
        return res.json({instructivos})
    }catch(error){
        return res.json({error})
    }
}

const obtenerInstructivoId = async(req,res) => {
    try{
        let instructivo = await logicaDB.obtenerInstructivoIdDB(req.params.idInstructivo)
        return res.json({instructivo})
    }catch(error){
        return res.json({error})
    }
}

const eliminarInstructivo = async(req,res) => {
    try{
        let instructivo = await logicaDB.obtenerInstructivoIdDB(req.params.idInstructivo)
        let filas = logicaDB.eliminarInstructivoDB(req.params.idInstructivo)
        if(filas > 0){
            fs.unlinkSync(path.resolve(instructivo.url));
        }else{
            return res.json({filas, mensaje:"Instructivo Eliminado Correctamente"})
        }
    }catch(error){
        return res.json({error})
    }
}

module.exports = {
    crearInstructivo,
    editarInstructivo,
    obtenerInstructivos,
    obtenerInstructivoId,
    eliminarInstructivo
}