const Sequelize = require('sequelize');
const db = require('../../database/database');

const Servicio = require('./Servicio');
const Categoria = require('./Categoria_servicio');
const Usuario = require('./Usuario_app');

module.exports = db.sequelize.define(
  'reservas',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orden:{
      type: Sequelize.INTEGER
    },
    fecha_creacion: {
      type: Sequelize.DATE
    },
    hora_inicio: {
      type: Sequelize.TIME
    },
    hora_fin: {
      type: Sequelize.TIME
    },
    fecha_reserva: {
      type: Sequelize.DATE
    },
    precio: {
      type: Sequelize.INTEGER
    },
    estado: {
      type: Sequelize.INTEGER
    },
    tipo: {
      type: Sequelize.INTEGER
    },
    metodo_pago:{
      type: Sequelize.STRING
    },
    pagado:{
      type: Sequelize.BOOLEAN
    },
    cantidad:{
      type: Sequelize.INTEGER
    },
    precio_total:{
      type: Sequelize.INTEGER
    },
    usuarioAppId: {
      type: Sequelize.INTEGER,
      references: {
        model: Usuario,
        key: 'id'
      }
    },
    servicioId: {
      type: Sequelize.INTEGER,
      references: {
        model: Servicio,
        key: 'id'
      }
    }    
  },
  {
    timestamps: false
  }
);
