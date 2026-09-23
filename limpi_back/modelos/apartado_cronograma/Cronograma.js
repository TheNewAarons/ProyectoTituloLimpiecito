const Sequelize = require('sequelize');
const db = require('../../database/database');
const Cliente = require('../sistema_base/Cliente')
const Turno = require('../apartado_listas_pev/turno')

module.exports = db.sequelize.define(
  'cronogramas',
  {
    mes:{
      type: Sequelize.INTEGER
    },
    anio: {
      type: Sequelize.INTEGER
    },
    fecha: {
      type: Sequelize.DATE
    },
    estado: {
      type:Sequelize.INTEGER
    },
    fecha_inicio:{
      type:Sequelize.DATE
    },
    fecha_termino:{
      type:Sequelize.DATE
    },
    clienteId: {
      type: Sequelize.INTEGER,
      references: {
        model: Cliente,
        key: 'id'
      }
    },
    turnoId: {
        type: Sequelize.INTEGER,
        references: {
          model: Turno,
          key: 'id'
        }
      }
  },
  {
    timestamps: false
  }
);
