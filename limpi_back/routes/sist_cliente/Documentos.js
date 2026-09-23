const express = require('express');
const archivos_sis_cli = express.Router();
const path = require('path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Asociacion_trabajador = require('../../modelos/sistema_base/Asociacion_trabajador');

const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');

Asociacion_trabajador.belongsTo(Documento);
Documento.hasMany(Asociacion_trabajador);

//OBTENER ASOCIACIONES POR ID TRABAJADOR
archivos_sis_cli.get('/obtener-asoc-trabajador/:idTrabajador/:categoria/:search?', async (req, res) => {
  if (req.params.search) {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({
        include: [{ model: Categoria }, { model: Asociacion_trabajador }],
        where: {
          [Op.and]: [
            { [Op.or]: [{ '$categoria_documento.tipo$': 'Trabajador' }, { '$trabajador_documentos.trabajadoreId$': req.params.idTrabajador }] },
            {
              [Op.or]: [
                { '$categoria_documento.nombre$': { [Op.like]: '%' + req.params.search + '%' } },
                { nombre: { [Op.like]: '%' + req.params.search + '%' } }
              ]
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({
        include: [{ model: Categoria }, { model: Asociacion_trabajador }],
        where: {
          [Op.and]: [
            { '$categoria_documento.nombre$': req.params.categoria },
            { [Op.or]: [{ '$categoria_documento.tipo$': 'Trabajador' }, { '$trabajador_documentos.trabajadoreId$': req.params.idTrabajador }] },
            {
              [Op.or]: [
                { '$categoria_documento.nombre$': { [Op.like]: '%' + req.params.search + '%' } },
                { nombre: { [Op.like]: '%' + req.params.search + '%' } }
              ]
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  } else {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({
        include: [{ model: Categoria }, { model: Asociacion_trabajador }],
        where: {
          [Op.or]: [{ '$categoria_documento.tipo$': 'Trabajador' }, { '$trabajador_documentos.trabajadoreId$': req.params.idTrabajador }]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({
        include: [{ model: Categoria }, { model: Asociacion_trabajador }],
        where: {
          '$categoria_documento.nombre$': req.params.categoria,
          [Op.or]: [{ '$categoria_documento.tipo$': 'Trabajador' }, { '$trabajador_documentos.trabajadoreId$': req.params.idTrabajador }]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  }
});

//VER DOCUMENTO
archivos_sis_cli.get('/obtener-documento/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      return res.status(200).json({ documento });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//DESCARGAR DOCUMENTO PDF
archivos_sis_cli.get('/descargar-pdf/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      let filePath = path.join(__dirname, '../../', documento.url);
      return res.status(200).sendFile(filePath);
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

module.exports = archivos_sis_cli;
