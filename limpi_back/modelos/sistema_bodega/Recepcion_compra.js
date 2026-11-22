const Sequelize = require('sequelize')
const db = require('../../database/database');
const Orden_compra = require('./Orden_compra')

// RF-BOD-04b: tabla `recepciones_compra` (migración 20261121130000). Cada recepción de una OC es un evento.
const Recepcion_compra = db.sequelize.define(
    'recepciones_compra',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orden_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        fecha_recepcion:{
            type: Sequelize.DATE,
            allowNull: false
        },
        // GUIA | FACTURA
        documento_tipo:{
            type: Sequelize.STRING(10),
            allowNull: true
        },
        documento_numero:{
            type: Sequelize.STRING(50),
            allowNull: true
        },
        observacion:{
            type: Sequelize.STRING(255),
            allowNull: true
        },
        estado:{
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'CONFIRMADA'
        },
        historica:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        created_by:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        contexto_usuario:{
            type: Sequelize.STRING(20),
            allowNull: true
        },
        created_at:{
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        }
    },
    {
        tableName: 'recepciones_compra',
        freezeTableName: true,
        timestamps: false
    }
)

Orden_compra.hasMany(Recepcion_compra, { foreignKey: 'orden_id', as: 'recepciones' })

module.exports = Recepcion_compra
