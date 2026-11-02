const Sequelize = require('sequelize')
const db = require('../../database/database');
const Orden_compra = require('./Orden_compra')
const Producto = require('../sistema_base/Producto')

// RF-BOD-03: tabla `orden_compra_items` (migración 20261102041711).
const Orden_compra_item = db.sequelize.define(
    'orden_compra_items',
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
        // FK fk_orden_compra_items_producto -> productos.id (migración 20261102151757)
        producto_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad_recibida:{
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        // CLP entero
        costo_unitario:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        }
    },
    {
        tableName: 'orden_compra_items',
        freezeTableName: true,
        timestamps: false
    }
)

Orden_compra.hasMany(Orden_compra_item, { foreignKey: 'orden_id', as: 'items' })
Orden_compra_item.belongsTo(Orden_compra, { foreignKey: 'orden_id', as: 'orden' })
Orden_compra_item.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' })

module.exports = Orden_compra_item
