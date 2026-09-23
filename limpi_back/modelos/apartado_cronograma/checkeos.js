const Sequelize = require('sequelize');
const db = require('../../database/database');
const Linea_cronograma = require('./Linea_cronograma')

module.exports = db.sequelize.define(
  'checkeos',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    check:{
      type: Sequelize.BOOLEAN
    },
    fecha: {
      type: Sequelize.DATE
    },
    comentario: {
      type: Sequelize.STRING
    },
    lineaCronogramaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Linea_cronograma,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
