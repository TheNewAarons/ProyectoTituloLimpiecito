const Sequelize = require('sequelize')
const db = require('../../database/database');
const Proveedor = require('./Proveedor')

// RF-BOD-03: tabla `ordenes_compra` (migración 20261102041711). No se borra: estado 'ANULADA'.
const Orden_compra = db.sequelize.define(
    'ordenes_compra',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        proveedor_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        estado:{
            type: Sequelize.ENUM('BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'ANULADA'),
            allowNull: false,
            defaultValue: 'BORRADOR'
        },
        enviada_at:{
            type: Sequelize.DATE,
            allowNull: true
        },
        enviada_a_email:{
            type: Sequelize.STRING(150),
            allowNull: true
        },
        // FK a usuarios.id
        created_by:{
            type: Sequelize.INTEGER,
            allowNull: true
        }
    },
    {
        tableName: 'ordenes_compra',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
)

Orden_compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' })

module.exports = Orden_compra
