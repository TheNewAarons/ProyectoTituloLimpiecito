const Sequelize = require('sequelize');
const db = require('../../database/database');

const Areas = require('../apartado_listas_pev/area');

module.exports = db.sequelize.define(
  'tareas',
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
    areaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Areas,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);