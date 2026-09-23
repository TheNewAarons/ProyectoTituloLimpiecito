const Sequelize = require("sequelize");
const db = require('../../database/database');

module.exports = db.sequelize.define(
  "liquidaciones",
  {
    sueldo_base: {
      type: Sequelize.INTEGER,
    },
    monto_mes: {
      type: Sequelize.INTEGER,
    },
    cant_horas_extras: {
      type: Sequelize.INTEGER,
    },
    valor_horas_extras: {
      type: Sequelize.INTEGER,
    },
    porcentaje_gratificacion: {
      type: Sequelize.INTEGER,
    },
    gratificacion: {
      type: Sequelize.INTEGER,
    },
    reajuste_retroactivo: {
      type: Sequelize.INTEGER,
    },
    monto_indemnizacion: {
      type: Sequelize.INTEGER,
    },
    bono_indemnizacion: {
      type: Sequelize.INTEGER,
    },
    valor_movilizacion: {
      type: Sequelize.INTEGER,
    },
    movilizacion: {
      type: Sequelize.INTEGER,
    },
    colacion: {
      type: Sequelize.INTEGER,
    },
    monto_produccion: {
      type: Sequelize.INTEGER,
    },
    bono_produccion: {
      type: Sequelize.INTEGER,
    },
    dias_trabajados: {
      type: Sequelize.INTEGER,
    },
    monto_responsabilidad: {
      type: Sequelize.INTEGER,
    },
    bono_responsabilidad: {
      type: Sequelize.INTEGER,
    },
    total_haber: {
      type: Sequelize.INTEGER,
    },
    total_imponible: {
      type: Sequelize.INTEGER,
    },
    cotizacion_obligatoria: {
      type: Sequelize.INTEGER,
    },
    salud: {
      type: Sequelize.INTEGER,
    },
    seguro_cesantia: {
      type: Sequelize.INTEGER,
    },
    total_descuento: {
      type: Sequelize.INTEGER,
    },
    anticipo: {
      type: Sequelize.INTEGER,
    },
    liquido_pagar: {
      type: Sequelize.INTEGER,
    },
    hora_faltante: {
      type: Sequelize.INTEGER,
    },
    valor_hora_faltante: {
      type: Sequelize.INTEGER,
    },
    cant_familiar: {
      type: Sequelize.INTEGER,
    },
    valor_carga_familiar: {
      type: Sequelize.INTEGER,
    },
    fecha_creacion: {
      type: Sequelize.DATE,
    },
    horas_feriado: {
      type: Sequelize.INTEGER,
    },
    valor_hora_feriado: {
      type: Sequelize.INTEGER,
    },
    total_pago: {
      type: Sequelize.INTEGER,
    },
    alimentacion: {
      type: Sequelize.INTEGER,
    },
    tipo_trabajador: {
      type: Sequelize.BOOLEAN,
    },
    estado: {
      type: Sequelize.INTEGER,
    },
  },
  {
    timestamps: false,
  }
);
