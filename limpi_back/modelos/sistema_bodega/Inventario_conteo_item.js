const Sequelize = require('sequelize')
const db = require('../../database/database');
const Inventario_conteo = require('./Inventario_conteo')

// RF-BOD-07: tabla `inventario_conteo_items`. Una línea por producto contado; movimiento_id = AJUSTE al aprobar.
const Inventario_conteo_item = db.sequelize.define(
    'inventario_conteo_items',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        conteo_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        producto_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad_teorica:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad_contada:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        diferencia:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        motivo:{
            type: Sequelize.STRING(255),
            allowNull: true
        },
        movimiento_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        }
    },
    {
        tableName: 'inventario_conteo_items',
        freezeTableName: true,
        timestamps: false
    }
)

Inventario_conteo.hasMany(Inventario_conteo_item, { foreignKey: 'conteo_id', as: 'items' })

module.exports = Inventario_conteo_item
