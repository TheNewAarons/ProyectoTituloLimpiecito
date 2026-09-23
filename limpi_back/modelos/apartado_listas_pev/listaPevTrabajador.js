const Sequelize = require('sequelize');
const db = require('../../database/database');

const Cronogramas = require('../apartado_cronograma/Cronograma');
const Sector = require('../apartado_listas_pev/sector')

module.exports = db.sequelize.define(
  'listas_pev_trabajadores',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    estado: {
      type: Sequelize.INTEGER
    },
    fecha_creacion: {
      type: Sequelize.DATE
    },
    fecha_firma: {
      type: Sequelize.DATE
    },
    fecha_chequeo:{
      type:Sequelize.DATE
    },
    n_empleado: {
      type: Sequelize.INTEGER
    },
    sectoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: Sector,
        key: 'id'
      }
    },
    cronogramaId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cronogramas,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);