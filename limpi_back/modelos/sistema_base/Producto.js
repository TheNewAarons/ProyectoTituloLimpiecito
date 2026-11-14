const Sequelize = require('sequelize')
const db = require('../../database/database');
// Proveedor solo requiere database: sin dependencia circular
const Proveedor = require('../sistema_bodega/Proveedor')

const Producto = db.sequelize.define(
    'productos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: Sequelize.STRING
        },
        descripcion:{
            type: Sequelize.STRING
        },
        tipo:{
            type: Sequelize.INTEGER
        },
        estado:{
            type: Sequelize.INTEGER
        },
        stock:{
            type: Sequelize.INTEGER
        },
        // RF-BOD-05: alerta del dashboard si stock_minimo > 0 y stock <= stock_minimo (migración 20261113162840)
        stock_minimo:{
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        precio:{
            type: Sequelize.INTEGER
        },
        // RF-BOD-03 (migración 20261102151757): NULL = sin proveedor asignado (histórico)
        proveedor_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        // CLP entero
        costo_unitario:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        }
    },
    {
        timestamps: false
    }
)

Producto.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' })

module.exports = Producto
