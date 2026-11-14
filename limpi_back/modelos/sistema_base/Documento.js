const Sequelize = require('sequelize');
const db = require('../../database/database');

const Categoria = require('./Categoria');

module.exports = db.sequelize.define(
  'documentos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    fecha_subida: {
      type: Sequelize.DATE
    },
    url: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.BOOLEAN
    },
    publico: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    fecha_publicacion: {
      type: Sequelize.DATE
    },
    categoriaDocumentoId: {
      type: Sequelize.INTEGER,
      references: {
        model: Categoria,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
