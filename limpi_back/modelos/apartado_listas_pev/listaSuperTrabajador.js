const Sequelize = require('sequelize');
const db = require('../../database/database');

const ListaPevTrabajador = require('../apartado_listas_pev/listaPevTrabajador');

module.exports = db.sequelize.define(
  'listas_super_trabajadores',
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
    n_empleado: {
      type: Sequelize.INTEGER
    },
    listasPevTrabajadoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: ListaPevTrabajador,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);