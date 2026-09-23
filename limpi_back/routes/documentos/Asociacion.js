const express = require('express');
const asociaciones = express.Router();

const Asociacion_trabajador = require('../../modelos/sistema_base/Asociacion_trabajador');

const Trabajador = require('../../modelos/sistema_base/Trabajadore');
const sequelize_asoc_tra = Asociacion_trabajador.sequelize;

Asociacion_trabajador.belongsTo(Trabajador);

//CREAR ASOCIACION DOCUMENTO - TRABAJADOR
asociaciones.post('/crear-asoc-trabajador', async (req, res) => {
  const asoc_trabajadores = JSON.parse(req.body.asoc_trabajadores);

  try {
    const resultado = await sequelize_asoc_tra.transaction(async (t) => {
      const array_resul = [];
      for (let index = 0; index < asoc_trabajadores.length; index++) {
        let result = await Asociacion_trabajador.create(asoc_trabajadores[index], { transaction: t });
        array_resul.push(result);
      }
      return array_resul;
    });
    return res.json({ resultado });
  } catch (error) {
    return res.status(400).json({ error, mensaje: 'Ocurrio un problema al asociar' });
  }
});

//OBTENER ASOCIACIONES DOCUMENTO - TRABAJADOR
asociaciones.get('/obtener-asoc-trabajador/:idTrabajador', async (req, res) => {
  Asociacion_trabajador.findAll({ where: { trabajadoreId: req.params.idTrabajador } })
    .then((asociaciones) => {
      res.status(200).json({ asociaciones });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//OBTENER ASOCIACIONES DOCUMENTO - TRABAJADOR CON ID DOCUMENTO,  SE USA PARA ENCONTRAR LOS QUE YA EXISTEN
asociaciones.get('/obtener-asoc-tra/:idDocumento', async (req, res) => {
  Asociacion_trabajador.findAll({ where: { documentoId: req.params.idDocumento } })
    .then((asociaciones) => {
      res.status(200).json({ asociaciones });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//OBTENER ASOCIACIONES DOCUMENTO - TRABAJADOR CON ID DOCUMENTO, CON INSTANCIA DE DOCUMENTO CATEGORIA
asociaciones.get('/get-asoc-tra/:idDocumento', async (req, res) => {
  Asociacion_trabajador.findAll({ where: { documentoId: req.params.idDocumento }, include: [{ model: Trabajador }], order: [['id', 'DESC']] })
    .then((asociaciones) => {
      res.status(200).json({ asociaciones });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

//ELIMINAR ASOCIACION DOCUMENTO - TRABAJADOR
asociaciones.delete('/eliminar-asoc-trabajador/:idAsoc', async (req, res) => {
  Asociacion_trabajador.destroy({ where: { id: req.params.idAsoc } })
    .then((cant) => {
      res.status(200).json({ cant });
    })
    .catch((error) => {
      res.status(400).send('error: ' + error);
    });
});

module.exports = asociaciones;
