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

  const TIPOS_DOCUMENTO = ['FACTURA', 'BOLETA', 'OTRO'];
  const tipoDocumento = egreso.tipo_documento;
  if (tipoDocumento !== null && tipoDocumento !== undefined && TIPOS_DOCUMENTO.indexOf(tipoDocumento) === -1) {
    return res.status(400).json({ mensaje: 'tipo_documento invalido' });
  }

  let estadoPago = egreso.estado_pago;
  if (estadoPago === null || estadoPago === undefined) {
    estadoPago = 'PAGADA';
  }
  if (estadoPago !== 'PENDIENTE' && estadoPago !== 'PAGADA') {
    return res.status(400).json({ mensaje: 'estado_pago invalido' });
  }

  // PENDIENTE nunca suma a caja: fecha_pago queda null. PAGADA sin fecha_pago deriva la fecha de `fecha`.
  let fechaPago = egreso.fecha_pago;
  if (estadoPago === 'PENDIENTE') {
    fechaPago = null;
  } else if (!fechaPago && egreso.fecha) {
    fechaPago = String(egreso.fecha).slice(0, 10);
  }

  const egresoData = {
    monto: egreso.monto,
    comentario: egreso.comentario,
    fecha: egreso.fecha,
    tipo: egreso.tipo,
    estado: egreso.estado,
    usuarioId: egreso.usuarioId,
    cajaId: egreso.cajaId,
    tipo_documento: tipoDocumento !== undefined ? tipoDocumento : null,
    numero_documento: egreso.numero_documento !== undefined ? egreso.numero_documento : null,
    fecha_emision: egreso.fecha_emision !== undefined ? egreso.fecha_emision : null,
    fecha_vencimiento: egreso.fecha_vencimiento !== undefined ? egreso.fecha_vencimiento : null,
    estado_pago: estadoPago,
    fecha_pago: fechaPago !== undefined ? fechaPago : null
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
      if (!egreso) {
        return res.status(404).json({ mensaje: 'Egreso no encontrado' });
      }
      if (egreso.tipo_documento !== null && egreso.tipo_documento !== undefined) {
        return res.status(409).json({ mensaje: 'No se puede eliminar un egreso con documento o pendiente/anulado; usar anular' });
      }
      if (egreso.estado_pago !== 'PAGADA') {
        return res.status(409).json({ mensaje: 'No se puede eliminar un egreso con documento o pendiente/anulado; usar anular' });
      }
      const comprobarCaja = egreso.cajaId ? Caja.findById(egreso.cajaId) : Promise.resolve(null);
      return comprobarCaja
        .then((caja) => {
          if (caja && caja.estado !== 1) {
            return res.status(409).json({ mensaje: 'No se puede eliminar un egreso de una caja cerrada; usar anular' });
          }
          return Egreso.destroy({ where: { id: req.params.id } })
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
