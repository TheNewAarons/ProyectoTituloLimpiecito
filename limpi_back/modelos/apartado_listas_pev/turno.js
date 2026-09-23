const Sequelize = require('sequelize');
const db = require('../../database/database');

const Clientes = require('../sistema_base/Cliente');

module.exports = db.sequelize.define(
  'turnos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.INTEGER
    },
    clienteId: {
      type: Sequelize.INTEGER,
      references: {
        model: Clientes,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);