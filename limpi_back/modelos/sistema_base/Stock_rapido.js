const Sequelize = require('sequelize')
const db = require("../../database/database.js")

const Producto = require("./Producto")

module.exports = db.sequelize.define(
    'stock_rapidos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cantidad:{
            type: Sequelize.INTEGER,
        },
        comentario:{
            type: Sequelize.STRING,
        },
        fecha:{
          type:Sequelize.DATE,
        },
        productoId:{
            type: Sequelize.INTEGER,
            references:{
                model:Producto,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)
