const Sequelize = require('sequelize');
const db = require('../../database/database.js');
const Usuario = require("../sistema_base/Usuario");


module.exports = db.sequelize.define(
  'anuncios',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: Sequelize.STRING
    },
    sub_titulo: {
      type: Sequelize.STRING
    },
    descripcion: {
        type: Sequelize.STRING
      },
    imagen: {
      type: Sequelize.STRING
    },
    
    usuarioId: {
      type: Sequelize.INTEGER,
      references: {
        model: Usuario,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
