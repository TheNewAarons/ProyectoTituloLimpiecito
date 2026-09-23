const Sequelize = require('sequelize');
const db = require('../../database/database');

const Cliente = require('../sistema_base/Cliente');

module.exports = db.sequelize.define(
  'carpeta_padres',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cant_documento:{
      type: Sequelize.INTEGER
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
