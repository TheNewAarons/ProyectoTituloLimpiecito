const express = require('express');
const detalle_centro = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../modelos/sistema_base/Linea_insumo');
const Ccegreso = require('../../modelos/sistema_base/CcEgreso');
const Ccingreso = require('../../modelos/sistema_base/CcIngreso');
const Centro_trabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const Producto = require('../../modelos/sistema_base/Producto');

const CentroCosto = require('../../modelos/sistema_base/Centro_costo');

const Liquidacion = require('../../modelos/sistema_base/Liquidacion');

detalle_centro.use(cors());

//RELACIONES 1-1 *-* 1-*
Lista_insumo.hasMany(Linea_insumo);
Linea_insumo.belongsTo(Producto);

/**
  RUTAS PARA CREAR ASOCIACION CENTRO-TRABAJADOR,
  LISTA DE INSUMO CON SUS RESPECTIVAS LINEAS DE INSUMO,
  Y PERDIDAS, TODO ASOCIADO AL CENTRO DE COSTO!!!
****/

/**  CENTRO - TRABAJADOR   **/

//CREAR ASOCIACIÓN CENTRO TRABAJADOR
detalle_centro.post('/crear-asociacion', (req, res) => {
  const asociacion = JSON.parse(req.body.asociacion);
  const asociacionData = {
    trabajadoreId: asociacion.trabajadoreId,
    centroCostoId: asociacion.centroCostoId,
    liquidacioneId: asociacion.liquidacioneId
  };
  Centro_trabajador.create(asociacionData)
    .then((asociacion) => {
      res.json({ asociacion: asociacion });
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});
//ELIMINAR ASOCIACION CENTRO TRABAJADOR
detalle_centro.delete('/eliminar-asociacion/:id', (req, res) => {
  Centro_trabajador.findById(req.params.id)
    .then((centro_trabajador) => {
      Liquidacion.destroy({
        where: {
          id: centro_trabajador.id
        }
      });
      Centro_trabajador.destroy({ where: { id: req.params.id } })
        .then((eliminado) => {
          res.json({ numero_eliminado: eliminado });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

/**  LISTA INSUMO   **/

//CREAR LISTA CON LISTA DE INSUMOS
detalle_centro.post('/crear-lista', (req, res) => {
  const lista_insumo = JSON.parse(req.body.lista_insumo);
  const lineasInsumos = JSON.parse(req.body.lineasInsumos);

  const listaData = {
    fecha: new Date(lista_insumo.fecha),
    total: lista_insumo.total,
    estado: lista_insumo.estado,
    centroCostoId: lista_insumo.centroCostoId,
    usuarioCreaId: lista_insumo.usuarioCreaId,
    usuarioApruebaId: lista_insumo.usuarioApruebaId

  };
  Lista_insumo.create(listaData)
    .then((lista) => {
      lineasInsumos.forEach((element) => {
        const lineaData = {
          cantidad: element.cantidad,
          precio: element.precio,
          total_linea: element.total_linea,
          listaInsumoId: lista.id,
          productoId: element.productoId
        };
        Producto.decrement('stock', {
          by: element.cantidad,
          where: {
            id: element.productoId
          }
        });
        Linea_insumo.create(lineaData);
      }); //termina el foreach..
      res.json({ lista: lista });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//APROBAR LISTA
detalle_centro.delete('/aprobar-lista/:id/:id_usuario', (req, res) => {

  Lista_insumo.update({ estado: 1, usuarioApruebaId:req.params.id_usuario }, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({ mensaje: 'Lista Aprobada' });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR LISTA CON SUS LINEAS DE INSUMOS **
detalle_centro.delete('/eliminar-lista/:id', (req, res) => {
  Linea_insumo.findAll({
    where: { listaInsumoId: req.params.id }
  })
    .then((lineas) => {
      lineas.forEach((element) => {
        Producto.increment('stock', {
          by: element.cantidad,
          where: {
            id: element.productoId
          }
        });
      });
      Linea_insumo.destroy({ where: { listaInsumoId: req.params.id } });
      Lista_insumo.destroy({ where: { id: req.params.id } })
        .then((numero_eliminado) => {
          res.json({ numero_eliminado: numero_eliminado });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

/**  EGRESO   **/

//CREAR EGRESO ASOCIADA AL CENTRO DE COSTO
detalle_centro.post('/crear-egreso', (req, res) => {
  const egreso = JSON.parse(req.body.egreso);
  const egresoData = {
    fecha: new Date(egreso.fecha),
    monto: egreso.monto,
    comentario: egreso.comentario,
    centroCostoId: egreso.centroCostoId
  };
  Ccegreso.create(egresoData)
    .then((egreso) => {
      res.json({ egreso: egreso });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR EGRESO
detalle_centro.delete('/eliminar-egreso/:id', (req, res) => {
  Ccegreso.destroy({
    where: {
      id: req.params.id
    }
  })
    .then((n_eliminado) => {
      res.json({ numero_eliminado: n_eliminado });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

/** INGRESO EXTRA  **/

//CREAR INGRESO ASOCIADA AL CENTRO DE COSTO
detalle_centro.post('/crear-ingreso', (req, res) => {
  const ingreso = JSON.parse(req.body.ingreso);
  const ingresoData = {
    fecha: new Date(ingreso.fecha),
    monto: ingreso.monto,
    comentario: ingreso.comentario,
    centroCostoId: ingreso.centroCostoId
  };
  Ccingreso.create(ingresoData)
    .then((ingreso) => {
      CentroCosto.increment('precio_servicio', {
        by: ingreso.monto,
        where: {
          id: ingreso.centroCostoId
        }
      });
      res.json({ ingreso: ingreso });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR INGRESO
detalle_centro.delete('/eliminar-ingreso/:id', (req, res) => {
  Ccingreso.findById(req.params.id)
    .then((ingreso) => {
      if (ingreso) {
        Ccingreso.destroy({
          where: {
            id: req.params.id
          }
        })
          .then((n_eliminado) => {
            CentroCosto.decrement('precio_servicio', {
              by: ingreso.monto,
              where: {
                id: ingreso.centroCostoId
              }
            });
            res.json({ numero_eliminado: n_eliminado });
          })
          .catch((error) => {
            res.send('error: ' + error);
          });
      } else {
        res.json({ error: 'Ingreso a eliminar no existe!!' });
      }
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

module.exports = detalle_centro;
