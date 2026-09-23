const Sequelize = require('sequelize');
const db = require('../../database/database');

const Cronogramas = require('../apartado_cronograma/Cronograma');
const Trabajadores = require('../sistema_base/Trabajadore');

module.exports = db.sequelize.define(
  'trabajadores_cronogramas',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cronogramaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cronogramas,
        key: 'id'
      }
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