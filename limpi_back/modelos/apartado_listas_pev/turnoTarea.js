const Sequelize = require('sequelize');
const db = require('../../database/database');

const Turnos = require('../apartado_listas_pev/turno');
const Tareas = require('../apartado_listas_pev/tarea');

module.exports = db.sequelize.define(
  'turnos_tareas',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    turnoId: {
        type: Sequelize.INTEGER,
        references: {
          model: Turnos,
          key: 'id'
        }
    },
    tareaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Tareas,
        key: 'id'
      }
    },
    estado: {
        type: Sequelize.INTEGER
      }
  },
  
  {
    timestamps: false
  }
);