const Sequelize = require('sequelize')
const db = require('../../database/database');

const Solicitud_bodega = require('./Solicitud_bodega')
const Producto = require('../sistema_base/Producto')

// RF-BOD-01: línea de la solicitud. cantidad_asignada/cantidad_faltante las escribe el cruce de stock (RF-BOD-02).
module.exports = db.sequelize.define(
    'solicitud_items',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        solicitud_id:{
            type: Sequelize.INTEGER,
            allowNull: false,
            references:{
                model: Solicitud_bodega,
                key: 'id'
            }
        },
        producto_id:{
            type: Sequelize.INTEGER,
            allowNull: false,
            references:{
                model: Producto,
                key: 'id'
            }
        },
        cantidad_pedida:{
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            validate:{
                isInt: true,
                min: 1
            }
        },
        cantidad_asignada:{
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        // NULL = aún no cruzado con stock
        cantidad_faltante:{
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true
        }
    },
    {
        tableName: 'solicitud_items',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
)
