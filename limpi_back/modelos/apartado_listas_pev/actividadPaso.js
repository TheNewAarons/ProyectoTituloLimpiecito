const Sequelize = require('sequelize');
const db = require('../../database/database');

// RF-PEV-02a — Pasos de una actividad (tabla `actividad_pasos`, migración 20261116052140). SIN timestamps.
module.exports = db.sequelize.define(
  'actividad_pasos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    actividad_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    orden: {
      type: Sequelize.TINYINT,
      allowNull: false
    },
    nombre: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    columna_legacy: {
      type: Sequelize.STRING(30),
      allowNull: true
    },
    estado: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: 'actividad_pasos',
    freezeTableName: true,
    timestamps: false
  }
);

// Asociación al final (después de exportar) para romper el require circular con actividad.js.
const Actividad = require('./actividad');
module.exports.belongsTo(Actividad, { as: 'actividad', foreignKey: 'actividad_id' });
