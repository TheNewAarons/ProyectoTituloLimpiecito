const Sequelize = require('sequelize');
const db = require('../../database/database');

const ListasPevTrabajadores = require('../apartado_listas_pev/listaSuperTrabajador');
const Tareas = require('../apartado_listas_pev/tarea');

module.exports = db.sequelize.define(
  'linea_lista_super_trabajadores',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hora_1: {
      type: Sequelize.TIME
    },
    despolvado_1: {
      type: Sequelize.INTEGER
    },
    aplicacion_producto_1: {
      type: Sequelize.INTEGER
    },
    abrillantado_1: {
      type: Sequelize.INTEGER
    },
    hora_2: {
      type: Sequelize.TIME
    },
    despolvado_2: {
      type: Sequelize.INTEGER
    },
    aplicacion_producto_2: {
      type: Sequelize.INTEGER
    },
    abrillantado_2: {
      type: Sequelize.INTEGER
    },
    hora_3: {
      type: Sequelize.TIME
    },
    despolvado_3: {
      type: Sequelize.INTEGER
    },
    aplicacion_producto_3: {
      type: Sequelize.INTEGER
    },
    abrillantado_3: {
      type: Sequelize.INTEGER
    },
    observaciones: {
      type: Sequelize.STRING
    },
    listasSuperTrabajadoreId: {
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
