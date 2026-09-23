const Sequelize = require('sequelize')
const db = require('../../database/database');

const Carpeta_Padre = require('../sist_doc_cliente/Carpeta_padre')

module.exports = db.sequelize.define(
    'carpetas',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement:true
        },
        nombre:{
            type: Sequelize.STRING
        },
        carpetaPadreId: {
            type: Sequelize.INTEGER,
            references: {
              model: "carpetas",
              key: 'id'
            }
        },
        padreId: {
            type: Sequelize.INTEGER,
            references: {
              model: Carpeta_Padre,
              key: 'id'
            }
        }
    },
    {
        timestamps: false
    }
)
