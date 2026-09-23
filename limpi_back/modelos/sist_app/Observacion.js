const Sequelize = require('sequelize');
const db = require('../../database/database');
const Reserva = require('./Reserva');

module.exports = db.sequelize.define(
  'observaciones',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    observacion: {
      type: Sequelize.STRING
    },
    fecha: {
      type: Sequelize.DATE
    },
    reservaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Reserva,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
