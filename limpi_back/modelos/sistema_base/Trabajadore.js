const Sequelize = require('sequelize');
const db = require("../../database/database.js")

const Salude = require('./Salude');
const Seguro = require('./Seguro');
const Instituto_previsione = require('./Instituto_previsione');
const Dato_liquidacione = require('./Dato_liquidacione');
const Acceso_trabajador = require('./Acceso_trabajador');

module.exports = db.sequelize.define(
  'trabajadores',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING
    },
    apellido: {
      type: Sequelize.STRING
    },
    rut: {
      type: Sequelize.STRING
    },
    telefono: {
      type: Sequelize.INTEGER
    },
    telefono_emergencia: {
      type: Sequelize.INTEGER
    },
    correo: {
      type: Sequelize.STRING
    },
    direccion: {
      type: Sequelize.STRING
    },
    fecha_nacimiento: {
      type: Sequelize.DATE
    },
    sexo: {
      type: Sequelize.STRING
    },
    estado: {
      type: Sequelize.INTEGER
    },
    n_empleado: {
      type: Sequelize.INTEGER
    },
    fecha_inicio_contrato: {
      type: Sequelize.DATE
    },
    fecha_termino_contrato: {
      type: Sequelize.DATE
    },
    enfermedad_cronica: {
      type: Sequelize.STRING
    },
    saludeId: {
      type: Sequelize.INTEGER,
      references: {
        model: Salude,
        key: 'id'
      }
    },
    seguroId: {
      type: Sequelize.INTEGER,
      references: {
        model: Seguro,
        key: 'id'
      }
    },
    institutoPrevisioneId: {
      type: Sequelize.INTEGER,
      references: {
        model: Instituto_previsione,
        key: 'id'
      }
    },
    datoLiquidacioneId: {
      type: Sequelize.INTEGER,
      references: {
        model: Dato_liquidacione,
        key: 'id'
      }
    },
    accesoTrabajadoreId: {
      type: Sequelize.INTEGER,
      references: {
        model: Acceso_trabajador,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
);
