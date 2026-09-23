const Sequelize = require('sequelize');
const db = require('../../database/database');

const Reserva = require('./Reserva');

module.exports = db.sequelize.define(
  'extra_lavados',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tipo: {
      type: Sequelize.STRING
    },
    marca: {
      type: Sequelize.STRING
    },
    modelo: {
      type: Sequelize.STRING
    },
    patente: {
      type: Sequelize.STRING
    },
    direccion: {
      type: Sequelize.STRING
    },
    celular: {
      type: Sequelize.STRING
    },
    recibe: {
      type: Sequelize.STRING
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
