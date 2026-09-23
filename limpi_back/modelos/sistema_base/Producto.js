const Sequelize = require('sequelize')
const db = require('../../database/database');

module.exports = db.sequelize.define(
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
        precio:{
            type: Sequelize.INTEGER
        }
    },
    {
        timestamps: false
    }
)