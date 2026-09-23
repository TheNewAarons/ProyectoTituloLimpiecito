const Sequelize = require('sequelize');
const db = require('../../database/database');

const ListasPevTrabajadores = require('../apartado_listas_pev/listaPevTrabajador');
const Tareas = require('../apartado_listas_pev/tarea');

module.exports = db.sequelize.define(
  'linea_lista_pev_trabajadores',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    check_trabajador_1: {
      type: Sequelize.INTEGER
    },
    hora_check_trabajador_1: {
      type: Sequelize.TIME
    },
    check_trabajador_2: {
        type: Sequelize.INTEGER
    },
    hora_check_trabajador_2: {
    type: Sequelize.TIME
    },
    check_trabajador_3: {
    type: Sequelize.INTEGER
    },
    hora_check_trabajador_3: {
    type: Sequelize.TIME
    },
    observaciones: {
      type: Sequelize.STRING
    },
    listasPevTrabajadoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: ListasPevTrabajadores,
        key: 'id'
      }
    },
    tareaId: {
        type: Sequelize.INTEGER,
        references: {
          model: Tareas,
          key: 'id'
        }
      }
  },
  {
    timestamps: false
  }
);