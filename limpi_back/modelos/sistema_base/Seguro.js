const Sequelize = require('sequelize')
const db = require("../../database/database.js")

module.exports = db.sequelize.define(
    'seguros',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type:Sequelize.STRING
        },
        comision:{
            type:Sequelize.FLOAT
        },
        estado:{
          type:Sequelize.INTEGER
        }
    },
    {
        timestamps:false
    }
)
