const Sequelize = require('sequelize');
const db = require('../../database/database');

const Categoria_servicio = require('./Categoria_servicio');

module.exports = db.sequelize.define(
  'servicios',
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
    imagen: {
      type: Sequelize.STRING
    },
    precio: {
      type: Sequelize.INTEGER
    },
    estado: {
      type: Sequelize.INTEGER
    },
    categoriaServicioId: {
      type: Sequelize.INTEGER,
      references: {
        model: Categoria_servicio,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
