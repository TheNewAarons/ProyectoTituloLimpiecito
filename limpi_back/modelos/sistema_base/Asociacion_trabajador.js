const Sequelize = require('sequelize');
const db = require('../../database/database');
const Trabajador = require('./Trabajadore');
const Documento = require('./Documento');

module.exports = db.sequelize.define(
  'trabajador_documentos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fecha: {
      type: Sequelize.DATE
    },
    estado: {
      type: Sequelize.BOOLEAN
    },
    trabajadoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: Trabajador,
        key: 'id'
      }
    },
    documentoId: {
      type: Sequelize.INTEGER,
      references: {
        model: Documento,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
