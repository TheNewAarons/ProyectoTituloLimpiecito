const Sequelize = require('sequelize');
const db = require('../../database/database');

const Categoria_servicio = require('./Categoria_servicio');

module.exports = db.sequelize.define(
  'articulos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    texto: {
      type: Sequelize.STRING,
      validate: {
        notEmpty: {
          msg: 'No puede ser vacio'
        }
      }
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
