const Sequelize = require('sequelize');
const db = require('../../database/database');

module.exports = db.sequelize.define(
  'categoria_documentos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    descripcion: {
      type: Sequelize.STRING
    },
    tipo: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.BOOLEAN
    }
  },
  {
    timestamps: false
  }
);
