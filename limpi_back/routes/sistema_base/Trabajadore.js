const express = require('express');
const trabajadores = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const Salude = require('../../modelos/sistema_base/Salude');
const Seguro = require('../../modelos/sistema_base/Seguro');
const Vestimenta = require('../../modelos/sistema_base/Vestimenta');
const Instituto_previsione = require('../../modelos/sistema_base/Instituto_previsione');
const Egreso = require('../../modelos/sistema_base/Egreso');
const Dato_liquidacione = require('../../modelos/sistema_base/Dato_liquidacione');
const Acceso_trabajador = require('../../modelos/sistema_base/Acceso_trabajador');
const Asoc_trabajador = require('../../modelos/sistema_base/Asociacion_trabajador');
const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');

//RELACIONES *-* 1-1
Trabajadore.belongsTo(Salude);
Trabajadore.belongsTo(Seguro);
Trabajadore.belongsTo(Instituto_previsione);
Vestimenta.belongsTo(Trabajadore);
Trabajadore.belongsTo(Dato_liquidacione);
Trabajadore.belongsTo(Acceso_trabajador);
Trabajadore.hasMany(Asoc_trabajador);
Asoc_trabajador.belongsTo(Documento);

//CREAR TRABAJAJOR
trabajadores.post('/crear', (req, res) => {
  const trabajadore = JSON.parse(req.body.trabajadore);
  const trabajadoreData = {
    nombre: trabajadore.nombre,
    apellido: trabajadore.apellido,
    rut: trabajadore.rut,
    telefono: trabajadore.telefono,
    telefono_emergencia: trabajadore.telefono_emergencia,
    correo: trabajadore.correo,
    direccion: trabajadore.direccion,
    fecha_nacimiento: new Date(trabajadore.fecha_nacimiento),
    sexo: trabajadore.sexo,
    estado: trabajadore.estado,
    n_empleado: trabajadore.n_empleado,
    fecha_inicio_contrato: new Date(trabajadore.fecha_inicio_contrato),
    fecha_termino_contrato: new Date(trabajadore.fecha_termino_contrato),
    carga_familiar: trabajadore.carga_familiar,
    enfermedad_cronica: trabajadore.enfermedad_cronica,
    saludeId: trabajadore.saludeId,
    seguroId: trabajadore.seguroId,
    institutoPrevisioneId: trabajadore.institutoPrevisioneId,
    datoLiquidacioneId: trabajadore.datoLiquidacioneId
  };
  const dato_liquidacione = JSON.parse(req.body.dato_liquidacione);
  const dato_liquidacioneData = {
    sueldo_base: dato_liquidacione.sueldo_base,
    gratificacion: dato_liquidacione.gratificacion,
    responsabilidad: dato_liquidacione.responsabilidad,
    colacion: dato_liquidacione.colacion,
    movilizacion: dato_liquidacione.movilizacion,
    alimentacion: dato_liquidacione.alimentacion,
    cant_familia: dato_liquidacione.cant_familia,
    valor_carga_familia: dato_liquidacione.valor_carga_familia
  };
  if (trabajadore.fecha_nacimiento == null) {
    trabajadoreData.fecha_nacimiento = null;
  }
  if (trabajadore.fecha_inicio_contrato == null) {
    trabajadoreData.fecha_inicio_contrato = null;
  }
  if (trabajadore.fecha_termino_contrato == null) {
    trabajadoreData.fecha_termino_contrato = null;
  }
  Trabajadore.max('n_empleado')
    .then((max) => {
      if (!max) {
        trabajadoreData.n_empleado = 1;
      } else {
        trabajadoreData.n_empleado = max + 1;
      }
      Dato_liquidacione.create(dato_liquidacioneData)
        .then((dato) => {
          trabajadoreData.datoLiquidacioneId = dato.id;
          Trabajadore.create(trabajadoreData)
            .then((trabajadore) => {
              res.json({ trabajadore: trabajadore });
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

//EDITAR TRABAJADOR
trabajadores.put('/editar/:id', (req, res) => {
  const trabajadore = JSON.parse(req.body.trabajadore);
  const trabajadoreData = {
    nombre: trabajadore.nombre,
    apellido: trabajadore.apellido,
    rut: trabajadore.rut,
    telefono: trabajadore.telefono,
    telefono_emergencia: trabajadore.telefono_emergencia,
    correo: trabajadore.correo,
    direccion: trabajadore.direccion,
    fecha_nacimiento: trabajadore.fecha_nacimiento,
    sexo: trabajadore.sexo,
    estado: trabajadore.estado,
    n_empleado: trabajadore.n_empleado,
    fecha_inicio_contrato: new Date(trabajadore.fecha_inicio_contrato),
    fecha_termino_contrato: new Date(trabajadore.fecha_termino_contrato),
    carga_familiar: trabajadore.carga_familiar,
    enfermedad_cronica: trabajadore.enfermedad_cronica,
    saludeId: trabajadore.saludeId,
    seguroId: trabajadore.seguroId,
    institutoPrevisioneId: trabajadore.institutoPrevisioneId
  };
  const dato_liquidacioneData = trabajadore.dato_liquidacione;
  if (trabajadore.fecha_nacimiento == null) {
    trabajadoreData.fecha_nacimiento = null;
  }
  if (trabajadore.fecha_inicio_contrato == null) {
    trabajadoreData.fecha_inicio_contrato = null;
  }
  if (trabajadore.fecha_termino_contrato == null) {
    trabajadoreData.fecha_termino_contrato = null;
  }
  Trabajadore.findById(req.params.id)
    .then((trabajadore) => {
      Trabajadore.update(trabajadoreData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          Dato_liquidacione.update(dato_liquidacioneData, { where: { id: trabajadore.datoLiquidacioneId } })
            .then((filas) => {
              const total_filas = Number(filasUpdate) + Number(filas);
              res.json({ filas: total_filas });
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

//OBTENER TODOS LAS TRABAJADORES
trabajadores.get('/todos', (req, res) => {
  Trabajadore.findAll({
    include: [
      {
        model: Instituto_previsione
      },
      {
        model: Seguro
      },
      {
        model: Salude
      },
      {
        model: Vestimenta
      }
    ],
    order: [['id', 'DESC']]
  })
    .then((trabajadores) => {
      res.json({ trabajadores: trabajadores });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LAS TRABAJADORES ACTIVOS
trabajadores.get('/activos', (req, res) => {
  Trabajadore.findAll({
    include: [
      {
        model: Instituto_previsione
      },
      {
        model: Seguro
      },
      {
        model: Salude
      }
      /*{
            model:Vestimenta,
            //include:[Producto]
        }*/
    ],
    order: [['id', 'DESC']],
    where: {
      estado: 1
    }
  })
    .then((trabajadores) => {
      res.json({ trabajadores: trabajadores });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODOS LAS TRABAJADORES ACTIVOS
trabajadores.get('/inactivos', (req, res) => {
  Trabajadore.findAll({
    include: [
      {
        model: Instituto_previsione
      },
      {
        model: Seguro
      },
      {
        model: Salude
      }
      /*{
            model:Vestimenta,
            //include:[Producto]
        }*/
    ],
    order: [['id', 'DESC']],
    where: {
      estado: 0
    }
  })
    .then((trabajadores) => {
      res.json({ trabajadores: trabajadores });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR TRABAJADOR ( CAMBIAR ESTADO A INACTIVO)
trabajadores.delete('/eliminar/:id', (req, res) => {
  Trabajadore.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});

//ACTIVAR TRABAJADOR ( CAMBIAR ESTADO A ACTIVO)
trabajadores.delete('/activar/:id', (req, res) => {
  Trabajadore.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});

//OBTENER UN TRABAJADOR POR ID CON SUS AFP SEGURO SALUD
trabajadores.get('/obtener/:id', (req, res) => {
  Trabajadore.findById(req.params.id, {
    include: [
      { model: Salude },
      { model: Seguro },
      { model: Instituto_previsione },
      { model: Dato_liquidacione },
      { model: Acceso_trabajador },
      { model: Asoc_trabajador, include: [{ model: Documento, include: [Categoria] }] }
    ]
  })
    .then((trabajador) => {
      res.json({ trabajador: trabajador });
    })
    .catch((error) => {
      console.log(error);
    });
});

//BUSCAR TODOS LAS TRABAJADORES ACTIVOS
trabajadores.get('/busca-activos/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Trabajadore.findAll({
      include: [{ model: Instituto_previsione }, { model: Seguro }, { model: Salude }],
      order: [['id', 'DESC']],
      where: {
        estado: 1,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            rut: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            telefono: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      }
    })
      .then((trabajadores) => {
        res.json({ trabajadores: trabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Trabajadore.findAll({
      include: [
        {
          model: Instituto_previsione
        },
        {
          model: Seguro
        },
        {
          model: Salude
        }
      ],
      order: [['id', 'DESC']],
      where: {
        estado: 1
      }
    })
      .then((trabajadores) => {
        res.json({ trabajadores: trabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

//BUSCAR TODOS LAS TRABAJADORES ACTIVOS
trabajadores.get('/busca-inactivos/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Trabajadore.findAll({
      include: [
        {
          model: Instituto_previsione
        },
        {
          model: Seguro
        },
        {
          model: Salude
        }
      ],
      order: [['id', 'DESC']],
      where: {
        estado: 0,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            rut: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            telefono: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      }
    })
      .then((trabajadores) => {
        res.json({ trabajadores: trabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Trabajadore.findAll({
      include: [
        {
          model: Instituto_previsione
        },
        {
          model: Seguro
        },
        {
          model: Salude
        }
      ],
      order: [['id', 'DESC']],
      where: {
        estado: 0
      }
    })
      .then((trabajadores) => {
        res.json({ trabajadores: trabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

// webeo
// trabajadores.get('/prueba',(req,res)=>{
//   Egreso.max('monto')
//   .then( max =>{
//     console.log('esto es max:'+max)
//     if(max == null){
//       res.json({max:max})
//     }else {
//       let maximo = max+1;
//       res.json({max:maximo})
//     }
//
//   })
//   .catch(error => {
//     res.send('error: '+error)
//   })
// })

module.exports = trabajadores;
