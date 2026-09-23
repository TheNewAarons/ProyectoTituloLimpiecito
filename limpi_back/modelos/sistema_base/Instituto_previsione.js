const Sequelize = require('sequelize')
const db = require('../../database/database');

module.exports = db.sequelize.define(
    'instituto_previsiones',
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
