const Sequelize = require('sequelize');
const db = require('../../database/database');

const Carpeta = require('./Carpeta')


module.exports = db.sequelize.define(
  'doc_clientes',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre:{
        type: Sequelize.STRING
    },
    url:{
        type: Sequelize.STRING
    },
    fecha:{
        type: Sequelize.STRING
    },
    carpetaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Carpeta,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);