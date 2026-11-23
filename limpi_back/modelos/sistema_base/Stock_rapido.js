const Sequelize = require('sequelize')
const db = require("../../database/database.js")

const Producto = require("./Producto")

module.exports = db.sequelize.define(
    'stock_rapidos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // RNF-ARQ-01: anulación en vez de borrado físico (NULL = activa)
        anulada_at: { type: Sequelize.DATE, allowNull: true },
        anulada_por: { type: Sequelize.INTEGER, allowNull: true },
        contexto_anulacion: { type: Sequelize.STRING(20), allowNull: true },
        motivo_anulacion: { type: Sequelize.STRING(255), allowNull: true },
        cantidad:{
            type: Sequelize.INTEGER,
        },
        comentario:{
            type: Sequelize.STRING,
        },
        fecha:{
          type:Sequelize.DATE,
        },
        productoId:{
            type: Sequelize.INTEGER,
            references:{
                model:Producto,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)
