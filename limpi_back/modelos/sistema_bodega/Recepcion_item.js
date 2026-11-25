const Sequelize = require('sequelize')
const db = require('../../database/database');
const Recepcion_compra = require('./Recepcion_compra')

// RF-BOD-04b: tabla `recepcion_items` (migración 20261121130000). Una línea por item de OC recibido.
const Recepcion_item = db.sequelize.define(
    'recepcion_items',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        recepcion_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        orden_item_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        producto_id:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        // CLP entero: costo real recibido
        costo_unitario:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        // RF-BOD-04 merma (migración 20261125180000): rechazadas en esta recepción y su motivo
        cantidad_rechazada:{
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        motivo_rechazo:{
            type: Sequelize.STRING(255),
            allowNull: true
        },
        // ENTRADA_COMPRA del kardex (NULL en recepciones históricas o líneas solo con rechazo)
        movimiento_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        }
    },
    {
        tableName: 'recepcion_items',
        freezeTableName: true,
        timestamps: false
    }
)

Recepcion_compra.hasMany(Recepcion_item, { foreignKey: 'recepcion_id', as: 'items' })

module.exports = Recepcion_item
