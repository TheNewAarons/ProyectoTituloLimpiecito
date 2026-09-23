const Sequelize = require('sequelize');
const db = require('../../database/database');

const Sectores = require('../apartado_listas_pev/sector');

module.exports = db.sequelize.define(
  'areas',
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
    sectoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: Sectores,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);