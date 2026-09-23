const express = require('express');
const liquidaciones = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');
const Salud = require('../../modelos/sistema_base/Salude');
const Afp = require('../../modelos/sistema_base/Instituto_previsione');
const Seguro = require('../../modelos/sistema_base/Seguro');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const Cliente = require('../../modelos/sistema_base/Cliente');

const CentroCostoTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');

liquidaciones.use(cors());

/** RELACIONES   */
CentroCostoTrabajador.belongsTo(Liquidacion);
Trabajador.belongsTo(Salud);
Trabajador.belongsTo(Seguro);
Trabajador.belongsTo(Afp);
CentroCostoTrabajador.belongsTo(Centro, { as: 'centro_costo' });
CentroCostoTrabajador.belongsTo(Trabajador);
Centro.belongsTo(Cliente);

// CREAR LIQUIDACION  /***

liquidaciones.post('/crear/:idCentroTrabajador', (req, res) => {
  const liquidacion = JSON.parse(req.body.liquidacion);
  const liquidacionData = {
    id: liquidacion.idd,
    sueldo_base: liquidacion.sueldo_base,
    monto_mes: liquidacion.monto_mes,
    cant_horas_extras: liquidacion.cant_horas_extras,
    valor_horas_extras: liquidacion.valor_horas_extras,
    porcentaje_gratificacion: liquidacion.porcentaje_gratificacion,
    gratificacion: liquidacion.gratificacion,
    reajuste_retroactivo: liquidacion.reajuste_retroactivo,
    monto_indemnizacion: liquidacion.monto_indemnizacion,
    bono_indemnizacion: liquidacion.bono_indemnizacion,
    valor_movilizacion: liquidacion.valor_movilizacion,
    movilizacion: liquidacion.movilizacion,
    colacion: liquidacion.colacion,
    monto_produccion: liquidacion.monto_produccion,
    bono_produccion: liquidacion.bono_produccion,
    dias_trabajados: liquidacion.dias_trabajados,
    monto_responsabilidad: liquidacion.monto_responsabilidad,
    bono_responsabilidad: liquidacion.bono_responsabilidad,
    total_haber: liquidacion.total_haber,
    total_imponible: liquidacion.total_imponible,
    cotizacion_obligatoria: liquidacion.cotizacion_obligatoria,
    salud: liquidacion.salud,
    seguro_cesantia: liquidacion.seguro_cesantia,
    total_descuento: liquidacion.total_descuento,
    anticipo: liquidacion.anticipo,
    liquido_pagar: liquidacion.liquido_pagar,
    hora_faltante: liquidacion.hora_faltante,
    valor_hora_faltante: liquidacion.valor_hora_faltante,
    cant_familiar: liquidacion.cant_familiar,
    valor_carga_familiar: liquidacion.valor_carga_familiar,
    fecha_creacion: new Date(liquidacion.fecha_creacion),
    //descuento_accion: liquidacion.descuento_accion,
    horas_feriado: liquidacion.horas_feriado,
    valor_hora_feriado: liquidacion.valor_hora_feriado,
    total_pago: liquidacion.total_pago,
    alimentacion: liquidacion.alimentacion,
    tipo_trabajador: liquidacion.tipo_trabajador,
    estado: liquidacion.estado
    // trabajadoreId: liquidacion.trabajadoreId,
    // centroCostoId: liquidacion.centroCostoId
    //centroCostoTrabajadoreId: liquidacion.centroCostoTrabajadoreId,
  };
  Liquidacion.create(liquidacionData)
    .then((response) => {
      CentroCostoTrabajador.update({ liquidacioneId: response.id }, { where: { id: req.params.idCentroTrabajador } });
      res.json({ liquidacion: response });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//EDITAR LIQUIDACION POR ID
liquidaciones.put('/editar/:id', (req, res) => {
  const liquidacion = JSON.parse(req.body.liquidacion);
  const liquidacionData = {
    sueldo_base: liquidacion.sueldo_base,
    monto_mes: liquidacion.monto_mes,
    cant_horas_extras: liquidacion.cant_horas_extras,
    valor_horas_extras: liquidacion.valor_horas_extras,
    porcentaje_gratificacion: liquidacion.porcentaje_gratificacion,
    gratificacion: liquidacion.gratificacion,
    reajuste_retroactivo: liquidacion.reajuste_retroactivo,
    monto_indemnizacion: liquidacion.monto_indemnizacion,
    bono_indemnizacion: liquidacion.bono_indemnizacion,
    valor_movilizacion: liquidacion.valor_movilizacion,
    movilizacion: liquidacion.movilizacion,
    colacion: liquidacion.colacion,
    monto_produccion: liquidacion.monto_produccion,
    bono_produccion: liquidacion.bono_produccion,
    dias_trabajados: liquidacion.dias_trabajados,
    monto_responsabilidad: liquidacion.monto_responsabilidad,
    bono_responsabilidad: liquidacion.bono_responsabilidad,
    total_haber: liquidacion.total_haber,
    total_imponible: liquidacion.total_imponible,
    cotizacion_obligatoria: liquidacion.cotizacion_obligatoria,
    salud: liquidacion.salud,
    seguro_cesantia: liquidacion.seguro_cesantia,
    total_descuento: liquidacion.total_descuento,
    anticipo: liquidacion.anticipo,
    liquido_pagar: liquidacion.liquido_pagar,
    hora_faltante: liquidacion.hora_faltante,
    valor_hora_faltante: liquidacion.valor_hora_faltante,
    cant_familiar: liquidacion.cant_familiar,
    valor_carga_familiar: liquidacion.valor_carga_familiar,
    fecha_creacion: new Date(liquidacion.fecha_creacion),
    //descuento_accion: liquidacion.descuento_accion,
    horas_feriado: liquidacion.horas_feriado,
    valor_hora_feriado: liquidacion.valor_hora_feriado,
    total_pago: liquidacion.total_pago,
    alimentacion: liquidacion.alimentacion,
    tipo_trabajador: liquidacion.tipo_trabajador,
    estado: liquidacion.estado
    // trabajadoreId: liquidacion.trabajadoreId,
    // centroCostoId: liquidacion.centroCostoId
    //centroCostoTrabajadoreId: liquidacion.centroCostoTrabajadoreId,
  };
  Liquidacion.findById(req.params.id)
    .then((liquidacion) => {
      if (liquidacion) {
        Liquidacion.update(liquidacionData, { where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas: filas });
          })
          .catch((error) => {
            res.send('error:' + error);
          });
      } else {
        res.send('No existe el producto a editar');
      }
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});

//CERRAR LIQUIDACION POR ID
liquidaciones.delete('/cerrar/:id', (req, res) => {
  Liquidacion.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({ filas: filas });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER LIQUIDACION POR ID TRAER CENTRO TRABAJADOR
liquidaciones.get('/obtener/:id', (req, res) => {
  CentroCostoTrabajador.findOne({
    include: [
      {
        model: Trabajador,
        include: [
          {
            model: Afp
          },
          {
            model: Salud
          },
          {
            model: Seguro
          }
        ]
      },
      {
        model: Centro,
        as: 'centro_costo',
        include: [
          {
            model: Cliente
          }
        ]
      },
      {
        model: Liquidacion
      }
    ],
    where: {
      liquidacioneId: req.params.id
    }
  })
    .then((centroTrabajador) => {
      res.json({ centroTrabajador: centroTrabajador });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODAS LAS LIQUIDACIONES
liquidaciones.get('/obtener-todos/', (req, res) => {
  CentroCostoTrabajador.findAll({
    include: [
      {
        model: Trabajador,
        as: 'trabajadore',
        include: [
          {
            model: Afp
          },
          {
            model: Salud
          },
          {
            model: Seguro
          }
        ]
      },
      {
        model: Centro,
        as: 'centro_costo',
        include: [
          {
            model: Cliente
          }
        ]
      },
      {
        model: Liquidacion,
        required: true
      }
    ]
  })
    .then((centroTrabajadores) => {
      res.json({ centroTrabajadores: centroTrabajadores });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER TODAS LAS LIQUIDACIONES CON BUSCADOR
liquidaciones.get('/obtener-busca/:busca?', (req, res) => {
  if (req.params.busca != null) {
    CentroCostoTrabajador.findAll({
      include: [
        {
          model: Trabajador,
          as: 'trabajadore',
          include: [
            {
              model: Afp
            },
            {
              model: Salud
            },
            {
              model: Seguro
            }
          ]
        },
        {
          model: Centro,
          as: 'centro_costo',
          include: [
            {
              model: Cliente,
              as: 'cliente'
            }
          ]
        },
        {
          model: Liquidacion,
          required: true
        }
      ],
      where: {
        [Op.or]: [
          {
            '$centro_costo.cliente.representante$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            '$trabajadore.nombre$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            '$trabajadore.rut$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            '$centro_costo.numero_cc$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      }
    })
      .then((centroTrabajadores) => {
        res.json({ centroTrabajadores: centroTrabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    CentroCostoTrabajador.findAll({
      include: [
        {
          model: Trabajador,
          as: 'trabajadore',
          include: [
            {
              model: Afp
            },
            {
              model: Salud
            },
            {
              model: Seguro
            }
          ]
        },
        {
          model: Centro,
          as: 'centro_costo',
          include: [
            {
              model: Cliente,
              as: 'cliente'
            }
          ]
        },
        {
          model: Liquidacion,
          required: true
        }
      ]
    })
      .then((centroTrabajadores) => {
        res.json({ centroTrabajadores: centroTrabajadores });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

module.exports = liquidaciones;
