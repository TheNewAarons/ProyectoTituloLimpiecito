const Sequelize = require('sequelize');
const db = require('../../database/database');
const Cronograma = require('./Cronograma')
const Tarea = require('../apartado_listas_pev/tarea')

module.exports = db.sequelize.define(
  'linea_cronogramas',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cronogramaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cronograma,
        key: 'id'
      }
    },
    tareaId: {
        type: Sequelize.INTEGER,
        references: {
          model: Tarea,
          key: 'id'
        }
      }
  },
  {
    timestamps: false
  }
);
