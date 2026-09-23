const Sequelize = require('sequelize')
const db = require('../../database/database');
const Centro = require("./Centro_costo")

module.exports = db.sequelize.define(
    'cc_ingresos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrment: true
        },
        fecha:{
            type: Sequelize.DATE
        },
        monto:{
            type: Sequelize.INTEGER
        },
        comentario:{
            type: Sequelize.STRING
        },
        centroCostoId:{
            type: Sequelize.INTEGER,
            references:{
                model: Centro,
                key:'id'
            }
        }

    },
    {
        timestamps: false
    }
)
