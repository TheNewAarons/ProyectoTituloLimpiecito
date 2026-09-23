const express = require('express');
const cajas = express.Router();
const cors = require('cors');

const Caja = require('../../modelos/sistema_base/Caja');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../modelos/sistema_base/Cliente');
const CentroTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');
const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../modelos/sistema_base/Linea_insumo');
const Producto = require('../../modelos/sistema_base/Producto');
const Ccegreso = require('../../modelos/sistema_base/CcEgreso');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const Egresogeneral = require('../../modelos/sistema_base/Egreso');

cajas.use(cors());

//RELACIONES 1-1 *-* 1-*
Caja.hasMany(Centro);
Centro.hasMany(CentroTrabajador);
CentroTrabajador.belongsTo(Trabajador);

CentroTrabajador.belongsTo(Liquidacion);
Centro.hasMany(Lista_insumo);
Centro.hasMany(Ccegreso);
Lista_insumo.hasMany(Linea_insumo);
Linea_insumo.belongsTo(Producto);

//CREAR CAJA
cajas.post('/crear', (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: new Date(caja.fecha_inicio),
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };
  Caja.create(cajaData)
    .then((caja) => {
      res.json({ caja: caja });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR CAJA  *** NOSE OCUPA TODAVIA
cajas.put('/editar/:id', (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: caja.fecha_inicio,
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };
  Caja.findById(req.params.id)
    .then((caja) => {
      Caja.update(cajaData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          res.json({ filas: filasUpdate });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR CIERRE CAJA   *** TODAVIA NO SE OCUPA
cajas.put('/editar-cierre/:id', (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: caja.fecha_inicio,
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };

  Caja.findById(req.params.id)
    .then((caja) => {
      Caja.update(cajaData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          res.json({ filas: filasUpdate });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODAS LAS CAJAS CON DETALLES
cajas.get('/obtener', (req, res) => {
  Caja.findAll({
    include: [
      {
        model: Centro,
        include: [
          {
            model: Cliente,
            as: 'cliente'
          },
          { model: Ccegreso },
          { model: CentroTrabajador, include: [{ model: Trabajador }, { model: Liquidacion }] },
          { model: Lista_insumo, include: [{ model: Linea_insumo, include: [{ model: Producto }] }] }
        ]
      }
    ],
    order: [['id', 'DESC']]
  })
    .then((cajas) => {
      res.json({ cajas: cajas });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODAS LAS CAJAS
cajas.get('/obtener-cajas', (req, res) => {
  Caja.findAll({
    order: [['id', 'DESC']]
  })
    .then((cajas) => {
      res.json({ cajas: cajas });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER CAJA ACTIVA
cajas.get('/obtener-activa', (req, res) => {
  Caja.findOne({
    where: {
      estado: 1
    }
  })
    .then((caja) => {
      res.json({ caja: caja });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER CAJA SOLICITADA
cajas.get('/obtener-unico/:id', (req, res) => {
  Caja.findById(req.params.id)
    .then((caja) => {
      res.json({ caja: caja });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//CERRAR CAJA
cajas.put('/cerrar/:idCaja', async (req, res) => {
  const { fecha } = req.body;
  let cant_centro_abierto = await Centro.count({ where: { cajaId: req.params.idCaja, estado: 1 } });
  if (cant_centro_abierto === 0) {
    let centros = await Centro.findAll({ where: { cajaId: req.params.idCaja, estado: 0 } });
    let egresos = await Egresogeneral.findAll({ where: { cajaId: req.params.idCaja } });
    let total_egreso = 0;
    for (i = 0; i < egresos.length; i++) {
      total_egreso += egresos[i].monto;
    }
    let moment_total_cc_egreso = 0;
    let moment_total_cc_ingreso = 0;
    let moment_total_cc_utilidad = 0;
    for (e = 0; e < centros.length; e++) {
      moment_total_cc_utilidad += centros[e].utilidad;
      moment_total_cc_egreso += centros[e].total_costos;
      moment_total_cc_ingreso += centros[e].precio_servicio;
    }
    let total_cc_ingreso = moment_total_cc_ingreso;
    let total_cc_egreso = moment_total_cc_egreso + total_egreso;
    let total_cc_utilidad = moment_total_cc_utilidad - total_egreso;

    const cajaData = {
      fecha_cierre: fecha,
      total_ingreso: total_cc_ingreso,
      total_egreso: total_cc_egreso,
      utilidad: total_cc_utilidad,
      estado: 0
    };
    Caja.update(cajaData, { where: { id: req.params.idCaja } })
      .then((filas) => {
        if (filas == 1) {
          return res.json({ cerrar: true, mensaje: 'Tu Caja ha sido cerrada correctamente' });
        } else {
          return res.json({
            cerrar: false,
            mensaje: 'No se puede cerrar la caja'
          });
        }
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  } else {
    return res.json({
      cerrar: false,
      mensaje: `No se puede cerrar la caja, existen ${cant_centro_abierto} Centro(s) de Costo(s) abierto(s)`
    });
  }
});

module.exports = cajas;
