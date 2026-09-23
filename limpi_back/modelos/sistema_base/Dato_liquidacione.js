const Sequelize = require('sequelize')
const db = require('../../database/database');


module.exports = db.sequelize.define(
    'dato_liquidaciones',
    {
        // id:{
        //     type: Sequelize.INTEGER,
        //     primaryKey: true,
        //     autoIncrment: true
        // },
        sueldo_base:{
            type: Sequelize.INTEGER
        },
        gratificacion:{
            type: Sequelize.INTEGER
        },
        responsabilidad:{
            type: Sequelize.INTEGER
        },
        colacion:{
            type: Sequelize.INTEGER
        },
        movilizacion:{
            type: Sequelize.INTEGER
        },
        alimentacion:{
            type: Sequelize.INTEGER
        },
        cant_familia:{
            type: Sequelize.INTEGER
        },
        valor_carga_familia:{
            type: Sequelize.INTEGER
        }
    },
    {
        timestamps: false
    }
)
