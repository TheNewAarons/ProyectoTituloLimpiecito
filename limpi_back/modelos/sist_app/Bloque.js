const Sequelize = require('sequelize');
const db = require('../../database/database');
const Dia = require('./Dia');

module.exports = db.sequelize.define(
  'bloques',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hora_inicio: {
      type: Sequelize.TIME
    },
    hora_fin: {
      type: Sequelize.TIME
    },
    activo: {
      type: Sequelize.BOOLEAN,
    },
    diaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Dia,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
