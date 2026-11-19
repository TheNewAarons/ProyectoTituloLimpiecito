const Sequelize = require('sequelize');
const db = require('../../database/database');

// RF-PEV-02a — Definición de actividad (tabla `actividades`, migración 20261116052140). Asociaciones
// declaradas SOLO en este archivo (lado nuevo) y siempre con `as` explícito (D-103).
module.exports = db.sequelize.define(
  'actividades',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cliente_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    nombre: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    estado: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    origen: {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'APP'
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'actividades',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Asociación al final (después de exportar) para romper el require circular con actividadPaso.js.
const ActividadPaso = require('./actividadPaso');
module.exports.hasMany(ActividadPaso, { as: 'pasos', foreignKey: 'actividad_id' });
