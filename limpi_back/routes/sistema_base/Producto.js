const express = require('express');
const productos = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Producto = require('../../modelos/sistema_base/Producto');

productos.use(cors());

//CREAR PRODUCTO
productos.post('/crear', async (req, res) => {
  const producto = JSON.parse(req.body.producto);

  const productoData = {
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    tipo: producto.tipo,
    estado: producto.estado,
    stock: producto.stock,
    precio: producto.precio
  };
  let producto_existe = await Producto.findOne({
    where: {
      nombre: productoData.nombre,
      estado: { [Op.ne]: 2 }
    }
  });
  if (producto_existe) {
    return res.json({ mensaje: 'Este nombre de producto ya esta registrado en el sistema!' });
  } else {
    Producto.create(productoData)
      .then((producto) => {
        return res.json({ producto: producto });
      })
      .catch((error) => {
        return res.send('error: ' + error);
      });
  }
});

//EDITAR PRODUCTO
productos.put('/editar/:id', async (req, res) => {
  const producto = JSON.parse(req.body.producto);
  const productoData = {
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    tipo: producto.tipo,
    estado: producto.estado,
    stock: producto.stock,
    precio: producto.precio
  };
  let producto_existe = await Producto.findOne({
    where: {
      nombre: productoData.nombre,
      estado: { [Op.ne]: 2 }
    }
  });
  if (producto_existe && req.params.id != producto_existe.id) {
    return res.json({ mensaje: 'Este nombre de producto ya esta registrado en el sistema!' });
  } else {
    Producto.findById(req.params.id)
      .then((producto) => {
        Producto.update(productoData, { where: { id: req.params.id } })
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
  }
});

//ELIMINAR PRODUCTO ( CAMBIAR ESTADO  A INACTIVO)
productos.delete('/eliminar/:id', (req, res) => {
  Producto.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//ACTIVAR PRODUCTO ( CAMBIAR ESTADO  A ACTIVO)
productos.delete('/activar/:id', (req, res) => {
  Producto.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//BORRAR PRODUCTO ( CAMBIAR ESTADO A BORRADO NUMERO 2)
productos.delete('/borrar/:id', (req, res) => {
  Producto.update({ estado: 2 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER PRODUCTOS EN ESTADO ACTIVO
productos.get('/activo', (req, res) => {
  Producto.findAll({
    where: {
      estado: 1
    },
    order: [['id', 'DESC']]
  })
    .then((productos) => {
      res.json({ productos: productos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//OBTENER PRODUCTOS EN ESTADO ACTIVO y STOCK > 0
productos.get('/stock_activo', (req, res) => {
  Producto.findAll({
    where: {
      estado: 1,
      stock: {
        [Op.gt]: 0
      }
    },
    order: [['id', 'DESC']]
  })
    .then((productos) => {
      res.json({ productos: productos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER PRODUCTOS EN ESTADO INACTIVO
productos.get('/inactivo', (req, res) => {
  Producto.findAll({
    where: {
      estado: 0
    },
    order: [['id', 'DESC']]
  })
    .then((productos) => {
      res.json({ productosInactivos: productos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LOS PRODUCTOS
productos.get('/todos', (req, res) => {
  Producto.findAll({
    order: [['id', 'DESC']]
  })
    .then((productos) => {
      res.json({ productos: productos });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//BUSCAR EN PRODUCTOS EN ESTADO ACTIVO
productos.get('/busca-activo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Producto.findAll({
      where: {
        estado: 1,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            precio: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            stock: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((productos) => {
        res.json({ productos: productos });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Producto.findAll({
      where: {
        estado: 1
      },
      order: [['id', 'DESC']]
    })
      .then((productos) => {
        res.json({ productos: productos });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

//BUSCAR EN PRODUCTOS EN ESTADO INACTIVO
productos.get('/busca-inactivo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Producto.findAll({
      where: {
        estado: 0,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            precio: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            stock: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((productos) => {
        res.json({ productosInactivos: productos });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Producto.findAll({
      where: {
        estado: 0
      },
      order: [['id', 'DESC']]
    })
      .then((productos) => {
        res.json({ productosInactivos: productos });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

module.exports = productos;
