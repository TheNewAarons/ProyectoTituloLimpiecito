const Sequelize = require('sequelize');
const db = require('../../database/database');
const Cliente = require('./Cliente');
const Documento = require('./Documento');

module.exports = db.sequelize.define(
  'descarga_cliente_documentos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fecha: {
      type: Sequelize.DATE
    },
    clienteId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cliente,
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
