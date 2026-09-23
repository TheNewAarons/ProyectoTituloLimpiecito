const Sequelize = require('sequelize')
const db = require('../../database/database');

const Usuario = require("./Usuario")
const Caja = require("./Caja")

module.exports = db.sequelize.define(
    'egresos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        monto:{
            type: Sequelize.INTEGER,
        },
        comentario:{
            type: Sequelize.STRING,
        },
        fecha:{
            type: Sequelize.DATE,
        },
        estado:{
            type: Sequelize.INTEGER,
        },
        tipo:{
            type: Sequelize.INTEGER,
        },
        usuarioId:{
            type: Sequelize.INTEGER,
            references:{
                model:Usuario,
                key:'id'
            }
        },
        cajaId:{
            type: Sequelize.INTEGER,
            references:{
                model:Caja,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)