const Sequelize = require('sequelize');
const db = require('../../database/database.js');

// RF-BI-01: parámetros clave/valor (migración 20261120043243). Ej.: 'bi.umbral_utilidad_baja' (CLP entero como texto).
module.exports = db.sequelize.define(
  'configuracion',
  {
    clave: {
      type: Sequelize.STRING(80),
      primaryKey: true
    },
    valor: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'configuracion',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
