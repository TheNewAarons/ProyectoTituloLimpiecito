const express = require('express');
const documentos = express.Router();
const multer = require('../../libs/multer');
const fs = require('fs');
const path = require('path');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');
const Asoc_trabajador = require('../../modelos/sistema_base/Asociacion_trabajador');

Documento.belongsTo(Categoria);

//CREAR DOCUMENTO COMO INSTANCIA Y SUBIDA DE ARCHIVO
documentos.post('/crear', multer.single('pdf'), async (req, res) => {
  const { fecha_subida, categoriaDocumentoId, estado, nombre } = req.body;
  const documentoData = {
    nombre: nombre,
    fecha_subida: fecha_subida,
    url: req.file.path,
    categoriaDocumentoId: Number(categoriaDocumentoId),
    //estado: Boolean(estado)
    estado: Boolean(estado)
  };
  Documento.create(documentoData)
    .then((documento) => {
      return res.json({ documento: documento });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//EDITAR DOCUMENTO COMO INSTANCIA
documentos.put('/editar/:id', async (req, res) => {
  const { nombre, categoriaDocumentoId } = req.body;
  Documento.update({ nombre: nombre, categoriaDocumentoId: categoriaDocumentoId }, { where: { id: req.params.id } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//ELIMINAR DOCUMENTO E INSTANCIA
documentos.delete('/eliminar/:idDocumento', async (req, res) => {
  const documento = await Documento.findById(req.params.idDocumento);
  if (documento) {
    let cont_trabajador = await Asoc_trabajador.count({ where: { documentoId: documento.id } });

    if (cont_trabajador === 0) {
      const result = await Documento.destroy({
        where: { id: req.params.idDocumento }
      });
      if (result == 1) {
        await fs.unlinkSync(path.resolve(documento.url));
      }
      return res.status(200).json({
        eliminar: true,
        mensaje: 'Tu Documento Ha Sido Eliminado'
      });
    } else {
      return res.json({
        eliminar: false,
        mensaje: `No Es Posible Eliminar, existen ${cont_trabajador} trabajadore(s) asociado(s)`
      });
    }
  } else {
    return res.json({ eliminar: false, mensaje: 'No Es Posible Eliminar' });
  }
});

//OBTENER DOCUMENTOS
documentos.get('/obtener-documentos', async (req, res) => {
  Documento.findAll({ include: [{ model: Categoria }], order: [['id', 'DESC']] })
    .then((documentos) => {
      return res.status(200).json({ documentos });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//VER DOCUMENTO
documentos.get('/obtener-documento/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      return res.status(200).json({ documento });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//DESCARGAR DOCUMENTO PDF
documentos.get('/descargar-pdf/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      let filePath = path.join(__dirname, '../../', documento.url);
      return res.status(200).sendFile(filePath);
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//BUSCAR DOCUMENTOS
documentos.get('/buscar-documento/:categoria/:search?', async (req, res) => {
  if (req.params.search != null) {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({
        include: [{ model: Categoria }],
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: '%' + req.params.search + '%' } },
            {
              '$categoria_documento.nombre$': {
                [Op.like]: '%' + req.params.search + '%'
              }
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({
        include: [{ model: Categoria }],
        where: {
          '$categoria_documento.nombre$': req.params.categoria,
          [Op.or]: [
            { nombre: { [Op.like]: '%' + req.params.search + '%' } },
            {
              '$categoria_documento.nombre$': {
                [Op.like]: '%' + req.params.search + '%'
              }
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  } else {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({ include: [{ model: Categoria }] })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({ include: [{ model: Categoria }], where: { '$categoria_documento.nombre$': req.params.categoria } })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  }
});

module.exports = documentos;
