const Sequelize = require('sequelize')
const db = require("../../database/database.js")

module.exports = db.sequelize.define(
    'roles',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: Sequelize.STRING,
        },
        descripcion:{
            type: Sequelize.STRING,
        },
        estado:{
            type: Sequelize.INTEGER,
        }
    },
    {
        timestamps:false
    }
)