const express = require('express');
const stocks = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Stock = require('../../modelos/sistema_base/Stock_rapido');
const Producto = require('../../modelos/sistema_base/Producto');

stocks.use(cors());

//RELACIONES 1-1 *-* 1-*
Stock.belongsTo(Producto, { as: 'producto' });

//CREAR STOCK RAPIDO Y AUMENTA STOCK EN PRODUCTO
stocks.post('/crear', (req, res) => {
  const stocks = JSON.parse(req.body.stocks);
  stocks.forEach((element) => {
    const stockData = {
      cantidad: element.cantidad,
      comentario: element.comentario,
      fecha: new Date(element.fecha),
      productoId: element.productoId
    };
    Stock.create(stockData)
      .then((stock) => {
        Producto.increment('stock', {
          by: stock.cantidad,
          where: {
            id: stock.productoId
          }
        });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  });
  res.json({ mensaje: 'Listo' });
});

//ELIMINAR STOCK Y DISMINUIR STOCK EN PRODUCTO
stocks.delete('/eliminar/:id', (req, res) => {
  Stock.findById(req.params.id)
    .then((stock) => {
      let stockaux = stock;
      Stock.destroy({ where: { id: req.params.id } })
        .then(() => {
          Producto.decrement('stock', {
            by: stockaux.cantidad,
            where: {
              id: stockaux.productoId
            }
          })
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

//OBTENER TODOS LOS STOCK RAPIDOS
stocks.get('/obtener', (req, res) => {
  Stock.findAll({
    include: {
      model: Producto,
      as: 'producto'
    },
    order: [['id', 'DESC']]
  })
    .then((stocks) => {
      res.json({ stocks: stocks });
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});

module.exports = stocks;
