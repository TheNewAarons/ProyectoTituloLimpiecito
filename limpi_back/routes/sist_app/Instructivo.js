const express = require('express');
const instructivos = express.Router();
const multer = require('../../libs/multer-instructivo');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Instructivo = require('../../modelos/sist_app/Instructivo')

//CREAR INSTRUCTIVO
instructivos.post('/crear', multer.single('image'), async (req, res) => {
  const { nombre , categoriaServicioId } = req.body;

    const instructivoData = {
        nombre: nombre,
        url: req.file.path,
        categoriaServicioId: categoriaServicioId
    };
    Instructivo.create(instructivoData)
    .then(instructivo=>{
        return res.json({ mensaje: 'Instructivo creado correctamente', instructivo});
    })
    .catch(error => {
        fs.unlinkSync(path.resolve(req.file.path));
        return res.status(400).json({ error, mensaje: 'Ocurrio un problema al crear el instructivo' });
    })
});

//EDITAR INSTRUCTIVO
instructivos.put('/editar/:idInstructivo', multer.single('image'), async (req, res) => {
  const { nombre } = req.body;
  const instructivo = await Instructivo.findById(req.params.idInstructivo);
  if (instructivo) {
    let instructivoData = {
      nombre: nombre,
      //imagen: req.file.path,
    };
    if (req.file) {
      instructivoData.url = req.file.path;
      fs.unlinkSync(path.resolve(instructivo.url));
    }
    Instructivo.update(instructivoData, { where: { id: req.params.idInstructivo } })
      .then((filas) => {
        return res.json({ filas, mensaje: 'Instructivo Editado Correctamente' });
      })
      .catch((error) => {
        fs.unlinkSync(path.resolve(req.file.path));
        return res.send('error: ' + error);
      });
  } else {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'El instructivo ha editar no existe' });
  }
});

//OBTENER INSTRUCTIVOS
instructivos.get('/obtener-instructivos', async (req, res) => {
    Instructivo.findAll()
    .then(instructivos => {
        return res.json({instructivos})
    })
    .catch(error => {
        return res.json({error})
    })
});

//OBTENER INSTRUCTIVO POR ID 
instructivos.get('/obtener-instructivo/:idInstructivo', async (req,res)=>{
    Instructivo.findById(req.params.idInstructivo)
    .then(instructivo => {
        return res.json({instructivo})
    })
    .catch(error => {
        return res.json({error})
    })
})

//ELIMINAR INSTRUCTIVO POR ID 
instructivos.delete('/eliminar-instructivo/:idInstructivo', async(req,res)=>{
    const instructivo = await Instructivo.findById(req.params.idInstructivo);
    Instructivo.destroy({where:{id:req.params.idInstructivo}})
    .then(filas =>{
        if(filas> 0){
            fs.unlinkSync(path.resolve(instructivo.url));
        }
        return res.json({filas, mensaje:"Instructivo Eliminado Correctamente"})
    })
    .catch(error => {
        return res.json({error})
    })
})

module.exports = instructivos;
