const Sequelize = require('sequelize');
const db = require('../../database/database.js');

// RF-WEB-01: tabla `catalogo_items` (migración 20261119020439). Independiente de bodega y de la app de reservas.
module.exports = db.sequelize.define(
  'catalogo_items',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    categoria: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    imagen: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    precio: {
      type: Sequelize.DECIMAL(14, 0),
      allowNull: true
    },
    publicado: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    orden: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'catalogo_items',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
