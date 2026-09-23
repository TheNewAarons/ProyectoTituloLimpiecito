const Sequelize = require('sequelize')
const db = require('../../database/database');

const Centro_costo = require("./Centro_costo")
const Usuario = require("./Usuario")

module.exports = db.sequelize.define(
    'lista_insumos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        estado:{
            type: Sequelize.INTEGER
        },
        fecha:{
            type: Sequelize.DATE
        },
        total:{
            type: Sequelize.INTEGER
        },
        centroCostoId:{
            type: Sequelize.INTEGER,
            references: {
                model: Centro_costo,
                key: 'id'
            }
        },
        usuarioCreaId:{
            type: Sequelize.INTEGER,
            references: {
                model: Usuario,
                key: 'id'
            }
        },
        usuarioApruebaId:{
            type: Sequelize.INTEGER,
            references: {
                model: Usuario,
                key: 'id'
            }
        }
    },
    {
        timestamps:false
    }
)
