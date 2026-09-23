const Sequelize = require('sequelize');
const db = require('../../database/database');
const Cliente = require('./Cliente');

module.exports = db.sequelize.define(
  'acceso_clientes',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrment: true
    },
    nombre:{
      type: Sequelize.STRING
    },
    correo: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    clienteId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cliente,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
