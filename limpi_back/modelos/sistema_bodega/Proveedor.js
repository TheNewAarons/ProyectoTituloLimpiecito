const Sequelize = require('sequelize')
const db = require('../../database/database');

// RF-BOD-03: tabla `proveedores` (migración 20261102041711). Baja lógica con activo = 0.
module.exports = db.sequelize.define(
    'proveedores',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: Sequelize.STRING(150),
            allowNull: false
        },
        rut:{
            type: Sequelize.STRING(12),
            allowNull: true
        },
        email:{
            type: Sequelize.STRING(150),
            allowNull: true
        },
        telefono:{
            type: Sequelize.STRING(30),
            allowNull: true
        },
        contacto:{
            type: Sequelize.STRING(150),
            allowNull: true
        },
        activo:{
            type: Sequelize.TINYINT(1),
            allowNull: false,
            defaultValue: 1
        }
    },
    {
        tableName: 'proveedores',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
)
