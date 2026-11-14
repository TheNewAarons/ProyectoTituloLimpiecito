const Sequelize = require('sequelize');
const db = require('../../database/database.js');

// RF-WEB-03: tabla `publicaciones` (migración 20261114130000). `cuerpo` se guarda ya sanitizado.
module.exports = db.sequelize.define(
  'publicaciones',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    cuerpo: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    imagen: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    fecha_publicacion: {
      type: Sequelize.DATE,
      allowNull: false
    },
    fecha_expiracion: {
      type: Sequelize.DATE,
      allowNull: true
    },
    publicado: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: 'publicaciones',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);
