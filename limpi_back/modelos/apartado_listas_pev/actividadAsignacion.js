const Sequelize = require('sequelize');
const db = require('../../database/database');

const Actividad = require('./actividad');
const Area = require('./area');
const Trabajadore = require('../sistema_base/Trabajadore');
const Turno = require('./turno');
const Tarea = require('./tarea');

// RF-PEV-02a — Asignación de trabajador a una actividad/área/turno (tabla `actividad_asignaciones`,
// migración 20261116052140). `estado` y `activa_flag` sin DEFAULT: los fija el servicio (D-101).
// Asociaciones declaradas SOLO en este archivo (lado nuevo) y siempre con `as` explícito (D-103).
const ActividadAsignacion = db.sequelize.define(
  'actividad_asignaciones',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    actividad_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    area_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    trabajador_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    tarea_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    turno_id: {
      type: Sequelize.INTEGER,
      allowNull: true // NULL solo para backfill de cronogramas sin turno (D-106); la API lo exige.
    },
    fecha_desde: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    fecha_hasta: {
      type: Sequelize.DATEONLY,
      allowNull: true
    },
    estado: {
      type: Sequelize.STRING(10),
      allowNull: false
    },
    activa_flag: {
      type: Sequelize.TINYINT,
      allowNull: true
    },
    origen: {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'APP'
    },
    motivo: {
      type: Sequelize.STRING(500),
      allowNull: true
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    cerrada_by: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    cerrada_at: {
      type: Sequelize.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'actividad_asignaciones',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

ActividadAsignacion.belongsTo(Actividad, { as: 'actividad', foreignKey: 'actividad_id' });
ActividadAsignacion.belongsTo(Area, { as: 'area', foreignKey: 'area_id' });
ActividadAsignacion.belongsTo(Trabajadore, { as: 'trabajador', foreignKey: 'trabajador_id' });
ActividadAsignacion.belongsTo(Turno, { as: 'turno', foreignKey: 'turno_id' });
ActividadAsignacion.belongsTo(Tarea, { as: 'tareaPuente', foreignKey: 'tarea_id' });

module.exports = ActividadAsignacion;
