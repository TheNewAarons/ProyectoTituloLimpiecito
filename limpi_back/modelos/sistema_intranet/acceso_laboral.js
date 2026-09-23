const Sequelize = require('sequelize');
const db = require('../../database/database');

const Trabajadores = require('../sistema_base/Trabajadore');

module.exports = db.sequelize.define(
  'accesos_laborales',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    correo: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    estado: {
        type: Sequelize.INTEGER
    },
    tipo:{
      type: Sequelize.INTEGER
    },
    trabajadoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: Trabajadores,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);