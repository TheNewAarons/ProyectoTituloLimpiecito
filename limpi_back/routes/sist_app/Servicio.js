const express = require('express');
const servicios = express.Router();
const multer = require('../../libs/multer-servicio');
const fs = require('fs');
const path = require('path');

//MODELOS
const Servicio = require('../../modelos/sist_app/Servicio');
const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');

//PARA REALIZAR OPERACIONES
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

//DEFINICION DE ASOCIACIONES
Servicio.belongsTo(Cate_servicio);

//CREAR SERVICIO
servicios.post('/crear', multer.single('image'), async (req, res) => {
  const { nombre, descripcion, precio, estado, categoriaServicioId } = req.body;
  let existe = await Servicio.findOne({ where: { nombre: nombre } });
  if (existe) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'Este Nombre Ya Existe En Los Registros!!' });
  } else {
    const servicioData = {
      nombre: nombre,
      descripcion: descripcion,
      imagen: req.file.path,
      precio: precio,
      categoriaServicioId: categoriaServicioId,
      estado: estado
    };
    Servicio.create(servicioData)
      .then((servicio) => {
        return res.json({ servicio, mensaje: 'Producto Servicio Creado Correctamente' });
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }
});

//EDITAR SERVICIO
servicios.put('/editar/:idServicio', multer.single('image'), async (req, res) => {
  const { nombre, descripcion, precio, estado, categoriaServicioId } = req.body;
  let servicio = await Servicio.findById(req.params.idServicio);
  if (servicio) {
    let servicioData = {
      nombre: nombre,
      descripcion: descripcion,
      //imagen: req.file.path,
      precio: precio,
      categoriaServicioId: categoriaServicioId,
      estado: estado
    };
    if (req.file) {
      servicioData.imagen = req.file.path;
      fs.unlinkSync(path.resolve(servicio.imagen));
    }
    Servicio.update(servicioData, { where: { id: req.params.idServicio } })
      .then((filas) => {
        return res.json({ filas, mensaje: 'Servicio Editado Correctamente' });
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  } else {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'El servicio ha editar no existe' });
  }
});

//OBTENER SERVICIO POR ID
servicios.get('/obtener-servicio/:idServicio', async (req, res) => {
  Servicio.findById(req.params.idServicio)
    .then((servicio) => {
      if (servicio) {
        return res.json({ servicio });
      } else {
        return res.json({ mensaje: 'El servicio ha obtener no existe' });
      }
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//DESACTIVAR SERVICIO
servicios.delete('/desactivar-servicio/:idServicio', async (req, res) => {
  Servicio.update({ estado: 0 }, { where: { id: req.params.idServicio } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Servicio desactivado satisfactoriamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//ACTIVAR SERVICIO
servicios.delete('/activar-servicio/:idServicio', async (req, res) => {
  Servicio.update({ estado: 1 }, { where: { id: req.params.idServicio } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Servicio activado satisfactoriamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});
//OBTENER SERVICIOS ACTIVOS
servicios.get('/obtener-servicios-activos', async (req, res) => {
  Servicio.findAll({ where: { estado: 1 } })
    .then((servicios) => {
      return res.json({ servicios });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER SERVICIOS INACTIVOS
servicios.get('/obtener-servicios-inactivos', async (req, res) => {
  Servicio.findAll({ where: { estado: 0 } })
    .then((servicios) => {
      return res.json({ servicios });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});
module.exports = servicios;
