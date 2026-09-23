const Sequelize = require('sequelize')
const db = require("../../database/database.js")
const Trabajadore = require("./Trabajadore")

module.exports = db.sequelize.define(
    'vestimentas',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        polera_talla:{
            type:Sequelize.STRING
        },
        pantalon_talla:{
            type:Sequelize.STRING
        },
        zapato_talla:{
            type:Sequelize.STRING
        },
        chaqueta_talla:{
            type:Sequelize.STRING
        },
        otros:{
            type:Sequelize.STRING
        },
        trabajadoreId:{
            type: Sequelize.INTEGER,
            references:{
                model: Trabajadore,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)
