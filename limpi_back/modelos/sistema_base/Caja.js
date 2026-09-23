const Sequelize = require('sequelize')
const db = require('../../database/database');
const Usuario = require("./Usuario")

module.exports = db.sequelize.define(
    'cajas',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrment: true
        },
        fecha_inicio:{
            type: Sequelize.DATE
        },
        fecha_cierre:{
            type: Sequelize.DATE
        },
        total_ingreso:{
            type: Sequelize.INTEGER
        },
        total_egreso:{
            type: Sequelize.INTEGER
        },
        utilidad:{
            type: Sequelize.INTEGER
        },
        total_perdida:{
            type: Sequelize.INTEGER
        },
        estado:{
            type: Sequelize.INTEGER
        },
        total_cf:{
            type: Sequelize.INTEGER
        },
        usuarioId:{
            type: Sequelize.INTEGER,
            references:{
                model: Usuario,
                key:'id'
            }
        }

    },
    {
        timestamps: false
    }
)
