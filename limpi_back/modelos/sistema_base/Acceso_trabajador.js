const Sequelize = require('sequelize');
const db = require('../../database/database');

module.exports = db.sequelize.define(
  'acceso_trabajadores',
  {
    // id: {
    //   type: Sequelize.INTEGER,
    //   primaryKey: true,
    //   autoIncrment: true
    // },
    correo: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.BOOLEAN
    }
  },
  {
    timestamps: false
  }
);
