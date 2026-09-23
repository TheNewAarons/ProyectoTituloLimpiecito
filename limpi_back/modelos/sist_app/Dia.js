const Sequelize = require('sequelize');
const db = require('../../database/database');

const Horarios = require('./Horario');

module.exports = db.sequelize.define(
  'dias',
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
    horarioId: {
      type: Sequelize.INTEGER,
      references: {
        model: Horarios,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);