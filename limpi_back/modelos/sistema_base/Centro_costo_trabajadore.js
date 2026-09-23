const Sequelize = require('sequelize')
const db = require('../../database/database');

const Trabajadore = require("./Trabajadore")
const Centro_costo = require("./Centro_costo")
const Liquidacione = require("./Liquidacion")

module.exports = db.sequelize.define(
    'centro_costo_trabajadores',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        trabajadoreId:{
            type: Sequelize.INTEGER,
            references: {
                model: Trabajadore,
                key: 'id'
            }
        },
        centroCostoId:{
            type: Sequelize.INTEGER,
            references: {
                model: Centro_costo,
                key: 'id'
            }
        },
        liquidacioneId:{
            type: Sequelize.INTEGER,
            references: {
                model: Centro_costo,
                key: 'id'
            }
        }
    },
    {
        timestamps:false
    }
)
