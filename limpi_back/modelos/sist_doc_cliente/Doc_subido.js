const Sequelize = require('sequelize');
const db = require('../../database/database');

const Cliente = require('../sistema_base/Cliente');

module.exports = db.sequelize.define(
  'doc_subidos',
  {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ruta:{
        type: Sequelize.STRING
    },
    fecha:{
        type: Sequelize.DATE
    },
    clienteId: {
        type: Sequelize.INTEGER,
        references: {
            model: Cliente,
            key: 'id'
        }
    }
  },
  {
    timestamps: false
  }
);
