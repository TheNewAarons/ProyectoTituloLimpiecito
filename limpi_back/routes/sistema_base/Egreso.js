const express = require('express');
const egresos = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Caja = require('../../modelos/sistema_base/Caja');
const Usuario = require('../../modelos/sistema_base/Usuario');
const Egreso = require('../../modelos/sistema_base/Egreso');

Egreso.belongsTo(Caja);
Egreso.belongsTo(Usuario);

egresos.use(cors());

//CREAR EGRESO
egresos.post('/crear', (req, res) => {
  const egreso = JSON.parse(req.body.egreso);

  const egresoData = {
    monto: egreso.monto,
    comentario: egreso.comentario,
    fecha: egreso.fecha,
    tipo: egreso.tipo,
    estado: egreso.estado,
    usuarioId: egreso.usuarioId,
    cajaId: egreso.cajaId
  };

  Egreso.create(egresoData)
    .then((egreso) => {
      res.json({ mensaje: 'Listo' });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR EGRESO
egresos.delete('/eliminar/:id', (req, res) => {
  Egreso.findById(req.params.id)
    .then((egreso) => {
      Egreso.destroy({ where: { id: req.params.id } })
        .then((resp) => {
          res.json({ resp: resp });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR EGRESO
/*egresos.delete('/eliminar/:id', (req,res) => {

    Egreso.destroy({where:{id: req.params.id}})
    .then( resp => {
      res.json({resp:resp})
    })
    .catch(error => {
      res.send('error: '+error)
    })
})*/

//OBTENER TODOS LOS EGRESOS
egresos.get('/obtener', (req, res) => {
  Egreso.findAll({
    include: [
      {
        model: Caja
      },
      {
        model: Usuario
      }
    ]
  })
    .then((egresos) => {
      res.json({ egresos: egresos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS EGRESOS POR CAJA
egresos.get('/obtener-caja/:id', (req, res) => {
  Egreso.findAll({
    include: [
      {
        model: Caja
      },
      {
        model: Usuario
      }
    ],
    where: {
      cajaId: req.params.id
    }
  })
    .then((egresos) => {
      res.json({ egresos: egresos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = egresos;
