const Sequelize = require('sequelize');
const db = require('../../database/database');

module.exports = db.sequelize.define(
  'usuario_apps',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    correo: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    direccion: {
      type: Sequelize.STRING
    },
    direccion_op: {
      type: Sequelize.STRING
    },
    celular: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.INTEGER
    }
  },
  {
    timestamps: false
  }
);
