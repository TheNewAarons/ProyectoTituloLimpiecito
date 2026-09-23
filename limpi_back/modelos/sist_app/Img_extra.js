const Sequelize = require('sequelize');
const db = require('../../database/database');

const Categoria_servicio = require('./Categoria_servicio');

module.exports = db.sequelize.define(
  'img_extras',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    url: {
      type: Sequelize.STRING,
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
