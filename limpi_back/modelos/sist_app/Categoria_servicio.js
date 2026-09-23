const Sequelize = require('sequelize');
const db = require('../../database/database');

module.exports = db.sequelize.define(
  'categoria_servicios',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    activar_cantidad: {
      type: Sequelize.BOOLEAN     
    },
    imagen: {
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
