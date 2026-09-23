const Sequelize = require('sequelize')
const db = require('../../database/database');

const Lista_insumo = require("./Lista_insumo")
const Producto = require("./Producto")

module.exports = db.sequelize.define(
    'linea_insumos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        precio:{
            type: Sequelize.INTEGER,
        },
        total_linea:{
            type: Sequelize.INTEGER,
        },
        cantidad:{
            type: Sequelize.INTEGER,
        },
        productoId:{
            type: Sequelize.INTEGER,
            references:{
                model:Producto,
                key:'id'
            }
        },
        listaInsumoId:{
            type: Sequelize.INTEGER,
            references:{
                model:Lista_insumo,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)
