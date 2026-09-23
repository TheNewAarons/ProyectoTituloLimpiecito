const express = require('express');
const categorias = express.Router();

const Categoria = require('../../modelos/sistema_base/Categoria');
const Documento = require('../../modelos/sistema_base/Documento');

//CREAR CATEGORIA
categorias.post('/crear', async (req, res) => {
  const categoria = JSON.parse(req.body.categoria);

  const categoriaData = {
    nombre: categoria.nombre,
    tipo: categoria.tipo,
    descripcion: categoria.descripcion,
    estado: categoria.estado
  };
  Categoria.create(categoriaData)
    .then((categoria) => {
      res.json({ categoria: categoria });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR CATEGORIA
categorias.put('/editar/:id', async (req, res) => {
  const categoria = JSON.parse(req.body.categoria);

  const categoriaData = {
    nombre: categoria.nombre,
    tipo: categoria.tipo,
    descripcion: categoria.descripcion
  };
  Categoria.update(categoriaData, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({ filas });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER ACTIVOS
categorias.get('/obtener-activos', async (req, res) => {
  Categoria.findAll({
    where: { estado: true },
    order: [['id', 'DESC']]
  })
    .then((categorias) => {
      res.json({ categorias: categorias });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER INACTIVOS
categorias.get('/obtener-inactivos', async (req, res) => {
  Categoria.findAll({
    where: { estado: false },
    order: [['id', 'DESC']]
  })
    .then((categorias) => {
      res.json({ categorias: categorias });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR CATEGORIA
categorias.delete('/eliminar/:idCategoria', async (req, res) => {
  const categoria = await Categoria.findById(req.params.idCategoria);
  if (categoria) {
    let cont_documento = await Documento.count({ where: { categoriaDocumentoId: req.params.idCategoria } });
    if (cont_documento === 0) {
      let result = await Categoria.destroy({ where: { id: req.params.idCategoria } });
      if (result === 1) {
        return res.status(200).json({
          eliminar: true,
          mensaje: '¡Tu Categoria Ha Sido Eliminada!'
        });
      } else {
        return res.json({
          eliminar: false,
          mensaje: '¡Ha Ocurrido Un Problema!'
        });
      }
    } else {
      return res.json({
        eliminar: false,
        mensaje: `No es posible eliminar, existen ${cont_documento} documento(s) asociado(s) a la categoria`
      });
    }
  } else {
    return res.json({ eliminar: false, mensaje: 'No Es Posible Eliminar' });
  }
});

module.exports = categorias;
