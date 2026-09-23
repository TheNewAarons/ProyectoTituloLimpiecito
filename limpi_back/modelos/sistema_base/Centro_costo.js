const Sequelize = require('sequelize')
const db = require('../../database/database');

const Caja = require("./Caja")
const Cliente = require("./Cliente")

module.exports = db.sequelize.define(
    'centro_costos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        fecha_inicio:{
            type: Sequelize.DATE
        },
        fecha_cierre:{
            type: Sequelize.DATE
        },
        precio_servicio:{
            type: Sequelize.INTEGER
        },
        total_costos:{
            type: Sequelize.INTEGER
        },
        utilidad:{
            type: Sequelize.INTEGER
        },
        numero_cc:{
            type: Sequelize.INTEGER
        },
        estado:{
            type: Sequelize.INTEGER
        },
        cajaId:{
            type: Sequelize.INTEGER,
            references: {
                model: Caja,
                key: 'id'
            }
        },
        clienteId:{
            type: Sequelize.INTEGER,
            references: {
                model: Cliente,
                key: 'id'
            }
        }
    },
    {
        timestamps:false
    }
)