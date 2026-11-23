const Sequelize = require('sequelize')
const db = require('../../database/database');

// RF-BOD-07: tabla `inventario_conteos` (migración 20261121150000). Conteo físico BORRADOR -> APROBADO | ANULADO.
const Inventario_conteo = db.sequelize.define(
    'inventario_conteos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        fecha:{
            type: Sequelize.DATE,
            allowNull: false
        },
        responsable_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        contexto_usuario:{
            type: Sequelize.STRING(20),
            allowNull: true
        },
        // BORRADOR | APROBADO | ANULADO
        estado:{
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'BORRADOR'
        },
        aprobado_por:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        aprobado_at:{
            type: Sequelize.DATE,
            allowNull: true
        },
        observacion:{
            type: Sequelize.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: 'inventario_conteos',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
)

module.exports = Inventario_conteo
