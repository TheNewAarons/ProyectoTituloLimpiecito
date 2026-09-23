const express = require('express');
const anuncios_web = express.Router();
//para subir imagen
const multer = require('../../libs/multer_web');
const fs = require('fs');

const path = require('path');
const Sequelize = require('sequelize');
//const Op = Sequelize.Op;

//Importar modelos
const Anuncio = require('../../modelos/sistema_web/Anuncio');


//crear anuncio

anuncios_web.post('/crear_anuncio/crear', multer.single('imagen'),  async (req, res) => {
  //const anuncio = JSON.parse(req.body.anuncio);
  const { titulo, sub_titulo, descripcion, usuarioId } = req.body;

  let existe_anuncios = await Anuncio.count();

  if(existe_anuncios >= 1){
    await fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ existe: true, mensaje: 'Solo puede crear un anuncio' });
    

  }else{
    const anuncioData = {
      titulo: titulo,
      sub_titulo: sub_titulo,
      descripcion: descripcion,
      imagen: req.file.path,
      usuarioId: usuarioId
    };
  
      console.log('imprimir' + req.file.path);
    Anuncio.create(anuncioData)
      .then((anuncio) =>{
        res.json({ mensaje: 'Listo', anuncio});
      })
      .catch((error) => {
        res.send('error: ' + error);
      })
  }

  




});


//Obtener el anuncio para la pagina web
anuncios_web.get('/obtener_anuncio/obtener/', async (req, res) =>{

        let cant_anuncios = await Anuncio.count();
        Anuncio.findAll()
        .then((anuncios) => {
            return res.json({ anuncios, cant_anuncios });
          })
          .catch((error) => {
            return res.status(400).send('error: ' + error);
          });
    
    
})




//EDITAR ANUNCIO COMO INSTANCIA
anuncios_web.put('/editar_anuncio/editar/:id', async (req, res) => {
  const { titulo, sub_titulo, descripcion, usuarioId } = req.body;

  
  Anuncio.update({ titulo: titulo, sub_titulo: sub_titulo, descripcion: descripcion, usuarioId: usuarioId }, { where: { id: req.params.id } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});



//ELIMINAR ANUNCIO
anuncios_web.delete('/eliminar_anuncio/eliminar/:idAnuncio', async (req, res) => {
  const anuncio = await Anuncio.findById(req.params.idAnuncio);
  if (anuncio) {

    const result = await Anuncio.destroy({
      where: { id: req.params.idAnuncio }
    });

    if (result == 1) {
      await fs.unlinkSync(path.resolve(anuncio.imagen));

    }
    
    return res.status(200).json({
      eliminar: true,
      mensaje: 'Tu Anuncio Ha Sido Eliminado'
    });

    
  } else {
    return res.json({ eliminar: false, mensaje: 'No Es Posible Eliminar' });
  }


});



//VER anuncio
anuncios_web.get('/obtener_anuncio/ver/:idAnuncio', async (req, res) => {
  Anuncio.findOne({ where: { id: req.params.idAnuncio } })
    .then((anuncio) => {
      return res.status(200).json({ anuncio });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});







module.exports = anuncios_web;