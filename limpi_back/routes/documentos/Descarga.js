const express = require('express');
const descargas = express.Router();

const Descarga_cliente = require('../../modelos/sistema_base/Descarga_cliente');
const Descarga_trabajador = require('../../modelos/sistema_base/Descargar_trabajador');
const Descargar_trabajador = require('../../modelos/sistema_base/Descargar_trabajador');

//CREAR DESCARGAR CLIENTE
descargas.post('/crear-desc-cliente', async (req, res) => {
  const desc_cliente = JSON.parse(req.body.desc_cliente);
  const desc_clienteData = {
    fecha: desc_cliente.fecha,
    clienteId: desc_cliente.clienteId,
    documentoId: desc_cliente.documentoId
  };
  Descarga_cliente.create(desc_clienteData)
    .then((desc_cliente) => {
      res.status(200).json({ desc_cliente });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//CREAR DESCARGAR TRABAJADOR
descargas.post('/crear-desc-trabajador', async (req, res) => {
  const desc_trabajador = JSON.parse(req.body.desc_trabajador);
  const desc_trabajadorData = {
    fecha: desc_trabajador.fecha,
    trabajadoreId: desc_trabajador.trabajadoreId,
    documentoId: desc_trabajador.documentoId
  };
  Descarga_trabajador.create(desc_trabajadorData)
    .then((desc_trabajador) => {
      res.status(200).json({ desc_trabajador });
      d;
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//VISTA DESCARGA CLIENTE
descargas.get('/obtener-desc-cliente', async (req, res) => {
  Descarga_cliente.findAll()
    .then((desc_clientes) => {
      res.status(200).json({ desc_clientes });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//VISTA DESCARGA TRABAJADOR
descargas.get('/obtener-desc-trabajador', async (req, res) => {
  Descarga_trabajador.findAll()
    .then((desc_trabajadores) => {
      res.status(200).json({ desc_trabajadores });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//VER DETALLE DOCUMENTO
descargas.get('/detalle-desc/:idDocumento', async (req, res) => {
  let desc_clientes = await Descarga_cliente.findAll({ where: { documentoId: req.params.idDocumento } });
  let desc_trabajadores = await Descarga_trabajador.findAll({ where: { documentoId: req.params.idDocumento } });

  res.status(200).json({ desc_clientes, desc_trabajadores });
});

module.exports = descargas;
