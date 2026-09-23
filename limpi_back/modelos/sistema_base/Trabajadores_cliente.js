const Sequelize = require('sequelize')
const db = require("../../database/database.js")

const Trabajadore = require("./Trabajadore")
const Cliente = require("./Cliente")

module.exports = db.sequelize.define(
    'trabajadores_clientes',
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
        clienteId:{
            type: Sequelize.INTEGER,
            references: {
                model: Cliente,
                key: 'id'
            }
        }
    },
    {
        timestamps:false
    }
)