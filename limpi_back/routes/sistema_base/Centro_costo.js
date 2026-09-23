const express = require('express');
const centro_costos = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Centro = require('../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../modelos/sistema_base/Cliente');
const Caja = require('../../modelos/sistema_base/Caja');
const CentroTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');
const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../modelos/sistema_base/Linea_insumo');
const Producto = require('../../modelos/sistema_base/Producto');
const Ccegreso = require('../../modelos/sistema_base/CcEgreso');
const Ccingreso = require('../../modelos/sistema_base/CcIngreso');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const Usuario = require('../../modelos/sistema_base/Usuario');

centro_costos.use(cors());

//RELACIONES 1-1 *-* 1-*
Centro.belongsTo(Cliente, { as: 'cliente' });
Centro.belongsTo(Caja);
Centro.hasMany(CentroTrabajador);
CentroTrabajador.belongsTo(Trabajador);

CentroTrabajador.belongsTo(Liquidacion);
Centro.hasMany(Lista_insumo);
Centro.hasMany(Ccegreso);
Centro.hasMany(Ccingreso);
Lista_insumo.hasMany(Linea_insumo);
Lista_insumo.belongsTo(Usuario,{as:'crea',foreignKey:'usuarioCreaId', targetKey:'id'})
Lista_insumo.belongsTo(Usuario,{as:'aprueba',foreignKey:'usuarioApruebaId', targetKey:'id'})
Linea_insumo.belongsTo(Producto);

//CREAR CENTRO DE COSTO
centro_costos.post('/crear', (req, res) => {
  const centro_costo = JSON.parse(req.body.centro_costo);
  const centroData = {
    fecha_inicio: new Date(centro_costo.fecha_inicio),
    //fecha_cierre: centro_costo.fecha_cierre,
    precio_servicio: centro_costo.precio_servicio,
    total_costos: centro_costo.total_costos,
    utilidad: centro_costo.utilidad,
    numero_cc: centro_costo.numero_cc,
    estado: centro_costo.estado,
    clienteId: centro_costo.clienteId,
    cajaId: centro_costo.cajaId
  };
  Centro.max('numero_cc')
    .then((max) => {
      if (!max) {
        centroData.numero_cc = 1;
      } else {
        centroData.numero_cc = max + 1;
      }
      Centro.create(centroData)
        .then((centro) => {
          res.json({ centro: centro });
        })
        .catch((error) => {
          res.send('error: ' + error);
        });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//EDITAR CENTRO DE COSTO
centro_costos.put('/editar/:id', (req, res) => {
  const centro_costo = JSON.parse(req.body.centro_costo);
  const centroData = {
    fecha_inicio: new Date(centro_costo.fecha_inicio),
    fecha_cierre: centro_costo.fecha_cierre,
    precio_servicio: centro_costo.precio_servicio,
    total_costos: centro_costo.total_costos,
    utilidad: centro_costo.utilidad,
    numero_cc: centro_costo.numero_cc,
    estado: centro_costo.estado,
    clienteId: centro_costo.clienteId,
    cajaId: centro_costo.cajaId
  };
  Centro.findById(req.params.id)
    .then((centro) => {
      Centro.update(centroData, { where: { id: req.params.id } })
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

//CERRAR CENTRO DE COSTO
centro_costos.put('/cerrar/:id', (req, res) => {
  const centro_costo = JSON.parse(req.body.centro_costo);
  const centroData = {
    fecha_inicio: centro_costo.fecha_inicio,
    fecha_cierre: new Date(centro_costo.fecha_cierre),
    precio_servicio: centro_costo.precio_servicio,
    total_costos: centro_costo.total_costos,
    utilidad: centro_costo.utilidad,
    numero_cc: centro_costo.numero_cc,
    estado: centro_costo.estado,
    clienteId: centro_costo.clienteId,
    cajaId: centro_costo.cajaId
  };
  Centro.findById(req.params.id)
    .then((centro) => {
      Centro.update(centroData, { where: { id: req.params.id } })
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

//OBTENER CENTRO DE COSTO POR ID
centro_costos.get('/obtener/:id', (req, res) => {
  Centro.findById(req.params.id, {
    include: [
      {
        model: Cliente,
        as: 'cliente'
      },
      {
        model: CentroTrabajador,
        include: [
          {
            model: Trabajador
            // include:[{
            //   model:Liquidacion,
            //   where:{centroCostoId: req.params.id},
            //   required:false
            // }]
          },
          {
            model: Liquidacion
          }
        ]
      },
      {
        model: Lista_insumo,
        include: [
          {
            model: Linea_insumo,
            include: [
              {
                model: Producto
              }
            ]
          },
          {
            model:Usuario,
            as:'crea',
            attributes:['nombre','apellido']
          },
          {
            model:Usuario,
            as:'aprueba',
            attributes:['nombre','apellido']
          }
        ]
      },
      {
        model: Ccegreso
      },
      {
        model: Ccingreso
      }
    ]
    //where:{estado: true},
  })
    .then((centro) => {
      res.json({ centro: centro });
    })
    .catch((error) => {
      console.log(error);
    });
});

//VER TODOS LOS CENTROS DE COSTO ACTIVOS POR ID CAJA
centro_costos.get('/activo/:id', (req, res) => {
  Centro.findAll({
    include: [
      {
        model: Cliente,
        as: 'cliente'
      }
    ],
    where: {
      estado: 1,
      cajaId: req.params.id
    },
    order: [['id', 'DESC']]
  })
    .then((centros) => {
      res.json({ centros: centros });
    })
    .catch((error) => {
      console.log(error);
    });
});

//VER TODOS LOS CENTROS DE COSTO INACTIVO POR ID CAJA
centro_costos.get('/inactivo/:id', (req, res) => {
  Centro.findAll({
    include: [
      {
        model: Cliente,
        as: 'cliente'
      }
    ],
    where: {
      estado: 0,
      cajaId: req.params.id
    },
    order: [['id', 'DESC']]
  })
    .then((centros) => {
      res.json({ centros: centros });
    })
    .catch((error) => {
      console.log(error);
    });
});

//VER CENTRO DE COSTOS POR CLIENTE  *** NOSE OCUPA TODAVIA
centro_costos.get('/obtener-cliente/:id', (req, res) => {
  Centro.findAll({
    include: [
      {
        model: Cliente,
        as: 'cliente'
      }
    ],
    where: { clienteId: req.params.id },
    order: [['id', 'DESC']]
  })
    .then((centros) => {
      res.json({ centros: centros });
    })
    .catch((error) => {
      console.log(error);
    });
});
//OBTENER TODOS LOS CENTROS DE COSTO POR ID CAJA
centro_costos.get('/todos/:id', (req, res) => {
  Centro.findAll({
    include: [
      {
        model: Cliente,
        as: 'cliente'
      },
      {
        model: Ccegreso
      },
      {
        model: CentroTrabajador,
        include: [
          {
            model: Trabajador
          },
          {
            model: Liquidacion
          }
        ]
      },
      {
        model: Lista_insumo,
        include: [
          {
            model: Linea_insumo,
            include: [
              {
                model: Producto
              }
            ]
          }
        ]
      }
    ],
    where: { cajaId: req.params.id }
  })
    .then((centros) => {
      res.json({ centros: centros });
    })
    .catch((error) => {
      console.log(error);
    });
});

//BUSQUEDA DE TODOS LOS CENTROS DE COSTO ACTIVOS POR ID CAJA
centro_costos.get('/busca-activo/:id/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Centro.findAll({
      include: [
        {
          model: Cliente,
          as: 'cliente'
        }
      ],
      where: {
        estado: 1,
        cajaId: req.params.id,
        [Op.or]: [
          {
            '$cliente.representante$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((centros) => {
        res.json({ centros: centros });
      })
      .catch((error) => {
        console.log(error);
      });
  } else {
    Centro.findAll({
      include: [
        {
          model: Cliente,
          as: 'cliente'
        }
      ],
      where: {
        estado: 1,
        cajaId: req.params.id
      },
      order: [['id', 'DESC']]
    })
      .then((centros) => {
        res.json({ centros: centros });
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

//BUSQUEDA DE TODOS LOS CENTROS DE COSTO INACTIVO POR ID CAJA
centro_costos.get('/busca-inactivo/:id/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Centro.findAll({
      include: [
        {
          model: Cliente,
          as: 'cliente'
        }
      ],
      where: {
        estado: 0,
        cajaId: req.params.id,
        [Op.or]: [
          {
            '$cliente.representante$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((centros) => {
        res.json({ centros: centros });
      })
      .catch((error) => {
        console.log(error);
      });
  } else {
    Centro.findAll({
      include: [
        {
          model: Cliente,
          as: 'cliente'
        }
      ],
      where: {
        estado: 0,
        cajaId: req.params.id
      },
      order: [['id', 'DESC']]
    })
      .then((centros) => {
        res.json({ centros: centros });
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

module.exports = centro_costos;
